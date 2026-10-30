import { createRequire } from "node:module";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

// 테스트가 fixtures 밖의 파일(특히 실제 볼트)을 읽지 못하게 막음. 실제 노트를 테스트 데이터로 쓰지 않기 위함 (blog-plan.md 4-2 6절)
// 심볼릭 링크는 따라간 실제 경로로 판단함. 가드에 걸리지 않도록 require로 원래 realpathSync를 가져옴
const { realpathSync } = createRequire(import.meta.url)("node:fs");

const fixtures =
  realpathSync(fileURLToPath(new URL("fixtures", import.meta.url))) + sep;

const reads = [
  "readFile",
  "readFileSync",
  "readdir",
  "readdirSync",
  "opendir",
  "opendirSync",
  "open",
  "openSync",
  "createReadStream",
  "copyFile",
  "copyFileSync",
  "cp",
  "cpSync",
];
const globs = ["glob", "globSync"];

const check = (path: unknown): void => {
  // 가드를 거친 open이 준 파일 디스크립터와 FileHandle
  if (
    typeof path === "number" ||
    (typeof path === "object" && path !== null && "fd" in path)
  )
    return;
  const target = resolve(
    path instanceof URL ? fileURLToPath(path) : String(path),
  );
  let real = target;
  try {
    real = realpathSync(target);
  } catch {
    // 없는 경로는 읽어도 실패하므로 문자열 경로로 판단함
  }
  if (!(real + sep).startsWith(fixtures)) {
    throw new Error(`fixtures 밖의 파일을 읽으려 함: ${real}`);
  }
};

const guard = <T>(mod: T): T => {
  const wrapped: Record<string, unknown> = {
    ...(mod as Record<string, unknown>),
  };
  for (const name of [...reads, ...globs]) {
    const original = wrapped[name];
    if (typeof original !== "function") continue;
    wrapped[name] = (first: unknown, ...rest: unknown[]) => {
      if (globs.includes(name)) {
        const options = rest.find(
          (arg) => typeof arg === "object" && arg !== null,
        ) as { cwd?: string | URL } | undefined;
        const cwd =
          options?.cwd instanceof URL
            ? fileURLToPath(options.cwd)
            : (options?.cwd ?? process.cwd());
        for (const pattern of [first].flat())
          check(resolve(cwd, String(pattern)));
      } else {
        check(first);
      }
      return original(first, ...rest);
    };
  }
  // import fs from "node:fs"와 fs.promises로 돌아가는 길도 막음
  for (const key of ["default", "promises"]) {
    if (typeof wrapped[key] === "object" && wrapped[key] !== null) {
      wrapped[key] = guard(wrapped[key]);
    }
  }
  return wrapped as T;
};

vi.mock("node:fs", async (importOriginal) => guard(await importOriginal()));
vi.mock("fs", async (importOriginal) => guard(await importOriginal()));
vi.mock("node:fs/promises", async (importOriginal) =>
  guard(await importOriginal()),
);
vi.mock("fs/promises", async (importOriginal) => guard(await importOriginal()));
