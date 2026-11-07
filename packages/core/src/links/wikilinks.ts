import { WARNING } from "../constants";
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
  LinkTarget,
  MarkdownNode,
  Range,
} from "../types";

// `[[...]]`와 `![[...]]`. 안쪽에는 대괄호와 줄바꿈이 없음
const WIKILINK = /(!?)\[\[([^[\]\n]+)\]\]/g;

// 확장자가 .md가 아닌 임베드는 첨부 파일이므로 BLOG-33이 다룸
const ATTACHMENT = /\.(?!md$)[A-Za-z0-9]+$/i;

interface Wikilink extends Range {
  embed: boolean;
  target: LinkTarget;
  alias?: string;
}

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

// 코드 밖의 위키링크를 찾음. 첨부 파일 임베드는 BLOG-33이 다루므로 뺌 (4-2 1절)
export const findWikilinks = ({ body, syntax }: LinkContext): Wikilink[] =>
  [...body.matchAll(WIKILINK)].map(readWikilink).filter((wikilink) => {
    const inCode = insideAny(wikilink.start, syntax.code);
    const attachment = wikilink.embed && ATTACHMENT.test(wikilink.target.path);
    return !inCode && !attachment && fitsLinks(wikilink, syntax.links);
  });

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
