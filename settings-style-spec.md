# Obsidian 主设置页样式规范（桌面端 vs 移动端）

> 基于 SKILL `ui-patterns.md` §10-§11 全量提取，涵盖 DOM 结构、圆角、颜色、间距、字体、交互状态。

---

## 一、DOM 层级结构

```
div.vertical-tab-content                          ← 容器层 (L0)
├── div.my-plugin-settings-root                   ← 插件根容器
│   ├── nav.settings-nav                         ← 导航栏（自定义）
│   │   ├── button.setting-item-heading.nav-btn.is-active   ← 激活态按钮
│   │   └── button.setting-item-heading.nav-btn           ← 非激活态按钮
│   │
│   └── div.setting-group                        ← 分组卡片 #1 (SettingGroup)
│       ├── div.setting-item-heading             ← 卡片标题 ("通知")
│       └── div.setting-items                    ← 卡片内容区 (L1)
│           ├── div.setting-item                 ← 设置项 #1
│           │   ├── div.setting-item-info        ← 左侧: 名称 + 描述
│           │   │   ├── div.setting-item-name    ← "显示通知"
│           │   │   └── div.setting-item-description ← "控制是否弹出..."
│           │   └── div.setting-item-control     ← 右侧: 控件 (Toggle/Dropdown/Text)
│           ├── div.setting-item                 ← 设置项 #2
│           └── ...
│
└── div.setting-group                            ← 分组卡片 #2 (SettingGroup)
    ├── div.setting-item-heading                 ← 卡片标题 ("图片预览")
    └── div.setting-items
        └── ...
```

---

## 二、桌面端完整样式

### 2.1 容器层 (.vertical-tab-content)

| 属性 | 值 | 变量 |
|------|-----|------|
| background-color | 页面背景色 | `var(--background-primary)` |
| padding-inline-start/end | 48px | `var(--size-4-12)` |
| padding-top | 32px | `var(--size-4-8)` |
| padding-bottom | 64px | `var(--size-4-16)` |
| overflow-y | auto | — |

### 2.2 导航栏 (.settings-nav + .nav-btn)

```
桌面端导航栏:
┌─────────────────────────────────────────────┐
│  📁 图片本地化    🖼 图片管理               │  ← 横向排列，不换行
└─────────────────────────────────────────────┘
```

| 选择器 | 属性 | 值 |
|--------|------|-----|
| `.settings-nav` | display | flex |
| `.settings-nav` | flex-wrap | nowrap |
| `.settings-nav` | gap | `var(--size-4-2) var(--size-4-4)` = 8px 16px |
| `.settings-nav` | margin-bottom | `var(--size-4-5)` = 20px |
| **`.nav-btn`** | **border-radius** | **`var(--radius-m)` = 8px** |
| `.nav-btn` | background | transparent |
| `.nav-btn` | class 必须包含 | **`setting-item-heading`** (继承原生字体) |
| `.nav-btn.is-active` | background | `var(--background-modifier-hover)` (中性灰) |
| `.nav-btn.is-active` | border-radius | **不重复声明！继承基础选择器** |
| `.nav-btn:hover:not(.is-active)` | background | `var(--background-modifier-hover)` |

> ⚠️ 导航按钮的字体/颜色/字重/行高全部由 `setting-item-heading` 继承，不要自定义！

### 2.3 分组卡片 (.setting-group + .setting-items)

```
桌面端卡片:
╭──────────────────────────────────────╮  ← 圆角 12px，背景稍深于页面
│  通知                                │  ← 标题: 15px / 600 / text-normal
│  ──────────────────────────────────  │  ← 无边框线 (heading 底部无 border-top)
│                                      │
│  显示通知              [Toggle ON]   │  ← item: padding 16px 0
│  控制成功和状态提示...                │  ← 描述: 12px / text-muted
│                                      │
│  命令操作日志弹窗      [Toggle OFF]  │  ← item 间有 1px 分割线
│  Ribbon/命令操作完成后...            │
│                                      │
╰──────────────────────────────────────╯  ← 圆角 12px

          ↓ 24px (group + group margin-top)

╭──────────────────────────────────────╮
│  图片预览                            │
│  ──────────────────────────────────  │
│  单击预览图片          [Toggle ON]   │
│  ...                                 │
╰──────────────────────────────────────╯
```

#### SettingGroup 核心属性

| 选择器 | 属性 | 值 |
|--------|------|-----|
| `.setting-group` | display | flex; flex-direction: column; gap: 8px |
| `.setting-group + .setting-group` | margin-top | `var(--size-4-6)` = **24px** |
| **`.setting-items`** | **background-color** | **`var(--background-primary-alt)`** |
| **`.setting-items`** | **padding** | **`var(--size-4-5)` = 20px** |
| **`.setting-items`** | **border-radius** | **`var(--radius-l)` = 12px** |
| `.setting-items` | border | 0 solid (默认无边框) |

#### 标题 (.setting-item-heading)

| 属性 | 值 | 变量 |
|------|-----|------|
| color | 主要文字色 | `var(--text-normal)` ⚠️ 不是 muted! |
| font-size | 15px | `var(--font-ui-medium)` |
| font-weight | 600 | `var(--font-semibold)` |
| padding | 0 16px | `0 var(--size-4-4)` |
| margin | 0 0 16px | `0 0 var(--size-4-4)` |
| text-transform | none ⚠️ | 不是 uppercase! |
| letter-spacing | normal | — |
| background-color | transparent | — |
| border-top | none | — |

#### 设置项 (.setting-item)

| 属性 | 值 |
|------|-----|
| display | flex; align-items: center; row-gap: 12px |
| padding | 16px 0 (= `var(--size-4-4) 0`) |
| border-top | 1px solid `var(--background-modifier-border)` |
| border-radius | **0** |
| background-color | **transparent** |
| margin-bottom | **0** |

> ⚠️ 第一个 item 的 `padding-top: 0`, `border-top: none`

#### 名称与描述

| 选择器 | color | font-size |
|--------|-------|-----------|
| `.setting-item-name` | `var(--text-normal)` | `var(--font-ui-medium)` = 15px |
| `.setting-item-description` | `var(--text-muted)` | `var(--font-ui-smaller)` = 12px |
| `.setting-item-description` | — | padding-top: 4px (`var(--size-4-1)`) |

#### 控件区域 (.setting-item-control)

| 属性 | 值 |
|------|-----|
| flex | 1 1 auto |
| text-align | end |
| display | flex; justify-content: flex-end; align-items: center |
| gap | 8px (`var(--size-4-2)`) |

---

## 三、移动端完整样式

> **断点**: `@media (max-width: 768px)` 或 `(max-width: 720px)`

### 3.1 容器层差异

移动端页面底色不同:
- **亮色模式**: L0 = `--background-secondary` (#f5f5f5 浅灰)
- **暗色模式**: L0 = `--background-secondary` (深灰)

### 3.2 卡片背景 — 关键差异!

| 平台 | 模式 | 卡片背景变量 | 实际颜色 |
|------|------|-------------|---------|
| **桌面端** | 亮+暗 | `--background-primary-alt` | ~#fafafa / ~#222 |
| **移动端** | **亮色** | **`--background-primary`** | **#ffffff 纯白** |
| **移动端** | **暗色** | `--background-primary-alt` | ~#222 |

> **写法**: 在插件根容器上声明 `--setting-items-background` 变量:

```css
@media (max-width: 768px) {
  .my-settings-root {
    --setting-items-background: var(--background-primary);   /* 亮色 */
  }
  .theme-dark .my-settings-root {
    --setting-items-background: var(--background-primary-alt); /* 暗色 */
  }
}
```

### 3.3 导航栏差异

```
移动端导航栏:
┌──────────────────┬──────────────────┐
│ 📁 图片本地化   │ 🖼 图片管理     │  ← 等宽分布 (flex: 1)
└──────────────────┴──────────────────┘
```

| 属性 | 桌面端 | 移动端 |
|------|--------|--------|
| flex-wrap | nowrap | nowrap |
| justify-content | start | space-between |
| 按钮 flex | auto | **1** (等宽) |
| **按钮圆角** | **`var(--radius-m)` = 8px** | **`var(--touch-radius-xs)`** |
| 图标 | 显示 | **隐藏** (节省空间) |

### 3.4 卡片圆角差异

| 元素 | 桌面端 | 移动端 |
|------|--------|--------|
| **分组卡片 (.setting-items)** | `var(--radius-l)` = **12px** | `var(--radius-l)` = **12px** (相同) |
| **导航按钮 (.nav-btn)** | `var(--radius-m)` = **8px** | `var(--touch-radius-xs)` |
| **底部操作按钮** | `var(--radius-m)` = 8px | `var(--touch-radius-xs)` |

> ⚠️ 移动端卡片圆角由 Obsidian 原生控制。如果视觉上看起来比 12px 更大，可能是主题对 `--radius-l` 或 `--setting-items-radius` 有自定义值。

### 3.5 其他移动端差异

| 属性 | 桌面端 | 移动端 |
|------|--------|--------|
| 容器左右内边距 | 48px (`--size-4-12`) | 通常更小 (由 Obsidian 自适应) |
| 导航图标 | 显示 | 隐藏 |
| 导航按钮宽度 | 自适应内容 | flex:1 等宽 |
| 卡片间距 | 24px (`--size-4-6`) | 同左 |

---

## 四、配色速查表

### 4.1 背景色层次

```
【桌面端亮色】                     【移动端亮色】
L0: --primary (#fff)              L0: --secondary (#f5f5f5) 灰
 L1: --primary-alt (~#fafafa)      L1: --primary (#fff) 白 ← 变量覆盖
                                    ↑ 对比度充足 ✅

【桌面端暗色】                     【移动端暗色】
L0: --primary (#1a1a1a)           L0: --secondary (#2d2d2d)
 L1: --primary-alt (~#222)         L1: --primary-alt (~#222)
                                    ↑ 对比度充足 ✅
```

### 4.2 通用配色速查

| 用途 | 变量 | 绝不用 |
|------|------|--------|
| 卡片背景 | 见上表 (分平台/分亮暗) | `--secondary` / `#ffffff` 硬编码 |
| 按钮/Tab 激活态 | `--background-modifier-hover` (中性灰) | ❌ `--interactive-accent-*` (蓝色!) |
| 边框/分割线 | `--background-modifier-border` | `color-mix(... transparent)` |
| 输入框背景 | `--background-modifier-form-field` | `--background-primary` |
| 主文字 (标题/名称) | `--text-normal` | `#000`, `black` |
| 次要文字 (描述) | `--text-muted` | `--text-faint` |
| 强调文字 (链接) | `--text-accent` | `--interactive-accent` (那是背景色) |

---

## 五、CSS 变量完整速查

### 5.1 圆角变量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `--radius-s` | 4px | 小圆角 |
| `--radius-m` | **8px** | **导航按钮 (桌面端)** |
| `--radius-l` | **12px** | **分组卡片圆角** |
| `--radius-xl` | 16px | 超大圆角 |
| `--touch-radius-xs` | *(主题决定)* | **导航按钮 (移动端)** |

### 5.2 间距变量 (--size-4-*)

| 变量 | 值 | 用途 |
|------|-----|------|
| `--size-4-1` | 4px | 描述顶部间距 |
| `--size-4-2` | 8px | item 行间距、控件间隙、导航按钮 gap |
| `--size-4-3` | 12px | item row-gap |
| `--size-4-4` | 16px | item 上下内边距、标题左右内边距 |
| `--size-4-5` | **20px** | **卡片内边距** |
| `--size-4-6` | **24px** | **卡片间间距** |
| `--size-4-8` | 32px | 容器顶部间距 |
| `--size-4-12` | 48px | 容器左右内边距 |
| `--size-4-16` | 64px | 容器底部间距 |

### 5.3 字体变量

| 变量 | 值 | 用途 |
|------|-----|------|
| `--font-ui-smaller` | 12px | 设置项描述文字 |
| `--font-ui-small` | 13px | 小号 UI 文字 |
| `--font-ui-medium` | **15px** | **设置项名称 / 标题字号** |
| `--font-normal` | 400 | 正常字重 |
| `--font-semibold` | **600** | **标题 / 激活态字重** |
| `--line-height-tight` | 1.25 | 紧凑行高 |

---

## 六、反模式清单 (禁止事项)

| # | 错误做法 | 正确做法 |
|---|---------|---------|
| 1 | 卡片背景用 `--background-secondary` | 桌面/移动暗色用 `--primary-alt`；移动亮色用 `--primary` |
| 2 | 激活态用 `--interactive-accent-*` (变蓝) | 用 `--background-modifier-hover` (中性灰) |
| 3 | 硬编码任何 CSS 值 (`#fff`, `12px`, `6px`, `14px`) | 使用 CSS 变量体系 |
| 4 | 传统 `new Setting()` 平铺 | 使用 `SettingGroup` 链式调用 |
| 5 | 移动端不区分亮暗色 | 亮色 `--primary`，暗色 `--primary-alt` |
| 6 | 边框用 `color-mix(... transparent)` | 用 `--background-modifier-border` |
| 7 | 导航按钮自定义字体/颜色/字重 | 添加 `setting-item-heading` class 继承原生 |
| 8 | `.is-active` 中重复声明 `border-radius` | 只在基础选择器声明一次 |
| 9 | 直接覆盖 `.setting-items` 的 `background-color` | 通过 `--setting-items-background` 变量覆盖 |

---

## 七、特异性对抗表 (常见冲突)

| 你的选择器 | 特异性 | Obsidian 核心 | 特异性 | 谁赢？ |
|-----------|-------|--------------|-------|--------|
| `.my-class` (0-1-0) | 0-1-0 | `.vertical-tab-content h3` (0-1-1) | 0-1-1 | **核心赢** ✅ 安全 |
| `.container .my-class` (0-2-0) | 0-2-0 | `.vertical-tab-content h3` (0-1-1) | 0-1-1 | **你赢** ⚠️ 需声明全部属性 |
| `.root h3` (0-2-1) | 0-2-1 | `.vertical-tab-content h3` (0-1-1) | 0-1-1 | **你赢** ⚠️ 需声明全部属性 |
| `.root .my-class` (0-2-0) | 0-2-0 | `.setting-group .setting-item` (0-3-0) | 0-3-0 | **核心赢** ✅ 安全 |
| `.my-class` (0-1-0) | 0-1-0 | `.setting-item` (0-1-0) | 0-1-0 | **平局** → 后定义赢 ⚠️ |
| `.nav-btn.is-active` (0-2-0) | 0-2-0 | `@media .nav-btn` (0-1-0) | 0-1-0 | **你赢** ⚠️ 不要在 `.is-active` 中声明 `border-radius` |
