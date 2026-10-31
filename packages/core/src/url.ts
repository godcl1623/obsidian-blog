import { NOTE_EXTENSION } from "./constants";

// 경로를 `/`로 나눈 조각마다 인코딩함. 한글도 %XX로 바뀜 (blog-plan.md 3절, BLOG-30 가정 1)
const encodePath = (path: string): string =>
  path.split("/").map(encodeURIComponent).join("/");

// 볼트 경로에서 끝의 .md만 빼고 공백 치환, 대소문자 변환 등은 하지 않음 (blog-plan.md 3절, 4-3 A1)
export const noteUrl = (path: string): string =>
  `/notes/${encodePath(path.replace(NOTE_EXTENSION, ""))}`;

export const assetUrl = (path: string): string => `/assets/${encodePath(path)}`;
