import { applyEdit } from "../strip-hidden/text-edits";
import type { Edit } from "../types";

// 뒤의 편집부터 적용해 앞 편집의 위치가 그대로 맞게 함
// 편집이 겹치면 어느 쪽이 맞는지 알 수 없으므로 예외로 그 노트를 보류하게 함 (blog-plan.md 4-2 4절)
export const applyEdits = (text: string, edits: readonly Edit[]): string => {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  sorted.forEach((edit, index) => {
    const next = sorted[index - 1];
    const overlap = next !== undefined && edit.end > next.start;
    if (overlap) throw new Error("링크 편집이 겹침");
  });
  return sorted.reduce(applyEdit, text);
};
