import type { Decision } from "./types";

// 보류 사유는 알림으로 나가므로 고정 문구만 담음. 해석기 오류 문구에는 노트 원문이 섞일 수 있음 (blog-plan.md 4-2 2절)
export const HOLD_REASON = {
  BROKEN: "frontmatter를 읽을 수 없음",
  UNAPPROVED: "승인 없음",
  NOT_NFC: "경로가 NFC가 아님",
  UNENCODABLE: "주소로 바꿀 수 없음",
  URL_CONFLICT: "URL 충돌",
} as const;

export const PUBLIC = { kind: "public" } as const satisfies Decision;
export const PRIVATE = { kind: "private" } as const satisfies Decision;

// 확장자 .md는 대소문자를 구분하지 않음 (BLOG-30 가정 8)
export const NOTE_EXTENSION = /\.md$/i;

// 넘으면 경고만 하고 그대로 내보냄. 줄이는 일은 사람이 함. 1MB는 1,048,576바이트 (blog-plan.md 4-2 1절, 4-3 A9, BLOG-33 가정 3)
const MEGABYTE = 1_048_576;
const MAX_IMAGE_MEGABYTES = 1;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MEGABYTES * MEGABYTE;
export const MAX_IMAGE_WIDTH = 2_560;

// 경고는 알림으로 나가므로 고정 문구만 담음. 지운 내용은 넣지 않음 (blog-plan.md 4-2 2절)
export const WARNING = {
  UNCLOSED_COMMENT: "닫히지 않은 %% 주석을 노트 끝까지 지움",
  UNCLOSED_HTML_COMMENT: "닫히지 않은 HTML 주석을 지움",
  BLOCK_REFERENCE: "블록 참조를 노트 링크로 바꿈",
  NOTE_EMBED: "노트 임베드를 링크로 바꿈",
  MEDIA_EMBED: "PDF, 오디오, 동영상 임베드를 파일 이름으로 바꿈",
  UNSUPPORTED_IMAGE: "지원하지 않는 형식의 이미지를 뺌",
  NO_IMAGE_INFO: "이미지 정보가 없는 이미지를 뺌",
  GPS_IMAGE: "GPS 정보가 있는 이미지를 뺌",
  LARGE_IMAGE: `${MAX_IMAGE_MEGABYTES}MB 또는 가로 ${MAX_IMAGE_WIDTH.toLocaleString("en-US")}px를 넘는 이미지를 그대로 내보냄`,
  EXTERNAL_IMAGE: "외부 이미지를 링크로 바꿈",
} as const;

// 내보내는 이미지 형식. 형식을 바꾸지 않고 대소문자를 구분하지 않음 (blog-plan.md 4-2 1절, 4-3 A9, BLOG-33 가정 2)
export const IMAGE_EXTENSION = /\.(?:png|jpe?g|gif|webp|avif)$/i;

// Obsidian이 이미지로 임베드하지만 내보내지 않는 형식. SVG는 XSS 위험으로 막음 (4-2 1절, BLOG-33 가정 4)
export const UNSUPPORTED_IMAGE_EXTENSION = /\.(?:bmp|svg)$/i;

// 이미지 너비를 넘기는 주소 조각 `#width=300`의 앞부분. 렌더링이 조각을 지우고 width 속성으로 바꿈 (4-2 1절, BLOG-33 가정 1)
export const WIDTH_FRAGMENT = "#width=";

// 내보내지 않고 파일 이름만 남기는 PDF, 오디오, 동영상 (4-2 1절, 4-3 A2)
export const MEDIA_EXTENSION =
  /\.(?:flac|m4a|mp3|ogg|wav|webm|3gp|mkv|mov|mp4|ogv|pdf)$/i;

// 원문 범위를 모으는 마크다운 노드 종류: 코드(펜스, 들여쓰기, 인라인)와 HTML
export const SPAN_TYPES = ["code", "inlineCode", "html"] as const;

// 웹 주소. 외부 링크로 그대로 두고, 외부 이미지는 이 주소의 링크로 바꿈 (blog-plan.md 4-2 1절, BLOG-33 가정 5)
export const WEB_URL = /^https?:\/\//i;

// HTML 블록 안의 `[글자](주소)`와 `![대체 텍스트](주소)`는 해석기가 링크나 이미지로 읽지 않으므로 정규식으로 찾음. `<주소>`의 <는 stripHidden이 &lt;로 바꿔 둠
// 주소 앞뒤에는 공백과 탭만, 제목은 따옴표로 감싼 것만 읽고 나머지 모양은 남은 `](`로 보류함 (BLOG-32 가정 16, BLOG-33 가정 13)
// 1은 글자, 2는 <>나 &lt;>로 감싼 주소, 3은 감싸지 않은 주소
const HTML_LINK_BODY = String.raw`\[([^[\]\n]*)\]\([ \t]*(?:(?:<|&lt;)([^<>\n]*)>|([^\s()]*))(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'))?[ \t]*\)`;

// 이스케이프한 `\[`와 이미지의 `[`는 링크가 아님 (BLOG-32 가정 16)
export const HTML_LINK = new RegExp(
  String.raw`(?<![!\\])${HTML_LINK_BODY}`,
  "g",
);

// 이미지 (4-2 1절, BLOG-33 가정 11)
export const HTML_IMAGE = new RegExp(`!${HTML_LINK_BODY}`, "g");

// 그대로 두는 외부 주소. 나머지 스킴과 경로 목록에 없는 주소는 표시 텍스트만 남김 (blog-plan.md 4-2 1절, 2절, BLOG-32 가정 3)
export const EXTERNAL_URL = new RegExp(`${WEB_URL.source}|^mailto:`, "i");
