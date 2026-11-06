import type { Edit } from "../types";

export const applyEdit = (
  text: string,
  { start, end, text: to }: Edit,
): string => text.slice(0, start) + to + text.slice(end);

// 편집을 차례로 적용한 뒤의 위치를 처음 원문의 위치로 되돌림. 바뀐 글자 안의 위치는 그 편집의 시작으로 봄
export const toOriginal = (
  position: number,
  history: readonly Edit[],
): number =>
  history.reduceRight((at, { start, end, text }) => {
    const afterEdit = at >= start + text.length;
    return afterEdit ? at + end - start - text.length : Math.min(at, start);
  }, position);
