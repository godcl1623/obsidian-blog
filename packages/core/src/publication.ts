import { parseDocument } from "yaml";

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
  const [error] = parseDocument(frontmatter).errors;
  if (error) {
    const pos = error.linePos?.[0];
    return pos
      ? { kind: "held", reason: BROKEN, line: pos.line + 1 }
      : { kind: "held", reason: BROKEN };
  }

  // 설정은 frontmatter 안에서 앞뒤에 다른 글자가 없는 줄만 인정함. 줄 위치는 상관없음.
  // 대소문자, 따옴표, 공백, 값 표기가 다르면 설정이 없는 것으로 봄
  // YAML로 읽히는 frontmatter에서 열 0의 이 줄은 늘 최상위 키임 (문자열이나 묶음 안이면 YAML 오류)
  if (/^private: true$/m.test(frontmatter)) return { kind: "private" };
  if (!/^publish: true$/m.test(frontmatter)) return { kind: "private" };

  if (!approvals.includes(path)) {
    return { kind: "held", reason: "승인 없음" };
  }
  return { kind: "public" };
}
