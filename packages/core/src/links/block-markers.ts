import { insideAny } from "./syntax";
import type { Edit, LinkContext } from "../types";

// 줄 끝의 블록 표식 `^abc123`(앞에 공백이 있거나 줄에 표식만 있음). 표식은 영문자, 숫자, -로 씀 (Obsidian 문법)
const BLOCK_MARKER = /(?:^|[ \t]+)\^[A-Za-z0-9-]+[ \t]*(?=\r?$)/gm;

// 블록 참조를 노트 링크로 낮추므로 표식도 지움. 코드 안은 그대로 둠 (blog-plan.md 4-2 1절)
export const findBlockMarkers = ({ body, syntax }: LinkContext): Edit[] =>
  [...body.matchAll(BLOCK_MARKER)]
    .map((match) => ({
      start: match.index,
      end: match.index + match[0].length,
      text: "",
    }))
    .filter(({ end }) => !insideAny(end - 1, syntax.code));
