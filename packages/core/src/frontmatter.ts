import {
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  type Node,
} from "yaml";
import { BROKEN, PRIVATE } from "./constants";
import type { Decision, ParsedFrontmatter, Step } from "./types";

const held = (line?: number): Decision =>
  line === undefined
    ? { kind: "held", reason: BROKEN }
    : { kind: "held", reason: BROKEN, line };

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
