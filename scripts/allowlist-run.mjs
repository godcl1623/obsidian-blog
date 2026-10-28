// 실제 데이터(볼트 원본)를 읽는 명령을 감싸, 미리 정한 키와 정수만 내보냄
// 사용: node scripts/allowlist-run.mjs <키,키,...> -- <명령> [인자...]
// 명령의 표준 출력은 줄마다 "<키>\t<정수>"이고 키는 목록이나 other여야 함
// 하나라도 어긋나거나 표준 오류에 무엇이든 나오면 내용은 내보내지 않고 막은 줄 수만 알림
import { spawnSync } from "node:child_process";

const [list, separator, command, ...args] = process.argv.slice(2);
if (separator !== "--" || !command) {
  console.error(
    "사용: node scripts/allowlist-run.mjs <키,키,...> -- <명령> [인자...]",
  );
  process.exit(2);
}

const keys = new Set([...list.split(","), "other"]);
// 명령을 찾지 못하면 stdout과 stderr가 null임
const { stdout, stderr, status } = spawnSync(command, args, {
  encoding: "utf8",
});
const nonEmpty = (text) => (text ?? "").split("\n").filter((line) => line);
const lines = nonEmpty(stdout);
const blocked = lines.filter((line) => {
  const [key, count, ...rest] = line.split("\t");
  return rest.length > 0 || !keys.has(key) || !/^\d+$/.test(count ?? "");
});
const errors = nonEmpty(stderr).length;

if (blocked.length > 0 || errors > 0 || status !== 0) {
  console.error(
    `막음: 허용 밖 표준 출력 ${blocked.length}줄, 표준 오류 ${errors}줄, 종료 코드 ${status}`,
  );
  process.exit(1);
}
console.log(lines.join("\n"));
