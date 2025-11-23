<script lang="ts">
import TasksComponent from 'TasksComponent.svelte'
import TimerSettingsComponent from 'TimerSettingsComponent.svelte'
import type Timer from 'Timer'
import type Tasks from 'Tasks'
import type TaskTracker from 'TaskTracker'

export let timer: Timer
export let tasks: Tasks
export let tracker: TaskTracker
export let render: (content: string, el: HTMLElement) => void

let extra: 'settings' | 'tasks' | 'close' = 'tasks'
let recordMenuOpen = false
const offset = 440

$: strokeOffset = $timer.remained.millis / $timer.count * offset

$: if (!$timer.inSession || $timer.mode !== 'WORK') {
    recordMenuOpen = false
}

const start = () => {
    if (!$timer.running) {
        timer.start()
    }
}

    const reset = () => {
        timer.reset()
        recordMenuOpen = false
    }

const configureTimerLength = () => {
    if ($timer.running) {
        return
    }
    timer.promptForTimerLength()
}

const toggleMode = () => {
    timer.toggleMode()
}

const toggleExtra = (value: 'settings' | 'tasks') => {
    recordMenuOpen = false
    if (extra === value) {
        extra = 'close'
        return
    }
    extra = value
}

const toggleRecordMenu = () => {
    if (!$timer.inSession || $timer.mode !== 'WORK') {
        return
    }
    recordMenuOpen = !recordMenuOpen
}

const recordInterrupt = (kind: 'INNER' | 'OUTER') => {
    if (!$timer.inSession || $timer.mode !== 'WORK') {
        return
    }
    timer.recordInterrupt(kind)
    recordMenuOpen = false
}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="container">
    <div class="main">
        <div class="timer">
            <div class="timer-display">
                <div
                    class="status control"
                    on:click={toggleMode}
                >
                    {#if $timer.running}<span class="breath"></span>{/if}
                    {#if $timer.mode === 'WORK'}
                        <span class="mode">Work</span>
                    {:else}
                        <span class="mode">Break</span>
                    {/if}
                    <span></span>
                </div>
                <div
                    on:click={configureTimerLength}
                    class="control"
                    class:disabled={$timer.running}
                    aria-disabled={$timer.running}
                >
                    <span class="timer-text">
                        {$timer.remained.human}
                    </span>
                </div>
            </div>
            <svg
                class="timer"
                width="160"
                height="160"
                xmlns="http://www.w3.org/2000/svg"
            >
                <g>
                    <circle
                        class="circle_timer"
                        r="69.85699"
                        cy="81"
                        cx="81"
                        stroke-width="2"
                        fill="none"
                    />
                    <circle
                        class="circle_animation"
                        r="69.85699"
                        cy="81"
                        cx="81"
                        stroke-width="8"
                        fill="none"
                        style="stroke-dashoffset: {strokeOffset}"
                    />
                </g>
            </svg>
        </div>
        <div class="btn-group">
            <span
                on:click={() => {
                    toggleExtra('tasks')
                }}
                class="control"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="lucide lucide-list-todo"
                    ><rect x="3" y="5" width="6" height="6" rx="1" /><path
                        d="m3 17 2 2 4-4"
                    /><path d="M13 6h8" /><path d="M13 12h8" /><path
                        d="M13 18h8"
                    /></svg
                >
            </span>

            {#if !$timer.running}
                <span on:click={start} class="control">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-play"
                        ><polygon points="5 3 19 12 5 21 5 3" /></svg
                    >
                </span>
            {/if}
            <span on:click={reset} class="control">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="lucide lucide-rotate-ccw"
                    ><path
                        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                    /><path d="M3 3v5h5" /></svg
                >
            </span>
            <div class="record-menu-wrapper">
                <span
                    on:click={toggleRecordMenu}
                    class="control"
                    class:disabled={
                        !$timer.inSession || $timer.mode !== 'WORK'
                    }
                    title="主动记录"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-flag"
                        ><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line
                            x1="4"
                            y1="22"
                            x2="4"
                            y2="15"
                        /></svg
                    >
                </span>
                {#if recordMenuOpen && $timer.inSession}
                    <div class="record-menu" on:click|stopPropagation>
                        <button on:click={() => recordInterrupt('INNER')}>
                            内部打扰
                        </button>
                        <button on:click={() => recordInterrupt('OUTER')}>
                            外部打扰
                        </button>
                    </div>
                {/if}
            </div>
            <span
                on:click={() => {
                    toggleExtra('settings')
                }}
                class="control"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="lucide lucide-settings-2"
                    ><path d="M20 7h-9" /><path d="M14 17H5" /><circle
                        cx="17"
                        cy="17"
                        r="3"
                    /><circle cx="7" cy="7" r="3" /></svg
                >
            </span>
        </div>
    </div>

    <div class="pomodoro-extra">
        {#if extra == 'tasks'}
            <TasksComponent {tasks} {tracker} {render} />
        {:else if extra == 'settings'}
            <TimerSettingsComponent {timer} />
        {/if}
    </div>
</div>

<style>
.container {
    width: 100%;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    height: 100%;
}
.main {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
}
.timer {
    position: relative;
    width: 160px;
    height: 160px;
}

.timer svg {
    -webkit-transform: rotate(-90deg);
    transform: rotate(-90deg);
    z-index: 3;
}

.timer-display {
    position: absolute;
    width: 100%;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    z-index: 4;
    padding: 30px;
}

.timer-text {
    display: block;
    color: var(--pomodoro-timer-text-color);
    font-size: 1.1em;
    font-weight: bold;
    margin-block-start: 1rem;
    margin-block-end: 1.75rem;
}

.status {
    font-size: 0.7rem;
    display: flex;
    align-items: center;
}
.status span {
    display: inline-block;
}
.circle_timer {
    stroke: var(--pomodoro-timer-color);
}

.circle_animation {
    stroke-dasharray: 440; /* this value is the pixel circumference of the circle */
    stroke-dashoffset: 440;
    stroke: var(--pomodoro-timer-elapsed-color);
    /* transition: all 0.2s linear; */
}

.btn-group {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    width: 100%;
}

.control {
    cursor: pointer;
}

.control.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
}

.control:hover {
    opacity: 0.7;
}

.control svg:active {
    opacity: 0.5;
}

.record-menu-wrapper {
    position: relative;
}

.record-menu {
    position: absolute;
    top: 125%;
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    z-index: 10;
}

.record-menu button {
    background: var(--interactive-accent);
    color: var(--text-on-accent, #fff);
    border: none;
    border-radius: 4px;
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
    cursor: pointer;
}

.record-menu button:hover {
    opacity: 0.85;
}

.pomodoro-extra {
    width: 100%;
    margin-top: 2rem;
}

.breath {
    width: 5px;
    height: 5px;
    margin-top: 5px;
    display: inline-block;
    position: absolute;
    left: 55px;
    background-color: var(--pomodoro-timer-dot-color);
    border-radius: 5px;
    transform: translate(-50%, -50%);
    animation: blink 1s linear infinite;
}

@keyframes blink {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0;
    }
}
</style>
