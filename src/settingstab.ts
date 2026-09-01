import {
  App,
  PluginSettingTab,
  Setting,
  SettingGroup,
} from "obsidian";

import { displayError, logError, trimAny } from "./utils";

import { APP_NAME } from "./config";

import LocalImagesPlugin from "./main";

/** Detect Obsidian's display language */
function getObsidianLang(): "zh-CN" | "en" {
  const lang = document.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("zh") ? "zh-CN" : "en";
}

const LOCALE_TEXT: Record<string, Record<string, string>> = {
  "zh-CN": {
    subgroupAutoTriggerTitle: "自动触发",
    subgroupGlobalTitle: "通知",
    subgroupCleanupTitle: "图片清理",
    showNotifications: "显示通知",
    showNotificationsDesc: "控制成功和状态提示是否弹出；错误提示仍会显示。",
    showCleanupRibbon: "显示图片清理 Ribbon 图标",
    showCleanupRibbonDesc:
      "在左侧功能区显示图片清理快捷按钮。它是\u201cClear Unused Images in Vault\u201d的快捷入口，按钮文案会跟随 Obsidian 显示语言切换。",
    autoProcess: "自动处理",
    autoProcessDesc: "在新建、复制和粘贴时自动处理笔记。",
    autoProcessInterval: "自动处理间隔",
    autoProcessIntervalDesc: "自动处理的时间间隔，单位为秒。",
    autoProcessIntervalInvalid: "请输入 3 到 3600 之间的正整数！",
    processNewMarkdown: "处理所有新建 Markdown 文件",
    processNewMarkdownDesc: "处理新建或同步得到的 Markdown 类文件。",
    processNewAttachments: "处理所有新附件",
    processNewAttachmentsDesc: "将所有新附件从 Obsidian 默认附件目录移动到插件管理的位置。",
    useTimestampNaming: "新图片使用时间+MD5命名",
    useTimestampNamingDesc:
      "对新粘贴或拖入的图片使用 YYYYMMDD-HHmmss-md5前6位 命名，同时保留去重能力。",
    useTimestampNamingForAttachments: "新附件使用时间+MD5命名",
    useTimestampNamingForAttachmentsDesc:
      "对新粘贴或拖入的非图片附件使用 YYYYMMDD-HHmmss-md5前6位 命名，同时保留去重能力。",
    subgroupDownloadTitle: "下载行为",
    subgroupCompressionTitle: "图片压缩",
    subgroupNamingTitle: "命名与链接",
    subgroupStorageNamingTitle: "存储命名",
    downloadRetryCount: "单个附件重试次数",
    downloadRetryCountDesc: "下载附件失败时的重试次数。",
    downloadRetryCountInvalid: "请输入 1 到 6 之间的正整数！",
    downloadUnknownTypes: "下载未知文件类型",
    downloadUnknownTypesDesc: "下载未知文件类型，并以 `.unknown` 扩展名保存。",
    compressImage: "压缩图片",
    compressImageDesc: "压缩下载和粘贴得到的图片。可以减小体积，但也可能影响性能。",
    compressionFormat: "压缩格式",
    compressionFormatDesc: "选择图片压缩后的输出格式。",
    compressionQuality: "图片质量",
    compressionQualityDesc: "图片质量范围为 10 到 100。",
    compressionQualityInvalid: "请输入 10 到 100 之间的正整数！",
    minFileSizeKB: "文件大小下限（KB）",
    minFileSizeKBDesc: "不下载小于该大小的文件。设为 0 表示不限制。",
    positiveIntegerInvalid: "请输入正整数！",
    excludedExtensions: "排除扩展名",
    excludedExtensionsDesc: "插件不会下载这些扩展名的附件。",
    preserveCaptions: "保留链接标题",
    preserveCaptionsDesc: "在转换后的标签中保留媒体链接标题。",
    appendOriginalName: "添加原始文件名或打开文件标签",
    appendOriginalNameDesc: "对本地文件或拖入文件，在替换后的标签后追加原始文件名。",
    linkPathFormat: "标签中的路径写法",
    linkPathFormatDesc: "选择写入完整路径、相对路径，或仅写文件名。",
    fullPath: "完整路径",
    relativePath: "相对于笔记",
    filenameOnly: "仅文件名",
    unsafeFolderName: "文件夹名称不安全！某些字符在部分文件系统中不可用。",
    attachmentSaveLocation: "新附件保存位置",
    attachmentSaveLocationDesc:
      "选择所有新附件的保存位置。可使用 `_resources/${notename}` 这类模板。",
    followObsidian: "跟随 Obsidian 设置",
    saveToRoot: "保存到下方指定的根目录",
    saveNextToNote: "保存在笔记旁边的指定文件夹",
    syncMediaFolder: "同步移动、删除或重命名媒体文件夹",
    syncMediaFolderDesc: "当关联笔记发生变化时，同时移动或重命名媒体文件夹。请谨慎使用。",
    mediaFolderPath: "媒体文件夹",
    mediaFolderPathDesc: "用于存放下载媒体文件的文件夹。",
    localizeAdvancedTitle: "高级选项",
    skipObsidianFolderCreation: "不创建 Obsidian 附件文件夹",
    skipObsidianFolderCreationDesc: "用于兼容其他插件，但可能导致部分工作流行为异常。",
    showOperationLogs: "命令操作日志弹窗",
    showOperationLogsDesc: "Ribbon/命令操作完成后，弹出包含操作详情的日志窗口。",
    excludeSubfolders: "清理时排除子文件夹",
    excludeSubfoldersDesc:
      "启用后，被排除的文件夹及其所有子文件夹在\u201c图片清理\u201d时都会被跳过。",
    excludedFolders: "排除文件夹",
    excludedFoldersDesc: "这些文件夹中的文件不会被自动处理，\u201c图片清理\u201d也会跳过它们。",
    excludedFoldersPlaceholder: "每行输入一个完整路径，例如 RootFolder/Subfolder",
  },
  en: {
    subgroupAutoTriggerTitle: "Auto Trigger",
    subgroupGlobalTitle: "Notifications",
    subgroupCleanupTitle: "Image Cleanup",
    showNotifications: "Show notifications",
    showNotificationsDesc: "Control whether success and status toasts appear. Errors will still show.",
    showCleanupRibbon: "Show cleanup Ribbon icon",
    showCleanupRibbonDesc:
      'Show the cleanup shortcut in the left Ribbon. It is a shortcut for "Clear Unused Images in Vault", and its label follows Obsidian\'s display language.',
    autoProcess: "Automatic processing",
    autoProcessDesc: "Automatically process notes on create, copy, and paste.",
    autoProcessInterval: "Automatic processing interval",
    autoProcessIntervalDesc: "The interval for automatic processing, in seconds.",
    autoProcessIntervalInvalid: "Please enter an integer between 3 and 3600.",
    processNewMarkdown: "Process all new Markdown files",
    processNewMarkdownDesc: "Process newly created or synced Markdown-like files.",
    processNewAttachments: "Process all new attachments",
    processNewAttachmentsDesc:
      "Move new attachments from the default Obsidian attachment folder into the plugin-managed location.",
    useTimestampNaming: "Use time + MD5 names for new images",
    useTimestampNamingDesc:
      "Rename newly pasted or dropped images as YYYYMMDD-HHmmss-md5-first-6 while keeping deduplication.",
    useTimestampNamingForAttachments: "Use time + MD5 names for new attachments",
    useTimestampNamingForAttachmentsDesc:
      "Rename newly pasted or dropped non-image attachments as YYYYMMDD-HHmmss-md5-first-6 while keeping deduplication.",
    subgroupDownloadTitle: "Download Behavior",
    subgroupCompressionTitle: "Image Compression",
    subgroupNamingTitle: "Naming & Links",
    subgroupStorageNamingTitle: "Storage & Naming",
    downloadRetryCount: "Retry count per attachment",
    downloadRetryCountDesc: "How many times to retry when attachment downloads fail.",
    downloadRetryCountInvalid: "Please enter an integer between 1 and 6.",
    downloadUnknownTypes: "Download unknown file types",
    downloadUnknownTypesDesc:
      "Download unknown types and save them with the `.unknown` extension.",
    compressImage: "Compress images",
    compressImageDesc:
      "Compress downloaded and pasted images. This can reduce file size but may affect performance.",
    compressionFormat: "Compression format",
    compressionFormatDesc: "Choose the output format for image compression.",
    compressionQuality: "Image quality",
    compressionQualityDesc: "Image quality from 10 to 100.",
    compressionQualityInvalid: "Please enter an integer between 10 and 100.",
    minFileSizeKB: "File size lower limit (KB)",
    minFileSizeKBDesc: "Do not download files smaller than this value. Set 0 to disable the limit.",
    positiveIntegerInvalid: "Please enter a positive integer.",
    excludedExtensions: "Excluded extensions",
    excludedExtensionsDesc: "The plugin will not download attachments with these extensions.",
    preserveCaptions: "Preserve link captions",
    preserveCaptionsDesc: "Preserve media link captions in converted tags.",
    appendOriginalName: "Add original filename or open-file tag",
    appendOriginalNameDesc:
      "Append the original filename after the replaced tag for local or dropped files.",
    linkPathFormat: "Path format in tags",
    linkPathFormatDesc: "Choose whether to write full paths, relative paths, or filenames only.",
    fullPath: "Full path",
    relativePath: "Relative to note",
    filenameOnly: "Filename only",
    unsafeFolderName:
      "Unsafe folder name. Some characters are not supported on certain file systems.",
    attachmentSaveLocation: "Save location for new attachments",
    attachmentSaveLocationDesc:
      "Choose where new attachments are stored. Templates like `_resources/${notename}` are supported.",
    followObsidian: "Follow Obsidian settings",
    saveToRoot: "Save to the root folder specified below",
    saveNextToNote: "Save in the specified folder next to the note",
    syncMediaFolder: "Move, delete, or rename media folder together",
    syncMediaFolderDesc:
      "When the related note changes, also move or rename the media folder. Use with caution.",
    mediaFolderPath: "Media folder",
    mediaFolderPathDesc: "Folder used to store downloaded media files.",
    localizeAdvancedTitle: "Advanced options",
    skipObsidianFolderCreation: "Do not create Obsidian attachment folder",
    skipObsidianFolderCreationDesc:
      "Improves compatibility with other plugins, but may affect some workflows.",
    showOperationLogs: "Command operation log modal",
    showOperationLogsDesc: "After Ribbon/command operations complete, show a log modal with operation details.",
    excludeSubfolders: "Exclude subfolders during cleanup",
    excludeSubfoldersDesc:
      "When enabled, excluded folders and all their subfolders are skipped during image cleanup.",
    excludedFolders: "Excluded folders",
    excludedFoldersDesc:
      "Files inside these folders will not be processed automatically, and image cleanup will skip them too.",
    excludedFoldersPlaceholder: "Enter one full path per line, for example RootFolder/Subfolder",
  },
};

export default class SettingTab extends PluginSettingTab {
  plugin: LocalImagesPlugin;

  constructor(app: App, plugin: LocalImagesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private applyCompressionEnabled(
    formatSetting: Setting,
    qualitySetting: Setting,
    enabled: boolean
  ): void {
    formatSetting.setDisabled(!enabled);
    qualitySetting.setDisabled(!enabled);
    formatSetting.settingEl.toggleClass("is-disabled", !enabled);
    qualitySetting.settingEl.toggleClass("is-disabled", !enabled);
  }

  private addSetting(
    group: SettingGroup | HTMLElement,
    configure: (setting: Setting) => void
  ): void {
    if (group instanceof SettingGroup) {
      group.addSetting(configure);
      return;
    }

    configure(new Setting(group));
  }

  private createSetting(group: SettingGroup | HTMLElement): Setting {
    if (!(group instanceof SettingGroup)) {
      return new Setting(group);
    }

    let createdSetting: Setting | undefined;
    group.addSetting((setting) => {
      createdSetting = setting;
    });

    if (createdSetting === undefined) {
      throw new Error("Failed to create setting inside SettingGroup.");
    }

    return createdSetting;
  }

  private addNumberSetting(
    group: SettingGroup | HTMLElement,
    options: {
      name: string;
      desc: string;
      value: number;
      min?: number;
      max?: number;
      integer?: boolean;
      emptyAs?: number | null;
      onValidChange: (value: number) => Promise<void>;
      invalidMessage: string;
    }
  ): Setting {
    const setting = this.createSetting(group);
    setting
      .setName(options.name)
      .setDesc(options.desc)
      .addText((text) =>
        text.setValue(String(options.value)).onChange(async (value: string) => {
          const trimmed = value.trim();
          if (trimmed === "" && options.emptyAs !== undefined) {
            await options.onValidChange(options.emptyAs ?? 0);
            return;
          }

          const numberValue = Number(trimmed);
          const isInteger = options.integer ?? true;
          const min = options.min ?? Number.NEGATIVE_INFINITY;
          const max = options.max ?? Number.POSITIVE_INFINITY;

          if (
            Number.isNaN(numberValue) ||
            (isInteger && !Number.isInteger(numberValue)) ||
            numberValue < min ||
            numberValue > max
          ) {
            displayError(options.invalidMessage);
            return;
          }

          await options.onValidChange(numberValue);
        })
      );

    return setting;
  }

  private createSettingGroup(containerEl: HTMLElement, heading: string): SettingGroup {
    return new SettingGroup(containerEl).setHeading(heading);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("lip-settings-root");
    const lang = getObsidianLang();
    const t = (key: string) => LOCALE_TEXT[lang][key] ?? key;

    new Setting(containerEl).setName(APP_NAME).setHeading();
    const contentEl = containerEl.createDiv({ cls: "lip-settings-content" });
    // ===================== 图片本地化 =====================
    const localizeEl = contentEl;

    const updateAutoProcessSettings = () => {
      const shouldDisable = !this.plugin.settings.autoProcess;
      autoProcessIntervalSetting.setDisabled(shouldDisable);
      processNewMarkdownSetting.setDisabled(shouldDisable);
      processNewAttachmentsSetting.setDisabled(shouldDisable);
    };

    const updateAttachmentFolderSettings = () => {
      const shouldHide =
        this.plugin.settings.attachmentSaveLocation === "obsFolder" ||
        this.plugin.settings.attachmentSaveLocation === "nextToNoteS";
      localizeEl
        .querySelectorAll<HTMLElement>('[data-lip-conditional="attachment-folder"]')
        .forEach((el) => el.toggleClass("lip-conditional-hidden", shouldHide));
    };

    // ── 自动触发 ──
    const triggerGroupEl = this.createSettingGroup(localizeEl, t("subgroupAutoTriggerTitle"));

    this.createSetting(triggerGroupEl)
      .setName(t("autoProcess"))
      .setDesc(t("autoProcessDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoProcess).onChange(async (value) => {
          this.plugin.settings.autoProcess = value;
          await this.plugin.saveSettings();
          this.plugin.setupQueueInterval();
          updateAutoProcessSettings();
        })
      );

    const autoProcessIntervalSetting = this.addNumberSetting(triggerGroupEl, {
      name: t("autoProcessInterval"),
      desc: t("autoProcessIntervalDesc"),
      value: this.plugin.settings.autoProcessInterval,
      min: 3,
      max: 3600,
      integer: true,
      onValidChange: async (value) => {
        this.plugin.settings.autoProcessInterval = value;
        await this.plugin.saveSettings();
        this.plugin.setupQueueInterval();
      },
      invalidMessage: t("autoProcessIntervalInvalid"),
    });

    const processNewMarkdownSetting = this.createSetting(triggerGroupEl)
      .setName(t("processNewMarkdown"))
      .setDesc(t("processNewMarkdownDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.processNewMarkdown).onChange(async (value) => {
          this.plugin.settings.processNewMarkdown = value;
          await this.plugin.saveSettings();
        })
      );

    // ── 存储命名 ──
    const storageNamingGroupEl = this.createSettingGroup(localizeEl, t("subgroupStorageNamingTitle"));

    const processNewAttachmentsSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("processNewAttachments"))
      .setDesc(t("processNewAttachmentsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.processNewAttachments).onChange(async (value) => {
          this.plugin.settings.processNewAttachments = value;
          await this.plugin.saveSettings();
        })
      );

    this.createSetting(storageNamingGroupEl)
      .setName(t("attachmentSaveLocation"))
      .setDesc(t("attachmentSaveLocationDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("obsFolder", t("followObsidian"))
          .addOption("nextToNoteS", t("saveNextToNote"))
          .addOption("inFolderBelow", t("saveToRoot"))
          .setValue(this.plugin.settings.attachmentSaveLocation)
          .onChange(async (value) => {
            this.plugin.settings.attachmentSaveLocation = value;
            await this.plugin.saveSettings();
            updateAttachmentFolderSettings();
            
          })
      );

    const mediaFolderPathSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("mediaFolderPath"))
      .setDesc(t("mediaFolderPathDesc"))
      .setClass("media_folder_set")
      .addText((text) =>
        text.setValue(this.plugin.settings.mediaFolderPath).onChange(async (value) => {
          if (value.match(/(\)|\(|"|'|#|\]|\[|: |>|<|\*|\|)/g) !== null) {
            displayError(t("unsafeFolderName"));
            return;
          }
          this.plugin.settings.mediaFolderPath = value;
          await this.plugin.saveSettings();
          
        })
      );
    mediaFolderPathSetting.settingEl.dataset.lipConditional = "attachment-folder";

    const syncMediaFolderSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("syncMediaFolder"))
      .setDesc(t("syncMediaFolderDesc"))
      .setClass("media_folder_set")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncMediaFolder).onChange(async (value) => {
          this.plugin.settings.syncMediaFolder = value;
          await this.plugin.saveSettings();
          
        })
      );
    syncMediaFolderSetting.settingEl.dataset.lipConditional = "attachment-folder";

    this.createSetting(storageNamingGroupEl)
      .setName(t("useTimestampNaming"))
      .setDesc(t("useTimestampNamingDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useTimestampNaming).onChange(async (value) => {
          this.plugin.settings.useTimestampNaming = value;
          await this.plugin.saveSettings();
          
        })
      );

    this.createSetting(storageNamingGroupEl)
      .setName(t("useTimestampNamingForAttachments"))
      .setDesc(t("useTimestampNamingForAttachmentsDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useTimestampNamingForAttachments)
          .onChange(async (value) => {
            this.plugin.settings.useTimestampNamingForAttachments = value;
            await this.plugin.saveSettings();
            
          })
      );

    this.createSetting(storageNamingGroupEl)
      .setName(t("appendOriginalName"))
      .setDesc(t("appendOriginalNameDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.appendOriginalName).onChange(async (value) => {
          this.plugin.settings.appendOriginalName = value;
          await this.plugin.saveSettings();
          
        })
      );

    this.createSetting(storageNamingGroupEl)
      .setName(t("preserveCaptions"))
      .setDesc(t("preserveCaptionsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.preserveCaptions).onChange(async (value) => {
          this.plugin.settings.preserveCaptions = value;
          await this.plugin.saveSettings();
          
        })
      );

    this.createSetting(storageNamingGroupEl)
      .setName(t("linkPathFormat"))
      .setDesc(t("linkPathFormatDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("baseFileName", t("filenameOnly"))
          .addOption("onlyRelative", t("relativePath"))
          .addOption("fullDirPath", t("fullPath"))
          .setValue(this.plugin.settings.linkPathFormat)
          .onChange(async (value) => {
            this.plugin.settings.linkPathFormat = value;
            await this.plugin.saveSettings();
            
          })
      );

    this.createSetting(storageNamingGroupEl)
      .setName(t("skipObsidianFolderCreation"))
      .setDesc(t("skipObsidianFolderCreationDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.skipObsidianFolderCreation).onChange(async (value) => {
          this.plugin.settings.skipObsidianFolderCreation = value;
          await this.plugin.saveSettings();
          
        })
      );

    // ── 下载行为 ──
    const downloadGroupEl = this.createSettingGroup(localizeEl, t("subgroupDownloadTitle"));

    this.createSetting(downloadGroupEl)
      .setName(t("downloadRetryCount"))
      .setDesc(t("downloadRetryCountDesc"))
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.downloadRetryCount))
          .onChange(async (value: string) => {
            const num = Number(value.trim());
            if (!Number.isInteger(num) || num < 1 || num > 6) {
              displayError(t("downloadRetryCountInvalid"));
              return;
            }
            this.plugin.settings.downloadRetryCount = num;
            await this.plugin.saveSettings();
          })
      );

    this.createSetting(downloadGroupEl)
      .setName(t("downloadUnknownTypes"))
      .setDesc(t("downloadUnknownTypesDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.downloadUnknownTypes).onChange(async (value) => {
          this.plugin.settings.downloadUnknownTypes = value;
          await this.plugin.saveSettings();
        })
      );

    this.createSetting(downloadGroupEl)
      .setName(t("minFileSizeKB"))
      .setDesc(t("minFileSizeKBDesc"))
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.minFileSizeKB))
          .onChange(async (value: string) => {
            const num = Number(value.trim());
            if (!Number.isInteger(num) || num < 0) {
              displayError(t("positiveIntegerInvalid"));
              return;
            }
            this.plugin.settings.minFileSizeKB = num;
            await this.plugin.saveSettings();
          })
      );

    this.createSetting(downloadGroupEl)
      .setName(t("excludedExtensions"))
      .setDesc(t("excludedExtensionsDesc"))
      .addText((text) =>
        text.setValue(this.plugin.settings.excludedExtensions).onChange(async (value) => {
          this.plugin.settings.excludedExtensions = value;
          await this.plugin.saveSettings();
        })
      );

    // ── 图片压缩 ──
    const compressionGroupEl = this.createSettingGroup(localizeEl, t("subgroupCompressionTitle"));

    this.createSetting(compressionGroupEl)
      .setName(t("compressImage"))
      .setDesc(t("compressImageDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.compressImage).onChange(async (value) => {
          this.plugin.settings.compressImage = value;
          await this.plugin.saveSettings();
          this.applyCompressionEnabled(compressionFormatSetting, compressionQualitySetting, value);
        })
      );

    const compressionFormatSetting = this.createSetting(compressionGroupEl)
      .setName(t("compressionFormat"))
      .setDesc(t("compressionFormatDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("image/webp", "WebP")
          .addOption("image/jpeg", "JPEG")
          .setValue(this.plugin.settings.compressionFormat)
          .onChange(async (value) => {
            this.plugin.settings.compressionFormat = value;
            await this.plugin.saveSettings();
          });
      });

    const compressionQualitySetting = this.createSetting(compressionGroupEl)
      .setName(t("compressionQuality"))
      .setDesc(t("compressionQualityDesc"))
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.compressionQuality))
          .onChange(async (value: string) => {
            const num = Number(value.trim());
            if (!Number.isInteger(num) || num < 10 || num > 100) {
              displayError(t("compressionQualityInvalid"));
              return;
            }
            this.plugin.settings.compressionQuality = num;
            await this.plugin.saveSettings();
          })
      );

    this.applyCompressionEnabled(
      compressionFormatSetting,
      compressionQualitySetting,
      this.plugin.settings.compressImage
    );

    // ── 图片清理 ──
    const cleanupGroupEl = this.createSettingGroup(localizeEl, t("subgroupCleanupTitle"));

    this.createSetting(cleanupGroupEl)
      .setName(t("showCleanupRibbon"))
      .setDesc(t("showCleanupRibbonDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showCleanupRibbon).onChange(async (value) => {
          this.plugin.settings.showCleanupRibbon = value;
          await this.plugin.saveSettings();
          this.plugin.refreshRibbonIcons();
        })
      );

    this.createSetting(cleanupGroupEl)
      .setName(t("excludedFolders"))
      .setDesc(t("excludedFoldersDesc"))
      .addTextArea((text) => {
        text
          .setPlaceholder(t("excludedFoldersPlaceholder"))
          .setValue(this.plugin.settings.excludedFolders)
          .onChange(async (value) => {
            const foldersArray = value.split(/\r?\n|\r|\n/g);
            if (foldersArray.length >= 1) {
              const regexconverted = trimAny(
                foldersArray
                  .map((folderPath) => {
                    const cleaned = trimAny(folderPath, [" ", "|", "/", "\\"]);
                    if (cleaned !== "") {
                      return `(^${cleaned}$)`;
                    }
                    return "";
                  })
                  .join("|")
                  .replace("\\", "/"),
                [" ", "|", "/", "\\"]
              );

              this.plugin.settings.excludedFolders = value;
              this.plugin.settings.excludedFoldersRegexp = regexconverted;
              await this.plugin.saveSettings();
              logError(`Excluded folders regex: ${regexconverted}`);
            }
          });

        text.inputEl.rows = 5;
        text.inputEl.addClass("lip-textarea-fullwidth");
      });

    this.createSetting(cleanupGroupEl)
      .setName(t("excludeSubfolders"))
      .setDesc(t("excludeSubfoldersDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.excludeSubfolders).onChange(async (value) => {
          this.plugin.settings.excludeSubfolders = value;
          await this.plugin.saveSettings();
        })
      );

    // ── 通知 ──
    const globalGroupEl = this.createSettingGroup(localizeEl, t("subgroupGlobalTitle"));

    this.createSetting(globalGroupEl)
      .setName(t("showNotifications"))
      .setDesc(t("showNotificationsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showNotifications).onChange(async (value) => {
          this.plugin.settings.showNotifications = value;
          await this.plugin.saveSettings();
        })
      );

    this.createSetting(globalGroupEl)
      .setName(t("showOperationLogs"))
      .setDesc(t("showOperationLogsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showOperationLogs).onChange(async (value) => {
          this.plugin.settings.showOperationLogs = value;
          await this.plugin.saveSettings();
        })
      );

    updateAutoProcessSettings();
    updateAttachmentFolderSettings();
  }

  hide(): void {
    const { containerEl } = this;
    containerEl.removeClass("lip-settings-root");
  }
}
