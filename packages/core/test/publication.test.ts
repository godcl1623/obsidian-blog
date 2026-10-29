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
const MERGE = "병합 키(<<)는 쓰지 않음";
const KEY = "키는 이름만 씀";

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

describe("공개 조건: publish: true와 승인 기록이 모두 있어야 공개", () => {
  table([
    {
      name: "publish: true, 승인 있음 → 공개",
      basis: "2절, 4-1 (0)",
      content: note("publish: true"),
      expected: PUBLIC,
    },
    {
      name: "publish: true, 다른 필드와 함께 → 공개",
      basis: "2절, 4-1 (0)",
      content: note("title: 제목\npublish: true\ntags: [a]"),
      expected: PUBLIC,
    },
    {
      name: "CRLF 줄바꿈, publish: true, 승인 있음 → 공개",
      basis: "2절, 4-1 (0)",
      content: "---\r\npublish: true\r\n---\r\n본문\r\n",
      expected: PUBLIC,
    },
    {
      name: '따옴표 키 "publish": true, 승인 있음 → 공개',
      basis: "2절, 4-1 (0)",
      content: note('"publish": true'),
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

describe("private: true는 publish보다 우선", () => {
  table([
    {
      name: "private: true, publish: true, 승인 있음 → 비공개",
      basis: "2절",
      content: note("publish: true\nprivate: true"),
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
      name: "private: false, publish: true, 승인 있음 → 공개",
      basis: "2절",
      content: note("publish: true\nprivate: false"),
      expected: PUBLIC,
    },
    {
      name: 'private: "true" 문자열 → 비공개',
      basis: "2절 fail-closed",
      content: note('publish: true\nprivate: "true"'),
      expected: PRIVATE,
    },
    {
      name: "private: yes → 비공개",
      basis: "2절 fail-closed",
      content: note("publish: true\nprivate: yes"),
      expected: PRIVATE,
    },
    {
      name: "Private: true (키 대소문자 다름) → 비공개",
      basis: "2절 fail-closed",
      content: note("publish: true\nPrivate: true"),
      expected: PRIVATE,
    },
    {
      name: "따옴표 키 'private': true → 비공개",
      basis: "2절",
      content: note("'private': true\npublish: true"),
      expected: PRIVATE,
    },
    {
      name: "Private: false (키 대소문자 다름) → 비공개",
      basis: "2절 fail-closed",
      content: note("publish: true\nPrivate: false"),
      expected: PRIVATE,
    },
    {
      name: "private: False (대문자 값) → 비공개",
      basis: "2절 fail-closed",
      content: note("publish: true\nprivate: False"),
      expected: PRIVATE,
    },
    {
      name: "private: (값 없음) → 비공개",
      basis: "2절 fail-closed",
      content: note("publish: true\nprivate:"),
      expected: PRIVATE,
    },
  ]);
});

describe("공개 값이 애매하면 알림 없이 비공개", () => {
  table([
    {
      name: 'publish: "true" 문자열 → 비공개',
      basis: "2절, 4-2 4절",
      content: note('publish: "true"'),
      expected: PRIVATE,
    },
    {
      name: "publish: yes → 비공개",
      basis: "2절, 4-2 4절",
      content: note("publish: yes"),
      expected: PRIVATE,
    },
    {
      name: "Publish: true (키 대소문자 다름) → 비공개",
      basis: "2절, 4-2 4절",
      content: note("Publish: true"),
      expected: PRIVATE,
    },
    {
      name: "publish: True (대문자 값) → 비공개",
      basis: "2절, 4-2 4절",
      content: note("publish: True"),
      expected: PRIVATE,
    },
    {
      name: "publish: TRUE (대문자 값) → 비공개",
      basis: "2절, 4-2 4절",
      content: note("publish: TRUE"),
      expected: PRIVATE,
    },
    {
      name: "publish: !!str true → 비공개",
      basis: "2절, 4-2 4절",
      content: note("publish: !!str true"),
      expected: PRIVATE,
    },
    {
      name: "publish: 1 → 비공개",
      basis: "2절, 4-2 4절",
      content: note("publish: 1"),
      expected: PRIVATE,
    },
    {
      name: "publish: [true] → 비공개",
      basis: "2절, 4-2 4절",
      content: note("publish: [true]"),
      expected: PRIVATE,
    },
    {
      name: "publish: true와 Publish: false가 함께 있음 → 비공개",
      basis: "2절, 4-2 4절",
      content: note("publish: true\nPublish: false"),
      expected: PRIVATE,
    },
    {
      name: "frontmatter 없음 → 비공개",
      basis: "2절",
      content: "publish: true\n본문\n",
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
    {
      name: "첫 줄이 아닌 곳의 frontmatter 모양 → 비공개",
      basis: "2절",
      content: "\n---\npublish: true\n---\n본문\n",
      expected: PRIVATE,
    },
    {
      name: "BOM으로 시작 → 비공개",
      basis: "2절",
      content: "﻿---\npublish: true\n---\n본문\n",
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
      name: "읽을 수 없으면 private: true여도 보류",
      basis: "4-2 4절",
      content: "---\nprivate: true\ntitle: [닫히지 않음\n---\n본문\n",
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

// 병합 키는 YAML 1.1과 1.2에서 뜻이 달라 별개 사유로 보류함 (2026-10-29 사용자 결정, 인수인계 가정 11)
describe("최상위 병합 키(<<)가 있으면 보류", () => {
  table([
    {
      name: "병합으로 private: true, 맨 키 publish: true → 보류(병합 키)",
      basis: "2절, 4-2 4절",
      content: note("<<: {private: true}\npublish: true"),
      expected: held(MERGE, 2),
    },
    {
      name: "맨 키 publish: true, 병합으로 publish: false → 보류(병합 키)",
      basis: "2절, 4-2 4절",
      content: note("publish: true\n<<: {publish: false}"),
      expected: held(MERGE, 3),
    },
    {
      name: "병합으로만 publish: true → 보류(병합 키)",
      basis: "2절, 4-2 4절",
      content: note("<<: {publish: true}"),
      expected: held(MERGE, 2),
    },
    {
      name: "병합 키, 승인 없음 → 보류(병합 키)",
      basis: "2절, 4-2 4절",
      content: note("publish: true\n<<: {a: 1}"),
      approvals: [],
      expected: held(MERGE, 3),
    },
    {
      name: "앵커를 병합 → 보류(병합 키)",
      basis: "2절, 4-2 4절",
      content: note("base: &b {publish: true}\n<<: *b"),
      expected: held(MERGE, 3),
    },
    {
      name: "private: true가 있어도 병합 키가 있으면 → 보류(병합 키)",
      basis: "2절, 4-2 4절",
      content: note("private: true\n<<: {a: 1}"),
      expected: held(MERGE, 3),
    },
    {
      name: "병합 키가 있어도 YAML을 읽을 수 없으면 → 보류(읽을 수 없음)",
      basis: "4-2 4절",
      content: note("<<: {a: 1}\ntitle: [닫히지 않음"),
      expected: held(BROKEN, 3),
    },
    {
      name: "최상위가 아닌 곳의 병합 키 → 공개",
      basis: "2절, 4-1 (0)",
      content: note("publish: true\nmeta: {<<: {a: 1}}"),
      expected: PUBLIC,
    },
  ]);
});

// 별칭 키와 복합 키는 publish, private를 가릴 수 있어 별개 사유로 보류함 (2026-10-29 사용자 결정, 인수인계 가정 12)
describe("최상위 키가 이름이 아니면(별칭 키, 복합 키) 보류", () => {
  table([
    {
      name: "별칭 키로 private: true, 맨 키 publish: true → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("x: &k private\n*k : true\npublish: true"),
      expected: held(KEY, 3),
    },
    {
      name: "맨 키 publish: true, 별칭 키로 publish: false → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("x: &k publish\npublish: true\n*k : false"),
      expected: held(KEY, 4),
    },
    {
      name: "별칭 키로만 publish: true → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("x: &k publish\n*k : true"),
      expected: held(KEY, 3),
    },
    {
      name: "복합 키(목록) → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("? [private]\n: true\npublish: true"),
      expected: held(KEY, 2),
    },
    {
      name: "복합 키(묶음) → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("publish: true\n? {private: x}\n: true"),
      expected: held(KEY, 3),
    },
    {
      name: "별칭 키, 승인 없음 → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("x: &k a\n*k : 1\npublish: true"),
      approvals: [],
      expected: held(KEY, 3),
    },
    {
      name: "private: true가 있어도 별칭 키가 있으면 → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("private: true\nx: &k a\n*k : 1"),
      expected: held(KEY, 4),
    },
    {
      name: "별칭 키가 있어도 YAML을 읽을 수 없으면 → 보류(읽을 수 없음)",
      basis: "4-2 4절",
      content: note("x: &k a\n*k : 1\ntitle: [닫히지 않음"),
      expected: held(BROKEN, 4),
    },
    {
      name: "별칭 키와 병합 키가 함께 있으면 먼저 나온 키의 사유 → 보류(병합 키)",
      basis: "2절, 4-2 4절",
      content: note("<<: {a: 1}\nx: &k a\n*k : 1"),
      expected: held(MERGE, 2),
    },
    {
      name: "병합 키보다 별칭 키가 먼저 나오면 → 보류(키)",
      basis: "2절, 4-2 4절",
      content: note("x: &k a\n*k : 1\n<<: {a: 1}"),
      expected: held(KEY, 3),
    },
    {
      name: "값이 별칭인 것은 키 문제가 아님: publish: *t → 비공개",
      basis: "2절, 4-2 4절",
      content: note("t: &t true\npublish: *t"),
      expected: PRIVATE,
    },
    {
      name: "빈 키(: 값)는 이름이 빈 키로 봄 → 공개",
      basis: "2절, 4-1 (0)",
      content: note(": x\npublish: true"),
      expected: PUBLIC,
    },
  ]);
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
