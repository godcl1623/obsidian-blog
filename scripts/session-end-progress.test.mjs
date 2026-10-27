import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";

const script = new URL("session-end-progress.mjs", import.meta.url);
const sessionId = "11111111-2222-3333-4444-555555555555";
let dir;

// 임시 저장소에 스크립트를 복사해 실제 저장소의 비공개 폴더에 닿지 않게 함
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "session-end-"));
  mkdirSync(join(dir, "scripts"));
  copyFileSync(script, join(dir, "scripts", "session-end-progress.mjs"));
  execFileSync("git", ["init", "-q", "-b", "feature/BLOG-99-fake"], {
    cwd: dir,
  });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const progress = () => join(dir, ".claude", "docs", "private", "progress");

const run = () =>
  execFileSync("node", [join(dir, "scripts", "session-end-progress.mjs")], {
    input: JSON.stringify({
      session_id: sessionId,
      hook_event_name: "SessionEnd",
    }),
  });

test("기록이 있는 세션이면 새로 만들지 않음", () => {
  mkdirSync(progress(), { recursive: true });
  writeFileSync(
    join(progress(), "2026-01-01-0000-BLOG-99.md"),
    `- 세션: ${sessionId}\n`,
  );
  run();
  expect(readdirSync(progress())).toEqual(["2026-01-01-0000-BLOG-99.md"]);
});

test("기록이 없는 세션이면 뼈대를 만듦", () => {
  mkdirSync(progress(), { recursive: true });
  writeFileSync(
    join(progress(), "2026-01-01-0000-BLOG-99.md"),
    "- 세션: 다른-세션\n",
  );
  run();
  const created = readdirSync(progress()).filter(
    (name) => name !== "2026-01-01-0000-BLOG-99.md",
  );
  expect(created).toHaveLength(1);
  expect(created[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}-BLOG-99\.md$/);
  const body = readFileSync(join(progress(), created[0]), "utf8");
  expect(body).toContain(`- 세션: ${sessionId}`);
  expect(body).toContain("- 브랜치: feature/BLOG-99-fake");
  expect(body).toContain("- 요약: 작성되지 않음");
});

test("비공개 폴더가 없으면 아무것도 만들지 않음", () => {
  run();
  expect(readdirSync(dir).sort()).toEqual([".git", "scripts"]);
});
