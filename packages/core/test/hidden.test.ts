import { describe, expect, it } from "vitest";
import { HOLD_REASON, WARNING } from "../src/constants";
import { stripHidden } from "../src/hidden";
import type { Stripped } from "../src/types";

// 가짜 노트만 씀. 실제 볼트는 열지 않음 (blog-plan.md 4-2 6절)
// frontmatter가 세 줄이므로 본문 n번째 줄은 노트의 n + 3번째 줄임
const note = (body: string, frontmatter = "publish: true") =>
  `---\n${frontmatter}\n---\n${body}`;

const { UNCLOSED_COMMENT, UNCLOSED_HTML_COMMENT } = WARNING;

type Row = {
  name: string;
  basis: string;
  content: string;
  expected: Partial<Stripped>;
};

// 본문만 보는 행은 expected에 body만 적음. 경고가 없으면 warnings는 빈 배열
const table = (rows: Row[]) =>
  it.each(rows)("$name ($basis)", ({ content, expected }) => {
    expect(stripHidden(content)).toEqual({ warnings: [], ...expected });
  });

// 같은 본문이 그대로 나와야 하는 행
const kept = (name: string, basis: string, body: string): Row => ({
  name,
  basis,
  content: note(body),
  expected: { body },
});

describe("%% 주석 지우기", () => {
  table([
    {
      name: "한 줄 안의 주석",
      basis: "4-2 2절",
      content: note("앞 %%숨김%% 뒤\n"),
      expected: { body: "앞  뒤\n" },
    },
    {
      name: "여러 줄 주석",
      basis: "4-2 2절",
      content: note("앞\n%%\n숨김\n%%\n뒤\n"),
      expected: { body: "앞\n\n뒤\n" },
    },
    {
      name: "빈 주석 %%%%",
      basis: "4-2 2절",
      content: note("a %%%% b\n"),
      expected: { body: "a  b\n" },
    },
    {
      name: "한 줄에 주석 둘",
      basis: "4-2 2절",
      content: note("a %%x%% b %%y%% c\n"),
      expected: { body: "a  b  c\n" },
    },
    {
      name: "닫히지 않은 %%는 노트 끝까지 지우고 연 줄을 경고",
      basis: "4-2 2절",
      content: note("앞\n%% 숨김\n뒤\n"),
      expected: {
        body: "앞\n",
        warnings: [{ message: UNCLOSED_COMMENT, line: 5 }],
      },
    },
    {
      name: "경고 줄 번호는 앞에서 지운 주석과 상관없이 원본 노트 기준",
      basis: "4-2 2절, 4-2 4절",
      content: note("%%a\nb%%\n<!--\nc\n-->\n%% 숨김\n"),
      expected: {
        body: "\n\n",
        warnings: [{ message: UNCLOSED_COMMENT, line: 9 }],
      },
    },
    {
      name: "CRLF 노트의 경고 줄 번호",
      basis: "4-2 2절, 4-2 4절",
      content: "---\r\npublish: true\r\n---\r\n앞\r\n%% 숨김\r\n",
      expected: {
        body: "앞\r\n",
        warnings: [{ message: UNCLOSED_COMMENT, line: 5 }],
      },
    },
    {
      // 가정 1(2026-11-06 사용자 결정): 연 뒤에는 코드 경계와 상관없이 처음 나오는 %%에서 닫음
      name: "닫는 %%가 코드 블록 안에 있어도 처음 %%에서 닫음",
      basis: "4-2 2절, 가정 1",
      content: note("%%\n```\n숨김 %%\n보임\n```\n"),
      expected: { body: "\n보임\n```\n" },
    },
    {
      name: "주석 안의 코드 블록도 함께 지움",
      basis: "4-2 2절",
      content: note("%%\n```\n숨김\n```\n%%\n뒤\n"),
      expected: { body: "\n뒤\n" },
    },
    {
      name: "HTML 블록 안의 %%도 주석으로 봄",
      basis: "4-2 2절, 가정 1",
      content: note("<details>\n%%숨김%%\n</details>\n"),
      expected: { body: "<details>\n\n</details>\n" },
    },
    {
      name: "HTML 안의 %%도 주석으로 봄",
      basis: "4-2 2절, 가정 1",
      content: note("<kbd>%%숨김%%</kbd>\n"),
      expected: { body: "<kbd></kbd>\n" },
    },
    {
      name: "주석을 지운 결과가 새 %% 주석이 되면 그것도 지움",
      basis: "4-2 2절",
      content: note("a %<!-- x -->% 숨김 %% b\n"),
      expected: { body: "a  b\n" },
    },
    {
      name: "%% 주석을 지운 결과가 새 HTML 주석이 되면 그것도 지움",
      basis: "4-2 2절",
      content: note("a <!%%x%%-- 숨김 --> b\n"),
      expected: { body: "a  b\n" },
    },
  ]);
});

describe("HTML 주석 지우기", () => {
  table([
    {
      name: "문단 안의 주석",
      basis: "4-2 2절",
      content: note("앞 <!-- 숨김 --> 뒤\n"),
      expected: { body: "앞  뒤\n" },
    },
    {
      name: "여러 줄 블록 주석",
      basis: "4-2 2절",
      content: note("앞\n\n<!--\n숨김\n-->\n\n뒤\n"),
      expected: { body: "앞\n\n\n\n뒤\n" },
    },
    {
      name: "블록 주석 뒤 같은 줄의 글자는 남김",
      basis: "4-2 2절",
      content: note("<!-- 숨김 --> 보임\n"),
      expected: { body: " 보임\n" },
    },
    {
      name: "다른 HTML 블록 안의 주석",
      basis: "4-2 2절",
      content: note("<details>\n<!-- 숨김 -->\n</details>\n"),
      expected: { body: "<details>\n\n</details>\n" },
    },
    {
      // 가정 2(2026-11-06 사용자 결정): 지우고 경고도 냄
      name: "닫히지 않은 블록 주석은 노트 끝까지 지우고 경고",
      basis: "4-2 2절, 가정 2",
      content: note("앞\n\n<!-- 숨김\n\n숨김\n"),
      expected: {
        body: "앞\n\n",
        warnings: [{ message: UNCLOSED_HTML_COMMENT, line: 6 }],
      },
    },
    {
      name: "다른 HTML 블록 안의 닫히지 않은 주석은 그 블록 끝까지 지우고 경고",
      basis: "4-2 2절, 가정 2",
      content: note("<details>\n<!-- 숨김\n\n보임\n"),
      expected: {
        body: "<details>\n\n\n보임\n",
        warnings: [{ message: UNCLOSED_HTML_COMMENT, line: 5 }],
      },
    },
    // 가정 6(2026-11-06 사용자 결정): HTML로 읽히지 않는 자리의 <!--도 주석이며, 닫히지 않으면 노트 끝까지 지우고 경고
    {
      name: "문단 안의 닫히지 않은 <!--는 노트 끝까지 지우고 경고",
      basis: "4-2 2절, 가정 6",
      content: note("앞 <!-- 숨김\n\n숨김\n"),
      expected: {
        body: "앞 ",
        warnings: [{ message: UNCLOSED_HTML_COMMENT, line: 4 }],
      },
    },
    {
      name: "HTML 밖에서 연 <!--는 문단을 넘어 다음 -->에서 닫음",
      basis: "4-2 2절, 가정 6",
      content: note("앞 <!-- 숨김\n\n숨김 --> 뒤\n"),
      expected: { body: "앞  뒤\n" },
    },
    // 가정 7(2026-11-06 사용자 결정): HTML 밖에서 연 <!--도 코드 경계와 상관없이 처음 -->에서 닫음
    {
      name: "HTML 밖에서 연 <!--는 코드 블록 안의 -->에서도 닫음",
      basis: "4-2 2절, 가정 7",
      content: note("앞 <!-- 숨김\n\n```\n숨김 -->\n보임\n```\n"),
      expected: { body: "앞 \n보임\n```\n" },
    },
    {
      name: "HTML 밖에서 연 <!--는 인라인 코드 안의 -->에서도 닫음",
      basis: "4-2 2절, 가정 7",
      content: note("앞 <!-- 숨김 `-->` 보임\n"),
      expected: { body: "앞 ` 보임\n" },
    },
    {
      name: "바로 닫히는 <!-->와 <!--->",
      basis: "4-2 2절",
      content: note("a <!--> b <!---> c\n"),
      expected: { body: "a  b  c\n" },
    },
    {
      name: "이미지 대체 글 안의 주석",
      basis: "4-2 2절, 가정 6",
      content: note("![a <!-- 숨김 --> b](x.png)\n"),
      expected: { body: "![a  b](x.png)\n" },
    },
    {
      name: "참조형 이미지 대체 글 안의 주석",
      basis: "4-2 2절, 가정 6",
      content: note("![a <!-- 숨김 -->][r]\n\n[r]: x.png\n"),
      expected: { body: "![a ][r]\n\n[r]: x.png\n" },
    },
    {
      name: "링크 제목과 참조 정의 제목 안의 주석",
      basis: "4-2 2절, 가정 6",
      content: note(
        '[a](x.png "t <!-- 숨김 -->")\n\n[r]: y.png "u <!-- 숨김 -->"\n',
      ),
      expected: { body: '[a](x.png "t ")\n\n[r]: y.png "u "\n' },
    },
  ]);
});

describe("인용, 목록, 콜아웃 안", () => {
  table([
    {
      name: "인용 안의 주석",
      basis: "4-2 2절",
      content: note("> <!-- 숨김 -->\n"),
      expected: { body: "> \n" },
    },
    {
      name: "목록 안의 주석",
      basis: "4-2 2절",
      content: note("- <!-- 숨김 -->\n"),
      expected: { body: "- \n" },
    },
    {
      name: "콜아웃 안의 여러 줄 주석",
      basis: "4-2 2절",
      content: note("> [!note]\n> <!--\n> 숨김\n> -->\n"),
      expected: { body: "> [!note]\n> \n" },
    },
    {
      name: "인용 안의 허용 밖 태그는 글자로",
      basis: "4-2 2절",
      content: note("> <span>a</span>\n"),
      expected: { body: "> &lt;span>a&lt;/span>\n" },
    },
    {
      name: "인용 안에서 여러 줄에 걸친 허용 태그의 속성도 지움",
      basis: "4-2 2절",
      content: note('> a <mark\n> title="숨김">b</mark>\n'),
      expected: { body: "> a <mark>b</mark>\n" },
    },
    {
      name: "인용 안 HTML 블록의 여러 줄 허용 태그",
      basis: "4-2 2절",
      content: note("> <details\n> open>\n> 내용\n> </details>\n"),
      expected: { body: "> <details>\n> 내용\n> </details>\n" },
    },
    {
      name: "인용 두 겹 안의 여러 줄 허용 태그",
      basis: "4-2 2절",
      content: note('> > a <mark\n> > title="숨김">b</mark>\n'),
      expected: { body: "> > a <mark>b</mark>\n" },
    },
    {
      name: "목록 안 인용의 여러 줄 허용 태그",
      basis: "4-2 2절",
      content: note('- > a <mark\n  > title="숨김">b</mark>\n'),
      expected: { body: "- > a <mark>b</mark>\n" },
    },
    {
      name: "인용 안 HTML 블록에서 태그를 닫는 >가 다음 줄의 인용 표시 뒤에 옴",
      basis: "4-2 2절",
      content: note('> <details title="숨김"\n> >\n> 내용\n> </details>\n'),
      expected: { body: "> <details>\n> 내용\n> </details>\n" },
    },
    {
      name: "CRLF 인용 안의 여러 줄 허용 태그",
      basis: "4-2 2절, 가정 8",
      content:
        '---\r\npublish: true\r\n---\r\n> a <mark\r\n> title="숨김">b</mark>\r\n',
      expected: { body: "> a <mark>b</mark>\r\n" },
    },
    {
      name: "CRLF 인용 안 HTML 블록에서 태그를 닫는 >가 다음 줄에 옴",
      basis: "4-2 2절, 가정 8",
      content:
        '---\r\npublish: true\r\n---\r\n> <details title="숨김"\r\n> >\r\n> 내용\r\n> </details>\r\n',
      expected: { body: "> <details>\r\n> 내용\r\n> </details>\r\n" },
    },
    {
      name: "> 뒤에 공백이 없는 인용의 여러 줄 허용 태그",
      basis: "4-2 2절, 가정 8",
      content: note('>a <mark\n>title="숨김">b</mark>\n'),
      expected: { body: ">a <mark>b</mark>\n" },
    },
    {
      name: "> 없이 이어진 인용 줄의 여러 줄 허용 태그",
      basis: "4-2 2절, 가정 8",
      content: note('> a <mark\ntitle="숨김">b</mark>\n'),
      expected: { body: "> a <mark>b</mark>\n" },
    },
    {
      name: "번호 목록 안의 여러 줄 허용 태그",
      basis: "4-2 2절, 가정 8",
      content: note('1. a <mark\n   title="숨김">b</mark>\n'),
      expected: { body: "1. a <mark>b</mark>\n" },
    },
    {
      name: "콜아웃 안의 여러 줄 허용 태그",
      basis: "4-2 2절, 가정 8",
      content: note('> [!note]\n> a <mark\n> title="숨김">b</mark>\n'),
      expected: { body: "> [!note]\n> a <mark>b</mark>\n" },
    },
    {
      name: "인용 표시 뒤 공백과 탭이 있어도 줄 끝이 맞으면 예외 없음",
      basis: "4-2 2절, 가정 8",
      content: note('> \t<mark title="숨김">b</mark>\n'),
      expected: { body: "> \t<mark>b</mark>\n" },
    },
    {
      name: "목록 표시 뒤 탭이 있어도 줄 끝이 맞으면 예외 없음",
      basis: "4-2 2절, 가정 8",
      content: note('-\t<details title="숨김">\n'),
      expected: { body: "-\t<details>\n" },
    },
    {
      name: "인용 밖 HTML 블록에서는 줄바꿈 뒤의 >가 태그 끝",
      basis: "4-2 2절",
      content: note("<details\n>\n내용\n</details>\n"),
      expected: { body: "<details>\n내용\n</details>\n" },
    },
    {
      name: "문단 안에서 여러 줄에 걸친 허용 태그의 속성도 지움",
      basis: "4-2 2절",
      content: note('a <mark\ntitle="숨김">b</mark>\n'),
      expected: { body: "a <mark>b</mark>\n" },
    },
  ]);
});

describe("%%와 HTML 주석 중 먼저 연 쪽이 이김", () => {
  table([
    {
      name: "%%가 먼저 열리면 그 안의 <!--는 주석 내용",
      basis: "4-2 2절",
      content: note("%% <!-- %% 보임 -->\n"),
      expected: { body: " 보임 -->\n" },
    },
    {
      name: "<!--가 먼저 열리면 그 안의 %%는 주석 내용",
      basis: "4-2 2절",
      content: note("<!-- %% --> 보임 %%x%%\n"),
      expected: { body: " 보임 \n" },
    },
  ]);
});

describe("코드 안은 그대로 둠", () => {
  table([
    kept(
      "펜스 코드 블록",
      "4-2 1절",
      "```\n%% 보임 %%\n<!-- 보임 -->\n<div>\n```\n",
    ),
    kept("물결 펜스 코드 블록", "4-2 1절", "~~~\n%% 보임 %%\n~~~\n"),
    kept("들여쓴 코드 블록", "4-2 1절", "    %% 보임 %%\n    <!-- 보임 -->\n"),
    kept("인라인 코드", "4-2 1절", "`%%보임%%`와 `<!-- 보임 -->`와 `<span>`\n"),
    kept("표 칸 안의 인라인 코드", "4-2 1절", "| a |\n| - |\n| `%%보임%%` |\n"),
    {
      name: "코드 안의 %%는 주석을 열지 않고, 코드 밖의 %%는 지움",
      basis: "4-2 1절, 4-2 2절",
      content: note("`%%` 앞 %%숨김%% 뒤\n"),
      expected: { body: "`%%` 앞  뒤\n" },
    },
  ]);
});

describe("본문 HTML: 허용 태그만 속성 없이 남김", () => {
  table([
    kept(
      "허용 태그 일곱 개는 그대로",
      "4-2 2절",
      "a<br>b <sup>1</sup> <sub>2</sub> <kbd>K</kbd> <mark>M</mark>\n\n<details>\n<summary>요약</summary>\n\n내용\n\n</details>\n",
    ),
    {
      name: "허용 태그의 속성은 지움",
      basis: "4-2 2절",
      content: note('<mark class="x" onclick="alert(1)">M</mark>\n'),
      expected: { body: "<mark>M</mark>\n" },
    },
    {
      name: "속성 값 안의 >도 속성과 함께 지움",
      basis: "4-2 2절",
      content: note('<kbd title="a>b">K</kbd>\n'),
      expected: { body: "<kbd>K</kbd>\n" },
    },
    {
      name: "값 없는 속성, 닫는 /, 대문자 태그 이름",
      basis: "4-2 2절",
      content: note(
        "<details open>\n<SUMMARY>요약</SUMMARY>\n</details>\n\na<br/>b\n",
      ),
      expected: {
        body: "<details>\n<summary>요약</summary>\n</details>\n\na<br>b\n",
      },
    },
    {
      name: "허용 밖 인라인 태그는 글자로",
      basis: "4-2 2절",
      content: note("a <span>b</span>\n"),
      expected: { body: "a &lt;span>b&lt;/span>\n" },
    },
    {
      name: "허용 밖 블록 태그는 글자로",
      basis: "4-2 2절",
      content: note("<div>\n보임\n</div>\n"),
      expected: { body: "&lt;div>\n보임\n&lt;/div>\n" },
    },
    {
      name: "script는 글자로",
      basis: "4-2 2절",
      content: note("<script>alert(1)</script>\n"),
      expected: { body: "&lt;script>alert(1)&lt;/script>\n" },
    },
    {
      name: "img는 글자로",
      basis: "4-2 2절",
      content: note("a <img src=x onerror=alert(1)> b\n"),
      expected: { body: "a &lt;img src=x onerror=alert(1)> b\n" },
    },
    {
      name: "허용 태그 이름으로 시작하는 다른 태그는 글자로",
      basis: "4-2 2절",
      content: note("<bra>a</bra> <summaryx>b</summaryx>\n"),
      expected: { body: "&lt;bra>a&lt;/bra> &lt;summaryx>b&lt;/summaryx>\n" },
    },
    {
      // <pre> 블록이 글자가 되면 다음 줄과 한 문단이 되어 백틱 짝이 바뀌고, 코드였던 <span>이 HTML이 됨
      name: "태그를 글자로 바꾼 결과 새로 드러난 태그도 글자로",
      basis: "4-2 2절",
      content: note("<pre>`</pre>\n`<span>`\n"),
      expected: { body: "&lt;pre>`&lt;/pre>\n`&lt;span>`\n" },
    },
    {
      name: "선언과 처리 지시는 글자로",
      basis: "4-2 2절",
      content: note("<!DOCTYPE html>\n\n<?php x ?>\n"),
      expected: { body: "&lt;!DOCTYPE html>\n\n&lt;?php x ?>\n" },
    },
  ]);
});

describe("frontmatter: 본문에서 빼고 title, description만 돌려줌", () => {
  table([
    {
      name: "title, description만 돌려주고 tags, aliases 등은 내보내지 않음",
      basis: "4-2 2절, 4-2 3절, 4-3 A1",
      content: note(
        "본문\n",
        "publish: true\ntitle: 제목\ndescription: 설명\ntags: [a]\naliases:\n  - b\ncreated: 2026-10-29",
      ),
      expected: { body: "본문\n", title: "제목", description: "설명" },
    },
    {
      name: "title, description이 없으면 돌려주지 않음",
      basis: "4-2 3절",
      content: note("본문\n"),
      expected: { body: "본문\n" },
    },
    {
      name: "따옴표 문자열은 값 그대로",
      basis: "4-2 3절",
      content: note("", "publish: true\ntitle: \"2024\"\ndescription: 'a: b'"),
      expected: { body: "", title: "2024", description: "a: b" },
    },
    {
      // 가정 3(2026-11-06 사용자 결정): 숫자와 참거짓은 원문 글자 그대로의 문자열
      name: "숫자는 원문 글자 그대로",
      basis: "4-2 3절, 가정 3",
      content: note("", "publish: true\ntitle: 2024\ndescription: 1.0"),
      expected: { body: "", title: "2024", description: "1.0" },
    },
    {
      name: "참거짓은 원문 글자 그대로",
      basis: "4-2 3절, 가정 3",
      content: note("", "publish: true\ntitle: true\ndescription: False"),
      expected: { body: "", title: "true", description: "False" },
    },
    {
      name: "목록은 없는 것으로 봄",
      basis: "4-2 3절, 가정 3",
      content: note("", "publish: true\ntitle: [a, b]\ndescription:\n  - c"),
      expected: { body: "" },
    },
    {
      name: "빈 값은 없는 것으로 봄",
      basis: "4-2 3절, 가정 3",
      content: note("", 'publish: true\ntitle:\ndescription: ""'),
      expected: { body: "" },
    },
    {
      name: "null과 ~는 없는 것으로 봄",
      basis: "4-2 3절, 가정 3",
      content: note("", "publish: true\ntitle: null\ndescription: ~"),
      expected: { body: "" },
    },
    {
      name: "키는 대소문자를 구분함",
      basis: "4-2 3절",
      content: note("", "publish: true\nTitle: 제목\nDESCRIPTION: 설명"),
      expected: { body: "" },
    },
    {
      name: "CRLF frontmatter",
      basis: "4-2 3절",
      content: "---\r\npublish: true\r\ntitle: 제목\r\n---\r\n본문\r\n",
      expected: { body: "본문\r\n", title: "제목" },
    },
    {
      name: "닫는 --- 뒤에 본문이 없음",
      basis: "4-2 3절",
      content: "---\npublish: true\n---",
      expected: { body: "" },
    },
    {
      name: "본문의 --- 줄은 frontmatter가 아님",
      basis: "4-2 3절",
      content: note("앞\n\n---\n\n뒤\n"),
      expected: { body: "앞\n\n---\n\n뒤\n" },
    },
  ]);
});

// 가정 8(2026-11-06 사용자 결정): HTML 노드 값과 원문의 줄 끝이 맞지 않으면 예외로 그 노트를 보류하게 함 (4-2 4절)
it("인용 표시 뒤의 탭으로 HTML 값과 원문이 맞지 않으면 예외 (4-2 4절, 가정 8)", () => {
  expect(() =>
    stripHidden(note(">\t<details>\n>\t내용\n>\t</details>\n")),
  ).toThrow("HTML 위치를 원문과 맞출 수 없음");
});

// stripHidden은 공개로 판정된 노트에만 부르므로 frontmatter를 꺼낼 수 없는 입력은 오지 않아야 함
// 그래도 오면 frontmatter를 본문에 남기지 않도록 예외로 그 노트를 보류하게 함 (4-2 4절)
describe("frontmatter 경계", () => {
  table([
    {
      name: "frontmatter가 없는 노트는 전체가 본문",
      basis: "4-2 3절",
      content: "본문\n",
      expected: { body: "본문\n" },
    },
  ]);
  it.each([
    { name: "닫는 ---가 없음", content: "---\npublish: true\n본문\n" },
    { name: "YAML로 읽을 수 없음", content: "---\n: :\n---\n본문\n" },
  ])("$name → 고정 문구의 예외 (4-2 4절)", ({ content }) => {
    expect(() => stripHidden(content)).toThrow(HOLD_REASON.BROKEN);
  });
});

describe("지운 내용은 결과 어디에도 남지 않음", () => {
  it("숨긴 곳마다 넣은 CANARY 표식이 본문, 값, 경고에 없음 (4-2 2절, 4-2 6절)", () => {
    const content = note(
      [
        "보임 %%CANARY-001%% 보임",
        "%%\nCANARY-002\n%%",
        "<!-- CANARY-003 -->",
        '<mark data-x="CANARY-004" title=CANARY-005>보임</mark>',
        "<!--\nCANARY-006\n-->",
        "<details>\n<!-- CANARY-007 -->\n</details>",
        "![보임 <!-- CANARY-014 -->](x.png)",
        '[보임](x.png "보임 <!-- CANARY-015 -->")',
        '> a <mark\n> title="CANARY-016">보임</mark>',
        "보임 <!-- CANARY-017 --> 보임",
        '> <details title="CANARY-018"\n> >\n> 보임\n> </details>',
        "<!-- CANARY-008",
        "",
        "CANARY-009",
        "%% CANARY-010",
      ].join("\n\n"),
      "publish: true\ntitle: 보임\ntags: [CANARY-011]\naliases: [CANARY-012]\nsecret: CANARY-013",
    );
    const result = stripHidden(content);
    expect(JSON.stringify(result)).not.toContain("CANARY");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
