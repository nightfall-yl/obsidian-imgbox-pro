# ImgBox Pro

> An image management toolkit for Obsidian

`ImgBox Pro` is an Obsidian plugin for managing images and attachments, supporting both desktop and mobile. It combines media localization, attachment cleanup, and preview interaction enhancements in a single plugin, suitable for long-term maintenance of notes with large numbers of attachments.

## Features Overview

- Image localization: download web images, handle pasted / dragged media, save base64 images
- Attachment organization: multiple save locations, link styles, `YYYYMMDD-HHmmss-md5-first-6` naming, deduplication (images and non-image attachments can be controlled separately)
- Attachment cleanup: unused images, unused attachments, and unlinked attachments in the current note folder
- Image interaction (desktop): context menu, click-to-preview, navigator highlight
- Image interaction (mobile): uses the built-in Obsidian image viewer
- Source-note jump: image navigator or image-tab context menu supports `Go to Source Note`
- Top-navigation settings UI: `Localize / Image Management`
- Settings page language automatically follows Obsidian's system language
- Cleanup `Ribbon` shortcut
- Full command palette access

## Common Commands

Command palette entries automatically follow Obsidian's display language.

Core commands:

- `Localize attachments for the current note (custom location)`
- `Localize attachments for the current note (Obsidian location)`
- `Localize attachments for all your notes (custom location)`
- `Clear Unused Images in Vault`
- `Clear Unused Attachments in Vault`
- `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)`

Notes:

- `Clear Unlinked Attachments in Current Note Folder (Next to Note mode)` is only available in "next to note" mode, and the folder pattern must end with `${notename}`

## Ribbon

The plugin provides one left cleanup `Ribbon` action:

- Chinese UI: `清理未使用图片`
- Other UI languages: `Clear unused images`

It triggers:

- `Clear Unused Images in Vault`

## Settings

### Localize

Auto Trigger:

- automatic processing switch and interval
- process newly created Markdown files

Storage & Naming:

- process all new attachments
- save location (follow Obsidian / next to note / root directory)
- media folder path
- move, delete, or rename media folder together
- use time + MD5 names for new images
- use time + MD5 names for new non-image attachments
- add original filename or open-file tag
- preserve link captions
- path format in tags
- do not create Obsidian attachment folder

Download Behavior:

- retry count per attachment
- download unknown file types
- file size lower limit (KB)
- excluded extensions

Image Compression:

- compress images toggle
- compression format (WebP / JPEG)
- image quality

### Image Management

Notifications:

- show notifications
- command operation log modal

Image Preview:

- Desktop: click-to-preview, preview ratio
- Mobile: uses the built-in Obsidian image viewer. No configuration needed.
- Image navigator or image-tab context menu supports `Go to Source Note`

Image Cleanup:

- show cleanup Ribbon icon
- delete destination (Obsidian Trash / System Trash / Delete permanently)
- excluded folder list
- exclude subfolders during cleanup

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
| `heic` | Yes | Yes | Yes | No |

Notes:

- `webp`, `avif`, and `heic` are recognized, saved, and cleaned correctly
- image compression currently mainly targets `png`

## Installation

1. Open your Obsidian vault
2. Go to `.obsidian/plugins/`
3. Copy the plugin folder into it
4. Restart Obsidian
5. Enable `ImgBox Pro` in Community Plugins

## Current Version

- plugin name: `ImgBox Pro`
- Chinese name: `图片管理工具`
- plugin id: `obsidian-imgbox-pro`
- version: `1.0.0`
- minimum Obsidian version: `1.11.0`
- platform support: desktop + mobile

## Usage Notes

- Back up your vault before batch processing, batch cleanup, or large-scale link rewriting
- `Clear Unused Images in Vault` / `Clear Unused Attachments in Vault` scan the whole vault
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
