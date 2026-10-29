import { describe, expect, it } from "vitest";
import { decidePublication, type Decision } from "../src/publication.ts";

// 가짜 노트만 씀. 실제 볼트는 열지 않음 (blog-plan.md 4-2 6절)
const note = (frontmatter: string, body = "본문\n") =>
  `---\n${frontmatter}\n---\n${body}`;

const PATH = "공개 글/노트.md";
const APPROVED = [PATH];

const PUBLIC: Decision = { kind: "public" };
const PRIVATE: Decision = { kind: "private" };
const held = (reason: string, line?: number): Decision =>
  line === undefined
    ? { kind: "held", reason }
    : { kind: "held", reason, line };
const BROKEN = "frontmatter를 읽을 수 없음";
const UNAPPROVED = "승인 없음";

type Row = {
  name: string;
  basis: string;
  path?: string;
  content: string;
  approvals?: readonly string[];
  expected: Decision;
};

const table = (rows: Row[]) =>
  it.each(rows)(
    "$name ($basis)",
    ({ path = PATH, content, approvals = APPROVED, expected }) => {
      expect(decidePublication(path, content, approvals)).toEqual(expected);
    },
  );

describe("공개 조건: 정확한 publish: true 줄과 승인 기록이 모두 있어야 공개", () => {
  table([
    {
      name: "publish: true, 승인 있음 → 공개",
      basis: "2절, 4-1 (0)",
      content: note("publish: true"),
      expected: PUBLIC,
    },
    {
      name: "publish: true가 다른 필드 뒤에 있음 → 공개",
      basis: "2절, 4-1 (0)",
      content: note(
        "title: 제목\ntags: [a]\ncreated: 2026-10-29\npublish: true",
      ),
      expected: PUBLIC,
    },
    {
      name: "publish: true가 다른 필드 앞에 있음 → 공개",
      basis: "2절, 4-1 (0)",
      content: note("publish: true\ntitle: 제목\ntags: [a]"),
      expected: PUBLIC,
    },
    {
      name: "CRLF 줄바꿈, publish: true, 승인 있음 → 공개",
      basis: "2절, 4-1 (0)",
      content: "---\r\npublish: true\r\n---\r\n본문\r\n",
      expected: PUBLIC,
    },
    {
      name: "publish: true, private: false → 공개",
      basis: "2절",
      content: note("publish: true\nprivate: false"),
      expected: PUBLIC,
    },
    {
      name: "다른 필드에 YAML 경고(모르는 태그)가 있어도 → 공개",
      basis: "2절, 4-1 (0)",
      content: note("publish: true\ntitle: !foo 제목"),
      expected: PUBLIC,
    },
    {
      name: "publish: true, 승인 없음 → 보류(승인 없음)",
      basis: "4-1 (0), 4-2 4절",
      content: note("publish: true"),
      approvals: [],
      expected: held(UNAPPROVED),
    },
    {
      name: "publish: true, 다른 경로만 승인됨 → 보류(승인 없음)",
      basis: "4-1 (0), 4-2 4절",
      content: note("publish: true"),
      approvals: ["공개 글/다른 노트.md"],
      expected: held(UNAPPROVED),
    },
    {
      name: "publish: false, 승인 있음 → 비공개",
      basis: "2절, 4-1 (0)",
      content: note("publish: false"),
      expected: PRIVATE,
    },
    {
      name: "publish 없음, 승인 있음 → 비공개",
      basis: "2절, 4-1 (0)",
      content: note("title: 제목"),
      expected: PRIVATE,
    },
    {
      name: "publish 없음, 승인 없음 → 비공개",
      basis: "2절, 4-1 (0)",
      content: note("title: 제목"),
      approvals: [],
      expected: PRIVATE,
    },
  ]);
});

describe("정확한 private: true 줄은 publish보다 우선", () => {
  table([
    {
      name: "private: true, publish: true, 승인 있음 → 비공개",
      basis: "2절",
      content: note("publish: true\nprivate: true"),
      expected: PRIVATE,
    },
    {
      name: "private: true가 publish: true보다 앞에 있음 → 비공개",
      basis: "2절",
      content: note("private: true\ntitle: 제목\npublish: true"),
      expected: PRIVATE,
    },
    {
      name: "private: true, publish: true, 승인 없음 → 비공개(보류 아님)",
      basis: "2절",
      content: note("private: true\npublish: true"),
      approvals: [],
      expected: PRIVATE,
    },
    {
      name: "private: true만 있음 → 비공개",
      basis: "2절",
      content: note("private: true"),
      expected: PRIVATE,
    },
  ]);
});

// 정확히 `publish: true`인 줄이 아니면 공개 설정이 없는 것으로 보고 알림 없이 비공개 (2026-10-29 사용자 결정, 인수인계 가정 14)
describe("publish 표기가 정확하지 않으면 알림 없이 비공개", () => {
  table([
    ...[
      ['publish: "true"', '따옴표 값 "true"'],
      ["publish: yes", "yes"],
      ["Publish: true", "키 대소문자 다름"],
      ["publish: True", "값 대소문자 다름"],
      ["publish: TRUE", "값 대문자"],
      ["publish: !!str true", "태그 붙은 값"],
      ["publish: 1", "숫자"],
      ["publish: [true]", "목록"],
      ['"publish": true', "따옴표 키"],
      ['"publish ": true', "키 뒤 공백"],
      ["publish:  true", "값 앞 공백 두 칸"],
      ["publish: true ", "줄 끝 공백"],
      ["publish: true # 공개", "줄 끝 주석"],
      ["ｐｕｂｌｉｓｈ: true", "전각 키"],
      ["!foo publish: true", "태그 붙은 키"],
      ["<<: {publish: true}", "병합 키로만 들어옴"],
      ["base: &b {publish: true}\n<<: *b", "앵커를 병합"],
      ["x: &k publish\n*k : true", "별칭 키"],
      ["t: &t true\npublish: *t", "별칭 값"],
    ].map(([frontmatter, label]): Row => ({
      name: `${label} → 비공개`,
      basis: "2절, 4-2 4절",
      content: note(frontmatter),
      expected: PRIVATE,
    })),
    {
      name: "본문에만 publish: true가 있음 → 비공개",
      basis: "2절",
      content: note("title: 제목", "publish: true\n"),
      expected: PRIVATE,
    },
  ]);
});

// 정확히 `private: true`인 줄이 아니면 private 설정이 없는 것으로 봄. 철자 오타와 같이 범위 밖 (2026-10-29 사용자 결정, 인수인계 가정 14)
describe("private 표기가 정확하지 않으면 private 설정으로 보지 않음", () => {
  table([
    ...[
      ['private: "true"', '따옴표 값 "true"'],
      ["private: yes", "yes"],
      ["Private: true", "키 대소문자 다름"],
      ["private: True", "값 대소문자 다름"],
      ['"private": true', "따옴표 키"],
      ['"private ": true', "키 뒤 공백"],
      ["private: true # 비공개", "줄 끝 주석"],
      ["ｐｒｉｖａｔｅ: true", "전각 키"],
      ["<<: {private: true}", "병합 키로만 들어옴"],
      ["x: &k private\n*k : true", "별칭 키"],
      ["xprivate: true", "앞에 글자가 붙은 키"],
    ].map(([frontmatter, label]): Row => ({
      name: `${label}, publish: true, 승인 있음 → 공개`,
      basis: "2절",
      content: note(`${frontmatter}\npublish: true`),
      expected: PUBLIC,
    })),
    {
      name: "본문에만 private: true, frontmatter에 publish: true → 공개",
      basis: "2절",
      content: note("publish: true", "private: true\n"),
      expected: PUBLIC,
    },
  ]);
});

describe("노트가 frontmatter로 시작하지 않으면 비공개", () => {
  table([
    {
      name: "frontmatter 없음 → 비공개",
      basis: "2절",
      content: "publish: true\n본문\n",
      expected: PRIVATE,
    },
    {
      name: "첫 줄이 아닌 곳의 frontmatter 모양 → 비공개",
      basis: "2절",
      content: "\n---\npublish: true\n---\n본문\n",
      expected: PRIVATE,
    },
    {
      name: "BOM으로 시작 → 비공개",
      basis: "2절",
      content: "\uFEFF---\npublish: true\n---\n본문\n",
      expected: PRIVATE,
    },
    {
      name: "여는 줄 뒤 공백 '--- ' → 비공개",
      basis: "2절",
      content: "--- \npublish: true\n---\n본문\n",
      expected: PRIVATE,
    },
    {
      name: "빈 frontmatter → 비공개",
      basis: "2절",
      content: "---\n---\n본문\n",
      expected: PRIVATE,
    },
    {
      name: "frontmatter가 목록 → 비공개",
      basis: "2절",
      content: note("- publish: true"),
      expected: PRIVATE,
    },
    {
      name: "frontmatter가 단일 값 → 비공개",
      basis: "2절",
      content: note("true"),
      expected: PRIVATE,
    },
  ]);
});

describe("frontmatter를 YAML로 읽을 수 없으면 보류", () => {
  table([
    {
      name: "YAML 문법 오류 → 보류(줄 번호)",
      basis: "4-2 4절",
      content: "---\npublish: true\ntitle: [닫히지 않음\n---\n본문\n",
      expected: held(BROKEN, 3),
    },
    {
      name: "중복 키 → 보류(줄 번호)",
      basis: "4-2 4절",
      content: "---\npublish: true\npublish: false\n---\n본문\n",
      expected: held(BROKEN, 3),
    },
    {
      name: "닫는 --- 없음 → 보류(1줄)",
      basis: "4-2 4절",
      content: "---\npublish: true\n본문\n",
      expected: held(BROKEN, 1),
    },
    {
      name: "닫는 줄이 '--- '(뒤 공백) → 보류(1줄)",
      basis: "4-2 4절",
      content: "---\npublish: true\n--- \n본문\n",
      expected: held(BROKEN, 1),
    },
    {
      name: "닫는 줄이 ... → 보류(1줄)",
      basis: "4-2 4절",
      content: "---\npublish: true\n...\n본문\n",
      expected: held(BROKEN, 1),
    },
    {
      name: "frontmatter 중간의 ... 줄 → 보류(줄 번호)",
      basis: "4-2 4절",
      content: note("publish: true\n...\nprivate: true"),
      expected: held(BROKEN, 4),
    },
    {
      name: "frontmatter 중간의 --- 뒤 내용 줄 → 보류(줄 번호)",
      basis: "4-2 4절",
      content: note("publish: true\n--- private: true"),
      expected: held(BROKEN, 3),
    },
    {
      name: "읽을 수 없으면 private: true여도 보류",
      basis: "4-2 4절",
      content: "---\nprivate: true\ntitle: [닫히지 않음\n---\n본문\n",
      expected: held(BROKEN, 3),
    },
    // 열 0의 publish: true 줄이 키가 아닌 자리에 오면 YAML 오류가 나므로, 읽히는 frontmatter에서 그 줄은 늘 최상위 키임
    {
      name: "따옴표 문자열 안의 publish: true 줄 → 보류",
      basis: "4-2 4절",
      content: note('title: "a\npublish: true\nb"'),
      expected: held(BROKEN, 2),
    },
    {
      name: "여러 줄 [ ] 안의 publish: true 줄 → 보류",
      basis: "4-2 4절",
      content: note("tags: [a,\npublish: true\n]"),
      expected: held(BROKEN, 3),
    },
    {
      name: "목록 뒤의 publish: true 줄 → 보류",
      basis: "4-2 4절",
      content: note("- a\npublish: true"),
      expected: held(BROKEN, 3),
    },
  ]);

  it("보류 사유에 노트 원문을 넣지 않음 (4-2 2절)", () => {
    const decision = decidePublication(
      PATH,
      "---\npublish: true\ntitle: [CANARY-201\n---\n",
      APPROVED,
    );
    expect(JSON.stringify(decision)).not.toContain("CANARY-201");
  });
});

describe("볼트 루트 README도 같은 규칙", () => {
  table([
    {
      name: "README, publish: true, 승인 있음 → 공개",
      basis: "2절, 4-2 3절",
      path: "README.md",
      content: note("publish: true"),
      approvals: ["README.md"],
      expected: PUBLIC,
    },
    {
      name: "README, publish 없음 → 비공개",
      basis: "2절, 4-2 3절",
      path: "README.md",
      content: "# 소개\n",
      approvals: ["README.md"],
      expected: PRIVATE,
    },
    {
      name: "README, publish: true, 승인 없음 → 보류(승인 없음)",
      basis: "2절, 4-2 3절",
      path: "README.md",
      content: note("publish: true"),
      approvals: [],
      expected: held(UNAPPROVED),
    },
  ]);
});

describe("폴더 기준 공개는 없음", () => {
  table([
    {
      name: "폴더 경로만 승인됨 → 보류(승인 없음)",
      basis: "2절",
      content: note("publish: true"),
      approvals: ["공개 글", "공개 글/"],
      expected: held(UNAPPROVED),
    },
  ]);
});
