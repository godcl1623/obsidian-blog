import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { LinkSyntax, MarkdownNode, Range } from "../types";

// 렌더링과 같은 문법(remark-parse, remark-gfm)으로 읽음 (blog-plan.md 4-3 A2)
const processor = unified().use(remarkParse).use(remarkGfm);

// remark-parse가 만든 노드에는 늘 위치가 있음
export const rangeOf = (node: MarkdownNode): Range => ({
  start: node.position!.start.offset!,
  end: node.position!.end.offset!,
});

const CODE_TYPES = ["code", "inlineCode"] as const;
const LINK_TYPES = ["link", "linkReference"] as const;
const IMAGE_TYPES = ["image", "imageReference"] as const;

// 코드 안은 처리하지 않으므로 범위만 모음 (4-2 1절). 이미지는 자식이 없음(대체 텍스트는 alt 문자열)
// 링크는 안쪽 글자에 위키링크와 이미지가 있을 수 있으므로 자식도 봄
export const readSyntax = (body: string): LinkSyntax => {
  const syntax: LinkSyntax = {
    code: [],
    html: [],
    links: [],
    images: [],
    definitions: [],
  };
  const visit = (node: MarkdownNode) => {
    const { type } = node;
    const isCode = CODE_TYPES.some((codeType) => codeType === type);
    if (isCode) {
      syntax.code.push(rangeOf(node));
      return;
    }
    const isHtml = type === "html";
    if (isHtml) {
      syntax.html.push(rangeOf(node));
      return;
    }
    const isImage = IMAGE_TYPES.some((imageType) => imageType === type);
    if (isImage) {
      syntax.images.push(node);
      return;
    }
    const isDefinition = type === "definition";
    if (isDefinition) {
      syntax.definitions.push(node);
      return;
    }
    const isLink = LINK_TYPES.some((linkType) => linkType === type);
    if (isLink) syntax.links.push(node);
    node.children?.forEach(visit);
  };
  visit(processor.parse(body));
  return syntax;
};

export const contains = (outer: Range, inner: Range): boolean =>
  outer.start <= inner.start && inner.end <= outer.end;

export const overlaps = (a: Range, b: Range): boolean =>
  a.start < b.end && b.start < a.end;

export const insideAny = (
  position: number,
  ranges: readonly Range[],
): boolean =>
  ranges.some(({ start, end }) => start <= position && position < end);

// 대괄호 링크에서 안쪽 글자가 끝나는 위치. 안쪽이 비었으면 여는 [ 바로 뒤
export const labelEnd = (node: MarkdownNode): number => {
  const { children = [] } = node;
  const last = children.at(-1);
  return last ? rangeOf(last).end : rangeOf(node).start + 1;
};
