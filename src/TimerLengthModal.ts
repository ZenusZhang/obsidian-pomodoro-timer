import { App, Modal } from 'obsidian'
import { formatMinutesAsClock, parseClockToMillis } from 'utils'

export interface TimerLengthModalOptions {
    initialMinutes: number
    title?: string
    description?: string
    minMinutes?: number
}

export class TimerLengthModal extends Modal {
    private readonly initialMinutes: number
    private readonly titleText: string
    private readonly descriptionText: string
    private readonly minMinutes: number
    private readonly onSubmit: (value: number | null) => void
    private inputEl!: HTMLInputElement

    constructor(
        app: App,
        options: TimerLengthModalOptions,
        onSubmit: (value: number | null) => void,
    ) {
        super(app)
        this.initialMinutes = Math.max(0, options.initialMinutes)
        this.titleText = options.title ?? '设置当前番茄钟的时间'
        this.descriptionText =
            options.description ??
            '请输入你希望的时间，格式 mm:ss（例如 05:00 或 25:00）。'
        this.minMinutes = options.minMinutes ?? 0
        this.onSubmit = onSubmit
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.createEl('h2', { text: this.titleText })
        contentEl.createEl('p', { text: this.descriptionText })
        this.inputEl = contentEl.createEl('input', {
            type: 'text',
            value: formatMinutesAsClock(this.initialMinutes),
        })
        this.inputEl.placeholder = 'mm:ss'
        this.inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault()
                this.submit()
            }
        })

        const buttonRow = contentEl.createDiv({ cls: 'timer-length-buttons' })
        const confirmBtn = buttonRow.createEl('button', { text: '确定' })
        confirmBtn.addEventListener('click', () => this.submit())
        const cancelBtn = buttonRow.createEl('button', { text: '取消' })
        cancelBtn.addEventListener('click', () => {
            this.onSubmit(null)
            this.close()
        })

        window.setTimeout(() => {
            this.inputEl.focus()
            this.inputEl.select()
        }, 0)
    }

    private submit() {
        const millis = parseClockToMillis(this.inputEl.value)
        if (millis === null) {
            this.onSubmit(null)
            this.close()
            return
        }
        const minutes = millis / 60000
        if (minutes < this.minMinutes) {
            this.onSubmit(null)
            this.close()
            return
        }

        this.onSubmit(minutes)
        this.close()
    }

    onClose() {
        this.contentEl.empty()
    }
}

export function askForTimerLength(
    app: App,
    options: TimerLengthModalOptions,
): Promise<number | null> {
    return new Promise((resolve) => {
        new TimerLengthModal(app, options, (value) => resolve(value)).open()
    })
}
