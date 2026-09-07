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
    // main.ts 的 editor-paste 处理器不能调用 evt.preventDefault()：本插件对
    // 图片/文件粘贴并不自行插入附件，而是依赖 Obsidian 默认粘贴行为创建附件
    // 并插入链接，随后经由文件创建/修改流水线做本地化。一旦 preventDefault 会
    // 抑制 Obsidian 的默认插入，导致图片无法粘贴进 .md。故豁免该规则。
    files: ["src/main.ts"],
    rules: {
      "obsidianmd/editor-drop-paste": "off",
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