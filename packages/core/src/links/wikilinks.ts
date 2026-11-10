import {
  IMAGE_EXTENSION,
  MEDIA_EXTENSION,
  UNSUPPORTED_IMAGE_EXTENSION,
  WARNING,
} from "../constants";
import { contains, insideAny, labelEnd, overlaps, rangeOf } from "./syntax";
import {
  defaultText,
  destination,
  escapeText,
  parseTarget,
  resolveTarget,
} from "./targets";
import type {
  LinkContext,
  LinkEdits,
  MarkdownNode,
  Range,
  Wikilink,
} from "../types";

// `[[...]]`와 `![[...]]`. 안쪽에는 대괄호와 줄바꿈이 없음
const WIKILINK = /(!?)\[\[([^[\]\n]+)\]\]/g;

// Obsidian이 임베드하는 이미지, 오디오, 동영상, PDF 확장자만 첨부로 보고 나머지(`v1.2`, `.tiff` 등)는 노트 이름으로 봄 (4-2 1절, BLOG-32 가정 10, BLOG-33 가정 4)
const ATTACHMENT_EXTENSIONS = [
  IMAGE_EXTENSION,
  UNSUPPORTED_IMAGE_EXTENSION,
  MEDIA_EXTENSION,
] as const;

const isAttachment = (wikilink: Wikilink) =>
  wikilink.embed &&
  ATTACHMENT_EXTENSIONS.some((extension) =>
    extension.test(wikilink.target.path),
  );

const readAll = (body: string) =>
  [...body.matchAll(WIKILINK)].map(readWikilink);

// 별칭은 처음 | 뒤. 표 안에서 쓰는 \|의 \는 대상에서 뺌. 빈 별칭은 없는 것으로 봄 (Obsidian 문법)
const readWikilink = (match: RegExpExecArray): Wikilink => {
  const [whole, bang, inner] = match;
  const bar = inner.indexOf("|");
  const hasAlias = bar !== -1;
  const raw = hasAlias ? inner.slice(0, bar) : inner;
  const alias = hasAlias ? inner.slice(bar + 1) : "";
  const start = match.index;
  return {
    start,
    end: start + whole.length,
    embed: bang === "!",
    target: parseTarget(raw.replace(/\\$/, "")),
    ...(alias !== "" && { alias }),
  };
};

// 마크다운 링크와 겹치는 위키링크: 링크 안쪽 글자 안에 있으면 살리고, 링크를 통째로 감싸면 살리되 그 링크는 위키링크가 대신함.
// 링크의 경계에 걸치면 해석기가 위키링크로 읽지 않은 것이므로 건너뜀
const fitsLinks = (wikilink: Range, links: readonly MarkdownNode[]) =>
  links.every((link) => {
    const range = rangeOf(link);
    const apart = !overlaps(range, wikilink);
    const label = { start: range.start + 1, end: labelEnd(link) };
    return apart || contains(label, wikilink) || contains(wikilink, range);
  });

// 코드 밖에서 해석기가 위키링크로 읽는 것 (4-2 1절)
const readOutsideCode = ({ body, syntax }: LinkContext) =>
  readAll(body).filter((wikilink) => {
    const inCode = insideAny(wikilink.start, syntax.code);
    return !inCode && fitsLinks(wikilink, syntax.links);
  });

// 노트로 가는 위키링크와 노트 임베드. 첨부 파일 임베드는 findEmbeds가 찾음
export const findWikilinks = (context: LinkContext): Wikilink[] =>
  readOutsideCode(context).filter((wikilink) => !isAttachment(wikilink));

// 첨부 파일 임베드 `![[폴더/이미지.png]]` (4-2 1절)
export const findEmbeds = (context: LinkContext): Wikilink[] =>
  readOutsideCode(context).filter(isAttachment);

// 바꾸지 못하고 남는 `[[`는 정규식이 읽지 못한 위키링크이며 비공개 경로가 원문 그대로 나갈 수 있음. 예외로 그 노트를 보류하게 함 (2절, BLOG-32 가정 10)
// 코드 안과 첨부 파일 임베드는 뺌
export const assertNoLeftovers = (
  { body, syntax }: LinkContext,
  wikilinks: readonly Wikilink[],
): void => {
  const handled = [
    ...wikilinks,
    ...readAll(body).filter(isAttachment),
    ...syntax.code,
  ];
  const leftover = [...body.matchAll(/\[\[/g)].some(
    ({ index }) => !insideAny(index, handled),
  );
  if (leftover) throw new Error("읽지 못한 위키링크가 남음");
};

// 위키링크를 표준 마크다운 링크나 표시 텍스트로 바꿈. HTML 안에서는 마크다운 링크가 동작하지 않으므로 표시 텍스트만 남김 (BLOG-32 가정 7)
// 블록 참조와 노트 임베드는 노트 링크로 낮추고 경고함 (4-2 1절)
export const convertWikilinks = (
  context: LinkContext,
  wikilinks: readonly Wikilink[],
): LinkEdits => {
  const result: LinkEdits = { edits: [], warnings: [], notes: [] };
  for (const { start, end, embed, target, alias } of wikilinks) {
    const { url, note } = resolveTarget(target, context.publicPaths);
    const inHtml = insideAny(start, context.syntax.html);
    const linked = url !== undefined && !inHtml;
    const text = escapeText(alias ?? defaultText(target));
    const replaced = linked ? `[${text}](${destination(url)})` : text;
    result.edits.push({ start, end, text: replaced });
    const hasNote = note !== undefined;
    if (hasNote) result.notes.push({ path: note, linked });
    const line = context.lineAt(start);
    const { block } = target;
    if (block) result.warnings.push({ message: WARNING.BLOCK_REFERENCE, line });
    if (embed) result.warnings.push({ message: WARNING.NOTE_EMBED, line });
  }
  return result;
};
