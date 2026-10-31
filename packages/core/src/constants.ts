import type { Decision } from "./types";

// 보류 사유는 알림으로 나가므로 고정 문구만 담음. 해석기 오류 문구에는 노트 원문이 섞일 수 있음 (blog-plan.md 4-2 2절)
export const HOLD_REASON = {
  BROKEN: "frontmatter를 읽을 수 없음",
  UNAPPROVED: "승인 없음",
  NOT_NFC: "경로가 NFC가 아님",
  UNENCODABLE: "주소로 바꿀 수 없음",
  URL_CONFLICT: "URL 충돌",
} as const;

export const PUBLIC: Decision = { kind: "public" };
export const PRIVATE: Decision = { kind: "private" };

// 확장자 .md는 대소문자를 구분하지 않음 (BLOG-30 가정 8)
export const NOTE_EXTENSION = /\.md$/i;
