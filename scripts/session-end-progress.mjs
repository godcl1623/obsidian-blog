// SessionEnd hook: 이 세션의 진행 기록이 없으면 뼈대를 만듦
// 비공개 문서 폴더가 없으면 아무것도 하지 않음 (공개 저장소에 쓰지 않게)
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const progressDir = new URL(
  "../.claude/docs/private/progress/",
  import.meta.url,
);

if (!existsSync(new URL("../.claude/docs/private", import.meta.url))) {
  process.exit(0);
}

mkdirSync(progressDir, { recursive: true });
const { session_id: sessionId } = JSON.parse(readFileSync(0, "utf8"));
const recorded = readdirSync(progressDir)
  .filter((name) => name.endsWith(".md"))
  .some((name) =>
    readFileSync(new URL(name, progressDir), "utf8").includes(sessionId),
  );

if (recorded) {
  process.exit(0);
}

const branch = execFileSync("git", ["branch", "--show-current"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const topic = branch.match(/[A-Z]+-\d+/)?.[0] ?? "session";

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

// 같은 분에 같은 주제로 끝난 세션이 있으면 세션 id 앞부분을 붙여 덮어쓰지 않음
const base = `${date}-${time}-${topic}`;
const name = existsSync(new URL(`${base}.md`, progressDir))
  ? `${base}-${sessionId.slice(0, 8)}.md`
  : `${base}.md`;

writeFileSync(
  new URL(name, progressDir),
  `# ${date} ${time.slice(0, 2)}:${time.slice(2)} 세션 기록 (자동 생성)

- 세션: ${sessionId}
- 브랜치: ${branch}
- 요약: 작성되지 않음
`,
  { flag: "wx" },
);
