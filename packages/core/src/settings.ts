import { PRIVATE } from "./constants";
import type { Decision } from "./types";

// 설정은 frontmatter 안에서 앞뒤에 다른 글자가 없는 줄만 인정함. 줄 위치는 상관없음.
// 대소문자, 따옴표, 공백, 값 표기가 다르면 설정이 없는 것으로 봄. private는 publish보다 우선함 (blog-plan.md 2절)
export const checkSettings = (frontmatter: string): Decision | undefined =>
  /^private: true$/m.test(frontmatter) || !/^publish: true$/m.test(frontmatter)
    ? PRIVATE
    : undefined;
