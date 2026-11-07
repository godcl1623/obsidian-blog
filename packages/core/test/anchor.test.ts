import { describe, expect, it } from "vitest";
import { headingSlug } from "../src/index";

interface Row {
  name: string;
  basis: string;
  heading: string;
  expected: string;
}

// 기대 출력은 github-slugger 규칙(소문자, 공백은 -, 문장 부호는 지움, 한글은 그대로)임
describe("제목 앵커는 github-slugger로 만들고 core 진입점에서 내보냄", () => {
  it.each<Row>([
    {
      name: "한글은 그대로",
      basis: "4-2 1절, 4-3 A2",
      heading: "설치",
      expected: "설치",
    },
    {
      name: "공백은 -",
      basis: "4-2 1절, 4-3 A2",
      heading: "설치 방법 정리",
      expected: "설치-방법-정리",
    },
    {
      name: "대문자는 소문자",
      basis: "4-2 1절, 4-3 A2",
      heading: "Astro Setup",
      expected: "astro-setup",
    },
    {
      name: "문장 부호는 지움",
      basis: "4-2 1절, 4-3 A2",
      heading: "1. 무엇? (요약)",
      expected: "1-무엇-요약",
    },
    {
      name: "같은 제목을 두 번 넣어도 번호를 붙이지 않음",
      basis: "BLOG-32 가정 8",
      heading: "설치",
      expected: "설치",
    },
  ])("$name ($basis)", ({ heading, expected }) => {
    expect(headingSlug(heading)).toBe(expected);
  });
});
