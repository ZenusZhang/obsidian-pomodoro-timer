# Obsidian 番茄钟

[English](README.md) | 中文

## 概览
面向 Obsidian 的番茄钟，提供结构化日志、随机记录提醒、任务联动与丰富的提示音。

## 亮点
- 工休计时使用 mm:ss，可选自动开始；休息时重置会直接回到工作；支持状态栏显示。
- Pomodoro Section 结构化日志可写入日/周记或自定义文件（自动创建当日日记），也支持简单/详细/自定义格式；兼容 Tasks/Dataview 的行内字段并自动回写实际次数。
- 番茄开始时可填写愉悦值（0–5）与电量（0–10）；工作中按密度随机弹窗（稀疏 10–15 分，中等 5–10 分，密集 4–7 分，中/密首条更快，最后 3 分钟内不提醒），双输入同窗展示，跳过前需确认。
- 工作模式下的“主动记录”可记录内/外部打扰，逐条写入带时间戳的 i_interupt/o_interupt 行。
- 提示音：工作开始播放 `windup.wav`；开局 2 分钟与结束前 2 分钟播放 `review.wav`；随机提醒也用加大的 review 声音；休息结束静音；支持自定义声音与系统通知。
- 设置保护：工作计时时锁定愉悦值/电量及密度开关，休息时可调整；倒计时进行中不可直接改动时长输入。

## 安装 / 更新
- 从 Release 获取：下载最新发布里的 `main.js`、`manifest.json`、`styles.css`，放入库目录下 `.obsidian/plugins/obsidian-pomodoro-timer/`。
- 本地构建：运行 `npm install` 后 `npm run build`，产物在仓库根目录。

## 使用指南
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

## 提示音与通知
- 自定义音频路径相对库根目录，点击播放按钮可测试。
- 可选系统通知；提醒音已放大，重置结束提示显示实际耗时（mm:ss）。

## 赞助
欢迎赞助支持：请前往 [赞助页面](SPONSOR.md) 查看二维码。
