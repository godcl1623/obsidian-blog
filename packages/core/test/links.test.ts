import { describe, expect, it } from "vitest";
import { WARNING } from "../src/constants";
import { applyEdits } from "../src/links/apply-edits";
import { convertLinks } from "../src/links/convert-links";
import { stripHidden } from "../src/strip-hidden/strip-hidden";
import type { Converted, Warning } from "../src/types";

// 가짜 노트만 씀. 실제 볼트는 열지 않음 (blog-plan.md 4-2 6절)
// 공개 노트는 아래 넷뿐임(경로는 NFC). secret/plan.md는 비공개, dev/missing.md는 볼트에 없는 노트로 씀
const PUBLIC = new Set([
  "dev/note.md",
  "dev/Public Note.md",
  "dev/한글.md",
  "README.md",
]);

// NFD로 쓴 "한글". 경로 목록(NFC)과 글자가 달라 링크가 되지 않음 (3절)
const NFD = "한글".normalize("NFD");

const { BLOCK_REFERENCE, NOTE_EMBED } = WARNING;

// frontmatter 없는 노트이므로 본문 n번째 줄이 노트의 n번째 줄임
const convert = (body: string, publicPaths = PUBLIC): Converted =>
  convertLinks(stripHidden(body), publicPaths);

interface Row {
  name: string;
  basis: string;
  body: string;
  expected: string;
  warnings?: Warning[];
}

const table = (rows: Row[]) =>
  it.each(rows)("$name ($basis)", ({ body, expected, warnings = [] }) => {
    const result = convert(body);
    expect(result.body).toBe(expected);
    expect(result.warnings).toEqual(warnings);
  });

// 같은 본문이 그대로 나와야 하는 행
const kept = (name: string, basis: string, body: string): Row => ({
  name,
  basis,
  body,
  expected: body,
});

// 기대 출력의 주소는 noteUrl 규칙(조각마다 encodeURIComponent)을 따름. 한글 앵커 설치-방법은 %EC%84%A4%EC%B9%98-%EB%B0%A9%EB%B2%95
describe("위키링크를 일반 링크로 바꿈", () => {
  table([
    {
      name: "경로 링크는 노트 이름을 표시 텍스트로",
      basis: "4-2 1절, 4-3 A2",
      body: "[[dev/note]]\n",
      expected: "[note](</notes/dev/note>)\n",
    },
    {
      name: "별칭은 표시 텍스트로",
      basis: "4-2 1절, 4-3 A2",
      body: "[[dev/note|별칭]]\n",
      expected: "[별칭](</notes/dev/note>)\n",
    },
    {
      name: ".md를 붙여 쓴 경로 링크",
      basis: "4-2 1절, BLOG-32 가정 8",
      body: "[[dev/note.md]]\n",
      expected: "[note](</notes/dev/note>)\n",
    },
    {
      name: "공백이 있는 경로는 주소만 인코딩",
      basis: "3절, 4-2 1절",
      body: "[[dev/Public Note]]\n",
      expected: "[Public Note](</notes/dev/Public%20Note>)\n",
    },
    {
      name: "제목이 붙으면 노트 > 제목, 앵커는 github-slugger",
      basis: "4-2 1절",
      body: "[[dev/note#Setup Guide]]\n",
      expected: "[note \\> Setup Guide](</notes/dev/note#setup-guide>)\n",
    },
    {
      name: "하위 제목은 이어 붙이고 앵커는 마지막 제목",
      basis: "4-2 1절",
      body: "[[dev/note#A#B]]\n",
      expected: "[note \\> A \\> B](</notes/dev/note#b>)\n",
    },
    {
      name: "제목과 별칭이 함께 있으면 별칭",
      basis: "4-2 1절",
      body: "[[dev/note#Setup|설치]]\n",
      expected: "[설치](</notes/dev/note#setup>)\n",
    },
    {
      name: "같은 노트의 제목은 제목만 표시",
      basis: "4-2 1절, BLOG-32 가정 5",
      body: "[[#설치 방법]]\n",
      expected: "[설치 방법](<#%EC%84%A4%EC%B9%98-%EB%B0%A9%EB%B2%95>)\n",
    },
    {
      name: "같은 노트의 제목에 별칭",
      basis: "4-2 1절, BLOG-32 가정 5",
      body: "[[#Setup|여기]]\n",
      expected: "[여기](<#setup>)\n",
    },
    {
      name: "루트 README는 /notes/README",
      basis: "4-3 A1, BLOG-32 가정 4",
      body: "[[README]]\n",
      expected: "[README](</notes/README>)\n",
    },
    {
      name: "표 안의 \\|는 별칭 구분",
      basis: "4-2 1절",
      body: "| a |\n| - |\n| [[dev/note\\|별칭]] |\n",
      expected: "| a |\n| - |\n| [별칭](</notes/dev/note>) |\n",
    },
    {
      name: "표시 텍스트의 마크다운 기호는 이스케이프",
      basis: "BLOG-32 가정 6",
      body: "[[dev/note|*중요* _b_ `c` (d)]]\n",
      expected: "[\\*중요\\* \\_b\\_ \\`c\\` \\(d\\)](</notes/dev/note>)\n",
    },
    {
      name: "stripHidden이 글자로 바꾼 태그는 &lt;를 그대로 둠",
      basis: "4-2 2절, BLOG-32 가정 6",
      body: "[[dev/note|<b>]]\n",
      expected: "[&lt;b\\>](</notes/dev/note>)\n",
    },
  ]);
});

describe("링크가 되지 않는 대상은 표시 텍스트만 남김", () => {
  table([
    {
      name: "비공개 대상은 노트 이름만, 폴더 경로는 지움",
      basis: "2절, 4-2 1절",
      body: "[[secret/plan]]\n",
      expected: "plan\n",
    },
    {
      name: "비공개 대상의 별칭",
      basis: "2절, 4-2 1절",
      body: "[[secret/plan|계획]]\n",
      expected: "계획\n",
    },
    {
      name: "비공개 대상의 제목 링크는 노트 > 제목 글자",
      basis: "4-2 1절",
      body: "[[secret/plan#안건]]\n",
      expected: "plan \\> 안건\n",
    },
    {
      name: "이름만 있는 링크",
      basis: "4-1 (0), 4-2 4절",
      body: "[[note]]\n",
      expected: "note\n",
    },
    {
      name: "볼트에 없는 대상",
      basis: "4-1 (0), 4-2 4절",
      body: "[[dev/missing]]\n",
      expected: "missing\n",
    },
    {
      name: "대소문자가 다르면 경로 목록에 없음",
      basis: "3절, 4-1 (0)",
      body: "[[Dev/note]]\n",
      expected: "note\n",
    },
    {
      name: "확장자 대소문자가 다르면 경로 목록에 없음",
      basis: "3절, 4-1 (0), BLOG-32 가정 8",
      body: "[[dev/note.MD]]\n",
      expected: "note\n",
    },
    {
      name: "NFC로 쓴 경로는 링크",
      basis: "3절, 4-2 1절",
      body: "[[dev/한글]]\n",
      expected: `[한글](</notes/dev/${encodeURIComponent("한글")}>)\n`,
    },
    {
      name: "NFD로 쓴 경로는 경로 목록에 없음",
      basis: "3절, 4-1 (0), BLOG-32 가정 8",
      body: `[[dev/${NFD}]]\n`,
      expected: `${NFD}\n`,
    },
    {
      name: "같은 노트의 블록은 별칭만",
      basis: "4-2 1절",
      body: "[[#^abc|여기]]\n",
      expected: "여기\n",
      warnings: [{ message: BLOCK_REFERENCE, line: 1 }],
    },
    {
      name: "같은 노트의 블록에 별칭이 없으면 빈 글자",
      basis: "4-2 1절",
      body: "[[#^abc123]]\n",
      expected: "\n",
      warnings: [{ message: BLOCK_REFERENCE, line: 1 }],
    },
    {
      name: "빈 대상은 별칭만",
      basis: "4-2 1절",
      body: "[[|별칭]]\n",
      expected: "별칭\n",
    },
    {
      name: "비공개 대상 표시 텍스트의 기호도 이스케이프",
      basis: "BLOG-32 가정 6",
      body: "[[secret/plan|*중요*]]\n",
      expected: "\\*중요\\*\n",
    },
    {
      name: "HTML 블록 안은 공개 대상도 표시 텍스트만",
      basis: "BLOG-32 가정 7",
      body: "<details>\n[[dev/note]] [[secret/plan|계획]]\n</details>\n",
      expected: "<details>\nnote 계획\n</details>\n",
    },
    {
      name: "HTML 블록 안의 표준 링크도 안쪽 글자만",
      basis: "2절, BLOG-32 가정 11",
      body: "<details>\n[글](secret/plan.md) [공개](<dev/Public Note.md>) [밖](https://example.com)\n</details>\n",
      expected: "<details>\n글 공개 밖\n</details>\n",
    },
    kept(
      "HTML 블록 안의 이미지는 BLOG-33이 다룸",
      "4-2 1절",
      "<details>\n![그림](img/a.png)\n</details>\n",
    ),
  ]);
});

describe("코드 안은 처리하지 않음", () => {
  table([
    kept("인라인 코드", "4-2 1절", "`[[secret/plan]]` `[a](secret/plan.md)`\n"),
    kept(
      "펜스 코드 블록",
      "4-2 1절",
      "```\n[[secret/plan]]\n[a](secret/plan.md)\n문단 ^abc\n```\n",
    ),
    kept("들여쓰기 코드 블록", "4-2 1절", "    [[secret/plan]]\n"),
  ]);
});

describe("블록 참조는 노트 링크로 낮추고 경고함", () => {
  table([
    {
      name: "#^블록을 지우고 표시 텍스트는 노트 이름",
      basis: "4-2 1절, 4-3 A2",
      body: "[[dev/note#^abc123]]\n",
      expected: "[note](</notes/dev/note>)\n",
      warnings: [{ message: BLOCK_REFERENCE, line: 1 }],
    },
    {
      name: "별칭이 있으면 별칭",
      basis: "4-2 1절",
      body: "[[dev/note#^abc123|여기]]\n",
      expected: "[여기](</notes/dev/note>)\n",
      warnings: [{ message: BLOCK_REFERENCE, line: 1 }],
    },
    {
      name: "비공개 대상은 노트 이름 글자",
      basis: "4-2 1절",
      body: "[[secret/plan#^abc123]]\n",
      expected: "plan\n",
      warnings: [{ message: BLOCK_REFERENCE, line: 1 }],
    },
    {
      name: "마크다운 링크의 블록 참조",
      basis: "4-2 1절",
      body: "[글](dev/note.md#^abc123)\n",
      expected: "[글](</notes/dev/note>)\n",
      warnings: [{ message: BLOCK_REFERENCE, line: 1 }],
    },
    {
      name: "줄 끝의 블록 표식을 지움",
      basis: "4-2 1절, 4-3 A2",
      body: "문단 ^abc123\n",
      expected: "문단\n",
    },
    {
      name: "줄에 표식만 있으면 표식만 지움",
      basis: "4-2 1절",
      body: "- 항목\n\n^list-1\n",
      expected: "- 항목\n\n\n",
    },
    kept("줄 가운데의 ^는 표식이 아님", "4-2 1절", "2^10 ^abc 뒤\n"),
    {
      name: "CRLF 줄의 표식",
      basis: "4-2 1절",
      body: "문단 ^abc\r\n",
      expected: "문단\r\n",
    },
    {
      name: "탭 뒤의 표식과 끝 공백",
      basis: "4-2 1절",
      body: "문단\t^abc  \n",
      expected: "문단\n",
    },
    {
      name: "공백 뒤 줄 끝의 ^영숫자는 표식으로 봄",
      basis: "4-2 1절, BLOG-32 가정 12",
      body: "a ^2\n",
      expected: "a\n",
    },
    {
      name: "경고 줄 번호는 주석을 지우기 전 원본 기준",
      basis: "4-2 4절, BLOG-32 가정 2",
      body: "%%\n숨김\n%%\n[[dev/note#^a]]\n",
      expected: "\n[note](</notes/dev/note>)\n",
      warnings: [{ message: BLOCK_REFERENCE, line: 4 }],
    },
  ]);

  it("경고는 종류별로 셀 수 있음 (4-2 1절)", () => {
    const { warnings } = convert(
      "[[dev/note#^a]]\n[[secret/plan#^b]]\n![[dev/note]]\n[[dev/note#^c]]\n",
    );
    const count = (message: string) =>
      warnings.filter((warning) => warning.message === message).length;
    expect(count(BLOCK_REFERENCE)).toBe(3);
    expect(count(NOTE_EMBED)).toBe(1);
  });
});

describe("노트 임베드는 일반 링크로 바꾸고 경고함", () => {
  table([
    {
      name: "공개 노트 임베드",
      basis: "4-2 1절, 4-3 A2",
      body: "![[dev/note]]\n",
      expected: "[note](</notes/dev/note>)\n",
      warnings: [{ message: NOTE_EMBED, line: 1 }],
    },
    {
      name: "비공개 노트 임베드는 노트 이름 글자",
      basis: "2절, 4-2 1절",
      body: "![[secret/plan]]\n",
      expected: "plan\n",
      warnings: [{ message: NOTE_EMBED, line: 1 }],
    },
    kept("첨부 파일 임베드는 BLOG-33이 다룸", "4-2 1절", "![[img/a.png]]\n"),
    kept(
      "첨부 확장자는 대소문자를 구분하지 않음",
      "4-2 1절",
      "![[img/a.PNG|300]] ![[doc/b.pdf]]\n",
    ),
    {
      name: "점이 있는 노트 이름 임베드는 노트로 봄",
      basis: "4-2 1절, BLOG-32 가정 10",
      body: "![[secret/v1.2]] ![[secret/plan.v2]]\n",
      expected: "v1\\.2 plan\\.v2\n",
      warnings: [
        { message: NOTE_EMBED, line: 1 },
        { message: NOTE_EMBED, line: 1 },
      ],
    },
  ]);
});

describe("읽지 못한 위키링크가 남으면 노트를 보류함 (2절, BLOG-32 가정 10)", () => {
  it.each([
    ["별칭 안의 대괄호", "[[secret/plan|별칭 [x]]]\n"],
    ["별칭 안의 닫는 대괄호", "[[secret/plan|a]b]]\n"],
    ["HTML 블록 안", "<details>\n[[secret/plan|a [b]]]\n</details>\n"],
  ])("%s", (_name, body) => {
    expect(() => convert(body)).toThrow("읽지 못한 위키링크가 남음");
  });

  table([kept("코드 안의 [[는 그대로", "4-2 1절", "`[[a [b]]]`\n")]);
});

describe("HTML 블록 안에 읽지 못한 링크가 남으면 노트를 보류함 (2절, BLOG-32 가정 13)", () => {
  it.each([
    ["주소에 괄호", "[글](secret/a(1).md)"],
    ["제목에 괄호", '[글](secret/plan.md "초안(1)")'],
    ["안쪽 글자에 대괄호", "[a [b] c](secret/plan.md)"],
    ["안쪽 글자에 줄바꿈", "[글\n자](secret/plan.md)"],
    ["참조 정의", "[r]: secret/plan.md"],
    ["이스케이프한 여는 대괄호", "\\[글](secret/plan.md)"],
  ])("%s", (_name, inner) => {
    const body = `<details>\n${inner}\n</details>\n`;
    expect(() => convert(body)).toThrow("읽지 못한 링크가 HTML 안에 남음");
  });
});

describe("표준 마크다운 링크에도 같은 규칙", () => {
  table([
    {
      name: "볼트 경로 링크",
      basis: "4-2 1절",
      body: "[글](dev/note.md)\n",
      expected: "[글](</notes/dev/note>)\n",
    },
    {
      name: "URL 인코딩된 경로",
      basis: "4-2 1절, BLOG-32 가정 8",
      body: "[글](dev/Public%20Note.md)\n",
      expected: "[글](</notes/dev/Public%20Note>)\n",
    },
    {
      name: "<>로 감싼 경로",
      basis: "4-2 1절",
      body: "[글](<dev/Public Note.md>)\n",
      expected: "[글](</notes/dev/Public%20Note>)\n",
    },
    {
      name: "제목 조각은 github-slugger 앵커",
      basis: "4-2 1절",
      body: "[글](dev/note.md#Setup%20Guide)\n",
      expected: "[글](</notes/dev/note#setup-guide>)\n",
    },
    {
      name: "같은 노트의 제목",
      basis: "4-2 1절",
      body: "[글](#Setup)\n",
      expected: "[글](<#setup>)\n",
    },
    {
      name: "링크 제목은 그대로",
      basis: "BLOG-32 가정 8",
      body: '[글](dev/note.md "설명")\n',
      expected: '[글](</notes/dev/note> "설명")\n',
    },
    {
      name: "비공개 대상은 안쪽 원문만 남김",
      basis: "2절, 4-2 1절, BLOG-32 가정 8",
      body: "[**계획**](secret/plan.md)\n",
      expected: "**계획**\n",
    },
    {
      name: "경로 목록에 없는 상대 주소",
      basis: "4-1 (0), BLOG-32 가정 3",
      body: "[글](../dev/note.md)\n",
      expected: "글\n",
    },
    {
      name: "인코딩이 깨진 주소",
      basis: "2절",
      body: "[글](dev/%E0.md)\n",
      expected: "글\n",
    },
    {
      name: "NFD를 인코딩한 경로는 경로 목록에 없음",
      basis: "3절, BLOG-32 가정 8",
      body: `[글](dev/${encodeURIComponent(NFD)}.md)\n`,
      expected: "글\n",
    },
    {
      name: "빈 주소와 # 하나는 안쪽 글자만",
      basis: "4-2 1절",
      body: "[글]() [글](#)\n",
      expected: "글 글\n",
    },
    {
      name: "링크 안쪽 글자의 위키링크도 바꿈",
      basis: "4-2 1절",
      body: "[보기 [[secret/plan]]](https://example.com)\n",
      expected: "[보기 plan](https://example.com)\n",
    },
  ]);
});

describe("외부 주소와 로컬 링크", () => {
  table([
    kept("https 링크는 그대로", "4-2 1절", "[글](https://example.com/a?b=1)\n"),
    kept("http 링크는 그대로", "BLOG-32 가정 3", "[글](http://example.com)\n"),
    kept(
      "mailto 링크는 그대로",
      "BLOG-32 가정 3",
      "[메일](mailto:a@example.com)\n",
    ),
    kept("자동 링크는 그대로", "4-2 1절", "<https://example.com>\n"),
    kept(
      "GFM 주소 글자는 그대로",
      "4-2 1절",
      "https://example.com 과 www.example.com\n",
    ),
    {
      name: "obsidian:// 링크는 표시 텍스트만",
      basis: "4-2 2절",
      body: "[열기](obsidian://open?vault=v&file=secret)\n",
      expected: "열기\n",
    },
    {
      name: "file:// 링크는 표시 텍스트만",
      basis: "4-2 2절",
      body: "[파일](file:///Users/me/secret.md)\n",
      expected: "파일\n",
    },
    {
      name: "로컬 경로 링크는 표시 텍스트만",
      basis: "4-2 2절",
      body: "[메모](/Users/me/secret.md)\n",
      expected: "메모\n",
    },
    {
      name: "그 밖의 스킴은 표시 텍스트만",
      basis: "BLOG-32 가정 3",
      body: "[a](javascript:alert(1)) [b](tel:123)\n",
      expected: "a b\n",
    },
    kept(
      "스킴 대소문자를 구분하지 않고 외부 주소는 그대로",
      "BLOG-32 가정 3",
      "[a](HTTPS://example.com) [b](MAILTO:a@b.c)\n",
    ),
    {
      name: "대문자 스킴, 드라이브 경로, //주소, data:는 표시 텍스트만",
      basis: "4-2 2절, BLOG-32 가정 3",
      body: "[a](Obsidian://open) [b](C:/Users/me/x.md) [c](//host/x) [d](data:text/html,x)\n",
      expected: "a b c d\n",
    },
    {
      name: "막는 스킴의 자동 링크는 통째로 지움",
      basis: "4-2 2절, BLOG-32 가정 9",
      body: "앞 <obsidian://open?vault=v&file=x> <file:///Users/me/secret.md> 뒤\n",
      expected: "앞   뒤\n",
    },
  ]);
});

describe("참조 링크와 정의", () => {
  table([
    {
      name: "공개 대상 정의는 주소를 바꿈",
      basis: "4-2 1절",
      body: "[글][r]\n\n[r]: dev/note.md\n",
      expected: "[글][r]\n\n[r]: </notes/dev/note>\n",
    },
    {
      name: "비공개 대상 정의는 지우고 참조는 글자",
      basis: "2절, 4-2 2절",
      body: "[글][r] [r]\n\n[r]: secret/plan.md\n",
      expected: "글 r\n\n\n",
    },
    {
      name: "쓰지 않는 비공개 대상 정의도 지움",
      basis: "4-2 2절",
      body: "본문\n\n[r]: secret/plan.md\n",
      expected: "본문\n\n\n",
    },
    kept(
      "외부 주소 정의는 그대로",
      "4-2 1절",
      "[글][r]\n\n[r]: https://example.com\n",
    ),
    {
      name: "정의와 이름이 같은 위키링크는 위키링크로 읽음",
      basis: "4-2 1절",
      body: "[[r]]\n\n[r]: https://example.com\n",
      expected: "r\n\n[r]: https://example.com\n",
    },
  ]);
});

describe("나가는 링크 목록 (BLOG-32 가정 1)", () => {
  const body = [
    "[[dev/note]] [[dev/note#A]] [글](dev/note.md)",
    "[[secret/plan]] [[dev/missing]] [[note]] [[#제목]]",
    "[외부](https://example.com) [로컬](/Users/me/x.md)",
    "",
    "<details>",
    "[[dev/Public Note]]",
    "</details>",
    "",
  ].join("\n");

  it("모든 내부 대상: 공개, 비공개, 없는 대상, 이름만 있는 링크. 같은 노트와 외부 주소는 뺌 (4-1 (2))", () => {
    expect(convert(body).allTargets).toEqual([
      "dev/note.md",
      "secret/plan.md",
      "dev/missing.md",
      "note.md",
      "dev/Public Note.md",
    ]);
  });

  it("공개 대상: 실제 링크로 바뀐 것만. HTML 안의 글자로 바뀐 공개 대상은 뺌 (4-2 2절)", () => {
    expect(convert(body).publicTargets).toEqual(["dev/note.md"]);
  });

  it("HTML 블록 안의 표준 링크는 모든 대상 칸에만 넣음 (BLOG-32 가정 11)", () => {
    const html =
      "<details>\n[글](secret/plan.md) [공개](dev/note.md)\n</details>\n";
    const { allTargets, publicTargets } = convert(html);
    expect(allTargets).toEqual(["secret/plan.md", "dev/note.md"]);
    expect(publicTargets).toEqual([]);
  });
});

describe("비공개 대상의 흔적이 가공 결과에 남지 않음", () => {
  // 비공개 노트의 폴더 경로와 블록 id, 로컬 주소에 표식을 넣음. 노트 이름과 제목은 표시 텍스트로 남으므로 표식을 넣지 않음 (4-2 1절)
  const secret = "비밀 CANARY-101/메모";
  const encoded = secret.split("/").map(encodeURIComponent).join("/");
  const body = [
    `[[${secret}]] [[${secret}|별칭]] [[${secret}#안건]] [[${secret}#^canary-103]]`,
    `![[${secret}]] [글](${encoded}.md) [글](<${secret}.md>) [글][r]`,
    "[열기](obsidian://open?file=CANARY-104) [파일](file:///CANARY-105) [메모](/Users/CANARY-106/a.md)",
    "<obsidian://open?vault=CANARY-108> <file:///CANARY-109/a.md>",
    "문단 ^canary-107",
    "",
    "<details>",
    `[[${secret}]] [글](${encoded}.md) [글](<${secret}.md>)`,
    "</details>",
    "",
    `[r]: ${encoded}.md`,
    "",
  ].join("\n");

  it("본문, 공개 대상 목록, 경고에 표식이 없음 (4-2 2절, 4-2 6절)", () => {
    const { body: output, warnings, publicTargets } = convert(body);
    expect(output).not.toContain("CANARY");
    expect(output).not.toMatch(/canary/i);
    expect(JSON.stringify({ warnings, publicTargets })).not.toMatch(/canary/i);
    expect(output).toContain("메모");
  });

  it("모든 대상 목록에는 비공개 대상이 있음 (DB 전용, BLOG-32 가정 1)", () => {
    expect(convert(body).allTargets).toEqual([`${secret}.md`]);
  });
});

// 편집이 겹치면 어느 쪽이 맞는지 알 수 없으므로 예외로 그 노트를 보류하게 함 (4-2 4절)
describe("편집 적용", () => {
  // 앞 편집이 길이를 바꾸므로 앞에서부터 적용하면 뒤 편집의 위치가 어긋나 "AAbc"가 됨
  it("겹치지 않는 편집은 뒤에서부터 적용함 (4-2 4절)", () => {
    const edits = [
      { start: 0, end: 1, text: "AAA" },
      { start: 2, end: 3, text: "" },
    ];
    expect(applyEdits("abc", edits)).toBe("AAAb");
  });

  it("맞닿은 편집은 겹침이 아님 (4-2 4절)", () => {
    const edits = [
      { start: 0, end: 1, text: "X" },
      { start: 1, end: 2, text: "Y" },
    ];
    expect(applyEdits("abc", edits)).toBe("XYc");
  });

  it("정의 주소의 위키링크는 정의 제거와 겹쳐 예외 (4-2 4절)", () => {
    expect(() => convert("[r]: [[secret/plan]]\n")).toThrow("링크 편집이 겹침");
  });

  it("겹치는 편집은 예외 (4-2 4절)", () => {
    const edits = [
      { start: 0, end: 2, text: "" },
      { start: 1, end: 3, text: "" },
    ];
    expect(() => applyEdits("abc", edits)).toThrow("링크 편집이 겹침");
  });
});
