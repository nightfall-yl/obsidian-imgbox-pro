import "obsidian";

export {};

declare module "obsidian" {
  interface Plugin {
    ensureFolderExists(folderPath: string): Promise<void>;
  }

  interface Vault {
    getConfig(key: string): unknown;
    exists(path: string): Promise<boolean>;
  }

  interface Workspace {
    activeEditor: import("obsidian").MarkdownFileInfo | null;
  }

  interface DataAdapter {
    exists(path: string, sensitive?: boolean): Promise<boolean>;
    readBinary(path: string): Promise<ArrayBuffer>;
  }

  interface TAbstractFile {
    children?: TAbstractFile[];
  }

  interface App {
    internalPlugins: {
      getEnabledPluginById(id: string): {
        revealInFolder(file: TAbstractFile): void;
      } | null;
    };
  }
}
