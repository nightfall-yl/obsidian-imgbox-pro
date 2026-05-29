import filenamify from "filenamify/browser";
import md5 from "md5";

import {
  FORBIDDEN_SYMBOLS_FILENAME_PATTERN,
  MD_LINK,
  USER_AGENT,
  NOTICE_TIMEOUT,
  APP_NAME,
  ATT_SIZE_ACHOR,
} from "./config";
import { isChineseDisplayLanguage } from "./previewHelpers";

import { requestUrl, Notice, TFile } from "obsidian";

export async function showBalloon(str: string, show: boolean = true, timeout = NOTICE_TIMEOUT) {
  if (show) {
    new Notice(APP_NAME + "\r\n" + str, timeout);
  }
}

export function showStatusBalloon(
  str: string,
  enabled: boolean = true,
  timeout = NOTICE_TIMEOUT
) {
  showBalloon(str, enabled, timeout);
}

export function displayError(error: Error | string, file?: TFile): void {
  if (file) {
    showBalloon(
      isChineseDisplayLanguage()
        ? `处理文件 ${file.name} 时出错：${error.toString()}`
        : `${APP_NAME}: Error while handling file ${file.name}, ${error.toString()}`
    );
  } else {
    showBalloon(error.toString());
  }

  logError(`LocalImagesPlus: error: ${error}`, false);
}

export async function logError(_str: any, _isObj: boolean = false) {
}

export function md5Sig(contentData: ArrayBuffer = undefined) {
  try {
    var dec = new TextDecoder("utf-8");
    const arrMid = Math.round(contentData.byteLength / 2);
    const chunk = 15000;
    const signature = md5(
      [
        contentData.slice(0, chunk),
        contentData.slice(arrMid, arrMid + chunk),
        contentData.slice(-chunk),
      ]
        .map((x) => dec.decode(x))
        .join()
    );

    return signature + "_MD5";
  } catch (e) {
    logError("Cannot generate md5: " + e, false);
    return null;
  }
}

export function generateTimestampRandomName(
  extension: string,
  hash?: string | null,
  date = new Date()
): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const normalizedHash = (hash ?? "").replace(/_MD5$/i, "");
  const suffix =
    normalizedHash.length >= 6
      ? normalizedHash.slice(0, 6)
      : Array.from(
          { length: 6 },
          () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
        ).join("");
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${suffix}${normalizedExtension}`;
}

export async function replaceAsync(str: any, regex: Array<RegExp>, asyncFn: any) {
  logError("replaceAsync: \r\nstr: " + str + "\r\nregex: ");
  logError(regex, true);

  let errorflag = false;
  const promises: Promise<any>[] = [];
  let dictPatt: Array<any>[] = [];
  let link;
  let anchor;
  let replp: any;
  let caption = "";
  let filesArr: Array<string> = [];
  let AttSize = "";

  regex.forEach((element) => {
    logError("cur regex:  " + element);
    const matches = str.matchAll(element);

    for (const match of matches) {
      logError("match: " + match);

      anchor = trimAny(match.groups.anchor, [")", "(", "]", "[", " "]);

      const AttSizeMatch = anchor.matchAll(ATT_SIZE_ACHOR);

      for (const match of AttSizeMatch) {
        AttSize =
          match.groups.attsize !== undefined
            ? trimAny(match.groups.attsize, [")", "(", "]", "[", " "])
            : match.groups.attsize2 !== undefined
              ? trimAny(match.groups.attsize2, [")", "(", "]", "[", " "])
              : "";
      }

      link = (match.groups.link.match(MD_LINK) ?? [match.groups.link])[0];
      caption = trimAny(
        match.groups.link.match(MD_LINK) !== null
          ? match.groups.link.split(link).length > 1
            ? match.groups.link.split(link)[1]
            : ""
          : "",
        [")", "]", "(", "[", " "]
      );
      link = trimAny(link, [")", "(", "]", "[", " "]);
      replp = trimAny(match[0], ["[", "(", "]"]);

      logError(
        "repl: " +
          replp +
          "\r\nahc: " +
          anchor +
          "\r\nlink: " +
          link +
          "\r\ncaption: " +
          caption +
          "\r\nAttSize: " +
          AttSize
      );

      dictPatt[replp] = [anchor, link, caption, AttSize];
    }
  });

  for (var key in dictPatt) {
    const promise = asyncFn(
      key,
      dictPatt[key][0],
      dictPatt[key][1],
      dictPatt[key][2],
      dictPatt[key][3]
    );
    logError(promise, true);
    promises.push(promise);
  }

  const data = await Promise.all(promises);
  logError("Promises: ");
  logError(data, true);

  data.forEach((element) => {
    if (element !== null) {
      logError("el: " + element[0] + "  el2: " + element[1] + element[2]);
      str = str.replaceAll(element[0], element[1] + element[2]);
      filesArr.push(element[1]);
    } else {
      errorflag = true;
    }
  });

  return [str, errorflag, filesArr];
}

export function isUrl(link: string) {
  logError("IsUrl: " + link, false);
  try {
    return Boolean(new URL(link));
  } catch (_) {
    return false;
  }
}

export async function base64ToBuff(data: string): Promise<ArrayBuffer> {
  logError("base64ToBuff: \r\n", false);
  try {
    const base64 = data.split("base64,")[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    logError("Cannot read base64: " + e, false);
    return null;
  }
}

export async function downloadImage(url: string): Promise<ArrayBuffer> {
  logError("Downloading: " + url, false);
  const headers = {
    method: "GET",
    "User-Agent": USER_AGENT,
  };

  try {
    const res = await requestUrl({ url: url, headers });
    logError(res, true);
    return res.arrayBuffer;
  } catch (e) {
    logError("Cannot download the file: " + e, false);
    return null;
  }
}

const MAGIC_SIGNATURES: Array<{ bytes: number[]; offset: number; ext: string }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, ext: "png" },
  { bytes: [0xff, 0xd8, 0xff], offset: 0, ext: "jpg" },
  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0, ext: "gif" },
  { bytes: [0x42, 0x4d], offset: 0, ext: "bmp" },
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, ext: "pdf" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0, ext: "zip" },
  { bytes: [0x49, 0x44, 0x33], offset: 0, ext: "mp3" },
  { bytes: [0xff, 0xfb], offset: 0, ext: "mp3" },
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], offset: 0, ext: "mkv" },
  { bytes: [0x4f, 0x67, 0x67, 0x53], offset: 0, ext: "ogg" },
  { bytes: [0x46, 0x4c, 0x56], offset: 0, ext: "flv" },
];

const ISOBMFF_BRANDS: Record<string, string> = {
  avif: "avif",
  avis: "avif",
  heic: "heic",
  heix: "heic",
  hevc: "heic",
  hevx: "heic",
  mif1: "heic",
  msf1: "heic",
  mp41: "mp4",
  mp42: "mp4",
  isom: "mp4",
  M4V: "mp4",
  M4A: "mp4",
  M4P: "mp4",
  avc1: "mp4",
  dash: "mp4",
  "qt  ": "mov",
  "3gp4": "3gp",
  "3gp5": "3gp",
  "3g2a": "3gp",
  caqv : "crx",
};

function detectExtByMagicNumber(content: ArrayBuffer): string | undefined {
  const header = new Uint8Array(content.slice(0, 32));

  for (const sig of MAGIC_SIGNATURES) {
    if (sig.offset + sig.bytes.length > header.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (header[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return sig.ext;
  }

  if (header.length >= 12) {
    const isRIFF = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
    const isWEBP = header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
    if (isRIFF && isWEBP) return "webp";
  }

  if (header.length >= 12) {
    const isFtyp =
      header[4] === 0x66 &&
      header[5] === 0x74 &&
      header[6] === 0x79 &&
      header[7] === 0x70;
    if (isFtyp) {
      const brand = String.fromCharCode(header[8], header[9], header[10], header[11]);
      if (ISOBMFF_BRANDS[brand]) {
        return ISOBMFF_BRANDS[brand];
      }
      return "mp4";
    }
  }

  return undefined;
}

function isSvgBuffer(data: ArrayBuffer): boolean {
  try {
    const header = new Uint8Array(data.slice(0, 1024));
    const text = new TextDecoder("utf-8", { fatal: false }).decode(header);
    return /^\s*<\?xml|^\s*<svg/i.test(text);
  } catch {
    return false;
  }
}

export async function getFileExt(content: ArrayBuffer, link: string) {
  const fileExtByLink = pathExtname(link).replace(".", "");
  const fileExtByBuffer = detectExtByMagicNumber(content);

  if (fileExtByBuffer == "xml" || !fileExtByBuffer) {
    if (isSvgBuffer(content)) return "svg";
  }

  logError("fileExtByBuffer" + fileExtByBuffer);

  if (
    fileExtByBuffer != undefined &&
    fileExtByBuffer &&
    fileExtByBuffer.length <= 5 &&
    fileExtByBuffer?.length > 0
  ) {
    return fileExtByBuffer;
  }

  logError("fileExtByLink  " + fileExtByLink);

  if (fileExtByLink != undefined && fileExtByLink.length <= 5 && fileExtByLink?.length > 0) {
    return fileExtByLink;
  }

  return "unknown";
}

export function trimAny(str: string, chars: Array<string>) {
  let start = 0,
    end = str.length;

  while (start < end && chars.indexOf(str[start]) >= 0) ++start;

  while (end > start && chars.indexOf(str[end - 1]) >= 0) --end;

  return start > 0 || end < str.length ? str.substring(start, end) : str;
}

export function cFileName(name: string) {
  const cleanedName = name.replace(/(\)|\(|\"|\'|\#|\]|\[|\:|\>|\<|\*|\|)/g, " ");
  return cleanedName;
}

export function cleanFileName(name: string) {
  const cleanedName = filenamify(name).replace(FORBIDDEN_SYMBOLS_FILENAME_PATTERN, "_");
  return cleanedName;
}

export function pathBasename(filepath: string): string {
  const normalized = filepath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "";
}

export function pathExtname(filepath: string): string {
  const base = pathBasename(filepath);
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return base.slice(dotIndex);
}

export function pathDirname(filepath: string): string {
  const normalized = filepath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

export function pathParse(filepath: string): {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
} {
  const normalized = filepath.replace(/\\/g, "/");
  const dir = pathDirname(normalized);
  const base = pathBasename(normalized);
  const ext = pathExtname(normalized);
  const name = base.slice(0, base.length - ext.length);
  return { root: "", dir, base, ext, name };
}

export function pathRelative(from: string, to: string): string {
  const fromParts = from
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  const toParts = to
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const upParts = Array(upCount).fill("..");
  const downParts = toParts.slice(commonLength);

  return [...upParts, ...downParts].join("/") || ".";
}

export function pathJoin(parts: Array<string>): string {
  return parts
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^(.+)\/$/, "$1");
}

export function normalizePath(p: string) {
  return p.replace(/\\/g, "/");
}

export function encObsURI(e: string) {
  return e.replace(/[\\\x00\x08\x0B\x0C\x0E-\x1F ]/g, function (e) {
    return encodeURIComponent(e);
  });
}

export async function blobToJpegArrayBuffer(
  blob: Blob,
  imgQuality: number,
  imgType: string = "image/jpeg"
): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (): void => {
      const image = new Image();
      image.onload = (): void => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not get 2D context.");
        }
        const imageWidth = image.width;
        const imageHeight = image.height;

        canvas.width = imageWidth;
        canvas.height = imageHeight;

        context.fillStyle = "#fff";
        context.fillRect(0, 0, imageWidth, imageHeight);
        context.save();

        context.translate(imageWidth / 2, imageHeight / 2);
        context.drawImage(
          image,
          0,
          0,
          imageWidth,
          imageHeight,
          -imageWidth / 2,
          -imageHeight / 2,
          imageWidth,
          imageHeight
        );
        context.restore();

        const data = canvas.toDataURL(imgType, imgQuality);

        const arrayBuffer = base64ToBuff(data);
        resolve(arrayBuffer);
      };

      image.src = reader.result as string;
    };
    reader.readAsDataURL(blob);
  });
}
