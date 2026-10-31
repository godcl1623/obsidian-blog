import { HOLD_REASON, PUBLIC } from "./constants";
import {
  checkLineSeparators,
  checkPropertyFormat,
  extractFrontmatter,
  parseFrontmatter,
} from "./frontmatter";
import { checkSettings } from "./settings";
import type { Decision } from "./types";

// 승인 경로는 git이 저장한 경로 문자열과 글자 그대로 비교함 (blog-plan.md 4-1 (0))
const checkApproval = (path: string, approvals: readonly string[]): Decision =>
  approvals.includes(path)
    ? PUBLIC
    : { kind: "held", reason: HOLD_REASON.UNAPPROVED };

// 공개는 frontmatter에 정확히 `publish: true`인 줄과 승인 목록의 경로가 모두 있을 때만임 (blog-plan.md 2절, 4-1 (0), 4-2 4절)
// 판단은 단계마다의 함수가 하고, 여기서는 순서대로 불러 먼저 난 판정을 돌려줌
export const decidePublication = (
  path: string,
  content: string,
  approvals: readonly string[],
): Decision => {
  const extracted = extractFrontmatter(content);
  if ("decision" in extracted) return extracted.decision;
  const frontmatter = extracted.value;
  const separator = checkLineSeparators(frontmatter);
  if (separator) return separator;
  const parsed = parseFrontmatter(frontmatter);
  if ("decision" in parsed) return parsed.decision;
  return (
    checkPropertyFormat(parsed.value) ??
    checkSettings(frontmatter) ??
    checkApproval(path, approvals)
  );
};
