import { findComment } from "./comments";
import { applyEdit, toOriginal } from "./text-edits";
import { findTagEdits } from "./html-tags";
import type { CleanedBody, Edit, Warning } from "../types";

// 주석을 하나씩 지우고 태그를 정리하기를 더 바뀌지 않을 때까지 되풀이함. 지운 결과가 새 주석이나 태그가 될 수 있기 때문
// 경고 줄 번호는 처음 본문 기준임
// 반복이 끝나는 근거: 바퀴마다 주석 하나를 지우거나(길이가 줄고 <는 늘지 않음), 허용 밖의 <를 &lt;로 바꾸거나(<가 줄어듦),
// 허용 태그를 정규형으로 맞춤(<는 늘지 않고, 속성이 빠지면 길이가, 대소문자만 다르면 대문자가 줄어듦). 정규형인 태그는 편집하지 않으므로
// (< 개수, 길이, 대문자 수)가 바퀴마다 사전순으로 줄어듦
export const cleanBody = (original: string): CleanedBody => {
  let body = original;
  const history: Edit[] = [];
  const warnings: Warning[] = [];
  const apply = (edit: Edit) => {
    body = applyEdit(body, edit);
    history.push(edit);
  };
  while (true) {
    const found = findComment(body);
    if (found) {
      const { edit, warning } = found;
      const offset = toOriginal(edit.start, history);
      const line = original.slice(0, offset).split("\n").length;
      if (warning) warnings.push({ message: warning, line });
      apply(edit);
      continue;
    }
    // 뒤의 편집부터 적용해 앞 편집의 위치가 그대로 맞게 함
    const tags = findTagEdits(body);
    const settled = tags.length === 0;
    if (settled) return { body, warnings, history };
    tags.reverse().forEach(apply);
  }
};
