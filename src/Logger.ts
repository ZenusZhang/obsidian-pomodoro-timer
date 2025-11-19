import { type TimerState, type Mode } from 'Timer'
import * as utils from 'utils'
import PomodoroTimerPlugin from 'main'
import { TFile, Notice, moment } from 'obsidian'
import { type TaskItem } from 'Tasks'

export type TimerLog = {
    duration: number
    begin: number
    end: number
    mode: Mode
    session: number
    task: TaskLog
    finished: boolean
}

export type TaskLog = Pick<
    TaskItem,
    | 'fileName'
    | 'path'
    | 'name'
    | 'text'
    | 'description'
    | 'blockLink'
    | 'actual'
    | 'expected'
    | 'status'
    | 'checked'
    | 'created'
    | 'start'
    | 'scheduled'
    | 'due'
    | 'done'
    | 'cancelled'
    | 'priority'
    | 'recurrence'
    | 'tags'
>

export type LogContext = TimerState & { task: TaskItem }

export default class Logger {
    private plugin: PomodoroTimerPlugin

    constructor(plugin: PomodoroTimerPlugin) {
        this.plugin = plugin
    }

    /**
     * Log the beginning of a pomodoro session into the dedicated Pomodoro
     * Section in the chosen log file.
     *
     * This is a no-op unless:
     *   - logFormat === 'POMODORO_SECTION'
     *   - logFile is not 'NONE'
     *   - ctx.mode === 'WORK' (only count real pomodoros)
     */
    public async logPomodoroStart(ctx: LogContext): Promise<void> {
        const settings = this.plugin.getSettings()

        if (settings.logFormat !== 'POMODORO_SECTION') {
            return
        }

        // Only log according to log level
        if (settings.logLevel !== 'ALL' && settings.logLevel !== ctx.mode) {
            return
        }

        // Only count work sessions as pomodoros
        if (ctx.mode !== 'WORK') {
            return
        }

        const logFile = await this.resolveLogFile(ctx)
        if (!logFile) {
            return
        }

        await this.appendPomodoroSectionEvent(logFile, ctx, 'START')
    }

    /**
     * Log the end of a pomodoro session into the Pomodoro Section.
     *
     * See the conditions in logPomodoroStart – they are mirrored here.
     */
    public async logPomodoroEnd(ctx: LogContext): Promise<void> {
        const settings = this.plugin.getSettings()

        if (settings.logFormat !== 'POMODORO_SECTION') {
            return
        }

        if (settings.logLevel !== 'ALL' && settings.logLevel !== ctx.mode) {
            return
        }

        if (ctx.mode !== 'WORK') {
            return
        }

        const logFile = await this.resolveLogFile(ctx)
        if (!logFile) {
            return
        }

        await this.appendPomodoroSectionEvent(logFile, ctx, 'END')
    }

    /**
     * Update reward tracking information (ARV and average ARV) for the
     * most recent pomodoro in the Pomodoro Section.
     *
     * Behaviour details for POMODORO_SECTION format:
     *   - ARV line is updated every time we collect a new sample so the
     *     user can see the series while the pomodoro is running.
     *   - The avg ARV line is only written once the current pomodoro has
     *     been ended (i.e. its corresponding "end" line exists).
     *   - Both ARV and avg ARV lines are inserted before the matching
     *     "end" line so that the visual order is:
     *         - 🍅 1 start ...
     *           ARV: ...
     *           avg ARV: ...
     *         - 1 end ...
     */
    public async updateRewardTracking(ctx: LogContext): Promise<void> {
        const settings = this.plugin.getSettings()

        if (settings.logFormat !== 'POMODORO_SECTION') {
            return
        }

        if (settings.logLevel !== 'ALL' && settings.logLevel !== ctx.mode) {
            return
        }

        if (ctx.mode !== 'WORK') {
            return
        }

        const samples =
            (ctx as any).rewardSamples as
                | { value: number; minutesFromStart: number }[]
                | undefined

        if (!samples || samples.length === 0) {
            return
        }

        const logFile = await this.resolveLogFile(ctx)
        if (!logFile) {
            return
        }

        await this.updatePomodoroSectionRewardLines(logFile, samples)
    }

    public async log(ctx: LogContext): Promise<TFile | void> {
        const logFile = await this.resolveLogFile(ctx)
        const log = this.createLog(ctx)
        if (logFile) {
            const logText = await this.toText(log, logFile)
            if (logText) {
                await this.plugin.app.vault.append(logFile, `\n${logText}`)
            }
        }

        return logFile
    }

    public async resolveLogFile(ctx: LogContext): Promise<TFile | void> {
        const settings = this.plugin!.getSettings()

        // filter log level
        if (settings.logLevel !== 'ALL' && settings.logLevel !== ctx.mode) {
            return
        }

        // focused file has the highest priority
        if (
            settings.logFocused &&
            ctx.task.path &&
            ctx.task.path.endsWith('md')
        ) {
            const file = this.plugin.app.vault.getAbstractFileByPath(
                ctx.task.path,
            )
            if (file && file instanceof TFile) {
                return file
            }
            // fall-through
        }

        if (settings.logFile === 'NONE') {
            return
        }

        // use daily note
        if (settings.logFile === 'DAILY') {
            return await utils.getDailyNoteFile()
        }

        // use weekly note
        if (settings.logFile == 'WEEKLY') {
            return await utils.getWeeklyNoteFile()
        }

        // log to file
        if (settings.logFile === 'FILE') {
            if (settings.logPath) {
                let path = settings.logPath
                if (!path.endsWith('md')) {
                    path += '.md'
                }
                try {
                    return await utils.ensureFileExists(this.plugin.app, path)
                } catch (error) {
                    if (error instanceof Error) {
                        new Notice(error.message)
                    }
                    return
                }
            }
        }
    }

    private createLog(ctx: LogContext): TimerLog {
        return {
            mode: ctx.mode,
            duration: Math.floor(ctx.elapsed / 60000),
            begin: ctx.startTime!,
            end: new Date().getTime(),
            session: ctx.duration,
            task: ctx.task,
            finished: ctx.count == ctx.elapsed,
        }
    }

    /**
     * Append a single pomodoro event (start or end) into the "Pomodoro Section"
     * of the given file.
     *
     * The format is:
     *   - 🍅 {pomo_id} start HH:mm [[file#^blockId|task description]] ERV: e
     *   - {pomo_id} end   HH:mm
     *
     * Where:
     *   - pomo_id is the N-th pomodoro in this file (counted by "start" lines)
     *   - The optional wiki link points to the tracked task (if any)
     */
    private async appendPomodoroSectionEvent(
        file: TFile,
        ctx: LogContext,
        kind: 'START' | 'END',
    ): Promise<void> {
        const app = this.plugin.app
        const content = await app.vault.read(file)
        const lines = content.split('\n')

        // Find or create the section header.
        const headerRegex = /^#{1,6}\s+Pomodoro Section\s*$/i
        let headerIndex = lines.findIndex((line) => headerRegex.test(line))

        if (headerIndex === -1) {
            // Trim trailing empty lines so the new section is tight at the end.
            while (
                lines.length > 0 &&
                lines[lines.length - 1].trim().length === 0
            ) {
                lines.pop()
            }

            if (lines.length > 0) {
                lines.push('')
            }
            lines.push('## Pomodoro Section')
            headerIndex = lines.length - 1
            lines.push('')
        }

        // Determine the range of lines that belong to the Pomodoro Section:
        // from the header until the next header or EOF.
        let sectionEnd = lines.length
        for (let i = headerIndex + 1; i < lines.length; i++) {
            if (/^#{1,6}\s+/.test(lines[i])) {
                sectionEnd = i
                break
            }
        }

        const idRegex = /^\s*-\s*(?:🍅\s+)?(\d+)\s+(start|end)\b/i
        let maxStartId = 0
        let maxEndId = 0

        for (let i = headerIndex + 1; i < sectionEnd; i++) {
            const match = lines[i].match(idRegex)
            if (!match) continue
            const id = parseInt(match[1], 10)
            const type = match[2].toLowerCase()
            if (type === 'start') {
                maxStartId = Math.max(maxStartId, id)
            } else if (type === 'end') {
                maxEndId = Math.max(maxEndId, id)
            }
        }

        let pomoId: number
        if (kind === 'START') {
            pomoId = maxStartId + 1
        } else {
            // END – attach to the most recent started pomodoro.
            if (maxStartId === 0) {
                pomoId = 1
            } else {
                pomoId = maxStartId
            }
        }

        // Compute the display time in HH:mm.
        const beginMoment = ctx.startTime
            ? moment(ctx.startTime)
            : moment(Date.now())
        const endMoment =
            kind === 'END'
                ? beginMoment.clone().add(ctx.elapsed, 'milliseconds')
                : beginMoment

        const timeStr =
            kind === 'START'
                ? beginMoment.format('HH:mm')
                : endMoment.format('HH:mm')

        let superLink = ''
        if (kind === 'START') {
            const t = ctx.task
            if (t.path && t.blockLink) {
                const linkPath = t.path.replace(/\.md$/i, '')
                const blockRef = t.blockLink.trim() // "^abcd"
                const alias = t.name || t.description || linkPath
                superLink = ` [[${linkPath}#${blockRef}|${alias}]]`
            }
        }

        const emojiPrefix = kind === 'START' ? '🍅 ' : ''

        let erv = ''
        if (
            kind === 'START' &&
            typeof (ctx as any).rewardExpected === 'number' &&
            (ctx as any).rewardExpected != null
        ) {
            erv = ` ERV: ${(ctx as any).rewardExpected}`
        }

        const line = `- ${emojiPrefix}${pomoId} ${kind.toLowerCase()} ${timeStr}${superLink}${erv}`

        // Insert at the end of the section (just before the next header or EOF).
        lines.splice(sectionEnd, 0, line)

        await app.vault.modify(file, lines.join('\n'))
    }

    private async updatePomodoroSectionRewardLines(
        file: TFile,
        samples: { value: number; minutesFromStart: number }[],
    ): Promise<void> {
        const app = this.plugin.app
        const content = await app.vault.read(file)
        const lines = content.split('\n')

        const headerRegex = /^#{1,6}\s+Pomodoro Section\s*$/i
        const startRegex = /^\s*-\s*(?:🍅\s+)?(\d+)\s+start\b/i

        let headerIndex = lines.findIndex((line) => headerRegex.test(line))
        if (headerIndex === -1) {
            return
        }

        let sectionEnd = lines.length
        for (let i = headerIndex + 1; i < lines.length; i++) {
            if (/^#{1,6}\s+/.test(lines[i])) {
                sectionEnd = i
                break
            }
        }

        let lastStartIndex = -1
        let lastStartId = 0
        for (let i = headerIndex + 1; i < sectionEnd; i++) {
            const match = lines[i].match(startRegex)
            if (match) {
                lastStartIndex = i
                lastStartId = parseInt(match[1], 10)
            }
        }

        if (lastStartIndex === -1) {
            return
        }

        let nextStartIndex = -1
        for (let i = lastStartIndex + 1; i < sectionEnd; i++) {
            if (startRegex.test(lines[i])) {
                nextStartIndex = i
                break
            }
        }

        let endLineIndex = -1
        const endRegex = new RegExp(
            '^\\s*-\\s*(?:🍅\\s+)?' + lastStartId.toString() + '\\s+end\\b',
            'i',
        )
        const searchEndLimit = nextStartIndex === -1 ? sectionEnd : nextStartIndex
        for (let i = lastStartIndex + 1; i < searchEndLimit; i++) {
            if (endRegex.test(lines[i])) {
                endLineIndex = i
                break
            }
        }

        let blockTailIndex: number
        const hasEndLine = endLineIndex !== -1
        if (endLineIndex !== -1) {
            blockTailIndex = endLineIndex
        } else if (nextStartIndex !== -1) {
            blockTailIndex = nextStartIndex
        } else {
            blockTailIndex = sectionEnd
        }

        const isRewardLine = (line: string) =>
            /^\s*(?:[>-]\s*)?ARV:/i.test(line) ||
            /^\s*(?:[>-]\s*)?avg\s+ARV:/i.test(line)

        let i = lastStartIndex + 1
        while (i < blockTailIndex) {
            if (isRewardLine(lines[i])) {
                lines.splice(i, 1)
                blockTailIndex--
            } else {
                i++
            }
        }

        if (samples.length === 0) {
            await app.vault.modify(file, lines.join('\n'))
            return
        }

        const arvParts = samples.map((s) => {
            const tStr = `${s.minutesFromStart}m`
            return `${s.value}, ${tStr}`
        })
        const arvLine = ` ARV: ${arvParts.join('; ')}`

        // Only show the average once the pomodoro has an explicit "end" line.
        const insertIndex = blockTailIndex

        if (hasEndLine) {
            const avg =
                samples.reduce((sum, s) => sum + s.value, 0) / samples.length
            const avgLine = ` avg ARV: ${avg.toFixed(2)}`

            lines.splice(insertIndex, 0, arvLine, avgLine)
        } else {
            // Session is still running – update only the ARV series.
            lines.splice(insertIndex, 0, arvLine)
        }

        await app.vault.modify(file, lines.join('\n'))
    }

    private async toText(log: TimerLog, file: TFile): Promise<string> {
        const settings = this.plugin.getSettings()

        // When using the dedicated Pomodoro Section format, we handle writing
        // to the note manually and suppress the old inline log entries.
        if (settings.logFormat === 'POMODORO_SECTION') {
            return ''
        }

        if (
            settings.logFormat === 'CUSTOM' &&
            utils.getTemplater(this.plugin.app)
        ) {
            // use templater
            try {
                return await utils.parseWithTemplater(
                    this.plugin.app,
                    file,
                    settings.logTemplate,
                    log,
                )
            } catch (e) {
                new Notice('Invalid template')
                console.error('invalid templat:', e)
                return ''
            }
        } else {
            // Built-in log: ignore unfinished session
            if (!log.finished) {
                return ''
            }

            let begin = moment(log.begin)
            let end = moment(log.end)
            if (settings.logFormat === 'SIMPLE') {
                return `**${log.mode}(${log.duration}m)**: ${begin.format(
                    'HH:mm',
                )} - ${end.format('HH:mm')}`
            }

            if (settings.logFormat === 'VERBOSE') {
                const emoji = log.mode == 'WORK' ? '🍅' : '🥤'
                return `- ${emoji} (pomodoro::${log.mode}) (duration:: ${
                    log.duration
                }m) (begin:: ${begin.format(
                    'YYYY-MM-DD HH:mm',
                )}) - (end:: ${end.format('YYYY-MM-DD HH:mm')})`
            }

            return ''
        }
    }
}
