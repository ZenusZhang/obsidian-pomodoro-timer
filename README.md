# Pomodoro Timer for Obsidian

English | [中文](README.zh.md)

## Overview
A focused Pomodoro timer for Obsidian with structured logging, rich reminders, and task-aware workflows.

## Highlights
- Work/break timers in mm:ss with optional autostart; reset during break returns to work; status bar display available.
- Structured Pomodoro Section logging to daily/weekly/custom notes (auto-creates daily notes if missing) plus Simple/Verbose/Custom formats; integrates with Tasks/Dataview inline fields and updates actual counts.
- Reward Value Record (0–5) and Energy Level Record (0–10) at pomodoro start, with random prompts during work (Sparse 10–15 min, Medium 5–10 min, Dense 4–7 min; first reminder quicker for Medium/Dense; no prompts in the final 3 minutes). Combined prompts share one modal and always confirm on skip.
- Active Record menu (work mode) logs inner/outer interrupts with per-pomodoro timestamps.
- Audio cues: work start plays `assets/pomodorotechnique/windup.wav`; review alerts fire at +2 min and -2 min; random prompts use `review.wav` at boosted volume; break end is silent; custom sound path + system notifications supported.
- Settings guard: Reward/Energy toggles and density lock while working but are adjustable during breaks; timer length inputs are disabled mid-countdown.

## Install / Update
- From releases: download `main.js`, `manifest.json`, and `styles.css` from the latest release and copy them into your vault at `.obsidian/plugins/obsidian-pomodoro-timer/`.
- Build locally: `npm install` then `npm run build` (artifacts are emitted to the repo root).

## How to Use
- Start a pomodoro: click the timer to fill the session description; expected reward (0–5) and energy (0–10) appear when the features are enabled. Work countdown starts immediately with the start sound; breaks do not show the start modal.
- Random prompts: enable Reward Value Record and/or Energy Level Record with the `Pomodoro Section` log format. Prompts combine inputs in one modal, Enter confirms, Esc cancels, and skip actions require confirmation.
- Interrupt logging: during work, open `Active Record` to append `i_interupt`/`o_interupt` entries for each timestamp.
- Logging formats: Simple, Verbose, Custom (Templater), or Pomodoro Section. Pomodoro Section example:

```
## Pomodoro Section
🍅 1 start 09:00 [[path/to/task#^abc|⏹]] 内容: Write spec ERV: 3
- ARV: 3, 05:00; 4, 12:30
- 🔋: 7, 00:00; 6, 10:00
- i_interupt: 06:45
- o_interupt: 15:10
1 end 09:25 avg ARV: 3.50
```

- Task tracking: enable in Settings to auto-update inline fields such as `[🍅:: 3/10]` or `[🍅:: 5]` on Tasks/Dataview items when work sessions finish.

## Notifications & Audio
- Custom audio path is relative to your vault root; use the play button to test.
- System notifications are optional; reminder sounds are amplified, and reset notices show the actual elapsed mm:ss.

## Sponsor
Support the project: see the [sponsor page](SPONSOR.md) for QR codes.
