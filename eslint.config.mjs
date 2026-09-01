import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"],
        },
      },
    },
  },
  {
    // FileManager.trashFile() 只能跟随 Obsidian 全局 trashOption，无法表达插件
    // deleteDestination 的三种显式去向（Obsidian回收站/系统回收站/彻底删除），
    // 尤其"彻底删除"没有 trashFile 等价操作。属插件有意设计，故豁免。
    files: ["src/clearUnusedUtils.ts", "src/main.ts", "src/previewDelete.ts", "src/previewUtil.ts"],
    rules: {
      "obsidianmd/prefer-file-manager-trash-file": "off",
    },
  },
  {
    // 插件沿用原项目的命令式设置 UI（SettingGroup + 自定义折叠样式），
    // 未采用 Obsidian 1.13 的命令式 getSettingDefinitions()。属架构性有意选择，豁免。
    // "WebP"/"JPEG" 为官方格式缩写，sentence-case 规则对其误报，一并在本文件豁免。
    files: ["src/settingstab.ts"],
    rules: {
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",
      "obsidianmd/ui/sentence-case": "off",
    },
  },
  {
    // editor-paste 处理函数是过滤器：onPasteFunc 仅消费图片/媒体粘贴，
    // 不能无条件 preventDefault()，否则会拦截普通文本粘贴。豁免该规则的
    // preventDefault 要求，保留 evt.defaultPrevented 提前返回。
    files: ["src/main.ts"],
    rules: {
      "obsidianmd/editor-drop-paste": "off",
    },
  },
  {
    // clearUnusedModal 展示的 textToView 是由 deleteFilesInTheList 生成的
    // 插件内 HTML 日志（无任何用户输入），用 innerHTML 注入属于安全的内部
    // 实现，故豁免 innerHTML/no-inner-html 这两条安全规则。
    files: ["src/clearUnusedModal.ts"],
    rules: {
      "no-unsanitized/property": "off",
      "@microsoft/sdl/no-inner-html": "off",
    },
  },
  {
    // 这些文件用 document.createElement("canvas"/"label") 创建游离 DOM 元素。
    // 本项目内置的 obsidian.d.ts（1.12.3）并未导出独立的 createEl 函数（仅
    // 暴露元素方法 .createEl()，必须依附父节点），而 canvas 转换时需要脱离
    // 文档的独立元素，无法改用 .createEl()。属依赖类型缺失导致的有意选择，豁免。
    files: ["src/utils.ts", "src/previewHelpers.ts", "src/previewUtil.ts"],
    rules: {
      "obsidianmd/prefer-create-el": "off",
    },
  },
]);