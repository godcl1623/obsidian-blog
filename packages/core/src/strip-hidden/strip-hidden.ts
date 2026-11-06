import { cleanBody } from "./clean-body";
import { readProperties, splitNote } from "./properties";
import type { Stripped } from "../types";

// 화면에 보이지 않지만 출력에 남으면 유출되는 내용(주석, HTML, frontmatter 필드)을 지움 (blog-plan.md 4-2 2절)
// 공개로 판정된 노트에만 부름. 링크 변환은 이 결과에 함(HTML 안에 있던 링크가 글자로 바뀌며 살아나기 때문, BLOG-31 가정 5)
export const stripHidden = (content: string): Stripped => {
  const { frontmatter, body, lineOffset } = splitNote(content);
  const cleaned = cleanBody(body);
  return {
    body: cleaned.body,
    ...readProperties(frontmatter),
    warnings: cleaned.warnings.map(({ message, line }) => ({
      message,
      line: line + lineOffset,
    })),
  };
};
