import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";

const script = new URL("allowlist-run.mjs", import.meta.url).pathname;
let dir;

// 가짜 볼트: 마침표가 든 노트 이름과 링크 대상에 CANARY 표식을 넣음 (blog-plan.md 4-2 6절)
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "allowlist-run-"));
  mkdirSync(join(dir, "vault"));
  writeFileSync(
    join(dir, "vault", "1. CANARY-901 노트.md"),
    "[[2. CANARY-902 링크]] [[그림.png]] [[CANARY-903]]\n",
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// 링크 대상의 확장자를 세는 집계 스크립트. mapped면 허용 목록으로 묶고, 아니면 볼트 문자열을 키로 씀 (BLOG-18의 실수)
const counter = (mapped) => `
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
const vault = process.argv[2];
const counts = {};
for (const name of readdirSync(vault)) {
  for (const [, target] of readFileSync(join(vault, name), "utf8").matchAll(/\\[\\[([^\\]]+)\\]\\]/g)) {
    const ext = extname(target);
    const key = ${mapped} ? ([".png", ""].includes(ext) ? ext || "none" : "other") : ext;
    counts[key] = (counts[key] ?? 0) + 1;
  }
}
for (const [key, count] of Object.entries(counts)) console.log(key + "\\t" + count);
`;

const run = (keys, source) => {
  const file = join(dir, "count.mjs");
  writeFileSync(file, source);
  return spawnSync(
    "node",
    [script, keys, "--", "node", file, join(dir, "vault")],
    { encoding: "utf8" },
  );
};

test("볼트 문자열을 키로 내보내는 집계는 막고 내용을 출력하지 않음", () => {
  const { status, stdout, stderr } = run(".png,none", counter(false));
  expect(status).toBe(1);
  expect(stdout + stderr).not.toMatch(/CANARY/);
  // ". CANARY-902 링크"와 확장자 없는 빈 키
  expect(stderr).toMatch(/허용 밖 표준 출력 2줄/);
});

test("허용 목록으로 묶은 집계는 그대로 내보냄", () => {
  const { status, stdout } = run(".png,none", counter(true));
  expect(status).toBe(0);
  expect(stdout.trim().split("\n").sort()).toEqual([
    ".png\t1",
    "none\t1",
    "other\t1",
  ]);
});

test("값이 정수가 아니면 막음", () => {
  const { status, stdout, stderr } = run(
    "name",
    `console.log("name\\t" + process.argv[2]);`,
  );
  expect(status).toBe(1);
  expect(stdout).toBe("");
  expect(stderr).not.toMatch(/vault/);
});

test("칸이 더 붙으면 막음", () => {
  const { status, stdout, stderr } = run(
    "files",
    `console.log("files\\t1\\tCANARY-901");`,
  );
  expect(status).toBe(1);
  expect(stdout + stderr).not.toMatch(/CANARY/);
});

test("표준 오류에 무엇이든 나오면 막음", () => {
  const { status, stdout, stderr } = run(
    "files",
    `console.log("files\\t1"); console.error("CANARY-901 노트");`,
  );
  expect(status).toBe(1);
  expect(stdout + stderr).not.toMatch(/CANARY/);
});

test("명령이 실패하면 출력이 맞아도 막음", () => {
  const { status, stdout } = run(
    "files",
    `console.log("files\\t1"); process.exit(3);`,
  );
  expect(status).toBe(1);
  expect(stdout).toBe("");
});

test("구분자 --가 없으면 실행하지 않음", () => {
  const { status } = spawnSync("node", [script, "files", "node", "-v"], {
    encoding: "utf8",
  });
  expect(status).toBe(2);
});
