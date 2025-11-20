import { App, Modal } from 'obsidian'

export interface PomodoroStartModalResult {
    description: string
    expectedReward: number | null
    initialEnergyLevel: number | null
}

export interface PomodoroStartModalOptions {
    includeRewardInput: boolean
    includeEnergyInput: boolean
    initialDescription?: string
    initialExpectedReward?: number | null
    initialEnergyLevel?: number | null
}

class PomodoroStartModal extends Modal {
    private readonly includeRewardInput: boolean
    private readonly includeEnergyInput: boolean
    private readonly initialDescription: string
    private readonly initialExpectedReward: number | null
    private readonly initialEnergyLevel: number | null
    private readonly onSubmit: (result: PomodoroStartModalResult) => void

    private descriptionInput!: HTMLTextAreaElement
    private rewardInput: HTMLInputElement | null = null
    private energyInput: HTMLInputElement | null = null
    private resolved = false

    constructor(
        app: App,
        options: PomodoroStartModalOptions,
        onSubmit: (result: PomodoroStartModalResult) => void,
    ) {
        super(app)
        this.includeRewardInput = options.includeRewardInput
        this.includeEnergyInput = options.includeEnergyInput
        this.initialDescription = options.initialDescription ?? ''
        this.initialExpectedReward = options.initialExpectedReward ?? null
        this.initialEnergyLevel = options.initialEnergyLevel ?? null
        this.onSubmit = onSubmit
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()

        contentEl.createEl('h2', { text: '设置当前番茄' })

        const descriptionSection = contentEl.createDiv({
            cls: 'pomodoro-start-section',
        })
        descriptionSection.createEl('div', {
            text: '请输入你这个番茄的内容',
        })
        this.descriptionInput = descriptionSection.createEl('textarea', {
            placeholder: '例如：review PR #123 或 编写设计稿',
        })
        this.descriptionInput.rows = 3
        this.descriptionInput.value = this.initialDescription

        if (this.includeRewardInput) {
            const rewardSection = contentEl.createDiv({
                cls: 'pomodoro-start-section',
            })
            rewardSection.createEl('div', {
                text: '请在 0~5 之间选择你预期的愉悦值。0~1 是非常低，2~3 是比较平静，3~4 是感受到愉悦感，4~5 是非常愉悦。',
            })
            const rewardInputWrapper = rewardSection.createDiv({
                cls: 'reward-input-wrapper',
            })
            this.rewardInput = rewardInputWrapper.createEl('input', {
                type: 'number',
            })
            this.rewardInput.min = '0'
            this.rewardInput.max = '5'
            this.rewardInput.step = '0.1'
            if (this.initialExpectedReward != null) {
                this.rewardInput.value = `${this.initialExpectedReward}`
            }
        }

        if (this.includeEnergyInput) {
            const energySection = contentEl.createDiv({
                cls: 'pomodoro-start-section',
            })
            energySection.createEl('div', {
                text: '描述你当前的电量🔋(0~10分)',
            })
            const energyWrapper = energySection.createDiv({
                cls: 'reward-input-wrapper',
            })
            this.energyInput = energyWrapper.createEl('input', {
                type: 'number',
            })
            this.energyInput.min = '0'
            this.energyInput.max = '10'
            this.energyInput.step = '0.5'
            if (this.initialEnergyLevel != null) {
                this.energyInput.value = `${this.initialEnergyLevel}`
            }
        }

        const buttonRow = contentEl.createDiv({
            cls: 'pomodoro-start-buttons',
        })

        const confirmButton = buttonRow.createEl('button', { text: '开始' })
        confirmButton.addEventListener('click', () => this.submit())

        const skipButton = buttonRow.createEl('button', { text: '跳过' })
        skipButton.addEventListener('click', () => {
            if (!this.confirmSkipIfIncomplete()) {
                return
            }
            this.descriptionInput.value = ''
            if (this.rewardInput) {
                this.rewardInput.value = ''
            }
            if (this.energyInput) {
                this.energyInput.value = ''
            }
            this.submit()
        })

        window.setTimeout(() => {
            this.descriptionInput.focus()
            this.descriptionInput.select()
        }, 0)
    }

    private submit() {
        const description = this.descriptionInput.value?.trim() ?? ''
        const rewardValue =
            this.rewardInput && this.rewardInput.value.length > 0
                ? Number(this.rewardInput.value)
                : null
        const sanitizedReward =
            rewardValue != null && !Number.isNaN(rewardValue)
                ? Math.max(0, Math.min(5, rewardValue))
                : null
        const energyValue =
            this.energyInput && this.energyInput.value.length > 0
                ? Number(this.energyInput.value)
                : null
        const sanitizedEnergy =
            energyValue != null && !Number.isNaN(energyValue)
                ? Math.max(0, Math.min(10, energyValue))
                : null

        this.resolved = true
        this.onSubmit({
            description,
            expectedReward: this.includeRewardInput
                ? sanitizedReward
                : null,
            initialEnergyLevel: this.includeEnergyInput
                ? sanitizedEnergy
                : null,
        })
        this.close()
    }

    onClose() {
        this.contentEl.empty()
        if (!this.resolved) {
            this.onSubmit({
                description: '',
                expectedReward: null,
                initialEnergyLevel: null,
            })
        }
    }

    private confirmSkipIfIncomplete(): boolean {
        const fields: string[] = []
        fields.push(this.descriptionInput.value?.trim() ?? '')
        if (this.includeRewardInput) {
            fields.push(this.rewardInput?.value?.trim() ?? '')
        }
        if (this.includeEnergyInput) {
            fields.push(this.energyInput?.value?.trim() ?? '')
        }
        const hasEmpty = fields.some((value) => value.length === 0)
        if (!hasEmpty) {
            return true
        }
        return window.confirm('仍有未填写的内容，确定要跳过吗？')
    }
}

export function askPomodoroStartInfo(
    app: App,
    options: PomodoroStartModalOptions,
): Promise<PomodoroStartModalResult> {
    return new Promise((resolve) => {
        new PomodoroStartModal(app, options, (result) => resolve(result)).open()
    })
}
