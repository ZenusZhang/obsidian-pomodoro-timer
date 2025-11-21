<script lang="ts">
import { settings } from 'stores'

import { formatMinutesAsClock, parseClockToMillis } from 'utils'

type DurationKey = 'workLen' | 'breakLen'
type ToggleKey =
    | 'autostart'
    | 'notificationSound'
    | 'logFocused'
    | 'rewardValueRecord'
    | 'energyLevelRecord'

const updateTimerLen = (key: DurationKey, minMinutes: number) => (e: Event) => {
    const target = e.target as HTMLInputElement
    const millis = parseClockToMillis(target.value)

    settings.update((current) => {
        const currentValue = current[key]
        const minutes = millis === null ? currentValue : millis / 60000
        const nextValue = minutes >= minMinutes ? minutes : currentValue

        target.value = formatMinutesAsClock(nextValue)

        if (nextValue === currentValue) {
            return current
        }
        return { ...current, [key]: nextValue }
    })
}

const updateWorkLen = updateTimerLen('workLen', 1)
const updateBreakLen = updateTimerLen('breakLen', 0)

const updateToggle = (key: ToggleKey) => (e: Event) => {
    const target = e.target as HTMLInputElement
    const checked = target.checked
    settings.update((current) => {
        if (current[key] === checked) {
            return current
        }
        return { ...current, [key]: checked }
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
                <input
                    type="checkbox"
                    checked={$settings.autostart}
                    on:change={updateToggle('autostart')}
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Notification Sound</div>
            <div class="pomodoro-settings-control">
                <input
                    type="checkbox"
                    checked={$settings.notificationSound}
                    on:change={updateToggle('notificationSound')}
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">
                Prefer Saving to Task File
            </div>
            <div class="pomodoro-settings-control">
                <input
                    type="checkbox"
                    checked={$settings.logFocused}
                    on:change={updateToggle('logFocused')}
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Reward Value Record</div>
            <div class="pomodoro-settings-control">
                <input
                    type="checkbox"
                    checked={$settings.rewardValueRecord}
                    on:change={updateToggle('rewardValueRecord')}
                />
            </div>
        </div>
        <div class="pomodoro-settings-item">
            <div class="pomodoro-settings-label">Energy Level Record</div>
            <div class="pomodoro-settings-control">
                <input
                    type="checkbox"
                    checked={$settings.energyLevelRecord}
                    on:change={updateToggle('energyLevelRecord')}
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
