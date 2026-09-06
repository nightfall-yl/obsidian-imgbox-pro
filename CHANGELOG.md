# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

> 说明：本更新日志按已发布版本整理，补录了 `26.0.4` 之前的历史版本。

## [26.0.4] - 2026-09-01

### ⚠️ 废止

- 移除「删除去向」设置项（Obsidian 回收站 / 系统回收站 / 永久删除）。现删除逻辑一律改用 `app.fileManager.trashFile()`，遵循 Obsidian 用户全局删除偏好。

### 功能与改进

- 清理预览确认文案不再区分删除方式，统一提示「删除后的文件将移入回收站」。

### 工程与代码质量

- 统一删除逻辑：`clearUnusedUtils.ts`、`previewDelete.ts`、`previewUtil.ts`、`main.ts` 全部改用 `FileManager.trashFile()`。
- 清理废弃的 `deleteDestination` 配置与 UI：从 `config.ts`（接口与默认值）、`settingstab.ts`（设置项与中英文翻译键）、`eslint.config.mjs`（豁免）中移除。
- 接入并跑通本地 ESLint 审查（`eslint-plugin-obsidianmd`）：`npx eslint src/` 0 错误 / 0 警告，构建验证通过。

## [26.0.3] - 2026-09-01

### 功能与改进

- 新增「清理未使用附件」的链接检测能力（基于 `clearUnusedLinkDetector`），更准确地识别被引用附件。
- 设置页从多标签分类改为单页布局，直接渲染「自动触发」「存储与命名」「图片压缩」「图片清理」「通知」等分组，移除「图片本地化 / 图片管理」Tab 分类。
- 将原生 `confirm()` 替换为 Obsidian 原生确认弹窗。

### 工程与代码质量

- 接入 `eslint-plugin-obsidianmd`，新增 `eslint.config.mjs` 并处理相关规则告警。
- 为缺失的 `filenamify/browser` 模块补充类型声明（`filenamify-module.d.ts`），更新兼容声明。
- 设置页 UI 与样式系统重构。

## [26.0.2] - 2026-05-29

### ⚠️ 废止

- 移除「图片预览」缩放功能：点击图片放大、滚轮缩放、右键菜单、双击自适应显示及 `previewAdaptiveRatio` 自适应比例设置。

### 功能与改进

- 精简设置项，移除 `clickPreviewEnabled` 与 `previewAdaptiveRatio`。

## [26.0.1] - 2026-05-29

### 功能与改进

- MD5 实现由 `crypto-js` 替换为 `blueimp-md5`，减小打包体积。
- 移除样式中的 `!important` 改动。

### 工程与代码质量

- 固定 `async-lock`、`blueimp-md5` 等依赖为精确版本，保证构建可复现。
- 将 `package-lock.json` 纳入版本管理。
- 新增 GitHub release 发布工作流（`.github/workflows/release.yml`）。
- `manifest.json` 增加权限声明（`vault-access`、`clipboard`），并移除不支持的 `permissions` 字段。
- 清理 `LICENSE` 中的合并冲突残留。
- 更新 README。