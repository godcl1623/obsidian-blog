// .node-version의 메이저 버전과 실행 중인 Node의 메이저 버전이 다르면 실패함
import { readFileSync } from "node:fs";

const expected = readFileSync(
  new URL("../.node-version", import.meta.url),
  "utf8",
)
  .trim()
  .split(".")[0];
const actual = process.versions.node.split(".")[0];

if (actual !== expected) {
  console.error(
    `Node ${expected} 버전이 필요하지만 ${process.versions.node}로 실행됨. fnm exec --using=${expected} -- pnpm verify 로 실행할 것`,
  );
  process.exit(1);
}
