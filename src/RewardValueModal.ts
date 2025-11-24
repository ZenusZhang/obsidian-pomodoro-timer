import { App, Modal } from 'obsidian'

export type RewardValueKind = 'EXPECTED' | 'ACTUAL' | 'ENERGY'

export interface RewardValueModalOptions {
    kind: RewardValueKind
    initial?: number | null
}

export interface RewardAndEnergyResult {
    reward: number | null
    energy: number | null
}

/**
 * Simple modal used to ask the user for a reward value in the range [0, 5].
 */
export class RewardValueModal extends Modal {
    private readonly kind: RewardValueKind
    private readonly initial?: number | null
    private readonly onResult: (value: number | null) => void

    private value: number | null = null
    private inputEl: HTMLInputElement | null = null
    private outsideClickHandler: ((event: Event) => void) | null = null

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
        this.preventOutsideClose()

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
        this.inputEl = inputWrapper.createEl('input', {
            type: 'number',
        })
        this.inputEl.min = '0'
        this.inputEl.max = this.kind === 'ENERGY' ? '10' : '5'
        this.inputEl.step = this.kind === 'ENERGY' ? '0.5' : '0.5'
        if (this.initial != null) {
            this.inputEl.value = `${this.initial}`
        }

        const buttonWrapper = contentEl.createDiv({
            cls: 'reward-button-wrapper',
        })

        const okButton = buttonWrapper.createEl('button', { text: 'OK' })
        okButton.addEventListener('click', () => {
            if (!this.inputEl) {
                return
            }
            this.submit(this.inputEl)
        })

        const cancelButton = buttonWrapper.createEl('button', {
            text: '跳过',
        })
        cancelButton.addEventListener('click', () => this.cancel())

        this.registerKeyboardShortcuts()

        // Focus the input by default
        window.setTimeout(() => {
            this.inputEl?.focus()
            this.inputEl?.select()
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
        this.removeOutsideCloseGuard()
        contentEl.empty()
        this.onResult(this.value)
    }

    private preventOutsideClose() {
        const blockOutside = (event: Event) => {
            const target = event.target
            if (!(target instanceof HTMLElement)) {
                return
            }
            if (!this.contentEl.contains(target)) {
                event.preventDefault()
                event.stopPropagation()
                event.stopImmediatePropagation()
            }
        }
        const events: Array<keyof HTMLElementEventMap> = [
            'pointerdown',
            'mousedown',
            'touchstart',
            'click',
        ]
        for (const evt of events) {
            this.containerEl.addEventListener(evt, blockOutside, true)
        }
        this.outsideClickHandler = blockOutside
    }

    private confirmSkip(): boolean {
        const hasEmpty = (this.inputEl?.value?.trim() ?? '').length === 0
        const message = hasEmpty
            ? '仍有未填写的内容，确定要跳过吗？'
            : '确定要跳过当前提醒吗？'
        return window.confirm(message)
    }

    private registerKeyboardShortcuts() {
        this.scope.register([], 'Enter', (event) => {
            if (event?.isComposing || event?.shiftKey) {
                return
            }
            event?.preventDefault()
            if (this.inputEl) {
                this.submit(this.inputEl)
            }
        })
        this.scope.register([], 'Escape', (event) => {
            event?.preventDefault()
            this.cancel()
        })
    }

    private cancel() {
        if (!this.confirmSkip()) {
            return
        }
        this.value = null
        this.close()
    }

    private removeOutsideCloseGuard() {
        if (!this.outsideClickHandler) {
            return
        }
        const events: Array<keyof HTMLElementEventMap> = [
            'pointerdown',
            'mousedown',
            'touchstart',
            'click',
        ]
        for (const evt of events) {
            this.containerEl.removeEventListener(
                evt,
                this.outsideClickHandler,
                true,
            )
        }
        this.outsideClickHandler = null
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

class RewardAndEnergyModal extends Modal {
    private readonly initialReward: number | null
    private readonly initialEnergy: number | null
    private readonly onResult: (result: RewardAndEnergyResult | null) => void

    private rewardInput!: HTMLInputElement
    private energyInput!: HTMLInputElement
    private outsideClickHandler: ((event: Event) => void) | null = null
    private resolved = false

    constructor(
        app: App,
        initialReward: number | null,
        initialEnergy: number | null,
        onResult: (result: RewardAndEnergyResult | null) => void,
    ) {
        super(app)
        this.initialReward = initialReward
        this.initialEnergy = initialEnergy
        this.onResult = onResult
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()
        this.preventOutsideClose()

        contentEl.createEl('h2', { text: '记录愉悦值与电量' })

        const rewardSection = contentEl.createDiv({
            cls: 'pomodoro-start-section',
        })
        rewardSection.createEl('div', {
            text: '请在 0~5 之间选择你当前的愉悦值。0~1 是非常低，2~3 是比较平静，3~4 是感受到愉悦感，4~5 是非常愉悦。',
        })
        const rewardWrapper = rewardSection.createDiv({
            cls: 'reward-input-wrapper',
        })
        this.rewardInput = rewardWrapper.createEl('input', {
            type: 'number',
            placeholder: '愉悦值 0~5',
        })
        this.rewardInput.min = '0'
        this.rewardInput.max = '5'
        this.rewardInput.step = '0.5'
        if (this.initialReward != null) {
            this.rewardInput.value = `${this.initialReward}`
        }

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
            placeholder: '当前电量 0~10',
        })
        this.energyInput.min = '0'
        this.energyInput.max = '10'
        this.energyInput.step = '0.5'
        if (this.initialEnergy != null) {
            this.energyInput.value = `${this.initialEnergy}`
        }

        const buttonWrapper = contentEl.createDiv({
            cls: 'reward-button-wrapper',
        })
        const okButton = buttonWrapper.createEl('button', { text: 'OK' })
        okButton.addEventListener('click', () => this.submit())

        const cancelButton = buttonWrapper.createEl('button', {
            text: '跳过',
        })
        cancelButton.addEventListener('click', () => this.cancel())

        this.registerKeyboardShortcuts()

        window.setTimeout(() => {
            this.rewardInput.focus()
            this.rewardInput.select()
        }, 0)
    }

    onClose() {
        this.removeOutsideCloseGuard()
        this.contentEl.empty()
        if (this.resolved) {
            return
        }
        this.onResult(null)
    }

    private preventOutsideClose() {
        const blockOutside = (event: Event) => {
            const target = event.target
            if (!(target instanceof HTMLElement)) {
                return
            }
            if (!this.contentEl.contains(target)) {
                event.preventDefault()
                event.stopPropagation()
                event.stopImmediatePropagation()
            }
        }
        const events: Array<keyof HTMLElementEventMap> = [
            'pointerdown',
            'mousedown',
            'touchstart',
            'click',
        ]
        for (const evt of events) {
            this.containerEl.addEventListener(evt, blockOutside, true)
        }
        this.outsideClickHandler = blockOutside
    }

    private submit() {
        const rewardValue = this.rewardInput.value?.trim()
        const energyValue = this.energyInput.value?.trim()

        const hasEmpty =
            (rewardValue?.length ?? 0) === 0 ||
            (energyValue?.length ?? 0) === 0
        if (hasEmpty && !this.confirmSkip()) {
            return
        }

        const parsedReward = this.parseValue(rewardValue, 5)
        const parsedEnergy = this.parseValue(energyValue, 10)

        this.resolved = true
        this.onResult({
            reward: parsedReward,
            energy: parsedEnergy,
        })
        this.close()
    }

    private parseValue(value: string | undefined, max: number): number | null {
        if (!value || value.length === 0) {
            return null
        }
        const numeric = Number(value)
        if (Number.isNaN(numeric)) {
            return null
        }
        return Math.max(0, Math.min(max, numeric))
    }

    private confirmSkip(): boolean {
        const rewardValue = this.rewardInput?.value?.trim() ?? ''
        const energyValue = this.energyInput?.value?.trim() ?? ''
        const hasEmpty = rewardValue.length === 0 || energyValue.length === 0
        const message = hasEmpty
            ? '仍有未填写的内容，确定要跳过吗？'
            : '确定要跳过当前提醒吗？'
        return window.confirm(message)
    }

    private registerKeyboardShortcuts() {
        this.scope.register([], 'Enter', (event) => {
            if (event?.isComposing || event?.shiftKey) {
                return
            }
            event?.preventDefault()
            this.submit()
        })
        this.scope.register([], 'Escape', (event) => {
            event?.preventDefault()
            this.cancel()
        })
    }

    private cancel() {
        if (!this.confirmSkip()) {
            return
        }
        this.resolved = true
        this.onResult(null)
        this.close()
    }

    private removeOutsideCloseGuard() {
        if (!this.outsideClickHandler) {
            return
        }
        const events: Array<keyof HTMLElementEventMap> = [
            'pointerdown',
            'mousedown',
            'touchstart',
            'click',
        ]
        for (const evt of events) {
            this.containerEl.removeEventListener(
                evt,
                this.outsideClickHandler,
                true,
            )
        }
        this.outsideClickHandler = null
    }
}

export function askRewardAndEnergy(
    app: App,
    initialReward: number | null = null,
    initialEnergy: number | null = null,
): Promise<RewardAndEnergyResult | null> {
    return new Promise((resolve) => {
        new RewardAndEnergyModal(
            app,
            initialReward,
            initialEnergy,
            (result) => resolve(result),
        ).open()
    })
}
