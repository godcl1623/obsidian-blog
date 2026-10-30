import { NOT_NFC, UNENCODABLE } from "./constants";

// 경로를 고치지 않고 보류만 함. 고치는 일은 사람이 함 (blog-plan.md 4-1 (0))
export const checkNfc = (path: string): string | undefined =>
  path.normalize("NFC") === path ? undefined : NOT_NFC;

// 짝 없는 서로게이트가 있으면 encodeURIComponent가 예외를 던짐 (BLOG-30 가정 6)
export const checkEncodable = (path: string): string | undefined =>
  path.isWellFormed() ? undefined : UNENCODABLE;

// .md를 빼고 남는 이름이 빈 문자열, `.`, `..`이면 주소가 폴더 주소가 되거나 브라우저가 다른 주소로 바꿈 (BLOG-30 가정 7, 8)
export const checkNoteName = (path: string): string | undefined =>
  /(^|\/)\.{0,2}\.md$/i.test(path) ? UNENCODABLE : undefined;
