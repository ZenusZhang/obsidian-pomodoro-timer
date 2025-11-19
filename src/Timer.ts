import PomodoroTimerPlugin from 'main'
// @ts-ignore
import Worker from 'clock.worker'
import { writable, derived } from 'svelte/store'
import type { Readable } from 'svelte/store'
import { Notice, TFile } from 'obsidian'
import Logger, { type LogContext } from 'Logger'
import DEFAULT_NOTIFICATION from 'Notification'
import type { Unsubscriber } from 'svelte/motion'
import type { TaskItem } from 'Tasks'
import { askRewardValue } from 'RewardValueModal'

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
}

export type TimerStore = TimerState & {
    remained: TimerRemained
    finished: boolean
}

export default class Timer implements Readable<TimerStore> {
    static DEFAULT_NOTIFICATION_AUDIO = new Audio(DEFAULT_NOTIFICATION)

    private plugin: PomodoroTimerPlugin

    private logger: Logger

    private state: TimerState

    private store: Readable<TimerStore>

    private clock: any

    private update

    private unsubscribers: Unsubscriber[] = []

    public subscribe

    private rewardTimeout: number | null = null

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

        const delayMinutes = 3 + Math.random() * 3
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
            sysNotification.show()
        } else {
            new Notice(text)
        }

        if (settings.notificationSound) {
            this.playAudio()
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
            let expected: number | null = null

            const shouldAskReward =
                settings.rewardValueRecord &&
                settings.logFormat === 'POMODORO_SECTION' &&
                this.state.mode === 'WORK'

            if (shouldAskReward) {
                expected = await askRewardValue(
                    this.plugin.app,
                    'EXPECTED',
                    null,
                )
                if (expected != null) {
                    this.update((state) => {
                        state.rewardExpected = expected
                        return state
                    })
                    this.scheduleRewardReminder()
                }
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
            this.playAudio()
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
        this.update((state) => {
            if (state.elapsed > 0) {
                this.logger.log(this.createLogContext(state))
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

    public toggleTimer() {
        this.state.running ? this.pause() : this.start()
    }

    public playAudio() {
        let audio = Timer.DEFAULT_NOTIFICATION_AUDIO
        let customSound = this.plugin.getSettings().customSound
        if (customSound) {
            const soundFile =
                this.plugin.app.vault.getAbstractFileByPath(customSound)
            if (soundFile && soundFile instanceof TFile) {
                const soundSrc =
                    this.plugin.app.vault.getResourcePath(soundFile)
                audio = new Audio(soundSrc)
            }
        }
        audio.play()
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
