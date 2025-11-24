import { App, Modal } from 'obsidian'

interface ConfirmModalOptions {
    message: string
    confirmText?: string
    cancelText?: string
    restoreFocusEl?: HTMLElement | null
}

class ConfirmModal extends Modal {
    private readonly message: string
    private readonly confirmText: string
    private readonly cancelText: string
    private readonly restoreFocusEl: HTMLElement | null
    private readonly onResult: (confirmed: boolean) => void
    private resolved = false
    private outsideClickHandler: ((event: Event) => void) | null = null

    constructor(app: App, options: ConfirmModalOptions, onResult: (confirmed: boolean) => void) {
        super(app)
        this.message = options.message
        this.confirmText = options.confirmText ?? '确定'
        this.cancelText = options.cancelText ?? '取消'
        this.restoreFocusEl = options.restoreFocusEl ?? null
        this.onResult = onResult
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()
        this.preventOutsideClose()

        contentEl.createEl('p', { text: this.message })

        const buttonRow = contentEl.createDiv({ cls: 'modal-button-row' })
        const confirmBtn = buttonRow.createEl('button', { text: this.confirmText })
        const cancelBtn = buttonRow.createEl('button', { text: this.cancelText })

        confirmBtn.addEventListener('click', () => this.resolve(true))
        cancelBtn.addEventListener('click', () => this.resolve(false))

        this.registerKeyboardShortcuts(confirmBtn, cancelBtn)

        window.setTimeout(() => {
            confirmBtn.focus()
        }, 0)
    }

    onClose() {
        this.removeOutsideCloseGuard()
        if (!this.resolved) {
            this.onResult(false)
        }
        this.restoreFocus()
        this.contentEl.empty()
    }

    private resolve(confirmed: boolean) {
        if (this.resolved) {
            return
        }
        this.resolved = true
        this.onResult(confirmed)
        this.close()
    }

    private registerKeyboardShortcuts(confirmBtn: HTMLButtonElement, cancelBtn: HTMLButtonElement) {
        this.scope.register([], 'Enter', (event) => {
            if (event?.isComposing || event?.shiftKey) {
                return
            }
            event?.preventDefault()
            this.resolve(true)
        })
        this.scope.register([], 'Escape', (event) => {
            event?.preventDefault()
            this.resolve(false)
        })

        confirmBtn.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                cancelBtn.focus()
            }
        })
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

    private restoreFocus() {
        if (!this.restoreFocusEl) {
            return
        }
        window.setTimeout(() => {
            try {
                this.restoreFocusEl?.focus()
            } catch (error) {
                // ignore focus errors
            }
        }, 0)
    }
}

export function confirmWithModal(
    app: App,
    message: string,
    restoreFocusEl?: HTMLElement | null,
): Promise<boolean> {
    return new Promise((resolve) => {
        new ConfirmModal(app, { message, restoreFocusEl }, (confirmed) =>
            resolve(confirmed),
        ).open()
    })
}
