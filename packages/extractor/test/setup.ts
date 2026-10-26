import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

// 테스트가 fixtures 밖의 파일(특히 실제 볼트)을 읽지 못하게 막음. 실제 노트를 테스트 데이터로 쓰지 않기 위함 (blog-plan.md 4-2 6절)
const fixtures = fileURLToPath(new URL("fixtures/", import.meta.url));

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
];

function guard<T>(mod: T): T {
  const wrapped: Record<string, unknown> = {
    ...(mod as Record<string, unknown>),
  };
  for (const name of reads) {
    const original = wrapped[name];
    if (typeof original !== "function") continue;
    wrapped[name] = (path: unknown, ...rest: unknown[]) => {
      const target = resolve(
        path instanceof URL ? fileURLToPath(path) : String(path),
      );
      if (!(target + sep).startsWith(fixtures)) {
        throw new Error(`fixtures 밖의 파일을 읽으려 함: ${target}`);
      }
      return original(path, ...rest);
    };
  }
  // import fs from "node:fs"와 fs.promises로 돌아가는 길도 막음
  for (const key of ["default", "promises"]) {
    if (typeof wrapped[key] === "object" && wrapped[key] !== null) {
      wrapped[key] = guard(wrapped[key]);
    }
  }
  return wrapped as T;
}

vi.mock("node:fs", async (importOriginal) => guard(await importOriginal()));
vi.mock("fs", async (importOriginal) => guard(await importOriginal()));
vi.mock("node:fs/promises", async (importOriginal) =>
  guard(await importOriginal()),
);
vi.mock("fs/promises", async (importOriginal) => guard(await importOriginal()));
