# ImgBox Pro

> 图片管理工具

`ImgBox Pro` 是一个 Obsidian 图片与附件管理插件，支持桌面端和移动端。它把图片本地化、图片预览和图片清理交互整合到一个插件里，适合长期维护包含大量媒体资源的笔记。

## 功能概览

- 图片本地化：下载网页图片、处理粘贴 / 拖拽媒体、保存 base64 图片
- 附件整理：支持多种保存位置、链接写法、`YYYYMMDD-HHmmss-md5前6位` 命名与去重（图片与非图片附件可分别控制）
- 附件清理：清理未使用图片、未使用附件、当前笔记目录中的未关联附件
- 图片交互（桌面端）：右键菜单、单击预览、拖拽缩放、导航定位高亮
- 图片交互（移动端）：使用 Obsidian 内置图片查看器
- 图片跳转：图片导航栏或图片标签页右键菜单支持"跳转到原笔记"
- 顶部导航式设置页：`图片本地化 / 图片管理`
- 设置页语言自动跟随 Obsidian 系统界面语言
- 清理 `Ribbon` 快捷入口
- 命令面板完整入口

## 常用命令

命令面板中的命令名称统一使用英文。

核心命令：

- `Localize attachments for the current note (plugin folder)`
- `Localize attachments for the current note (Obsidian folder)`
- `Clear Unused Images in Vault`
- `Clear Unused Attachments in Vault`

可选命令：

- 批量命令（可在设置中控制显示）
  - `Localize attachments for all your notes (plugin folder)`
  - `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)`

补充说明：

- `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)` 仅在"保存在笔记旁边的指定文件夹"模式下可用，且目录模板必须以 `${notename}` 结尾
- 图片导航栏或图片标签页右键菜单支持：`跳转到原笔记`

## Ribbon

插件提供一个左侧清理 `Ribbon` 按钮：

- 中文界面：`清理未使用图片`
- 其他界面：`Clear unused images`

点击后执行：

- `Clear Unused Images in Vault`

## 设置页

### 图片本地化

自动触发：

- 自动处理开关与间隔
- 处理新建 Markdown 文件

存储命名：

- 处理所有新附件
- 新附件保存位置（跟随 Obsidian / 保存在笔记旁边 / 保存到根目录）
- 媒体文件夹路径
- 同步移动、删除或重命名媒体文件夹
- 新图片使用时间+MD5 命名
- 新附件（非图片）使用时间+MD5 命名
- 添加原始文件名或打开文件标签
- 保留链接标题
- 标签中的路径写法
- 不创建 Obsidian 附件文件夹

下载行为：

- 单个附件重试次数
- 下载未知文件类型
- 文件大小下限（KB）
- 排除扩展名

图片压缩：

- 压缩图片开关
- 压缩格式（WebP / JPEG）
- 图片质量

### 图片管理

图片预览：

- 桌面端：单击预览图片、预览比例、拖拽缩放、缩放步进
- 移动端：使用 Obsidian 内置图片查看器，无需额外配置
- 图片导航栏或图片标签页右键菜单支持"跳转到原笔记"

图片清理：

- 显示图片清理 Ribbon 图标
- 删除目标（回收站 / 彻底删除 / Obsidian 回收站 / 系统回收站）
- 显示操作日志弹窗
- 排除文件夹列表
- 清理时排除子文件夹

界面与全局：

- 显示通知
- 显示批量命令
- 调试模式

## 图片格式支持

| 格式 | 识别 | 保存 | 未使用图片清理 | 压缩输出 |
|---|---|---:|---:|---:|
| `jpg` / `jpeg` | 支持 | 支持 | 支持 | 否 |
| `png` | 支持 | 支持 | 支持 | 是，可转为 `jpeg` / `webp` |
| `gif` | 支持 | 支持 | 支持 | 否 |
| `svg` | 支持 | 支持 | 支持 | 否 |
| `bmp` | 支持 | 支持 | 支持 | 否 |
| `webp` | 支持 | 支持 | 支持 | 是 |
| `avif` | 支持 | 支持 | 支持 | 否 |
| `heic` | 支持 | 支持 | 支持 | 否 |

补充说明：

- `webp`、`avif` 与 `heic` 可以正常识别、保存与清理
- 图片压缩目前主要针对 `png`

## 安装

1. 打开 Obsidian vault
2. 进入 `.obsidian/plugins/`
3. 将插件目录放入其中
4. 重启 Obsidian
5. 在"社区插件"中启用 `ImgBox Pro`

## 当前版本

- 插件名：`ImgBox Pro`
- 中文名称：`图片管理工具`
- 插件 ID：`obsidian-imgbox-pro`
- 版本：`26.5.6`
- 最低 Obsidian 版本：`1.0.3`
- 平台支持：桌面端 + 移动端

## 使用提示

- 批量处理、批量清理、批量改写链接前，建议先备份 vault
- `Clear Unused Images in Vault` / `Clear Unused Attachments in Vault` 面向整个 vault
- `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)` 面向当前笔记附件目录

## 致谢

- [Sergei-Korneev/obsidian-local-images-plus](https://github.com/Sergei-Korneev/obsidian-local-images-plus)
- [elf004-star/Obsidian-AttachFlow](https://github.com/elf004-star/Obsidian-AttachFlow)
- [ozntel/oz-clear-unused-images-obsidian](https://github.com/ozntel/oz-clear-unused-images-obsidian)

## GitHub

- [nightfall-yl/obsidian-imgbox-pro](https://github.com/nightfall-yl/obsidian-imgbox-pro)

## 许可证

使用本插件即表示你接受项目许可证条款。许可证文件见：

- `LICENSE`
