import { mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertNoCanaryInDir, assertNoCanaryInHtml } from "./canary.ts";

const fixture = (path: string) =>
  fileURLToPath(new URL(`fixtures/${path}`, import.meta.url));

describe("CANARY 검사기", () => {
  it("표식이 든 폴더에서는 표식 번호와 파일 경로를 보여 주며 실패함", () => {
    const check = () => assertNoCanaryInDir(fixture("fake-output/leaky"));
    expect(check).toThrow("CANARY-005 a.md");
    expect(check).toThrow("CANARY-012 nested/b.json");
  });

  it("표식이 없는 폴더에서는 통과함", () => {
    expect(() =>
      assertNoCanaryInDir(fixture("fake-output/clean")),
    ).not.toThrow();
  });

  it("바이너리 파일 안의 표식도 찾음", () => {
    expect(() => assertNoCanaryInDir(fixture("fake-output/binary"))).toThrow(
      "CANARY-007 image.png",
    );
  });

  it("심볼릭 링크로 된 파일도 따라가서 검사함", () => {
    expect(() => assertNoCanaryInDir(fixture("fake-output/symlinked"))).toThrow(
      "CANARY-005 a.md",
    );
  });

  it("파일이 하나도 없는 폴더는 실패함", () => {
    const empty = mkdtempSync(fixture("empty-"));
    try {
      expect(() => assertNoCanaryInDir(empty)).toThrow("검사할 파일이 없음");
    } finally {
      rmSync(empty, { recursive: true });
    }
  });

  it("표식이 든 HTML 문자열에서는 실패함", () => {
    expect(() => assertNoCanaryInHtml("<p>CANARY-003</p>")).toThrow(
      "CANARY-003 HTML",
    );
  });

  it("slug처럼 소문자로 바뀐 표식도 찾음", () => {
    expect(() =>
      assertNoCanaryInHtml('<a href="#canary-016-안건">안건</a>'),
    ).toThrow("canary-016 HTML");
  });

  it("문자열 맨 앞과 맨 끝, 자릿수가 다른 표식도 찾음", () => {
    expect(() => assertNoCanaryInHtml("CANARY-001")).toThrow("CANARY-001 HTML");
    expect(() => assertNoCanaryInHtml("끝CANARY-1")).toThrow("CANARY-1 HTML");
    expect(() => assertNoCanaryInHtml("CANARY-0001")).toThrow(
      "CANARY-0001 HTML",
    );
  });

  it("표식이 없는 HTML 문자열에서는 통과함", () => {
    expect(() => assertNoCanaryInHtml("<p>보이는 본문</p>")).not.toThrow();
  });

  it("가짜 노트 모음의 표식 001~020을 모두 찾음", () => {
    const check = () => assertNoCanaryInDir(fixture("vault"));
    for (let i = 1; i <= 20; i++) {
      const id = String(i).padStart(3, "0");
      expect(check).toThrow(new RegExp(`CANARY-${id} `, "i"));
    }
  });
});
