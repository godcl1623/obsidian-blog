import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("fixtures 밖 읽기 차단", () => {
  it("fixtures 밖의 파일을 읽으면 예외를 던짐", () => {
    const outside = new URL("../package.json", import.meta.url);
    expect(() => readFileSync(outside)).toThrow(
      "fixtures 밖의 파일을 읽으려 함",
    );
    expect(() => readFile(outside)).toThrow("fixtures 밖의 파일을 읽으려 함");
  });

  it("fixtures 안의 파일은 읽힘", () => {
    const inside = new URL("fixtures/fake-output/clean/a.md", import.meta.url);
    expect(readFileSync(inside, "utf8")).not.toBe("");
  });
});
