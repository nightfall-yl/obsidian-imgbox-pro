# ImgBox Pro

> An image management toolkit for Obsidian

`ImgBox Pro` is an Obsidian desktop plugin for managing images and attachments. It combines media localization, attachment cleanup, and preview interaction enhancements in a single plugin.

## Features Overview

- Image localization: download web images, handle pasted / dragged media, save base64 images
- Attachment organization: multiple save locations, link styles, `YYYYMMDD-HHmmss-md5-first-6` naming, deduplication
- Attachment cleanup: unused images, unused attachments, and unlinked attachments in the current note folder
- Image interaction: context menu, click-to-preview, drag-to-resize, navigator highlight
- Source-note jump: image navigator or image-tab context menu supports `Go to Source Note`
- Top-navigation settings UI: `General / Localize / Preview / Cleanup`
- Settings page language automatically follows Obsidian's system language
- Cleanup `Ribbon` shortcut
- Full command palette access

## Common Commands

Command palette entries are intentionally kept in English.

Core commands:

- `Localize attachments for the current note (plugin folder)`
- `Localize attachments for the current note (Obsidian folder)`
- `Clear Unused Images in Vault`
- `Clear Unused Attachments in Vault`

Optional commands:

- Batch commands (visibility can be controlled in settings)
  - `Localize attachments for all your notes (plugin folder)`
  - `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)`

Notes:

- `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)` is only available in "next to note" mode, and the folder pattern must end with `${notename}` and must not contain `${date}`
- the image navigator or image-tab context menu provides: `Go to Source Note`

## Ribbon

The plugin provides one left cleanup `Ribbon` action:

- Chinese UI: `清理未使用图片`
- Other UI languages: `Clear unused images`

It triggers:

- `Clear Unused Images in Vault`

## Settings

### General

- notifications
- cleanup Ribbon visibility
- automatic processing and interval
- process newly created Markdown files
- batch commands: show batch commands
- developer options (debug mode)

### Localize

- trigger: process newly created attachments
- download retry count
- unknown file download
- image compression
- compression format and quality
- minimum file size
- excluded extensions
- naming: `YYYYMMDD-HHmmss-md5-first-6`
- path: new attachment save location and media folder template
- path: link path style
- path: date format
- other: link title preservation
- advanced options: original filename tag, media-folder sync, Obsidian attachment-folder compatibility

### Preview

- click-to-preview
- preview ratio
- drag-to-resize
- resize step
- image navigator or image-tab context menu supports `Go to Source Note`

### Cleanup

- deletion target (trash / permanent delete)
- operation log modal
- excluded folder list
- exclude subfolders

## Supported Image Formats

| Format | Detect | Save | Included in unused-image cleanup | Compression output |
|---|---|---:|---:|---:|
| `jpg` / `jpeg` | Yes | Yes | Yes | No |
| `png` | Yes | Yes | Yes | Yes, can be converted to `jpeg` / `webp` |
| `gif` | Yes | Yes | Yes | No |
| `svg` | Yes | Yes | Yes | No |
| `bmp` | Yes | Yes | Yes | No |
| `webp` | Yes | Yes | Yes | Yes |
| `avif` | Yes | Yes | Yes | No |

Notes:

- `webp` and `avif` are recognized, saved, and cleaned correctly
- image compression currently mainly targets `png`

## Installation

1. Open your Obsidian vault
2. Go to `.obsidian/plugins/`
3. Copy the plugin folder into it
4. Restart Obsidian
5. Enable `ImgBox Pro` in Community Plugins

## Current Version

- plugin name: `ImgBox Pro`
- plugin id: `obsidian-imgbox-pro`
- version: `26.4.5`
- minimum Obsidian version: `1.0.3`
- desktop only: `true`

## Usage Notes

- Back up your vault before batch processing, cleanup, or large-scale link rewriting
- `Clear Unused Images in Vault` and `Clear Unused Attachments in Vault` scan the whole vault
- `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)` only targets the current note's attachment folder

## Credits

- [Sergei-Korneev/obsidian-local-images-plus](https://github.com/Sergei-Korneev/obsidian-local-images-plus)
- [elf004-star/Obsidian-AttachFlow](https://github.com/elf004-star/Obsidian-AttachFlow)
- [ozntel/oz-clear-unused-images-obsidian](https://github.com/ozntel/oz-clear-unused-images-obsidian)

## GitHub

- [nightfall-yl/obsidian-imgbox-pro](https://github.com/nightfall-yl/obsidian-imgbox-pro)

## License

Using this plugin means you accept the project license terms. See:

- `LICENSE`
