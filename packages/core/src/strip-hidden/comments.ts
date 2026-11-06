import { WARNING } from "../constants";
import { findSpans } from "./code-spans";
import type { Edit, Span, WarningMessage } from "../types";

type Found = { edit: Edit; warning?: WarningMessage };

const remove = (start: number, end: number): Edit => ({ start, end, text: "" });

const inside = (position: number, spans: readonly Span[]) =>
  spans.some(({ start, end }) => start <= position && position < end);

// 코드 밖에서 처음 나오는 표시의 위치. 없으면 -1
const findOutside = (body: string, mark: string, code: readonly Span[]) => {
  let start = body.indexOf(mark);
  while (start !== -1 && inside(start, code)) {
    start = body.indexOf(mark, start + 1);
  }
  return start;
};

// 연 위치 뒤에서 처음 나오는 닫는 표시까지 지우고, until 안에서 닫히지 않으면 until까지 지우고 경고함
const removeUntilClose = (
  body: string,
  start: number,
  close: string,
  until: number,
  warning: WarningMessage,
): Found => {
  // 여는 위치 두 글자 뒤부터 찾음: %%는 여는 두 글자 뒤, -->는 <!-->와 <!--->도 닫힌 주석이기 때문
  const end = body.indexOf(close, start + 2);
  return end !== -1 && end + close.length <= until
    ? { edit: remove(start, end + close.length) }
    : { edit: remove(start, until), warning };
};

// 코드 밖에서 처음 나오는 %%에서 열고, 코드와 상관없이 다음 %%에서 닫음. HTML 안의 %%도 주석임 (BLOG-31 가정 1)
// 닫히지 않으면 노트 끝까지 지움 (blog-plan.md 4-2 2절)
const findPercentComment = (
  body: string,
  code: readonly Span[],
): Found | undefined => {
  const start = findOutside(body, "%%", code);
  if (start === -1) return undefined;
  return removeUntilClose(
    body,
    start,
    "%%",
    body.length,
    WARNING.UNCLOSED_COMMENT,
  );
};

// 코드 밖에서 처음 나오는 <!--에서 열고 -->에서 닫음. HTML 노드 안에서 열면 그 노드 안에서만 닫고 없으면 노드 끝까지 지움 (BLOG-31 가정 2)
// 노드 밖(문단 글자, 이미지 대체 글, 링크 제목)에서 열면 코드와 상관없이 다음 -->에서 닫고 없으면 노트 끝까지 지움 (BLOG-31 가정 6)
const findHtmlComment = (
  body: string,
  code: readonly Span[],
  html: readonly Span[],
): Found | undefined => {
  const start = findOutside(body, "<!--", code);
  if (start === -1) return undefined;
  const node = html.find((span) => inside(start, [span]));
  return removeUntilClose(
    body,
    start,
    "-->",
    node ? node.end : body.length,
    WARNING.UNCLOSED_HTML_COMMENT,
  );
};

// %% 주석과 HTML 주석 가운데 먼저 열린 것 하나를 찾음. 먼저 연 쪽 안의 다른 표시는 주석 내용임
export const findComment = (body: string): Found | undefined => {
  const spans = findSpans(body);
  const code = spans.filter(({ type }) => type !== "html");
  const html = spans.filter(({ type }) => type === "html");
  const found = [
    findPercentComment(body, code),
    findHtmlComment(body, code, html),
  ];
  return found
    .filter((item) => item !== undefined)
    .sort((a, b) => a.edit.start - b.edit.start)[0];
};
