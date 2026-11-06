import {
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  type Node,
} from "yaml";
import { HOLD_REASON, PRIVATE } from "./constants";
import type { Decision, ParsedFrontmatter, Step } from "./types";

const held = (line?: number): Decision =>
  line === undefined
    ? { kind: "held", reason: HOLD_REASON.BROKEN }
    : { kind: "held", reason: HOLD_REASON.BROKEN, line };

// 첫 줄이 정확히 `---`일 때만 frontmatter로 봄. 닫는 `---`가 없으면 보류함
export const extractFrontmatter = (content: string): Step<string> => {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return { decision: PRIVATE };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { decision: held(1) };
  return { value: lines.slice(1, end).join("\n") };
};

// YAML은 따옴표 안의 단독 CR, U+2028, U+2029를 줄바꿈으로 보지 않지만 정규식의 m 플래그는 줄 끝으로 보므로,
// 둘이 보는 줄이 어긋나지 않게 보류함 (CRLF의 CR은 frontmatter를 꺼낼 때 이미 나눔)
export const checkLineSeparators = (
  frontmatter: string,
): Decision | undefined => {
  const separator = frontmatter.search(/[\r\u2028\u2029]/);
  if (separator === -1) return undefined;
  return held(frontmatter.slice(0, separator).split("\n").length + 1);
};

export const parseFrontmatter = (text: string): Step<ParsedFrontmatter> => {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });
  const [error] = doc.errors;
  if (!error) return { value: { text, doc, lineCounter } };
  const pos = error.linePos?.[0];
  return { decision: held(pos && pos.line + 1) };
};

// Obsidian 속성 형식(https://obsidian.md/help/properties)이 아니면 보류함: 최상위는 `이름: 값` 묶음이고,
// 값은 한 줄짜리 값이나 한 줄짜리 값의 목록임. 앵커, 별칭, 태그, 여러 줄 값, 중첩 묶음은 쓰지 않음
export const checkPropertyFormat = ({
  text,
  doc,
  lineCounter,
}: ParsedFrontmatter): Decision | undefined => {
  // 해석한 문서의 노드에는 늘 range가 있음
  const heldAt = (node: Node) =>
    held(lineCounter.linePos(node.range![0]).line + 1);
  const oneLine = (node: unknown) =>
    isScalar(node) &&
    node.tag === undefined &&
    node.anchor === undefined &&
    !text.slice(node.range![0], node.range![1]).includes("\n");
  const map = doc.contents;
  if (map === null) return undefined;
  if (!isMap(map)) return heldAt(map);
  // JSON 형식은 키에 따옴표가 붙어 정확한 `publish: true` 줄이 생길 수 없으므로, publish를 쓰면 YAML로 바꾸게 보류함
  if (map.flow && /publish/i.test(text)) return heldAt(map);
  for (const { key, value } of map.items) {
    if (!oneLine(key)) return heldAt(key as Node);
    const list =
      isSeq(value) &&
      value.tag === undefined &&
      value.anchor === undefined &&
      value.items.every(oneLine);
    if (value !== null && !oneLine(value) && !list)
      return heldAt(value as Node);
  }
  return undefined;
};

// 공개로 판정된 노트를 frontmatter와 본문으로 나눔. 첫 줄과 닫는 줄의 기준은 extractFrontmatter와 같음
// lineOffset은 본문 앞의 줄 수. 공개 노트에서는 frontmatter를 꺼낼 수 있으므로 꺼낼 수 없으면 예외로 그 노트를 보류하게 함 (4-2 4절)
export const splitNote = (content: string) => {
  const parts = content.split(/(\r?\n)/);
  const lines = parts.filter((_, index) => index % 2 === 0);
  if (lines[0] !== "---") return { body: content, lineOffset: 0 };
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new Error(HOLD_REASON.BROKEN);
  return {
    frontmatter: lines.slice(1, end).join("\n"),
    body: parts.slice(2 * end + 2).join(""),
    lineOffset: end + 1,
  };
};

// 문자열은 값 그대로, 숫자와 참거짓은 원문 글자 그대로 씀. 목록, 빈 값, null은 없는 것으로 봄 (BLOG-31 가정 3)
const readText = (
  { text, doc }: ParsedFrontmatter,
  key: string,
): string | undefined => {
  const node = doc.get(key, true);
  if (!isScalar(node) || node.value === null) return undefined;
  const value =
    typeof node.value === "string"
      ? node.value
      : text.slice(node.range![0], node.range![1]);
  return value === "" ? undefined : value;
};

// 허용 필드 가운데 원본에서 오는 값은 title, description뿐임. tags, aliases 등은 내보내지 않음 (4-2 3절, 4-3 A1)
export const readProperties = (frontmatter: string | undefined) => {
  if (frontmatter === undefined) return {};
  const parsed = parseFrontmatter(frontmatter);
  if ("decision" in parsed) throw new Error(HOLD_REASON.BROKEN);
  const title = readText(parsed.value, "title");
  const description = readText(parsed.value, "description");
  return {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
  };
};
