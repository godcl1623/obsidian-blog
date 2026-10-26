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

  it("표식이 든 HTML 문자열에서는 실패함", () => {
    expect(() => assertNoCanaryInHtml("<p>CANARY-003</p>")).toThrow(
      "CANARY-003 HTML",
    );
  });

  it("표식이 없는 HTML 문자열에서는 통과함", () => {
    expect(() => assertNoCanaryInHtml("<p>보이는 본문</p>")).not.toThrow();
  });

  it("가짜 노트 모음의 표식 001~015를 모두 찾음", () => {
    const check = () => assertNoCanaryInDir(fixture("vault"));
    for (let i = 1; i <= 15; i++) {
      expect(check).toThrow(`CANARY-${String(i).padStart(3, "0")} `);
    }
  });
});
