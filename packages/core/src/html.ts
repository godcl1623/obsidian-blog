import { findSpans } from "./markdown";
import type { Edit } from "./types";

// 허용 태그 이름 뒤에는 공백, /, > 가운데 하나가 와야 함(`<bra>`는 허용 밖). 속성 값 안의 >는 태그 끝이 아님
const ALLOWED_TAG =
  /^<(\/?)(br|sup|sub|kbd|mark|details|summary)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>/i;
// 인용 안에서는 줄바꿈 뒤의 `>`가 인용 표시이므로 태그 끝으로 보지 않고 모두 넘김
const QUOTED_TAG =
  /^<(\/?)(br|sup|sub|kbd|mark|details|summary)(?=[\s/>])(?:\n(?:[ \t]*>)*(?![ \t]*>)|[^>"'\n]|"[^"]*"|'[^']*')*>/i;

// HTML 노드 안의 <마다 허용 태그면 속성을 뺀 소문자 태그로, 아니면 &lt;로 바꿔 글자로 보이게 함 (blog-plan.md 4-2 2절)
// 편집은 앞에서 뒤 순서로 돌려줌
export const findTagEdits = (body: string): Edit[] => {
  const edits: Edit[] = [];
  for (const { type, start: from, end: until, quoted } of findSpans(body)) {
    if (type !== "html") continue;
    const allowed = quoted ? QUOTED_TAG : ALLOWED_TAG;
    let start = body.indexOf("<", from);
    while (start !== -1 && start < until) {
      const tag = allowed.exec(body.slice(start, until));
      const end = start + (tag ? tag[0].length : 1);
      const text = tag ? `<${tag[1]}${tag[2].toLowerCase()}>` : "&lt;";
      if (body.slice(start, end) !== text) edits.push({ start, end, text });
      start = body.indexOf("<", end);
    }
  }
  return edits;
};
