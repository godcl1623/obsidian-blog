import { isMap, isScalar, parseDocument } from "yaml";

export type Decision =
  | { kind: "public" }
  | { kind: "private" }
  | { kind: "held"; reason: string; line?: number };

// 보류 사유는 알림으로 나가므로 고정 문구와 줄 번호만 담음. 해석기 오류 문구에는 노트 원문이 섞일 수 있음 (blog-plan.md 4-2 2절)
const BROKEN = "frontmatter를 읽을 수 없음";

// 공개는 frontmatter `publish: true`(boolean)와 승인 목록의 경로가 모두 있을 때만임. 애매하면 비공개 (blog-plan.md 2절, 4-1 (0), 4-2 4절)
export function decidePublication(
  path: string,
  content: string,
  approvals: readonly string[],
): Decision {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return { kind: "private" };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { kind: "held", reason: BROKEN, line: 1 };

  const doc = parseDocument(lines.slice(1, end).join("\n"));
  const [error] = doc.errors;
  if (error) {
    const pos = error.linePos?.[0];
    return pos
      ? { kind: "held", reason: BROKEN, line: pos.line + 1 }
      : { kind: "held", reason: BROKEN };
  }

  const map = doc.contents;
  if (!isMap(map)) return { kind: "private" };
  const fields = map.items.flatMap(({ key, value }) =>
    isScalar(key) ? [[String(key.value), value] as const] : [],
  );
  const named = (name: string) =>
    fields.filter(([key]) => key.toLowerCase() === name);
  // 원문이 소문자 true/false인 boolean만 인정함. True, "true", yes 등과 대소문자가 다른 키는 애매한 값으로 봄
  const literal = (node: unknown, word: "true" | "false") =>
    isScalar(node) && node.source === word && node.value === (word === "true");

  const privates = named("private");
  if (
    privates.some(
      ([key, value]) => key !== "private" || !literal(value, "false"),
    )
  ) {
    return { kind: "private" };
  }
  const publishes = named("publish");
  if (
    publishes.length !== 1 ||
    publishes[0][0] !== "publish" ||
    !literal(publishes[0][1], "true")
  ) {
    return { kind: "private" };
  }

  if (!approvals.includes(path)) {
    return { kind: "held", reason: "승인 없음" };
  }
  return { kind: "public" };
}
