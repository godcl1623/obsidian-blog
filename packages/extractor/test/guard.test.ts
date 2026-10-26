import fs, { copyFileSync, globSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const message = "fixtures 밖의 파일을 읽으려 함";
const outside = new URL("../package.json", import.meta.url);
const fixture = (path: string) => new URL(`fixtures/${path}`, import.meta.url);

describe("fixtures 밖 읽기 차단", () => {
  it("fixtures 밖의 파일을 읽으면 예외를 던짐", () => {
    expect(() => readFileSync(outside)).toThrow(message);
    expect(() => readFile(outside)).toThrow(message);
    expect(() => fs.readFileSync(outside)).toThrow(message);
    expect(() => fs.promises.readFile(outside)).toThrow(message);
  });

  it("이름 앞부분이 fixtures인 형제 폴더도 밖으로 봄", () => {
    const sibling = new URL("fixtures-other/a.md", import.meta.url);
    expect(() => readFileSync(sibling)).toThrow(message);
  });

  it("fixtures 안의 심볼릭 링크가 밖을 가리키면 예외를 던짐", () => {
    expect(() => readFileSync(fixture("outside-link"))).toThrow(message);
  });

  it("fixtures 밖의 파일을 복사하면 예외를 던짐", () => {
    const dest = fixture("copy-should-not-exist");
    try {
      expect(() => copyFileSync(outside, dest)).toThrow(message);
    } finally {
      rmSync(dest, { force: true });
    }
  });

  it("fixtures 밖을 glob으로 훑으면 예외를 던짐", () => {
    const cwd = fileURLToPath(new URL("..", import.meta.url));
    expect(() => globSync("*.json", { cwd })).toThrow(message);
  });

  it("fixtures 안의 파일은 읽힘", () => {
    const inside = fixture("fake-output/clean/a.md");
    expect(readFileSync(inside, "utf8")).not.toBe("");
  });
});
