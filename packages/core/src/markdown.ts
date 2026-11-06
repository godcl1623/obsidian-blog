import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Span } from "./types";

// 렌더링과 같은 문법(remark-parse, remark-gfm)으로 읽음 (blog-plan.md 4-3 A2)
const processor = unified().use(remarkParse).use(remarkGfm);

type Node = {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: Node[];
};

// 코드(펜스, 들여쓰기, 인라인)와 HTML 노드의 원문 범위를 문서 순서대로 모음. 코드 안은 HTML로 읽히지 않음
const SPAN_TYPES = ["code", "inlineCode", "html"];

// quoted는 인용 안의 노드인지임. 인용 안 노드의 원문 범위에는 줄마다 앞의 `>` 표시가 들어 있음
export const findSpans = (text: string): Span[] => {
  const spans: Span[] = [];
  const visit = (node: Node, quoted: boolean) => {
    if (!SPAN_TYPES.includes(node.type)) {
      const inQuote = quoted || node.type === "blockquote";
      return node.children?.forEach((child) => visit(child, inQuote));
    }
    // remark-parse가 만든 노드에는 늘 위치가 있음
    const { start, end } = node.position!;
    spans.push({
      type: node.type,
      start: start.offset!,
      end: end.offset!,
      quoted,
    });
  };
  visit(processor.parse(text), false);
  return spans;
};
