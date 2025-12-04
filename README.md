# Pomodoro Timer for Obsidian

English | [中文](#中文)

## English

### Overview
A focused Pomodoro timer for Obsidian with structured logging, rich reminders, and task-aware workflows.

### Highlights
- Work/break timers in mm:ss with optional autostart; reset during break returns to work; status bar display available.
- Structured Pomodoro Section logging to daily/weekly/custom notes (auto-creates daily notes if missing) plus Simple/Verbose/Custom formats; integrates with Tasks/Dataview inline fields and updates actual counts.
- Reward Value Record (0–5) and Energy Level Record (0–10) at pomodoro start, with random prompts during work (Sparse 10–15 min, Medium 5–10 min, Dense 4–7 min; first reminder quicker for Medium/Dense; no prompts in the final 3 minutes). Combined prompts share one modal and always confirm on skip.
- Active Record menu (work mode) logs inner/outer interrupts with per-pomodoro timestamps.
- Audio cues: work start plays `assets/pomodorotechnique/windup.wav`; review alerts fire at +2 min and -2 min; random prompts use `review.wav` at boosted volume; break end is silent; custom sound path + system notifications supported.
- Settings guard: Reward/Energy toggles and density lock while working but are adjustable during breaks; timer length inputs are disabled mid-countdown.

### Install / Update
- From releases: download `main.js`, `manifest.json`, and `styles.css` from the latest release and copy them into your vault at `.obsidian/plugins/obsidian-pomodoro-timer/`.
- Build locally: `npm install` then `npm run build` (artifacts are emitted to the repo root).

### How to Use
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

### Notifications & Audio
- Custom audio path is relative to your vault root; use the play button to test.
- System notifications are optional; reminder sounds are amplified, and reset notices show the actual elapsed mm:ss.

### Sponsor
Support the project:

![Alipay](assets/pics/qr_code_ali.png)
![WeChat](assets/pics/qr_code_wechat.png)

---

## 中文

### 概览
面向 Obsidian 的番茄钟，提供结构化日志、随机记录提醒、任务联动与丰富的提示音。

### 亮点
- 工休计时使用 mm:ss，可选自动开始；休息时重置会直接回到工作；支持状态栏显示。
- Pomodoro Section 结构化日志可写入日/周记或自定义文件（自动创建当日日记），也支持简单/详细/自定义格式；兼容 Tasks/Dataview 的行内字段并自动回写实际次数。
- 番茄开始时可填写愉悦值（0–5）与电量（0–10）；工作中按密度随机弹窗（稀疏 10–15 分，中等 5–10 分，密集 4–7 分，中/密首条更快，最后 3 分钟内不提醒），双输入同窗展示，跳过前需确认。
- 工作模式下的“主动记录”可记录内/外部打扰，逐条写入带时间戳的 i_interupt/o_interupt 行。
- 提示音：工作开始播放 `windup.wav`；开局 2 分钟与结束前 2 分钟播放 `review.wav`；随机提醒也用加大的 review 声音；休息结束静音；支持自定义声音与系统通知。
- 设置保护：工作计时时锁定愉悦值/电量及密度开关，休息时可调整；倒计时进行中不可直接改动时长输入。

### 安装 / 更新
- 从 Release 获取：下载最新发布里的 `main.js`、`manifest.json`、`styles.css`，放入库目录下 `.obsidian/plugins/obsidian-pomodoro-timer/`。
- 本地构建：运行 `npm install` 后 `npm run build`，产物在仓库根目录。

### 使用指南
- 开始番茄：点击计时器填写当次内容，开启相关功能后可录入预期愉悦值与当前电量。工作倒计时立即开始并播放起始音，休息阶段不弹出开始窗口。
- 随机提醒：在设置中启用 Reward Value Record / Energy Level Record 并选择 `Pomodoro Section` 日志格式。提示窗支持回车确认、Esc 取消，跳过前会提示确认。
- 打扰记录：工作时通过 `Active Record` 记录内部/外部打扰，时间戳会写入本次番茄的日志块。
- 日志格式：支持简单、详细、自定义（Templater）或 Pomodoro Section。Pomodoro Section 示例：

```
## Pomodoro Section
🍅 1 start 09:00 [[path/to/task#^abc|⏹]] 内容: 写设计稿 ERV: 3
- ARV: 3, 05:00; 4, 12:30
- 🔋: 7, 00:00; 6, 10:00
- i_interupt: 06:45
- o_interupt: 15:10
1 end 09:25 avg ARV: 3.50
```

- 任务追踪：在设置中开启后，工作结束会自动更新任务行内字段（如 `[🍅:: 3/10]` 或 `[🍅:: 5]`）并维护 Tasks/Dataview 兼容的 block 链接。

### 提示音与通知
- 自定义音频路径相对库根目录，点击播放按钮可测试。
- 可选系统通知；提醒音已放大，重置结束提示显示实际耗时（mm:ss）。

### 赞助
欢迎赞助支持：

![支付宝](assets/pics/qr_code_ali.png)
![微信](assets/pics/qr_code_wechat.png)
