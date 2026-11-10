import { findSpans } from "./code-spans";
import type { Edit, Span } from "../types";

// 허용 태그 이름 뒤에는 공백, /, > 가운데 하나가 와야 함(`<bra>`는 허용 밖). 속성 값 안의 >는 태그 끝이 아님
const ALLOWED_TAG =
  /^<(\/?)(br|sup|sub|kbd|mark|details|summary)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>/i;

// HTML 노드 값의 위치를 원문 위치로 바꾸는 함수. 값은 원문에서 줄 앞의 컨테이너 표시를 뺀 것이므로 줄마다 끝을 맞춤
// 줄 끝이 맞지 않으면(표시 뒤의 탭이 공백으로 바뀐 경우 등) 위치를 알 수 없으므로 예외로 그 노트를 보류하게 함 (4-2 4절)
const valueToSource = (body: string, { start, end, value }: Span) => {
  const source = body.slice(start, end).split("\n");
  const lines = value.split("\n");
  const sameLineCount = source.length === lines.length;
  const aligned =
    sameLineCount && source.every((line, index) => line.endsWith(lines[index]));
  if (!aligned) throw new Error("HTML 위치를 원문과 맞출 수 없음");

  const lineStarts: number[] = [];
  let at = start;

  source.forEach((line, index) => {
    lineStarts.push(at + line.length - lines[index].length);
    at += line.length + 1;
  });

  return (position: number) => {
    const before = value.slice(0, position).split("\n");

    return lineStarts[before.length - 1] + before[before.length - 1].length;
  };
};

// HTML 노드 값의 <마다 허용 태그면 속성을 뺀 소문자 태그로, 아니면 &lt;로 바꿔 글자로 보이게 함 (blog-plan.md 4-2 2절)
// 해석기가 컨테이너 표시를 뺀 값에서 태그를 찾으므로 인용 안에서도 줄 앞의 >를 태그 끝으로 읽지 않음. 편집은 앞에서 뒤 순서로 돌려줌
export const findTagEdits = (body: string): Edit[] => {
  const edits: Edit[] = [];

  for (const span of findSpans(body)) {
    const isHtml = span.type === "html";
    if (!isHtml) continue;

    const { value } = span;
    const toSource = valueToSource(body, span);
    // 찾는 위치가 매번 뒤로 가므로 반복이 끝남
    let start = value.indexOf("<");

    while (true) {
      const notFound = start === -1;
      if (notFound) break;

      const tag = ALLOWED_TAG.exec(value.slice(start));
      const end = start + (tag ? tag[0].length : 1);
      const text = tag ? `<${tag[1]}${tag[2].toLowerCase()}>` : "&lt;";
      const from = toSource(start);
      const to = toSource(end - 1) + 1;
      const changed = body.slice(from, to) !== text;
      if (changed) edits.push({ start: from, end: to, text });

      start = value.indexOf("<", end);
    }
  }

  return edits;
};
