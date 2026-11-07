import { NOTE_EXTENSION } from "../constants";
import { noteUrl } from "../address/url";
import { headingSlug } from "./anchor";
import type { LinkTarget, Resolution } from "../types";

// `경로#제목#하위 제목` 또는 `경로#^블록`을 나눔. 경로가 비면 같은 노트, 빈 제목은 없는 것으로 봄 (blog-plan.md 4-2 1절)
export const parseTarget = (raw: string): LinkTarget => {
  const [path, ...rest] = raw.split("#");
  const fragment = rest.join("#");
  const block = fragment.startsWith("^");
  const headings = block ? [] : rest.filter((heading) => heading !== "");
  return { path, headings, block };
};

// 볼트 경로 목록과 맞춰 볼 노트 경로. `.md`가 없으면 붙임 (BLOG-32 가정 8)
export const notePath = (path: string): string => {
  const hasExtension = NOTE_EXTENSION.test(path);
  return hasExtension ? path : `${path}.md`;
};

// 표시 텍스트에 쓰는 노트 이름: 폴더 경로와 끝의 .md를 뺌 (4-2 1절)
export const noteName = (path: string): string =>
  path.split("/").at(-1)!.replace(NOTE_EXTENSION, "");

// 마지막 제목으로 앵커를 만듦. 블록 참조는 `#^블록`을 지우므로 앵커가 없음 (4-2 1절)
const anchor = ({ headings }: LinkTarget): string => {
  const last = headings.at(-1);
  const hasHeading = last !== undefined;
  return hasHeading ? `#${encodeURIComponent(headingSlug(last))}` : "";
};

// 경로 목록(공개 노트)에 정확히 있는 대상만 링크로 봄. 이름만 있는 링크, 없는 대상, 비공개 대상은 표시 텍스트만 남김 (4-1 (0), 4-2 1절)
// 같은 노트의 제목은 앵커만 남기고, 같은 노트의 블록이나 빈 대상은 표시 텍스트만 남김
export const resolveTarget = (
  target: LinkTarget,
  publicPaths: ReadonlySet<string>,
): Resolution => {
  const fragment = anchor(target);
  const sameNote = target.path === "";
  const noAnchor = fragment === "";
  if (sameNote) return noAnchor ? {} : { url: fragment };
  const note = notePath(target.path);
  const isPublic = publicPaths.has(note);
  return isPublic ? { url: `${noteUrl(note)}${fragment}`, note } : { note };
};

// 별칭이 없을 때의 표시 텍스트. 제목이 붙으면 "노트 > 제목", 블록 참조는 노트 이름, 같은 노트의 제목은 제목만 (4-2 1절, BLOG-32 가정 5)
export const defaultText = (target: LinkTarget): string => {
  const sameNote = target.path === "";
  const parts = sameNote
    ? target.headings
    : [noteName(target.path), ...target.headings];
  return parts.join(" > ");
};

// ASCII 문장 부호는 모두 \로 이스케이프할 수 있음(CommonMark). 표시 텍스트가 링크, 서식, HTML로 읽히지 않게 함 (BLOG-32 가정 6)
// &와 ;는 빼서 stripHidden이 만든 &lt;가 그대로 <로 보이게 함. 문자 참조는 글자로만 그려짐
const PUNCTUATION = /[!-%'-/:<-@[-`{-~]/g;

export const escapeText = (text: string): string =>
  text.replace(PUNCTUATION, "\\$&");

// 주소를 <>로 감싸 괄호나 공백이 있어도 주소가 끝나지 않게 함. 주소 안의 <, >, 줄바꿈은 인코딩되어 있음
export const destination = (url: string): string => `<${url}>`;
