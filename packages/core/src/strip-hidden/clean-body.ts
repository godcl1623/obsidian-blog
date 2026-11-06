import { findComment } from "./comments";
import { applyEdit, toOriginal } from "./text-edits";
import { findTagEdits } from "./html-tags";
import type { Edit, WarningMessage } from "../types";

// 주석을 하나씩 지우고 태그를 정리하기를 더 바뀌지 않을 때까지 되풀이함. 지운 결과가 새 주석이나 태그가 될 수 있기 때문
// 경고 줄 번호는 처음 본문 기준임
export const cleanBody = (original: string) => {
  let body = original;
  const history: Edit[] = [];
  const warnings: { message: WarningMessage; line: number }[] = [];
  const apply = (edit: Edit) => {
    body = applyEdit(body, edit);
    history.push(edit);
  };
  for (;;) {
    const found = findComment(body);
    if (found) {
      const offset = toOriginal(found.edit.start, history);
      const line = original.slice(0, offset).split("\n").length;
      if (found.warning) warnings.push({ message: found.warning, line });
      apply(found.edit);
      continue;
    }
    // 뒤의 편집부터 적용해 앞 편집의 위치가 그대로 맞게 함
    const tags = findTagEdits(body);
    if (tags.length === 0) return { body, warnings };
    tags.reverse().forEach(apply);
  }
};
