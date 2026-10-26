import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

// 숨겨야 할 곳마다 넣은 고유 표식 (blog-plan.md 4-2 6절)
const CANARY = /CANARY-\d+/g;

type Hit = { canary: string; where: string };

function find(text: string, where: string): Hit[] {
  return [...new Set(text.match(CANARY))].map((canary) => ({ canary, where }));
}

function fail(hits: Hit[]): void {
  if (hits.length === 0) return;
  const lines = hits.map(({ canary, where }) => `  ${canary} ${where}`);
  throw new Error(`CANARY 표식이 출력에 남음:\n${lines.join("\n")}`);
}

// 출력 형식에 기대지 않도록 폴더 아래 모든 파일을 검사함. 바이너리도 깨지지 않게 latin1로 읽음
export function assertNoCanaryInDir(dir: string): void {
  const files = readdirSync(dir, {
    recursive: true,
    withFileTypes: true,
  }).filter((entry) => entry.isFile());
  fail(
    files.flatMap((entry) => {
      const path = join(entry.parentPath, entry.name);
      return find(readFileSync(path, "latin1"), relative(dir, path));
    }),
  );
}

export function assertNoCanaryInHtml(html: string): void {
  fail(find(html, "HTML"));
}
