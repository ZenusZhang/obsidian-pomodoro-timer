import { App, Modal } from 'obsidian'

export type RewardValueKind = 'EXPECTED' | 'ACTUAL' | 'ENERGY'

export interface RewardValueModalOptions {
    kind: RewardValueKind
    initial?: number | null
}

/**
 * Simple modal used to ask the user for a reward value in the range [0, 5].
 */
export class RewardValueModal extends Modal {
    private readonly kind: RewardValueKind
    private readonly initial?: number | null
    private readonly onResult: (value: number | null) => void

    private value: number | null = null

    constructor(
        app: App,
        options: RewardValueModalOptions,
        onResult: (value: number | null) => void,
    ) {
        super(app)
        this.kind = options.kind
        this.initial = options.initial
        this.onResult = onResult
        this.value = options.initial ?? null
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()

        let title = ''
        if (this.kind === 'EXPECTED') {
            title = 'Expected reward value'
        } else if (this.kind === 'ACTUAL') {
            title = 'Current reward value'
        } else {
            title = 'Energy level'
        }

        contentEl.createEl('h2', { text: title })

        let description = ''
        if (this.kind === 'EXPECTED') {
            description =
                '请在 0~5 之间选择你预期的愉悦值。0~1 是非常低，2~3 是比较平静，3~4 是感受到愉悦感，4~5 是非常愉悦。'
        } else if (this.kind === 'ACTUAL') {
            description =
                '请在 0~5 之间选择你当前的愉悦值。0~1 是非常低，2~3 是比较平静，3~4 是感受到愉悦感，4~5 是非常愉悦。'
        } else {
            description = '描述你当前的电量🔋(0~10分)'
        }

        contentEl.createEl('p', { text: description })

        const inputWrapper = contentEl.createDiv({ cls: 'reward-input-wrapper' })
        const inputEl = inputWrapper.createEl('input', {
            type: 'number',
        })
        inputEl.min = '0'
        inputEl.max = this.kind === 'ENERGY' ? '10' : '5'
        inputEl.step = this.kind === 'ENERGY' ? '0.5' : '0.5'
        if (this.initial != null) {
            inputEl.value = `${this.initial}`
        }

        inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault()
                this.submit(inputEl)
            }
        })

        const buttonWrapper = contentEl.createDiv({
            cls: 'reward-button-wrapper',
        })

        const okButton = buttonWrapper.createEl('button', { text: 'OK' })
        okButton.addEventListener('click', () => {
            this.submit(inputEl)
        })

        const cancelButton = buttonWrapper.createEl('button', {
            text: 'Cancel',
        })
        cancelButton.addEventListener('click', () => {
            this.value = null
            this.close()
        })

        // Focus the input by default
        window.setTimeout(() => {
            inputEl.focus()
            inputEl.select()
        }, 0)
    }

    private submit(inputEl: HTMLInputElement) {
        const v = Number(inputEl.value)
        if (!Number.isNaN(v)) {
            const maxValue = this.kind === 'ENERGY' ? 10 : 5
            this.value = Math.max(0, Math.min(maxValue, v))
        } else {
            this.value = null
        }
        this.close()
    }

    onClose() {
        const { contentEl } = this
        contentEl.empty()
        this.onResult(this.value)
    }
}

export function askRewardValue(
    app: App,
    kind: RewardValueKind,
    initial?: number | null,
): Promise<number | null> {
    return new Promise((resolve) => {
        const modal = new RewardValueModal(
            app,
            { kind, initial: initial ?? null },
            (value) => resolve(value),
        )
        modal.open()
    })
}
