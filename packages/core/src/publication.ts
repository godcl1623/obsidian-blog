import {
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  type Node,
} from "yaml";

export type Decision =
  | { kind: "public" }
  | { kind: "private" }
  | { kind: "held"; reason: string; line?: number };

// 보류 사유는 알림으로 나가므로 고정 문구와 줄 번호만 담음. 해석기 오류 문구에는 노트 원문이 섞일 수 있음 (blog-plan.md 4-2 2절)
const BROKEN = "frontmatter를 읽을 수 없음";

// 공개는 frontmatter에 정확히 `publish: true`인 줄과 승인 목록의 경로가 모두 있을 때만임 (blog-plan.md 2절, 4-1 (0), 4-2 4절)
export function decidePublication(
  path: string,
  content: string,
  approvals: readonly string[],
): Decision {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return { kind: "private" };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { kind: "held", reason: BROKEN, line: 1 };

  const frontmatter = lines.slice(1, end).join("\n");
  const lineCounter = new LineCounter();
  const doc = parseDocument(frontmatter, { lineCounter });
  const [error] = doc.errors;
  if (error) {
    const pos = error.linePos?.[0];
    return pos
      ? { kind: "held", reason: BROKEN, line: pos.line + 1 }
      : { kind: "held", reason: BROKEN };
  }

  // Obsidian 속성 형식(https://obsidian.md/help/properties)이 아니면 보류함: 최상위는 `이름: 값` 묶음이고,
  // 값은 한 줄짜리 값이나 한 줄짜리 값의 목록임. 앵커, 별칭, 태그, 여러 줄 값, 중첩 묶음은 쓰지 않음
  // 해석한 문서의 노드에는 늘 range가 있음
  const held = (node: Node): Decision => ({
    kind: "held",
    reason: BROKEN,
    line: lineCounter.linePos(node.range![0]).line + 1,
  });
  const oneLine = (node: unknown) =>
    isScalar(node) &&
    node.tag === undefined &&
    node.anchor === undefined &&
    !frontmatter.slice(node.range![0], node.range![1]).includes("\n");
  const map = doc.contents;
  if (map !== null) {
    if (!isMap(map)) return held(map);
    // JSON 형식은 키에 따옴표가 붙어 정확한 `publish: true` 줄이 생길 수 없으므로, publish를 쓰면 YAML로 바꾸게 보류함
    if (map.flow && /publish/i.test(frontmatter)) return held(map);
    for (const { key, value } of map.items) {
      if (!oneLine(key)) return held(key as Node);
      const list =
        isSeq(value) &&
        value.tag === undefined &&
        value.anchor === undefined &&
        value.items.every(oneLine);
      if (value !== null && !oneLine(value) && !list)
        return held(value as Node);
    }
  }

  // 설정은 frontmatter 안에서 앞뒤에 다른 글자가 없는 줄만 인정함. 줄 위치는 상관없음.
  // 대소문자, 따옴표, 공백, 값 표기가 다르면 설정이 없는 것으로 봄
  if (/^private: true$/m.test(frontmatter)) return { kind: "private" };
  if (!/^publish: true$/m.test(frontmatter)) return { kind: "private" };

  if (!approvals.includes(path)) {
    return { kind: "held", reason: "승인 없음" };
  }
  return { kind: "public" };
}
