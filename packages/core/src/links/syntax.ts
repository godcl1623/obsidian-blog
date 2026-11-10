import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { HtmlMatch, LinkSyntax, MarkdownNode, Range } from "../types";

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

// 같은 이름의 정의가 여럿이면 처음 것만 쓰임(CommonMark)
const firstDefinitions = (definitions: readonly MarkdownNode[]) => {
  const first = new Map<string, MarkdownNode>();

  for (const definition of definitions) {
    const { identifier = "" } = definition;
    const known = first.has(identifier);
    if (!known) first.set(identifier, definition);
  }

  return first;
};

// 참조 이미지만 쓰는 정의의 이름. 참조 이미지는 정의를 풀어 따로 바꾸므로(images.ts) 노트 대상에 넣지 않음 (BLOG-33)
const imageOnlyIdentifiers = (
  links: readonly MarkdownNode[],
  images: readonly MarkdownNode[],
) => {
  const linked = new Set(links.map(({ identifier }) => identifier));
  const referenced = images
    .filter(({ type }) => type === "imageReference")
    .map(({ identifier = "" }) => identifier);

  return new Set(referenced.filter((identifier) => !linked.has(identifier)));
};

// 코드 안은 처리하지 않으므로 범위만 모음 (4-2 1절). 이미지는 자식이 없음(대체 텍스트는 alt 문자열)
// 링크는 안쪽 글자에 위키링크와 이미지가 있을 수 있으므로 자식도 봄
export const readSyntax = (body: string): LinkSyntax => {
  const syntax: Omit<LinkSyntax, "defined" | "imageOnly"> = {
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

  return {
    ...syntax,
    defined: firstDefinitions(syntax.definitions),
    imageOnly: imageOnlyIdentifiers(syntax.links, syntax.images),
  };
};

// HTML 블록 안에서 HTML_LINK_BODY 모양(constants.ts)을 찾음. 묶음 1은 글자, 2는 <>나 &lt;>로 감싼 주소, 3은 감싸지 않은 주소 (BLOG-32 가정 16, BLOG-33 가정 13)
export const matchHtml = (
  body: string,
  html: readonly Range[],
  pattern: RegExp,
): HtmlMatch[] =>
  html.flatMap((block) =>
    [...body.slice(block.start, block.end).matchAll(pattern)].map((match) => {
      const [whole, text, angled, plain] = match;
      const start = block.start + match.index;

      return { start, end: start + whole.length, text, url: angled ?? plain };
    }),
  );

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
