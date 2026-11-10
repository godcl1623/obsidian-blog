import {
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  type Node,
} from "yaml";
import { HOLD_REASON, PRIVATE } from "../constants";
import type { Decision, ParsedFrontmatter, Step } from "../types";

const held = (line?: number): Decision => {
  const noLine = line === undefined;

  return noLine
    ? { kind: "held", reason: HOLD_REASON.BROKEN }
    : { kind: "held", reason: HOLD_REASON.BROKEN, line };
};

// 첫 줄이 정확히 `---`일 때만 frontmatter로 봄. 닫는 `---`가 없으면 보류함
export const extractFrontmatter = (content: string): Step<string> => {
  const lines = content.split(/\r?\n/);
  const hasFrontmatter = lines[0] === "---";
  if (!hasFrontmatter) return { decision: PRIVATE };

  const end = lines.indexOf("---", 1);
  const unclosed = end === -1;
  if (unclosed) return { decision: held(1) };

  return { value: lines.slice(1, end).join("\n") };
};

// YAML은 따옴표 안의 단독 CR, U+2028, U+2029를 줄바꿈으로 보지 않지만 정규식의 m 플래그는 줄 끝으로 보므로,
// 둘이 보는 줄이 어긋나지 않게 보류함 (CRLF의 CR은 frontmatter를 꺼낼 때 이미 나눔)
export const checkLineSeparators = (
  frontmatter: string,
): Decision | undefined => {
  const separator = frontmatter.search(/[\r\u2028\u2029]/);
  const noSeparator = separator === -1;
  if (noSeparator) return;

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
  const empty = map === null;
  if (empty) return;

  const mapping = isMap(map);
  if (!mapping) return heldAt(map);

  // JSON 형식은 키에 따옴표가 붙어 정확한 `publish: true` 줄이 생길 수 없으므로, publish를 쓰면 YAML로 바꾸게 보류함
  const publishInJson = map.flow && /publish/i.test(text);
  if (publishInJson) return heldAt(map);

  for (const { key, value } of map.items) {
    const oneLineKey = oneLine(key);
    if (!oneLineKey) return heldAt(key as Node);

    const list =
      isSeq(value) &&
      value.tag === undefined &&
      value.anchor === undefined &&
      value.items.every(oneLine);
    const badValue = value !== null && !oneLine(value) && !list;
    if (badValue) return heldAt(value as Node);
  }

  return;
};
