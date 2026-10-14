# ImgBox Pro — Code Wiki

> ImgBox Pro 是一个 Obsidian 插件，将 **图片本地化、附件重命名、附件清理** 三大能力整合到一起，适合长期维护包含大量附件的笔记库，桌面端与移动端均可用。
>
> 本 Wiki 由源码静态分析生成，覆盖项目架构、模块职责、关键类与函数、依赖关系及构建运行方式。

| 项目属性 | 值 |
| --- | --- |
| 插件 ID | `imgbox-pro` |
| 版本 | 26.0.5（`manifest.json`） |
| 最低 Obsidian 版本 | 1.11.0 |
| 语言 / 技术 | TypeScript 5 + Rollup + esbuild |
| 许可证 | MIT |
| 作者 | nightfall（[nightfall-yl](https://github.com/nightfall-yl)） |
| 上游来源 | [obsidian-local-images-plus](https://github.com/Sergei-Korneev/obsidian-local-images-plus)、[oz-clear-unused-images-obsidian](https://github.com/ozntel/oz-clear-unused-images-obsidian) |
| 源码规模 | 23 个 TS 文件，约 5,460 行 |

## 功能速览

1. **图片本地化**：下载笔记中的外链图片（`http(s)`）、Base64 图片、`file://` 本地文件，保存到库内并改写链接。
2. **附件整理**：多种保存位置（跟随 Obsidian / 笔记旁 / 指定根目录），`YYYYMMDD-HHmmss-md5前6位` 命名，MD5 去重，PNG 压缩（JPEG/WebP）。
3. **附件清理**：全库未使用图片 / 未使用附件 / 当前笔记文件夹孤立附件，支持排除文件夹。
4. **图片交互（桌面端）**：右键菜单（复制、重命名、删除文件及链接、系统打开）、文件浏览器定位高亮、跳转原笔记、拖拽调宽同步链接。

## 文档目录

| 文档 | 内容 |
| --- | --- |
| [01-项目架构总览](01-项目架构总览.md) | 分层架构、核心数据流、插件生命周期、队列与定时器机制 |
| [02-模块职责](02-模块职责.md) | 全部 23 个源码文件的职责说明与分组 |
| [03-关键类与函数](03-关键类与函数.md) | 核心类、关键函数的签名、行为与调用链说明 |
| [04-依赖关系](04-依赖关系.md) | npm 依赖、内部模块依赖图、外部 API 依赖 |
| [05-构建运行与发布](05-构建运行与发布.md) | 环境要求、构建命令、安装调试、CI 发布流程 |

## 快速上手

```bash
npm install        # 安装依赖
npm run dev        # 开发模式（Rollup watch，输出到 dist/）
npm run build      # 生产构建（dist/ + 根目录 main.js）
npm run lint       # ESLint 检查（eslint-plugin-obsidianmd）
```

手动安装到 Obsidian：将 `main.js`、`manifest.json`、`styles.css` 复制到 `<库>/.obsidian/plugins/imgbox-pro/`，重启 Obsidian 并在第三方插件中启用。
