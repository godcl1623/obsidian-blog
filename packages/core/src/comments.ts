import { WARNING } from "./constants";
import { findSpans } from "./markdown";
import type { Edit, Span, WarningMessage } from "./types";

type Found = { edit: Edit; warning?: WarningMessage };

const remove = (start: number, end: number): Edit => ({ start, end, text: "" });

const inside = (position: number, spans: readonly Span[]) =>
  spans.some(({ start, end }) => start <= position && position < end);

// 코드 밖에서 처음 나오는 %%에서 열고, 코드와 상관없이 다음 %%에서 닫음. HTML 안의 %%도 주석임 (BLOG-31 가정 1)
// 닫히지 않으면 노트 끝까지 지움 (blog-plan.md 4-2 2절)
const findPercentComment = (
  body: string,
  code: readonly Span[],
): Found | undefined => {
  let start = body.indexOf("%%");
  while (start !== -1 && inside(start, code)) {
    start = body.indexOf("%%", start + 1);
  }
  if (start === -1) return undefined;
  const close = body.indexOf("%%", start + 2);
  return close === -1
    ? {
        edit: remove(start, body.length),
        warning: WARNING.UNCLOSED_COMMENT,
      }
    : { edit: remove(start, close + 2) };
};

// HTML 노드 안의 <!--에서 열고 -->에서 닫음. 그 노드 안에서 닫히지 않으면 노드 끝까지 지움 (BLOG-31 가정 2)
// 닫는 -->를 <!-- 바로 뒤 두 글자부터 찾는 것은 <!-->와 <!--->도 닫힌 주석이기 때문
const findHtmlComment = (
  body: string,
  html: readonly Span[],
): Found | undefined => {
  for (const { start: from, end } of html) {
    const start = body.indexOf("<!--", from);
    if (start === -1 || start + 4 > end) continue;
    const close = body.indexOf("-->", start + 2);
    return close !== -1 && close + 3 <= end
      ? { edit: remove(start, close + 3) }
      : {
          edit: remove(start, end),
          warning: WARNING.UNCLOSED_HTML_COMMENT,
        };
  }
  return undefined;
};

// %% 주석과 HTML 주석 가운데 먼저 열린 것 하나를 찾음. 먼저 연 쪽 안의 다른 표시는 주석 내용임
export const findComment = (body: string): Found | undefined => {
  const spans = findSpans(body);
  const code = spans.filter(({ type }) => type !== "html");
  const html = spans.filter(({ type }) => type === "html");
  const found = [findPercentComment(body, code), findHtmlComment(body, html)];
  return found
    .filter((item) => item !== undefined)
    .sort((a, b) => a.edit.start - b.edit.start)[0];
};
