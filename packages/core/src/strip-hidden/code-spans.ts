import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { SPAN_TYPES } from "../constants";
import type { Span } from "../types";

// 렌더링과 같은 문법(remark-parse, remark-gfm)으로 읽음 (blog-plan.md 4-3 A2)
const processor = unified().use(remarkParse).use(remarkGfm);

type Node = {
  type: string;
  value?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: Node[];
};

// 코드(펜스, 들여쓰기, 인라인)와 HTML 노드의 원문 범위와 값을 문서 순서대로 모음. 코드 안은 HTML로 읽히지 않음
// 값은 원문에서 줄 앞의 컨테이너 표시(인용의 >, 목록 들여쓰기)를 뺀 것임
export const findSpans = (text: string): Span[] => {
  const spans: Span[] = [];
  const visit = (node: Node) => {
    const type = SPAN_TYPES.find((spanType) => spanType === node.type);
    if (!type) return node.children?.forEach(visit);
    // remark-parse가 만든 노드에는 늘 위치와 값이 있음
    const { start, end } = node.position!;
    spans.push({
      type,
      start: start.offset!,
      end: end.offset!,
      value: node.value!,
    });
  };
  visit(processor.parse(text));
  return spans;
};
