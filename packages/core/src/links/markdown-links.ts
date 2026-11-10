import { EXTERNAL_URL, HTML_HANDLED, HTML_LINK, WARNING } from "../constants";
import { contains, labelEnd, matchHtml, overlaps, rangeOf } from "./syntax";
import { destination, parseTarget, resolveTarget } from "./targets";
import type {
  Edit,
  Href,
  LinkContext,
  LinkEdits,
  MarkdownNode,
  Range,
  Resolution,
} from "../types";

// 스킴이 있는 주소. 그대로 두는 외부 주소(EXTERNAL_URL) 밖의 스킴은 표시 텍스트만 남김 (4-2 2절, BLOG-32 가정 3)
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// 볼트 경로 링크는 `폴더/노트.md#제목`처럼 쓰고 경로와 제목은 URL 인코딩되어 있음. 인코딩이 깨졌으면 표시 텍스트만 남김
// `/`로 시작하는 로컬 경로(`/Users/...`)는 볼트 경로가 아님 (4-2 1절, 2절). 표준 마크다운 이미지도 같은 규칙으로 읽음
export const readHref = (url: string): Href => {
  const external = EXTERNAL_URL.test(url);
  if (external) return { kind: "external" };
  const hasScheme = SCHEME.test(url);
  const localPath = url.startsWith("/");
  const blocked = hasScheme || localPath;
  if (blocked) return { kind: "blocked" };
  try {
    const decoded = url.split("#").map(decodeURIComponent).join("#");
    return { kind: "internal", target: parseTarget(decoded) };
  } catch {
    return { kind: "blocked" };
  }
};

interface Judged {
  href: Href;
  resolution: Resolution;
}

const judge = (url: string, publicPaths: ReadonlySet<string>): Judged => {
  const href = readHref(url);
  const internal = href.kind === "internal";
  const resolution = internal ? resolveTarget(href.target, publicPaths) : {};
  return { href, resolution };
};

// 링크가 남는지: 외부 주소이거나 공개 대상으로 가는 내부 주소
const keeps = ({ href, resolution }: Judged): boolean =>
  href.kind === "external" || resolution.url !== undefined;

export const quotedTitle = (title: string | null | undefined): string => {
  const hasTitle = typeof title === "string";
  return hasTitle ? ` "${title.replace(/["\\]/g, "\\$&")}"` : "";
};

// 대괄호 링크는 감싼 기호를 지워 안쪽 글자만 남김. 안쪽 원문(서식 포함)은 그대로 둠 (BLOG-32 가정 8)
// 자동 링크(<...>)는 안쪽이 곧 주소이므로 통째로 지움 (2절, BLOG-32 가정 9)
// 기호 없이 쓴 주소(GFM 자동 링크)는 지울 기호가 없으므로 그대로 둠. 화면에 보이는 글자임
const unwrap = (body: string, link: MarkdownNode): Edit[] => {
  const { start, end } = rangeOf(link);
  const angle = body[start] === "<";
  const bracket = body[start] === "[";
  if (angle) return [{ start, end, text: "" }];
  if (!bracket) return [];
  return [
    { start, end: start + 1, text: "" },
    { start: labelEnd(link), end, text: "" },
  ];
};

const addNote = (
  result: LinkEdits,
  { resolution }: Judged,
  linked: boolean,
) => {
  const { note } = resolution;
  const hasNote = note !== undefined;
  if (hasNote) result.notes.push({ path: note, linked });
};

const warnBlock = (result: LinkEdits, judged: Judged, line: number) => {
  const { href } = judged;
  const block = href.kind === "internal" && href.target.block;
  if (block) result.warnings.push({ message: WARNING.BLOCK_REFERENCE, line });
};

// 참조 정의 `[이름]: 주소`: 링크가 남으면 주소를 바꾸고, 아니면 정의를 지움. 정의가 비공개 경로를 담고 있으므로 남기지 않음 (4-2 2절)
// 참조 링크가 남는지는 이름마다 쓰이는 처음 정의(defined)로 정함
const convertDefinitions = (
  context: LinkContext,
  result: LinkEdits,
): Map<string, boolean> => {
  const kept = new Map<string, boolean>();
  const { definitions, defined, imageOnly } = context.syntax;
  for (const definition of definitions) {
    const { url = "", identifier = "", label, title } = definition;
    const judged = judge(url, context.publicPaths);
    const keep = keeps(judged);
    const first = defined.get(identifier) === definition;
    if (first) kept.set(identifier, keep);
    const range = rangeOf(definition);
    const { url: converted } = judged.resolution;
    const internal = converted !== undefined;
    const linksNote = !imageOnly.has(identifier);
    if (linksNote) addNote(result, judged, internal);
    const rewritten = `[${label}]: ${destination(converted ?? "")}${quotedTitle(title)}`;
    if (!keep) result.edits.push({ ...range, text: "" });
    if (internal) result.edits.push({ ...range, text: rewritten });
  }
  return kept;
};

// 인라인 링크와 자동 링크: 공개 대상이면 주소를 최종 URL로 바꾸고, 외부 주소는 그대로, 나머지는 안쪽 글자만 남김 (4-2 1절, 2절)
const convertInline = (
  context: LinkContext,
  link: MarkdownNode,
  result: LinkEdits,
) => {
  const judged = judge(link.url ?? "", context.publicPaths);
  const { start, end } = rangeOf(link);
  const { url } = judged.resolution;
  const internal = url !== undefined;
  const keep = keeps(judged);
  addNote(result, judged, internal);
  warnBlock(result, judged, context.lineAt(start));
  const text = `](${destination(url ?? "")}${quotedTitle(link.title)})`;
  if (internal) result.edits.push({ start: labelEnd(link), end, text });
  if (!keep) result.edits.push(...unwrap(context.body, link));
};

// 참조 링크 `[글자][이름]`: 정의를 지웠으면 안쪽 글자만 남김. 정의가 남으면 그대로 둠
const convertReference = (
  body: string,
  link: MarkdownNode,
  kept: Map<string, boolean>,
): Edit[] => {
  const keep = kept.get(link.identifier ?? "") === true;
  return keep ? [] : unwrap(body, link);
};

// 바꾸고 남은 `](`나 `]:`는 정규식이 읽지 못한 링크나 참조 정의일 수 있으며 원문 주소가 나갈 수 있음. 위치와 모양을 가리지 않고 예외로 그 노트를 보류하게 함 (2절, BLOG-32 가정 13, 15)
const HTML_LEFTOVER = /\](?:\(|:)/;

const assertNoHtmlLeftovers = ({ body, syntax }: LinkContext) => {
  for (const { start, end } of syntax.html) {
    const rest = HTML_HANDLED.reduce(
      (source, pattern) => source.replace(pattern, ""),
      body.slice(start, end),
    );
    const leftover = HTML_LEFTOVER.test(rest);
    if (leftover) throw new Error("읽지 못한 링크가 HTML 안에 남음");
  }
};

// HTML 블록 안의 `[글자](주소)`: 공개 여부와 상관없이 안쪽 글자만 남기고, 내부 대상은 모든 대상 칸에 넣음 (2절, BLOG-32 가정 11)
// 위키링크와 겹치면 위키링크가 처리함
const convertHtmlLinks = (
  context: LinkContext,
  wikilinks: readonly Range[],
  result: LinkEdits,
) => {
  assertNoHtmlLeftovers(context);
  const { body, syntax, publicPaths } = context;
  for (const { start, end, text, url } of matchHtml(
    body,
    syntax.html,
    HTML_LINK,
  )) {
    const range = { start, end };
    const swallowed = wikilinks.some((wikilink) => overlaps(wikilink, range));
    if (swallowed) continue;
    addNote(result, judge(url, publicPaths), false);
    result.edits.push({ ...range, text });
  }
};

// 위키링크가 통째로 감싼 마크다운 링크는 위키링크가 대신하므로 건너뜀
export const convertMarkdownLinks = (
  context: LinkContext,
  wikilinks: readonly Range[],
): LinkEdits => {
  const result: LinkEdits = { edits: [], warnings: [], notes: [] };
  const kept = convertDefinitions(context, result);
  for (const link of context.syntax.links) {
    const range = rangeOf(link);
    const swallowed = wikilinks.some((wikilink) => contains(wikilink, range));
    if (swallowed) continue;
    const isReference = link.type === "linkReference";
    if (isReference) {
      result.edits.push(...convertReference(context.body, link, kept));
      continue;
    }
    convertInline(context, link, result);
  }
  convertHtmlLinks(context, wikilinks, result);
  return result;
};
