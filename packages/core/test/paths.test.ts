import { describe, expect, it } from "vitest";
import { checkAssetPaths, checkNotePaths } from "../src/paths";

// 가짜 경로만 씀. 실제 볼트는 열지 않음 (blog-plan.md 4-2 6절)
const nfd = (path: string) => path.normalize("NFD");
// 짝 없는 서로게이트. 주소로 인코딩할 수 없음
const BROKEN_CHAR = "\uD800";

const NOT_NFC = "경로가 NFC가 아님";
const UNENCODABLE = "주소로 바꿀 수 없음";
const CONFLICT = "URL 충돌";

type Row = {
  name: string;
  basis: string;
  paths: string[];
  expected: Record<string, string>;
};

// 기대 출력은 보류할 경로와 사유. 없는 경로는 보류하지 않음
const table = (
  check: (paths: readonly string[]) => Map<string, string>,
  rows: Row[],
) =>
  it.each(rows)("$name ($basis)", ({ paths, expected }) => {
    expect(Object.fromEntries(check(paths))).toEqual(expected);
  });

// 가정 4·6은 blog-plan.md에 없는 BLOG-30의 사용자 결정(2026-10-30): NFC가 아닌 경로도 충돌 비교에 넣고,
// 주소로 바꿀 수 없는 경로는 뺌. 사유는 하나만 돌려주며 NFC가 먼저임. 대소문자만 다르면 충돌이 아님
describe("노트 경로 형식", () => {
  table(checkNotePaths, [
    {
      name: "NFC 경로 하나 → 보류 없음",
      basis: "3절",
      paths: ["개발/노트.md"],
      expected: {},
    },
    {
      name: "파일 이름이 NFC가 아님 → 보류",
      basis: "4-1 (0), 4-2 4절",
      paths: [nfd("개발/노트.md")],
      expected: { [nfd("개발/노트.md")]: NOT_NFC },
    },
    {
      name: "폴더 이름만 NFC가 아님 → 보류",
      basis: "4-1 (0), 4-2 4절",
      paths: [`${nfd("개발")}/note.md`],
      expected: { [`${nfd("개발")}/note.md`]: NOT_NFC },
    },
    {
      name: "짝 없는 서로게이트 → 보류",
      basis: "BLOG-30 가정 6",
      paths: [`노트${BROKEN_CHAR}.md`],
      expected: { [`노트${BROKEN_CHAR}.md`]: UNENCODABLE },
    },
    {
      name: "NFC가 아니면서 서로게이트도 있음 → NFC 사유만",
      basis: "BLOG-30 가정 6",
      paths: [nfd(`노트${BROKEN_CHAR}.md`)],
      expected: { [nfd(`노트${BROKEN_CHAR}.md`)]: NOT_NFC },
    },
    {
      name: "낮은 서로게이트만 있음 → 보류",
      basis: "BLOG-30 가정 6",
      paths: ["노트\uDC00.md"],
      expected: { "노트\uDC00.md": UNENCODABLE },
    },
    {
      name: "서로게이트 쌍의 순서가 뒤집힘 → 보류",
      basis: "BLOG-30 가정 6",
      paths: ["노트\uDC00\uD800.md"],
      expected: { "노트\uDC00\uD800.md": UNENCODABLE },
    },
    {
      name: "짝이 맞는 서로게이트(이모지) → 보류 없음",
      basis: "3절, BLOG-30 가정 6",
      paths: ["노트🙂.md"],
      expected: {},
    },
    {
      name: "결합 악센트가 분리된 라틴 문자 → 보류",
      basis: "3절, 4-1 (0)",
      paths: ["e\u0301.md"],
      expected: { "e\u0301.md": NOT_NFC },
    },
    {
      name: "NFC가 다른 글자로 바꾸는 옹스트롬 기호 → 보류",
      basis: "3절, 4-1 (0)",
      paths: ["\u212B.md"],
      expected: { "\u212B.md": NOT_NFC },
    },
    {
      name: "NFC가 통합 한자로 바꾸는 CJK 호환 한자 → 보류",
      basis: "3절, 4-1 (0), 4-3 A1",
      paths: ["\uF900.md"],
      expected: { "\uF900.md": NOT_NFC },
    },
    {
      name: "NFKC만 바꾸는 합자 → 보류 없음",
      basis: "3절, 4-1 (0)",
      paths: ["\uFB01.md"],
      expected: {},
    },
    {
      name: "NFKC만 바꾸는 전각 문자 → 보류 없음",
      basis: "3절, 4-1 (0)",
      paths: ["\uFF21.md"],
      expected: {},
    },
    {
      name: "NFKC만 바꾸는 한글 호환 자모 → 보류 없음",
      basis: "3절, 4-1 (0)",
      paths: ["\u3131.md"],
      expected: {},
    },
    {
      name: "빈 목록 → 보류 없음",
      basis: "4-1 (0)",
      paths: [],
      expected: {},
    },
  ]);
});

// 가정 7은 blog-plan.md에 없는 BLOG-30의 사용자 결정(2026-10-31): .md를 빼고 남는 이름이 빈 문자열, `.`, `..`이면
// 주소가 폴더 주소가 되거나 브라우저가 다른 주소로 바꾸므로 보류함
describe("파일 이름이 점으로만 남는 노트", () => {
  table(checkNotePaths, [
    {
      name: "볼트 루트의 .md → 보류",
      basis: "4-3 A1, BLOG-30 가정 7",
      paths: [".md"],
      expected: { ".md": UNENCODABLE },
    },
    {
      name: "폴더 안의 .md → 보류",
      basis: "4-3 A1, BLOG-30 가정 7",
      paths: ["개발/.md"],
      expected: { "개발/.md": UNENCODABLE },
    },
    {
      name: "..md → 보류",
      basis: "4-3 A1, BLOG-30 가정 7",
      paths: ["..md"],
      expected: { "..md": UNENCODABLE },
    },
    {
      name: "폴더 안의 ...md → 보류",
      basis: "4-3 A1, BLOG-30 가정 7",
      paths: ["개발/...md"],
      expected: { "개발/...md": UNENCODABLE },
    },
    {
      name: "....md는 남는 이름이 ...이라 주소가 그대로 → 보류 없음",
      basis: "3절, BLOG-30 가정 7",
      paths: ["....md"],
      expected: {},
    },
    {
      name: "점으로 시작하는 다른 이름 → 보류 없음",
      basis: "3절, BLOG-30 가정 7",
      paths: [".숨김.md"],
      expected: {},
    },
    {
      name: "폴더 이름이 .md → 보류 없음",
      basis: "3절, BLOG-30 가정 7",
      paths: [".md/a.md"],
      expected: {},
    },
    {
      name: "점 이름 노트는 충돌 비교에서 뺌",
      basis: "BLOG-30 가정 6, 7",
      paths: ["개발/.md", "개발.md"],
      expected: { "개발/.md": UNENCODABLE },
    },
    {
      name: "퍼센트 인코딩된 점 이름 → 보류 없음",
      basis: "3절, BLOG-30 가정 7, 10",
      paths: ["%2e.md", "개발/.%2e.md"],
      expected: {},
    },
    {
      name: "확장자가 대문자인 .MD → 보류",
      basis: "4-3 A1, BLOG-30 가정 7, 8",
      paths: ["개발/.MD"],
      expected: { "개발/.MD": UNENCODABLE },
    },
    {
      name: "확장자 대소문자가 섞인 ..mD → 보류",
      basis: "4-3 A1, BLOG-30 가정 7, 8",
      paths: ["..mD"],
      expected: { "..mD": UNENCODABLE },
    },
  ]);
});

// 가정 8은 blog-plan.md에 없는 BLOG-30의 사용자 결정(2026-10-31): 노트 확장자 .md는 대소문자를 구분하지 않음.
// 확장자 앞 이름의 대소문자는 그대로 구분함
describe("노트 확장자의 대소문자", () => {
  table(checkNotePaths, [
    {
      name: "확장자 대소문자만 다른 같은 노트 → 둘 다 보류",
      basis: "4-1 (0), 4-3 A1, BLOG-30 가정 8",
      paths: ["개발/노트.md", "개발/노트.MD"],
      expected: { "개발/노트.md": CONFLICT, "개발/노트.MD": CONFLICT },
    },
    {
      name: "확장자가 대문자인 노트와 폴더가 겹침 → 둘 다 보류",
      basis: "4-1 (0), 4-3 A1, BLOG-30 가정 8",
      paths: ["개발.MD", "개발/a.md"],
      expected: { "개발.MD": CONFLICT, "개발/a.md": CONFLICT },
    },
    {
      name: "이름과 확장자 대소문자가 모두 다름 → 충돌 아님",
      basis: "3절, BLOG-30 가정 4, 8",
      paths: ["Note.MD", "note.md"],
      expected: {},
    },
  ]);
});

describe("노트끼리 URL 충돌", () => {
  table(checkNotePaths, [
    {
      name: "NFC로 바꾸면 같은 노트 → 둘 다 보류",
      basis: "4-1 (0), 4-2 4절",
      paths: ["개발/노트.md", nfd("개발/노트.md")],
      expected: {
        "개발/노트.md": CONFLICT,
        [nfd("개발/노트.md")]: NOT_NFC,
      },
    },
    {
      name: "NFC가 아닌 쪽이 먼저 들어와도 둘 다 보류",
      basis: "4-1 (0), 4-2 4절",
      paths: [nfd("개발/노트.md"), "개발/노트.md"],
      expected: {
        [nfd("개발/노트.md")]: NOT_NFC,
        "개발/노트.md": CONFLICT,
      },
    },
    {
      name: "NFC로 바꾸면 같은 라틴 문자 노트 → 둘 다 보류",
      basis: "4-1 (0), 4-2 4절",
      paths: ["\u00E9.md", "e\u0301.md"],
      expected: { "\u00E9.md": CONFLICT, "e\u0301.md": NOT_NFC },
    },
    {
      name: "NFKC로만 같아지는 합자와 일반 글자 → 충돌 아님",
      basis: "3절, 4-1 (0)",
      paths: ["\uFB01.md", "fi.md"],
      expected: {},
    },
    {
      name: "같은 경로가 두 번 들어옴 → 보류",
      basis: "4-1 (0), BLOG-30 가정 4",
      paths: ["개발/노트.md", "개발/노트.md"],
      expected: { "개발/노트.md": CONFLICT },
    },
    {
      name: "노트 경로와 폴더 경로가 겹침 → 둘 다 보류",
      basis: "4-1 (0), 4-3 A1",
      paths: ["개발.md", "개발/노트.md"],
      expected: { "개발.md": CONFLICT, "개발/노트.md": CONFLICT },
    },
    {
      name: "겹친 폴더 안의 노트는 하위 폴더까지 모두 보류, 다른 노트는 그대로",
      basis: "4-1 (0), 4-3 A1",
      paths: ["개발.md", "개발/a.md", "개발/하위/b.md", "기타.md"],
      expected: {
        "개발.md": CONFLICT,
        "개발/a.md": CONFLICT,
        "개발/하위/b.md": CONFLICT,
      },
    },
    {
      name: "중간 폴더와 겹침 → 보류",
      basis: "4-1 (0), 4-3 A1",
      paths: ["a/b.md", "a/b/c.md"],
      expected: { "a/b.md": CONFLICT, "a/b/c.md": CONFLICT },
    },
    {
      name: "노트 이름이 자기 폴더 이름과 같음 → 충돌 아님",
      basis: "4-3 A1",
      paths: ["a/a.md"],
      expected: {},
    },
    {
      name: "NFC가 아닌 노트와 NFC 폴더가 겹침 → 둘 다 보류",
      basis: "4-1 (0), BLOG-30 가정 4",
      paths: [nfd("개발.md"), "개발/노트.md"],
      expected: { [nfd("개발.md")]: NOT_NFC, "개발/노트.md": CONFLICT },
    },
    {
      name: "NFC 노트와 NFC가 아닌 폴더가 겹침 → 둘 다 보류",
      basis: "4-1 (0), BLOG-30 가정 4",
      paths: ["개발.md", `${nfd("개발")}/note.md`],
      expected: { "개발.md": CONFLICT, [`${nfd("개발")}/note.md`]: NOT_NFC },
    },
    {
      name: ".md를 뺀 노트 주소가 .md로 끝나는 폴더와 겹침 → 둘 다 보류",
      basis: "3절, 4-3 A1",
      paths: ["a.md.md", "a.md/x.md"],
      expected: { "a.md.md": CONFLICT, "a.md/x.md": CONFLICT },
    },
    {
      name: "대소문자만 다른 노트 → 충돌 아님",
      basis: "3절, 4-3 A1, BLOG-30 가정 4",
      paths: ["Note.md", "note.md"],
      expected: {},
    },
    {
      name: "대소문자만 다른 노트와 폴더 → 충돌 아님",
      basis: "3절, 4-3 A1, BLOG-30 가정 4",
      paths: ["Dev.md", "dev/a.md"],
      expected: {},
    },
    {
      name: "공백과 이미 인코딩된 모양의 공백 → 충돌 아님",
      basis: "3절, 4-1 (0), BLOG-30 가정 4, 10",
      paths: ["a b.md", "a%20b.md"],
      expected: {},
    },
    {
      name: "다른 폴더의 같은 이름 노트 → 충돌 아님",
      basis: "3절",
      paths: ["a/노트.md", "b/노트.md"],
      expected: {},
    },
    {
      name: "이름 앞부분만 같은 폴더 → 충돌 아님",
      basis: "4-3 A1",
      paths: ["개발.md", "개발자/a.md"],
      expected: {},
    },
    {
      name: "폴더끼리만 NFC가 다름 → NFC가 아닌 쪽만 보류",
      basis: "4-1 (0), BLOG-30 가정 4",
      paths: [`${nfd("개발")}/a.md`, "개발/b.md"],
      expected: { [`${nfd("개발")}/a.md`]: NOT_NFC },
    },
    {
      name: "서로게이트가 든 노트는 충돌 비교에서 뺌",
      basis: "BLOG-30 가정 6",
      paths: ["개발.md", `개발/노트${BROKEN_CHAR}.md`],
      expected: { [`개발/노트${BROKEN_CHAR}.md`]: UNENCODABLE },
    },
  ]);
});

describe("첨부 파일도 첨부끼리 같은 기준", () => {
  table(checkAssetPaths, [
    {
      name: "NFC가 아님 → 보류",
      basis: "4-1 (0), BLOG-30 가정 2",
      paths: [nfd("그림/a.png")],
      expected: { [nfd("그림/a.png")]: NOT_NFC },
    },
    {
      name: "짝 없는 서로게이트 → 보류",
      basis: "BLOG-30 가정 6",
      paths: [`a${BROKEN_CHAR}.png`],
      expected: { [`a${BROKEN_CHAR}.png`]: UNENCODABLE },
    },
    {
      name: "NFC로 바꾸면 같은 첨부 → 둘 다 보류",
      basis: "4-1 (0), BLOG-30 가정 2",
      paths: ["그림/a.png", nfd("그림/a.png")],
      expected: { "그림/a.png": CONFLICT, [nfd("그림/a.png")]: NOT_NFC },
    },
    {
      name: "첨부 경로와 폴더 경로가 NFC로 겹침 → 둘 다 보류",
      basis: "4-1 (0), BLOG-30 가정 2",
      paths: [nfd("그림"), "그림/a.png"],
      expected: { [nfd("그림")]: NOT_NFC, "그림/a.png": CONFLICT },
    },
    {
      name: "낮은 서로게이트만 있음 → 보류",
      basis: "BLOG-30 가정 6",
      paths: ["a\uDC00.png"],
      expected: { "a\uDC00.png": UNENCODABLE },
    },
    {
      name: "짝이 맞는 서로게이트(이모지) → 보류 없음",
      basis: "BLOG-30 가정 6",
      paths: ["a🙂.png"],
      expected: {},
    },
    {
      name: "점 이름 규칙은 노트에만 씀 → 보류 없음",
      basis: "4-2 3절, BLOG-30 가정 7",
      paths: ["그림/.md", "..md"],
      expected: {},
    },
    {
      name: "확장자만 다른 첨부 → 충돌 아님",
      basis: "4-2 3절",
      paths: ["a.png", "a.jpg"],
      expected: {},
    },
    {
      name: "대소문자만 다른 첨부 → 충돌 아님",
      basis: "3절, BLOG-30 가정 4",
      paths: ["a.png", "A.png"],
      expected: {},
    },
  ]);
});
