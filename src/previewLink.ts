/**
 * 链接更新功能模块
 */

import { MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";

/**
 * 表示一行中匹配的链接信息
 */
export interface MatchedLinkInLine {
  oldLink: string;
  newLink: string;
  fromCh: number;
  toCh: number;
}

/**
 * 更新内部链接的大小
 * @param activeView 活动视图
 * @param targetPos 目标位置
 * @param imageName 图片名称
 * @param newWidth 新宽度
 * @param inTable 是否在表格中
 * @param inCallout 是否在调用框中
 */
export function updateInternalLink(
  activeView: MarkdownView,
  targetPos: number,
  imageName: string,
  newWidth: number,
  inTable: boolean,
  inCallout: boolean
): void {
  const editor = activeView.editor;
  const editorView = (editor as any).cm as EditorView;
  const targetLine = editorView.state.doc.lineAt(targetPos);

  if (!inCallout && !inTable) {
    const matched = matchLineWithInternalLink(targetLine.text, imageName, newWidth, inTable);
    if (matched.length === 1) {
      editorView.dispatch({
        changes: {
          from: targetLine.from + matched[0].fromCh,
          to: targetLine.from + matched[0].toCh,
          insert: matched[0].newLink,
        },
      });
    } else if (matched.length > 1) {
      new (require("obsidian").Notice)("当前行中找到多个相同图片链接，请手动调整缩放。");
    }
    return;
  }

  updateGroupedLink(
    activeView,
    targetLine.number,
    imageName,
    newWidth,
    inTable ? /^\s*\|/ : /^>/,
    "internal",
    inTable
  );
}

/**
 * 更新外部链接的大小
 * @param activeView 活动视图
 * @param target 目标元素
 * @param targetPos 目标位置
 * @param newWidth 新宽度
 * @param newHeight 新高度
 * @param inTable 是否在表格中
 * @param inCallout 是否在调用框中
 */
export function updateExternalLink(
  activeView: MarkdownView,
  target: HTMLImageElement | HTMLVideoElement,
  targetPos: number,
  newWidth: number,
  newHeight: number,
  inTable: boolean,
  inCallout: boolean
): void {
  const editor = activeView.editor;
  const editorView = (editor as any).cm as EditorView;
  const targetLine = editorView.state.doc.lineAt(targetPos);
  const link = target.getAttribute("src") as string;
  const altText = target.getAttribute("alt") as string;

  if (!inCallout && !inTable) {
    const matched = matchLineWithExternalLink(targetLine.text, link, altText, newWidth, inTable);
    if (matched.length === 1) {
      editorView.dispatch({
        changes: {
          from: targetLine.from + matched[0].fromCh,
          to: targetLine.from + matched[0].toCh,
          insert: matched[0].newLink,
        },
      });
    } else if (matched.length > 1) {
      new (require("obsidian").Notice)("当前行中找到多个相同图片链接，请手动调整缩放。");
    }
    return;
  }

  updateGroupedLink(
    activeView,
    targetLine.number,
    link,
    newWidth,
    inTable ? /^\s*\|/ : /^>/,
    "external",
    inTable,
    altText
  );
}

/**
 * 更新分组链接的大小
 * @param activeView 活动视图
 * @param startLineNumber 起始行号
 * @param targetName 目标名称
 * @param newWidth 新宽度
 * @param startReg 起始正则表达式
 * @param kind 链接类型
 * @param inTable 是否在表格中
 * @param altText 替代文本
 */
export function updateGroupedLink(
  activeView: MarkdownView,
  startLineNumber: number,
  targetName: string,
  newWidth: number,
  startReg: RegExp,
  kind: "internal" | "external",
  inTable: boolean,
  altText?: string
): void {
  const editor = activeView.editor;
  const editorView = (editor as any).cm as EditorView;
  const matchedResults: MatchedLinkInLine[] = [];
  const matchedLines: number[] = [];

  for (let i = startLineNumber; i <= editor.lineCount(); i++) {
    const line = editorView.state.doc.line(i);
    if (!startReg.test(line.text)) {
      break;
    }
    const matched = kind === "internal"
      ? matchLineWithInternalLink(line.text, targetName, newWidth, inTable)
      : matchLineWithExternalLink(line.text, targetName, altText ?? "", newWidth, inTable);
    matchedResults.push(...matched);
    matchedLines.push(...new Array(matched.length).fill(i));
  }

  for (let i = startLineNumber - 1; i >= 1; i--) {
    const line = editorView.state.doc.line(i);
    if (!startReg.test(line.text)) {
      break;
    }
    const matched = kind === "internal"
      ? matchLineWithInternalLink(line.text, targetName, newWidth, inTable)
      : matchLineWithExternalLink(line.text, targetName, altText ?? "", newWidth, inTable);
    matchedResults.push(...matched);
    matchedLines.push(...new Array(matched.length).fill(i));
  }

  if (matchedResults.length === 1) {
    const targetLine = editorView.state.doc.line(matchedLines[0]);
    if (inTable) {
      const oldText = targetLine.text;
      const newLineText = oldText.substring(0, matchedResults[0].fromCh) +
        matchedResults[0].newLink +
        oldText.substring(matchedResults[0].toCh);
      editorView.dispatch({
        changes: {
          from: targetLine.from,
          to: targetLine.from + oldText.length,
          insert: newLineText,
        },
      });
    } else {
      editorView.dispatch({
        changes: {
          from: targetLine.from + matchedResults[0].fromCh,
          to: targetLine.from + matchedResults[0].toCh,
          insert: matchedResults[0].newLink,
        },
      });
    }
  } else if (matchedResults.length === 0) {
    new (require("obsidian").Notice)("未找到当前图片链接，请手动调整缩放。");
  } else {
    new (require("obsidian").Notice)("找到多个相同图片链接，请手动调整缩放。");
  }
}

/**
 * 匹配行中的内部链接
 * @param lineText 行文本
 * @param targetName 目标名称
 * @param newWidth 新宽度
 * @param inTable 是否在表格中
 * @returns 匹配的链接数组
 */
export function matchLineWithInternalLink(
  lineText: string,
  targetName: string,
  newWidth: number,
  inTable: boolean
): MatchedLinkInLine[] {
  const regWikiLink = /\!\[\[[^\[\]]*?\]\]/g;
  const regMdLink = /\!\[[^\[\]]*?\]\(\s*[^\[\]\{\}']*\s*\)/g;
  const targetNameMdLink = targetName.replace(/ /g, "%20");
  if (!lineText.includes(targetName) && !lineText.includes(targetNameMdLink)) {
    return [];
  }

  const result: MatchedLinkInLine[] = [];
  while (true) {
    const wikiMatch = regWikiLink.exec(lineText);
    if (!wikiMatch) {
      break;
    }
    const matchedLink = wikiMatch[0];
    if (matchedLink.includes(targetName)) {
      const normalLink = inTable ? matchedLink.replace(/\\\|/g, "|") : matchedLink;
      const linkMatch = normalLink.match(/!\[\[(.*?)(\||\]\])/);
      const linkText = linkMatch ? linkMatch[1] : "";

      const altMatch = matchedLink.match(/!\[\[.*?(\|(.*?))\]\]/);
      const altText = altMatch ? altMatch[1] : "";
      const altTextList = altText.split("|");
      let altTextWithoutSize = "";
      for (const alt of altTextList) {
        if (!/^\d+$/.test(alt) && !/^\s*$/.test(alt)) {
          altTextWithoutSize = `${altTextWithoutSize}|${alt}`;
        }
      }
      let newAltText = newWidth !== 0 ? `${altTextWithoutSize}|${newWidth}` : altTextWithoutSize;
      newAltText = inTable ? newAltText.replace(/\|/g, "\\|") : newAltText;
      const newWikiLink = linkMatch
        ? `![[${linkText}${newAltText}]]`
        : `![[${targetName}${newAltText}]]`;

      result.push({
        oldLink: matchedLink,
        newLink: newWikiLink,
        fromCh: wikiMatch.index,
        toCh: wikiMatch.index + matchedLink.length,
      });
    }
  }

  while (true) {
    const match = regMdLink.exec(lineText);
    if (!match) {
      break;
    }
    const matchedLink = match[0];
    if (matchedLink.includes(targetNameMdLink)) {
      const altTextMatch = matchedLink.match(/\[.*?\]/g) as string[];
      const altText = altTextMatch[0].substring(1, altTextMatch[0].length - 1);
      let pureAlt = altText.replace(/\|\d+(\|\d+)?$/g, "");
      if (inTable) {
        pureAlt = altText.replace(/\\\|\d+(\|\d+)?$/g, "");
      }
      const linkText = matchedLink.substring(altTextMatch[0].length + 2, matchedLink.length - 1);
      let newMdLink = inTable
        ? `![${pureAlt}\|${newWidth}](${linkText})`
        : `![${pureAlt}|${newWidth}](${linkText})`;
      if (/^\d*$/.test(altText)) {
        newMdLink = `![${newWidth}](${linkText})`;
      }
      result.push({
        oldLink: matchedLink,
        newLink: newMdLink,
        fromCh: match.index,
        toCh: match.index + matchedLink.length,
      });
    }
  }

  return result;
}

/**
 * 匹配行中的外部链接
 * @param lineText 行文本
 * @param link 链接
 * @param altText 替代文本
 * @param newWidth 新宽度
 * @param inTable 是否在表格中
 * @returns 匹配的链接数组
 */
export function matchLineWithExternalLink(
  lineText: string,
  link: string,
  altText: string,
  newWidth: number,
  inTable: boolean
): MatchedLinkInLine[] {
  const result: MatchedLinkInLine[] = [];
  const regMdLink = /\!\[[^\[\]]*?\]\(\s*[^\[\]\{\}']*\s*\)/g;
  if (!lineText.includes(link)) {
    return [];
  }

  while (true) {
    const match = regMdLink.exec(lineText);
    if (!match) {
      break;
    }
    const matchedLink = match[0];
    if (matchedLink.includes(link)) {
      const altTextMatch = matchedLink.match(/\[.*?\]/g) as string[];
      const altTextInLink = altTextMatch[0].substring(1, altTextMatch[0].length - 1);
      let pureAlt = altTextInLink.replace(/\|\d+(\|\d+)?$/g, "");
      if (inTable) {
        pureAlt = altTextInLink.replace(/\\\|\d+(\|\d+)?$/g, "");
      }
      if (/^\d*$/.test(altTextInLink)) {
        pureAlt = "";
      }
      const linkText = matchedLink.substring(altTextMatch[0].length + 2, matchedLink.length - 1);
      const newExternalLink = inTable
        ? `![${pureAlt}\|${newWidth}](${linkText})`
        : `![${pureAlt}|${newWidth}](${linkText})`;

      result.push({
        oldLink: matchedLink,
        newLink: newExternalLink,
        fromCh: match.index,
        toCh: match.index + matchedLink.length,
      });
    }
  }

  return result;
}
