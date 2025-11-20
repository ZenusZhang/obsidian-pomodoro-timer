import { App, Modal } from 'obsidian'

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
        this.initialMinutes = options.initialMinutes
        this.titleText = options.title ?? '设置当前番茄钟的时间'
        this.descriptionText =
            options.description ??
            '请输入你希望的时间（单位：分钟，可以包含小数）。'
        this.minMinutes = options.minMinutes ?? 0
        this.onSubmit = onSubmit
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.createEl('h2', { text: this.titleText })
        contentEl.createEl('p', { text: this.descriptionText })
        this.inputEl = contentEl.createEl('input', {
            type: 'number',
            value: `${this.initialMinutes}`,
        })
        this.inputEl.step = '0.5'
        this.inputEl.min = `${this.minMinutes}`
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
        const value = Number(this.inputEl.value)
        if (Number.isNaN(value) || value < this.minMinutes) {
            this.onSubmit(null)
        } else {
            this.onSubmit(value)
        }
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

