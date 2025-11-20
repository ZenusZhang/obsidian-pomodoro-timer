import PomodoroTimerPlugin from 'main'
// @ts-ignore
import Worker from 'clock.worker'
import { writable, derived } from 'svelte/store'
import type { Readable } from 'svelte/store'
import { Notice, TFile } from 'obsidian'
import Logger, { type LogContext } from 'Logger'
import DEFAULT_NOTIFICATION from 'Notification'
import REWARD_NOTIFICATION from 'RewardNotification'
import type { Unsubscriber } from 'svelte/motion'
import type { TaskItem } from 'Tasks'
import { askRewardValue } from 'RewardValueModal'
import { askPomodoroStartInfo } from 'PomodoroStartModal'
import { askForTimerLength } from 'TimerLengthModal'

const NOTE_FREQUENCIES = {
    C3: 130.81,
    C4: 261.63,
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    F5: 698.46,
} as const

const START_MELODY = [
    NOTE_FREQUENCIES.C5,
    NOTE_FREQUENCIES.D5,
    NOTE_FREQUENCIES.E5,
    NOTE_FREQUENCIES.F5,
]

const END_MELODY = [
    NOTE_FREQUENCIES.F5,
    NOTE_FREQUENCIES.E5,
    NOTE_FREQUENCIES.D5,
    NOTE_FREQUENCIES.C5,
]

const STANDARD_DO_FREQUENCY = NOTE_FREQUENCIES.C4

export type Mode = 'WORK' | 'BREAK'

export type TimerRemained = {
    millis: number
    human: string
}

type RewardSample = {
    value: number
    minutesFromStart: number
}

const DEFAULT_TASK: TaskItem = {
    actual: 0,
    expected: 0,
    path: '',
    fileName: '',
    text: '',
    name: '',
    status: '',
    blockLink: '',
    checked: false,
    done: '',
    due: '',
    created: '',
    cancelled: '',
    scheduled: '',
    start: '',
    description: '',
    priority: '',
    recurrence: '',
    tags: [],
    line: -1,
}

export type TimerState = {
    autostart: boolean
    running: boolean
    // lastTick: number
    mode: Mode
    elapsed: number
    startTime: number | null
    inSession: boolean
    workLen: number
    breakLen: number
    count: number
    duration: number
    rewardExpected: number | null
    rewardSamples: RewardSample[]
    sessionDescription: string
}

export type TimerStore = TimerState & {
    remained: TimerRemained
    finished: boolean
}

export default class Timer implements Readable<TimerStore> {
    static DEFAULT_NOTIFICATION_AUDIO = new Audio(DEFAULT_NOTIFICATION)
    static REWARD_NOTIFICATION_AUDIO = new Audio(REWARD_NOTIFICATION)

    private plugin: PomodoroTimerPlugin

    private logger: Logger

    private state: TimerState

    private store: Readable<TimerStore>

    private clock: any

    private update

    private unsubscribers: Unsubscriber[] = []

    public subscribe

    private rewardTimeout: number | null = null

    private audioContext: AudioContext | null = null

    private rewardReminderCount = 0

    constructor(plugin: PomodoroTimerPlugin) {
        this.plugin = plugin
        this.logger = new Logger(plugin)
        let count = this.toMillis(plugin.getSettings().workLen)
        this.state = {
            autostart: plugin.getSettings().autostart,
            workLen: plugin.getSettings().workLen,
            breakLen: plugin.getSettings().breakLen,
            running: false,
            // lastTick: 0,
            mode: 'WORK',
            elapsed: 0,
            startTime: null,
            inSession: false,
            duration: plugin.getSettings().workLen,
            count,
            rewardExpected: null,
            rewardSamples: [],
            sessionDescription: '',
        }

        let store = writable(this.state)

        this.update = store.update

        this.store = derived(store, ($state) => ({
            ...$state,
            remained: this.remain($state.count, $state.elapsed),
            finished: $state.count == $state.elapsed,
        }))

        this.subscribe = this.store.subscribe
        this.unsubscribers.push(
            this.store.subscribe((state) => {
                this.state = state
            }),
        )
        this.clock = Worker()
        this.clock.onmessage = ({ data }: any) => {
            this.tick(data as number)
        }
    }

    private remain(count: number, elapsed: number): TimerRemained {
        let remained = count - elapsed
        let min = Math.floor(remained / 60000)
        let sec = Math.floor((remained % 60000) / 1000)
        let minStr = min < 10 ? `0${min}` : min.toString()
        let secStr = sec < 10 ? `0${sec}` : sec.toString()
        return {
            millis: remained,
            human: `${minStr} : ${secStr}`,
        }
    }

    private toMillis(minutes: number) {
        return minutes * 60 * 1000
    }

    private clearRewardTimeout() {
        if (this.rewardTimeout != null) {
            window.clearTimeout(this.rewardTimeout)
            this.rewardTimeout = null
        }
    }

    private scheduleRewardReminder() {
        const settings = this.plugin.getSettings()
        if (
            !settings.rewardValueRecord ||
            settings.logFormat !== 'POMODORO_SECTION'
        ) {
            return
        }

        if (!this.state.inSession || this.state.mode !== 'WORK') {
            return
        }

        this.clearRewardTimeout()

        const isFirstReminder = this.rewardReminderCount === 0
        const minDelay = isFirstReminder ? 2 : 3
        const maxDelay = isFirstReminder ? 3 : 6
        const delayMinutes = minDelay + Math.random() * (maxDelay - minDelay)
        const delayMillis = Math.round(delayMinutes * 60 * 1000)
        this.rewardTimeout = window.setTimeout(() => {
            void this.handleRewardReminder()
        }, delayMillis)
    }

    private tick(t: number) {
        let timeup: boolean = false
        let pause: boolean = false
        this.update((s) => {
            if (s.running) {
                s.elapsed += t
                if (s.elapsed >= s.count) {
                    s.elapsed = s.count
                }
                timeup = s.elapsed >= s.count
            } else {
                pause = true
            }
            return s
        })
        if (!pause && timeup) {
            this.timeup()
        }
    }

    private timeup() {
        let autostart = false
        this.update((state) => {
            const ctx = this.createLogContext(state)
            void this.processLog(ctx)
            autostart = state.autostart
            return this.endSession(state)
        })
        if (autostart) {
            void this.start()
        }
    }

    private async handleRewardReminder() {
        // This is always called from a timeout callback.
        this.rewardTimeout = null

        this.rewardReminderCount++

        const settings = this.plugin.getSettings()
        if (
            !settings.rewardValueRecord ||
            settings.logFormat !== 'POMODORO_SECTION'
        ) {
            return
        }

        if (!this.state.inSession || this.state.mode !== 'WORK') {
            return
        }

        this.notifyRewardReminder()

        const value = await askRewardValue(this.plugin.app, 'ACTUAL')
        if (value == null) {
            this.scheduleRewardReminder()
            return
        }

        let minutesFromStart = 0
        if (this.state.startTime != null) {
            minutesFromStart =
                Math.round(
                    ((Date.now() - this.state.startTime) / 60000) * 10,
                ) / 10
        } else if (this.state.elapsed > 0) {
            minutesFromStart =
                Math.round((this.state.elapsed / 60000) * 10) / 10
        }

        this.update((state) => {
            state.rewardSamples.push({ value, minutesFromStart })
            return state
        })

        const ctx = this.createLogContext(this.state)
        await this.logger.updateRewardTracking(ctx)

        this.scheduleRewardReminder()
    }

    private notifyRewardReminder() {
        const settings = this.plugin.getSettings()
        const text =
            '请在 0~5 之间选择你当前的愉悦值（0 表示非常低，5 表示非常高）。'

        if (settings.useSystemNotification) {
            const Notification = (require('electron') as any).remote
                .Notification
            const sysNotification = new Notification({
                title: 'Pomodoro Reward',
                body: text,
                silent: true,
            })
            sysNotification.on('click', () => {
                this.focusObsidianWindow()
                sysNotification.close()
            })
            sysNotification.show()
        } else {
            new Notice(text)
        }

        if (settings.notificationSound) {
            this.playRewardAudio()
        }
    }

    private createLogContext(s: TimerState): LogContext {
        let state = { ...s }
        let task = this.plugin.tracker?.task
            ? { ...this.plugin.tracker.task }
            : { ...DEFAULT_TASK }

        if (!task.path) {
            task.path = this.plugin.tracker?.file?.path ?? ''
            task.fileName = this.plugin.tracker?.file?.name ?? ''
        }

        return { ...state, task }
    }

    private async processLog(ctx: LogContext) {
        if (ctx.mode == 'WORK') {
            await this.plugin.tracker?.updateActual()
        }
        await this.logger.logPomodoroEnd(ctx)
        await this.logger.updateRewardTracking(ctx)
        const logFile = await this.logger.log(ctx)
        this.notify(ctx, logFile)
    }

    public async start() {
        let isNewSession = false
        this.update((s) => {
            let now = new Date().getTime()
            if (!s.inSession) {
                // new session
                s.elapsed = 0
                s.duration = s.mode === 'WORK' ? s.workLen : s.breakLen
                s.count = s.duration * 60 * 1000
                s.startTime = now
                s.rewardExpected = null
                s.rewardSamples = []
                s.sessionDescription = ''
                this.rewardReminderCount = 0
                isNewSession = true
            }
            s.inSession = true
            s.running = true
            this.clock.postMessage({
                start: true,
                lowFps: this.plugin.getSettings().lowFps,
            })
            return s
        })
        if (isNewSession) {
            const settings = this.plugin.getSettings()
            const shouldAskReward =
                settings.rewardValueRecord &&
                settings.logFormat === 'POMODORO_SECTION' &&
                this.state.mode === 'WORK'
            const shouldPromptForDetails =
                settings.logFormat === 'POMODORO_SECTION' &&
                this.state.mode === 'WORK'

            let expected: number | null = null
            let sessionDescription = ''

            if (shouldPromptForDetails) {
                const result = await askPomodoroStartInfo(this.plugin.app, {
                    includeRewardInput: shouldAskReward,
                })
                sessionDescription = result.description ?? ''
                if (shouldAskReward) {
                    expected = result.expectedReward
                }
            }

            this.update((state) => {
                if (shouldPromptForDetails) {
                    state.sessionDescription = sessionDescription
                }
                state.rewardExpected = shouldAskReward ? expected ?? null : null
                return state
            })

            if (shouldAskReward && expected != null) {
                this.scheduleRewardReminder()
            }

            if (this.state.mode === 'WORK' && settings.notificationSound) {
                this.playAudio('START')
            }

            const ctx = this.createLogContext(this.state)
            this.logger.logPomodoroStart(ctx)
        }
    }

    private endSession(state: TimerState) {
        // setup new session
        if (state.breakLen == 0) {
            state.mode = 'WORK'
        } else {
            state.mode = state.mode == 'WORK' ? 'BREAK' : 'WORK'
        }
        state.duration = state.mode == 'WORK' ? state.workLen : state.breakLen
        state.count = state.duration * 60 * 1000
        state.inSession = false
        state.running = false
        this.clearRewardTimeout()
        this.clock.postMessage({
            start: false,
            lowFps: this.plugin.getSettings().lowFps,
        })
        state.startTime = null
        state.elapsed = 0
        return state
    }

    private notify(state: TimerState, logFile: TFile | void) {
        const emoji = state.mode == 'WORK' ? '🍅' : '🥤'
        const text = `${emoji} You have been ${
            state.mode === 'WORK' ? 'working' : 'breaking'
        } for ${state.duration} minutes.`

        if (this.plugin.getSettings().useSystemNotification) {
            const Notification = (require('electron') as any).remote
                .Notification
            const sysNotification = new Notification({
                title: 'Pomodoro Timer',
                body: text,
                silent: true,
            })
            sysNotification.on('click', () => {
                this.focusObsidianWindow()
                if (logFile) {
                    this.plugin.app.workspace.getLeaf('split').openFile(logFile)
                }
                sysNotification.close()
            })
            sysNotification.show()
        } else {
            let fragment = new DocumentFragment()
            let span = fragment.createEl('span')
            span.setText(`${text}`)
            fragment.addEventListener('click', () => {
                if (logFile) {
                    this.plugin.app.workspace.getLeaf('split').openFile(logFile)
                }
            })
            new Notice(fragment)
        }

        if (this.plugin.getSettings().notificationSound) {
            this.playAudio('END')
        }
    }

    private focusObsidianWindow() {
        try {
            const electron = require('electron') as any
            const remote = electron?.remote
            if (!remote) {
                return
            }
            const currentWindow =
                remote.getCurrentWindow?.() ??
                remote.BrowserWindow?.getFocusedWindow?.()
            const targetWindow =
                currentWindow ??
                (remote.BrowserWindow?.getAllWindows?.() || [])[0]
            if (targetWindow) {
                if (targetWindow.isMinimized()) {
                    targetWindow.restore()
                }
                targetWindow.show()
                targetWindow.focus()
            }
        } catch (error) {
            console.warn('Failed to focus Obsidian window', error)
        }
    }

    public pause() {
        this.update((state) => {
            state.running = false
            this.clock.postMessage({
                start: false,
                lowFps: this.plugin.getSettings().lowFps,
            })
            return state
        })
    }

    public reset() {
        let ctx: LogContext | null = null
        this.update((state) => {
            const shouldTreatAsEnd =
                state.running && state.inSession && state.elapsed > 0
            if (shouldTreatAsEnd) {
                ctx = this.createLogContext(state)
            }

            state.duration =
                state.mode == 'WORK' ? state.workLen : state.breakLen
            state.count = state.duration * 60 * 1000
            state.inSession = false
            state.running = false
            this.clearRewardTimeout()

            if (!this.plugin.tracker!.pinned) {
                this.plugin.tracker!.clear()
            }
            this.clock.postMessage({
                start: false,
                lowFps: this.plugin.getSettings().lowFps,
            })
            state.startTime = null
            state.elapsed = 0
            return state
        })
        // Treat resetting a running pomodoro as an explicit "end" event.
        if (ctx) {
            void this.processLog(ctx)
        }
    }

    public toggleMode(callback?: (state: TimerState) => void) {
        this.update((s) => {
            let updated = this.endSession(s)
            if (callback) {
                callback(updated)
            }
            return updated
        })
    }

    public async promptForTimerLength() {
        const remainingMillis = Math.max(0, this.state.count - this.state.elapsed)
        const remainingMinutes =
            Math.round((remainingMillis / 60000) * 10) / 10
        const initialMinutes = this.state.inSession
            ? remainingMinutes
            : this.state.duration
        const result = await askForTimerLength(this.plugin.app, {
            initialMinutes: Number.isFinite(initialMinutes)
                ? initialMinutes
                : 0,
            minMinutes: 0,
        })
        if (result == null) {
            return
        }
        const sanitized = Math.max(0, result)
        this.update((state) => {
            const elapsedMinutes = state.elapsed / 60000
            if (state.inSession) {
                const totalMinutes = sanitized + elapsedMinutes
                state.duration = totalMinutes
                state.count = Math.max(0, Math.round(totalMinutes * 60 * 1000))
                if (state.elapsed > state.count) {
                    state.elapsed = state.count
                }
            } else {
                state.duration = sanitized
                state.count = Math.max(0, Math.round(sanitized * 60 * 1000))
                state.elapsed = 0
            }
            return state
        })
    }

    public toggleTimer() {
        this.state.running ? this.pause() : this.start()
    }

    public playAudio(kind: 'START' | 'END' = 'END') {
        const customSound = this.plugin.getSettings().customSound
        if (customSound && this.playCustomSound(customSound)) {
            return
        }

        const melody = kind === 'START' ? START_MELODY : END_MELODY
        const played = this.playPianoMelody(melody, {
            noteDuration: 0.28,
            gap: 0.04,
            volume: 0.22,
        })

        if (!played) {
            this.playDefaultAudioClip()
        }
    }

    public playRewardAudio() {
        const rewardAudio = Timer.REWARD_NOTIFICATION_AUDIO
        if (rewardAudio) {
            rewardAudio.currentTime = 0
            rewardAudio.volume = 0.7
            try {
                const playPromise = rewardAudio.play()
                if (playPromise && typeof playPromise.catch === 'function') {
                    void playPromise.catch(() => {
                        this.playFallbackRewardTone()
                    })
                }
                return
            } catch (error) {
                console.warn('Failed to play reward audio sample', error)
            }
        }

        this.playFallbackRewardTone()
    }

    private playFallbackRewardTone() {
        const played = this.playPianoMelody([STANDARD_DO_FREQUENCY], {
            noteDuration: 0.85,
            gap: 0,
            volume: 0.3,
        })

        if (!played) {
            this.playDefaultAudioClip()
        }
    }

    private playCustomSound(path: string): boolean {
        const soundFile =
            this.plugin.app.vault.getAbstractFileByPath(path)
        if (soundFile && soundFile instanceof TFile) {
            const soundSrc = this.plugin.app.vault.getResourcePath(soundFile)
            const audio = new Audio(soundSrc)
            audio.currentTime = 0
            void audio.play()
            return true
        }
        return false
    }

    private playDefaultAudioClip() {
        const audio = Timer.DEFAULT_NOTIFICATION_AUDIO
        audio.currentTime = 0
        void audio.play()
    }

    private getAudioContext(): AudioContext | null {
        if (typeof window === 'undefined') {
            return null
        }

        const AudioCtor =
            window.AudioContext || (window as any).webkitAudioContext
        if (!AudioCtor) {
            return null
        }

        if (!this.audioContext) {
            this.audioContext = new AudioCtor()
        }

        if (this.audioContext.state === 'suspended') {
            void this.audioContext.resume().catch(() => {
                /* noop */
            })
        }

        return this.audioContext
    }

    private playPianoMelody(
        notes: number[],
        options?: { noteDuration?: number; gap?: number; volume?: number },
    ): boolean {
        const ctx = this.getAudioContext()
        if (!ctx) {
            return false
        }

        const duration = options?.noteDuration ?? 0.35
        const gap = options?.gap ?? 0.05
        const volume = options?.volume ?? 0.25
        const startAt = ctx.currentTime

        notes.forEach((frequency, index) => {
            const noteStart = startAt + index * (duration + gap)
            const oscillator = ctx.createOscillator()
            oscillator.type = 'triangle'
            oscillator.frequency.setValueAtTime(frequency, noteStart)

            const gainNode = ctx.createGain()
            gainNode.gain.setValueAtTime(volume, noteStart)
            gainNode.gain.exponentialRampToValueAtTime(
                0.0001,
                noteStart + duration,
            )

            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            oscillator.start(noteStart)
            oscillator.stop(noteStart + duration + gap)
        })

        return true
    }

    public setupTimer() {
        this.update((state) => {
            const { workLen, breakLen, autostart } = this.plugin.getSettings()
            state.workLen = workLen
            state.breakLen = breakLen
            state.autostart = autostart
            if (!state.running && !state.inSession) {
                state.duration =
                    state.mode == 'WORK' ? state.workLen : state.breakLen
                state.count = state.duration * 60 * 1000
            }

            return state
        })
    }

    public destroy() {
        this.pause()
        this.clearRewardTimeout()
        this.clock?.terminate()
        for (let unsub of this.unsubscribers) {
            unsub()
        }
    }
}
