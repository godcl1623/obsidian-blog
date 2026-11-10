import { applyEdits } from "./apply-edits";
import { findBlockMarkers } from "./block-markers";
import { convertImages } from "./images";
import { convertMarkdownLinks } from "./markdown-links";
import { readSyntax } from "./syntax";
import {
  assertNoLeftovers,
  convertWikilinks,
  findEmbeds,
  findWikilinks,
} from "./wikilinks";
import type {
  Converted,
  LinkedNote,
  Stripped,
  VaultAttachments,
} from "../types";

const unique = (notes: readonly LinkedNote[]) => [
  ...new Set(notes.map(({ path }) => path)),
];

// 위키링크와 표준 마크다운 링크를 최종 URL의 표준 마크다운 링크로 바꾸고, 비공개 대상과 로컬 링크는 표시 텍스트만 남김 (blog-plan.md 4-2 1절, 2절, 4-3 A2)
// 이미지는 웹 주소의 이미지나 글자로 바꾸고, 남긴 이미지의 경로를 첨부 목록으로 돌려줌 (BLOG-33)
// stripHidden의 결과에만 부름(BLOG-31 가정 5). publicPaths는 공개 노트의 볼트 경로 목록
export const convertLinks = (
  stripped: Stripped,
  publicPaths: ReadonlySet<string>,
  vault: VaultAttachments,
): Converted => {
  const { body, lineAt } = stripped;
  const syntax = readSyntax(body);
  const context = { body, syntax, publicPaths, vault, lineAt };
  const wikilinks = findWikilinks(context);
  const embeds = findEmbeds(context);
  assertNoLeftovers(context, wikilinks);
  const allWikilinks = [...wikilinks, ...embeds];
  const links = [
    convertWikilinks(context, wikilinks),
    convertMarkdownLinks(context, allWikilinks),
  ];
  const images = convertImages(context, embeds, allWikilinks);
  const edits = [
    ...links.flatMap((step) => step.edits),
    ...images.edits,
    ...findBlockMarkers(context),
  ];
  const warnings = [
    ...links.flatMap((step) => step.warnings),
    ...images.warnings,
  ];
  const notes = links.flatMap((step) => step.notes);
  return {
    body: applyEdits(body, edits),
    warnings: warnings.sort((a, b) => a.line - b.line),
    allTargets: unique(notes),
    publicTargets: unique(notes.filter(({ linked }) => linked)),
    attachments: [...new Set(images.attachments)],
  };
};
