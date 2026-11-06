import { isScalar } from "yaml";
import { HOLD_REASON } from "../constants";
import { parseFrontmatter } from "../publish-decision/frontmatter-format";
import type { NoteParts, ParsedFrontmatter, Properties } from "../types";

// 공개로 판정된 노트를 frontmatter와 본문으로 나눔. 첫 줄과 닫는 줄의 기준은 extractFrontmatter와 같음
// lineOffset은 본문 앞의 줄 수. 공개 노트에서는 frontmatter를 꺼낼 수 있으므로 꺼낼 수 없으면 예외로 그 노트를 보류하게 함 (4-2 4절)
export const splitNote = (content: string): NoteParts => {
  const parts = content.split(/(\r?\n)/);
  const lines = parts.filter((_, index) => index % 2 === 0);
  const hasFrontmatter = lines[0] === "---";
  if (!hasFrontmatter) return { body: content, lineOffset: 0 };
  const end = lines.indexOf("---", 1);
  const unclosed = end === -1;
  if (unclosed) throw new Error(HOLD_REASON.BROKEN);
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
  const scalar = isScalar(node);
  if (!scalar) return;
  const { value, range } = node;
  const isNull = value === null;
  if (isNull) return;
  const isString = typeof value === "string";
  const written = isString ? value : text.slice(range![0], range![1]);
  const empty = written === "";
  return empty ? undefined : written;
};

// 허용 필드 가운데 원본에서 오는 값은 title, description뿐임. tags, aliases 등은 내보내지 않음 (4-2 3절, 4-3 A1)
export const readProperties = (frontmatter: string | undefined): Properties => {
  const absent = frontmatter === undefined;
  if (absent) return {};
  const parsed = parseFrontmatter(frontmatter);
  const broken = "decision" in parsed;
  if (broken) throw new Error(HOLD_REASON.BROKEN);
  const title = readText(parsed.value, "title");
  const description = readText(parsed.value, "description");
  return {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
  };
};
