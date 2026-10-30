import { describe, expect, it } from "vitest";
import { assetUrl, noteUrl } from "../src/url";

type Row = { name: string; basis: string; path: string; expected: string };

const table = (convert: (path: string) => string, rows: Row[]) =>
  it.each(rows)("$name ($basis)", ({ path, expected }) => {
    expect(convert(path)).toBe(expected);
  });

// 기대 출력의 인코딩 값: 개발 %EA%B0%9C%EB%B0%9C, 정리 %EC%A0%95%EB%A6%AC, 노트 %EB%85%B8%ED%8A%B8,
// 질문 %EC%A7%88%EB%AC%B8, 이미지 %EC%9D%B4%EB%AF%B8%EC%A7%80, 자료 %EC%9E%90%EB%A3%8C, 표 %ED%91%9C (조각마다 encodeURIComponent, BLOG-30 가정 1)
describe("노트 주소는 /notes/ 뒤에 볼트 경로에서 .md만 뺀 형태", () => {
  table(noteUrl, [
    {
      name: "볼트 루트 노트",
      basis: "3절, 4-3 A1",
      path: "README.md",
      expected: "/notes/README",
    },
    {
      name: "폴더 안 노트, 공백은 치환하지 않고 인코딩",
      basis: "3절",
      path: "개발/Astro 정리.md",
      expected: "/notes/%EA%B0%9C%EB%B0%9C/Astro%20%EC%A0%95%EB%A6%AC",
    },
    {
      name: "대소문자를 그대로 둠",
      basis: "3절, 4-3 A1",
      path: "Dev/ReadMe.md",
      expected: "/notes/Dev/ReadMe",
    },
    {
      name: "?, #, %는 인코딩",
      basis: "3절",
      path: "질문?/a#b%c.md",
      expected: "/notes/%EC%A7%88%EB%AC%B8%3F/a%23b%25c",
    },
    {
      name: "+, &, =도 인코딩",
      basis: "3절, BLOG-30 가정 1",
      path: "a+b&c=d.md",
      expected: "/notes/a%2Bb%26c%3Dd",
    },
    {
      name: "끝의 .md만 빼고 다른 점은 그대로",
      basis: "3절",
      path: "v1.2 노트.md",
      expected: "/notes/v1.2%20%EB%85%B8%ED%8A%B8",
    },
    {
      name: ".md가 두 번이면 끝의 하나만 뺌",
      basis: "3절",
      path: "노트.md.md",
      expected: "/notes/%EB%85%B8%ED%8A%B8.md",
    },
    {
      name: "짝이 맞는 서로게이트(이모지)는 4바이트로 인코딩",
      basis: "3절, BLOG-30 가정 1",
      path: "🙂.md",
      expected: "/notes/%F0%9F%99%82",
    },
    {
      name: "....md는 끝의 .md만 빼서 ...",
      basis: "3절, BLOG-30 가정 7",
      path: "....md",
      expected: "/notes/...",
    },
    {
      name: "폴더 이름의 .md는 빼지 않음",
      basis: "3절",
      path: "a.md/b.md",
      expected: "/notes/a.md/b",
    },
  ]);
});

describe("첨부 파일 주소는 /assets/ 뒤에 볼트 경로를 그대로 붙인 형태", () => {
  table(assetUrl, [
    {
      name: "폴더 안 이미지, 확장자를 둠",
      basis: "4-2 3절",
      path: "개발/이미지 1.png",
      expected:
        "/assets/%EA%B0%9C%EB%B0%9C/%EC%9D%B4%EB%AF%B8%EC%A7%80%201.png",
    },
    {
      name: "특수문자는 인코딩하고 확장자 대소문자는 그대로",
      basis: "3절, 4-2 3절",
      path: "a#b?.PNG",
      expected: "/assets/a%23b%3F.PNG",
    },
    {
      name: "이름에 .md가 들어간 첨부도 그대로 둠",
      basis: "4-2 3절",
      path: "자료/표.md.png",
      expected: "/assets/%EC%9E%90%EB%A3%8C/%ED%91%9C.md.png",
    },
  ]);
});
