import { applyEdits } from "./apply-edits";
import { findBlockMarkers } from "./block-markers";
import { convertMarkdownLinks } from "./markdown-links";
import { readSyntax } from "./syntax";
import {
  assertNoLeftovers,
  convertWikilinks,
  findWikilinks,
} from "./wikilinks";
import type { Converted, LinkedNote, Stripped } from "../types";

const unique = (notes: readonly LinkedNote[]) => [
  ...new Set(notes.map(({ path }) => path)),
];

// 위키링크와 표준 마크다운 링크를 최종 URL의 표준 마크다운 링크로 바꾸고, 비공개 대상과 로컬 링크는 표시 텍스트만 남김 (blog-plan.md 4-2 1절, 2절, 4-3 A2)
// stripHidden의 결과에만 부름(BLOG-31 가정 5). publicPaths는 공개 노트의 볼트 경로 목록
export const convertLinks = (
  stripped: Stripped,
  publicPaths: ReadonlySet<string>,
): Converted => {
  const { body, lineAt } = stripped;
  const context = { body, syntax: readSyntax(body), publicPaths, lineAt };
  const wikilinks = findWikilinks(context);
  assertNoLeftovers(context, wikilinks);
  const converted = [
    convertWikilinks(context, wikilinks),
    convertMarkdownLinks(context, wikilinks),
  ];
  const edits = [
    ...converted.flatMap((step) => step.edits),
    ...findBlockMarkers(context),
  ];
  const notes = converted.flatMap((step) => step.notes);
  return {
    body: applyEdits(body, edits),
    warnings: converted
      .flatMap((step) => step.warnings)
      .sort((a, b) => a.line - b.line),
    allTargets: unique(notes),
    publicTargets: unique(notes.filter(({ linked }) => linked)),
  };
};
