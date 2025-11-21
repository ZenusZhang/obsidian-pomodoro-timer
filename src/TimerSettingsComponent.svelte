<script lang="ts">
import { settings } from 'stores'

import { formatMinutesAsClock, parseClockToMillis } from 'utils'

const updateWorkLen = (e: Event) => {
    const target = e.target as HTMLInputElement
    settings.update((s) => {
        const millis = parseClockToMillis(target.value)
        if (millis !== null) {
            const minutes = millis / 60000
            if (minutes >= 1) {
                s.workLen = minutes
            }
        }
        target.value = formatMinutesAsClock(s.workLen)
        return s
    })
}

const updateBreakLen = (e: Event) => {
    const target = e.target as HTMLInputElement
    settings.update((s) => {
        const millis = parseClockToMillis(target.value)
        if (millis !== null) {
            const minutes = millis / 60000
            if (minutes >= 0) {
                s.breakLen = minutes
            }
        }
        target.value = formatMinutesAsClock(s.breakLen)
        return s
    })
}
</script>

<div class="pomodoro-settings-wrapper">
    <div class="pomodoro-settings-list">
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Work</div>
            <div class="pomodoro-settings-control">
                <input
                    value={formatMinutesAsClock($settings.workLen)}
                    on:change={updateWorkLen}
                    inputmode="numeric"
                    placeholder="mm:ss"
                    type="text"
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Break</div>
            <div class="pomodoro-settings-control">
                <input
                    value={formatMinutesAsClock($settings.breakLen)}
                    on:change={updateBreakLen}
                    inputmode="numeric"
                    placeholder="mm:ss"
                    type="text"
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Auto-start</div>
            <div class="pomodoro-settings-control">
                <input type="checkbox" bind:checked={$settings.autostart} />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Notification Sound</div>
            <div class="pomodoro-settings-control">
                <input
                    type="checkbox"
                    bind:checked={$settings.notificationSound}
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">
                Prefer Saving to Task File
            </div>
            <div class="pomodoro-settings-control">
                <input type="checkbox" bind:checked={$settings.logFocused} />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Reward Value Record</div>
            <div class="pomodoro-settings-control">
                <input
                    type="checkbox"
                    bind:checked={$settings.rewardValueRecord}
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Energy Level Record</div>
            <div class="pomodoro-settings-control">
                <input
                    type="checkbox"
                    bind:checked={$settings.energyLevelRecord}
                />
            </div>
        </div>
    </div>
</div>

<style>
.pomodoro-settings-wrapper,
.pomodoro-settings-list,
.pomodoro-settings-item {
    width: 100%;
}

.pomodoro-settings-wrapper {
    border: 1px solid var(--background-modifier-border);
    border-radius: 5px;
}

.pomodoro-settings-item {
    display: flex;
    font-size: 0.8rem;
    align-items: center;
    justify-content: space-between;
    height: 2rem;
    padding: 0.5rem 1rem;
}

.pomodoro-settings-item + .pomodoro-settings-item {
    border-top: 1px solid var(--background-modifier-border);
}

.pomodoro-settings-item input {
    /* width: 100%; */
    font-size: 0.8rem;
    border: none;
    border-radius: 0;
    height: 0.8rem;
    text-align: end;
    background: transparent;
}

.pomodoro-settings-item input:active {
    border: none;
    box-shadow: none;
}

.pomodoro-settings-item input:focus {
    border: none;
    box-shadow: none;
}
</style>
