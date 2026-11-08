import { WARNING, WEB_URL } from "../constants";
import { assetUrl } from "../address/url";
import { judgeImage } from "./image-rules";
import { quotedTitle, readHref } from "./markdown-links";
import { contains, insideAny, rangeOf } from "./syntax";
import { destination, escapeText } from "./targets";
import type {
  ImageEdits,
  ImageVerdict,
  LinkContext,
  LinkSyntax,
  MarkdownNode,
  Range,
  Wikilink,
} from "../types";

// 위키 임베드의 `|` 뒤가 숫자면 너비, `300x200`이면 너비만 씀. 0이나 다른 모양은 대체 텍스트 (4-2 1절, 4-3 A11, BLOG-33 가정 7)
const SIZE = /^([1-9]\d*)(?:x[1-9]\d*)?$/;

// 볼트 경로로 가리킨 이미지 하나
interface VaultImage extends Range {
  path: string;
  alt: string;
  width?: string;
  title?: string | null;
  inHtml: boolean;
}

// 표준 마크다운 이미지 하나. 참조 이미지는 정의의 주소와 제목을 씀
interface MarkdownImage extends Range {
  alt: string;
  url: string;
  title?: string | null;
}

const fileName = (path: string) => path.split("/").at(-1)!;

// 남기는 이미지는 표준 마크다운 이미지로 둠. 너비는 주소 조각 #width=로 넘기고 렌더링이 width 속성으로 바꿈 (4-2 1절, BLOG-33 가정 1)
const imageMarkdown = ({ path, alt, width, title }: VaultImage) => {
  const hasWidth = width !== undefined;
  const fragment = hasWidth ? `#width=${width}` : "";
  const url = destination(`${assetUrl(path)}${fragment}`);
  return `![${escapeText(alt)}](${url}${quotedTitle(title)})`;
};

// 뺀 이미지의 글자: 대체 텍스트, 없으면 파일 이름(폴더 경로 없음). PDF, 오디오, 동영상은 파일 이름만 (4-2 1절, BLOG-33 가정 8)
const fallbackText = ({ kind }: ImageVerdict, { path, alt }: VaultImage) => {
  const nameOnly = kind === "name" || alt === "";
  return escapeText(nameOnly ? fileName(path) : alt);
};

// HTML 블록 안에서는 마크다운 이미지가 동작하지 않으므로 남길 이미지도 글자로 두고 첨부 목록에 넣지 않음 (BLOG-32 가정 7, BLOG-33 가정 8)
const verdictFor = (context: LinkContext, image: VaultImage): ImageVerdict => {
  const verdict = judgeImage(image.path, context.vault);
  const hidden = image.inHtml && verdict.kind === "image";
  return hidden ? { kind: "text" } : verdict;
};

const convertVaultImage = (
  context: LinkContext,
  image: VaultImage,
  result: ImageEdits,
) => {
  const verdict = verdictFor(context, image);
  const { warning } = verdict;
  const warned = warning !== undefined;
  const line = context.lineAt(image.start);
  if (warned) result.warnings.push({ message: warning, line });
  const kept = verdict.kind === "image";
  if (kept) result.attachments.push(image.path);
  const text = kept ? imageMarkdown(image) : fallbackText(verdict, image);
  result.edits.push({ start: image.start, end: image.end, text });
};

// 위키 임베드: 경로는 볼트 경로 그대로 씀. 이름만 있는 이미지는 경로 목록에 정확히 없으므로 글자가 됨 (4-2 1절, BLOG-33 가정 8)
const fromEmbed = (
  context: LinkContext,
  { start, end, target, alias = "" }: Wikilink,
): VaultImage => {
  const size = SIZE.exec(alias);
  const sized = size !== null;
  const inHtml = insideAny(start, context.syntax.html);
  const image = { start, end, path: target.path, inHtml };
  return sized
    ? { ...image, alt: "", width: size[1] }
    : { ...image, alt: alias };
};

// 같은 이름의 정의가 여럿이면 처음 것만 쓰임(CommonMark)
const firstDefinitions = (definitions: readonly MarkdownNode[]) => {
  const first = new Map<string, MarkdownNode>();
  for (const definition of definitions) {
    const { identifier = "" } = definition;
    const known = first.has(identifier);
    if (!known) first.set(identifier, definition);
  }
  return first;
};

const readImages = ({ images, definitions }: LinkSyntax): MarkdownImage[] => {
  const defined = firstDefinitions(definitions);
  return images.map((node) => {
    const isReference = node.type === "imageReference";
    const source = isReference ? defined.get(node.identifier ?? "") : node;
    return {
      ...rangeOf(node),
      alt: node.alt ?? "",
      url: source?.url ?? "",
      title: source?.title,
    };
  });
};

// 외부 이미지는 앞의 !를 지워 일반 링크로 바꾸고 주소와 제목 원문은 그대로 둠. 대체 텍스트가 없으면 주소를 글자로 넣음 (4-2 1절, 4-3 A7)
// 링크 안에는 링크를 둘 수 없으므로 링크 안의 외부 이미지는 글자만 남김
const convertExternal = (
  context: LinkContext,
  image: MarkdownImage,
  result: ImageEdits,
) => {
  const { start, end, alt, url } = image;
  const line = context.lineAt(start);
  result.warnings.push({ message: WARNING.EXTERNAL_IMAGE, line });
  const noAlt = alt === "";
  const text = escapeText(noAlt ? url : alt);
  const inLink = context.syntax.links.some((link) =>
    contains(rangeOf(link), image),
  );
  if (inLink) {
    result.edits.push({ start, end, text });
    return;
  }
  result.edits.push({ start, end: start + 1, text: "" });
  if (noAlt) result.edits.push({ start: start + 2, end: start + 2, text });
};

// 표준 마크다운 이미지에도 위키 임베드와 같은 규칙을 씀. 볼트 경로는 URL 인코딩되어 있음 (4-2 1절)
// 그대로 둘 수 없는 스킴과 로컬 경로는 대체 텍스트만 남김. 주소의 마지막 조각이 파일 이름이 아닐 수 있으므로 파일 이름을 쓰지 않음 (2절)
const convertMarkdownImage = (
  context: LinkContext,
  image: MarkdownImage,
  result: ImageEdits,
) => {
  const { start, end, alt, url, title } = image;
  // http도 https처럼 링크로 바꿈. 나머지 스킴은 대체 텍스트만 남김 (4-3 A7, BLOG-33 가정 5)
  const external = WEB_URL.test(url);
  if (external) {
    convertExternal(context, image, result);
    return;
  }
  const href = readHref(url);
  const internal = href.kind === "internal";
  if (!internal) {
    result.edits.push({ start, end, text: escapeText(alt) });
    return;
  }
  const { path } = href.target;
  const vaultImage = { start, end, path, alt, title, inHtml: false };
  convertVaultImage(context, vaultImage, result);
};

// 첨부 파일 임베드와 표준 마크다운 이미지를 웹 주소의 이미지나 글자로 바꾸고, 남긴 이미지의 경로를 모음 (4-2 1절, 2절, 4-3 A2)
export const convertImages = (
  context: LinkContext,
  embeds: readonly Wikilink[],
): ImageEdits => {
  const result: ImageEdits = { edits: [], warnings: [], attachments: [] };
  for (const embed of embeds) {
    convertVaultImage(context, fromEmbed(context, embed), result);
  }
  for (const image of readImages(context.syntax)) {
    convertMarkdownImage(context, image, result);
  }
  return result;
};
