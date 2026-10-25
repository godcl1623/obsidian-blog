# 구조 요약

- 이 문서는 요약임. 결정의 원본과 이유는 `.claude/docs/private/blog-plan.md`에 있음 (공개 저장소에는 없음)
- 두 문서가 어긋나면 blog-plan.md가 맞음. 괄호 안 번호는 blog-plan.md의 절 번호임
- 인프라 세부(서버 경로, 접근 제어, 비밀값 위치)는 이 문서에 적지 않음

## 1. 사용 흐름

### 작성자

1. Obsidian에서 노트를 씀. 공개할 노트는 frontmatter에 `publish: true`를 넣음. 공개되려면 `publish: true`와 승인 기록이 모두 있어야 함. 내부 링크는 경로 링크(`[[폴더/노트]]`)만 씀 (2, 4-1)
2. 작성 환경에서 커밋하고 볼트 저장소에 push함 (4-1)
3. 이미 승인된 노트를 고친 경우: 승인 없이 자동 반영됨. 목표는 노트 하나당 10~30초 (4, 4-1)
4. 새로 공개하는 노트, 새 이미지, 이름 변경: 보류되고 텔레그램 알림이 옴. 노트별 [승인] 버튼을 누르면 바로 반영되고 조용한 "공개" 알림이 옴 (4-6, 4-7)
5. 막힌 경우(이름만 있는 링크, NFC가 아닌 경로, URL 충돌): 알림을 받고 Obsidian에서 직접 고쳐 다시 push함 (4-1)
6. 내리기: `publish: false`로 바꾸거나 승인을 취소함. 승인 없이 바로 내려감 (4-1)
7. 확인: 봇 명령 `/pending`(보류 목록), `/status`(마지막 성공 커밋, 현재 릴리스, 뒤처짐 여부) (4-6)

### 독자

- `/notes/{볼트 경로}`로 노트를 읽음. 폴더 트리, 백링크, 최근 글, 이전/다음 노트, 라이트/다크 전환 (4-3 A1, A4, A5, A6, A10)
- 그래프는 화면 폭 768px 이상에서만, 링크 미리보기는 마우스가 있는 기기에서만 동작함 (4-3 A4, A5)
- `/search`는 JavaScript 없이도 동작함 (4-3 A3)
- 없는 노트, 비공개 노트, 내린 노트는 모두 같은 404임 (4-3 A1)

### 운영자

- 앱 배포: 공개 저장소 main에 병합하면 이미지가 빌드되고, 웹 서버가 1~2분마다 확인해 교체함 (4-4, 4-8)
- 추출기: 태그 릴리스를 만들고 사람이 설치함. 자동 업데이트 없음 (4-8)
- 되돌리기: 웹 앱은 이전 이미지 digest로, 추출기는 링크를 이전 버전으로 되돌림 (4-8)
- 비상: 퍼블리싱 환경에 직접 들어가 CLI를 씀 (승인 목록, 승인 취소, 승인 저장소 복구) (4-6)

## 2. 데이터 흐름

### 콘텐츠 반영

1. 볼트 저장소에 push
2. 퍼블리싱 환경의 self-hosted runner가 `extractor run`을 실행함
3. `git diff`로 바뀐 파일만 읽고, 공개 여부를 판정하고 승인 기록과 대조함
4. 승인된 노트는 가공함: 위키링크를 표준 마크다운 링크로 바꾸고, 비공개 대상 링크는 표시 텍스트만 남김. 미승인 노트는 보류함
5. 색인(`manifest.json`, `search.json` 등)을 만듦
6. rsync로 웹 서버에 새 릴리스 폴더를 만들고, `current` 링크를 한 번에 교체함
7. 웹 앱은 다음 요청에서 새 릴리스를 읽음

- 모든 실행 경로(push, 10분 뒤처짐 확인, 승인 직후)는 `extractor run` 하나를 같은 잠금 아래에서 부름 (4-6)
- 새벽 4시에 전체 추출해 증분 결과와 비교함. 다르면 전체 결과로 교체하고 알림함 (4-1, 4-5)
- 실패하면 아무것도 바꾸지 않고 다음 실행이 같은 지점부터 다시 처리함 (4-1)

### 앱 배포

1. 공개 저장소 main 병합 또는 매주 예약 빌드
2. GitHub 호스팅 ARM64 runner가 Docker 이미지를 빌드해 GHCR(공개)에 올림
3. 웹 서버의 systemd timer가 새 digest를 확인하고, `/healthz`가 정상일 때만 교체함 (4-4, 4-8)

### 데이터 위치

| 데이터 | 위치 | 비공개 노트 정보 |
| --- | --- | --- |
| 볼트 원본 | 볼트 저장소(비공개), 작성 환경 | 있음 |
| 고정 clone, 상태 SQLite(경로, 링크, 내용 해시, 승인 기록, 보류 목록, 마지막 성공 커밋) | 퍼블리싱 환경 | 있음 (퍼블리싱 환경 밖으로 나가지 않음) |
| 릴리스(`notes/`, `assets/`, 색인), 최근 5개 | 웹 서버 | 없음 |
| 렌더링 캐시, 검색 색인, OG 이미지 | 웹 앱 메모리 | 없음 |
| 앱 코드, Docker 이미지 | 공개 저장소, GHCR | 없음 |

- 유출 경계는 추출 단계 한 곳임. 웹 서버와 웹 앱은 비공개 노트를 갖지 않음 (4)
- 공개 판정과 링크 변환 코드는 `core`에만 둠. `core`는 파일, git, DB, 현재 시각을 직접 다루지 않음 (4-2)
- fail-closed: 공개 목록에 없으면 404 (2, 4-1)

## 3. 기술 스택

### 앱

- TypeScript, pnpm workspace: `core`, `extractor`, `web` (4-2)
- `core`: unified(remark-parse, remark-gfm, remark-rehype, rehype-raw, rehype-sanitize), github-slugger, Shiki (4-3 A2)
- `extractor`: Node CLI 단일 파일 번들, SQLite는 `node:sqlite` 우선 검토 (4-2)
- `web`: Astro SSR(Node 어댑터), React islands, d3-force(그래프), MiniSearch(한글 bigram), satori + resvg(OG 이미지), Pretendard (4-3, 8)

### 검사

- Vitest, Playwright + axe, Lighthouse(경고만), ESLint `no-restricted-imports` 또는 dependency-cruiser, tsgo(실험), Trivy, Dependabot (4-2, 4-3 A11, 4-8)

### 실행 환경

- GitHub Actions(호스팅 ARM64 runner, self-hosted runner), GHCR, Docker(linux/arm64), nginx, systemd timer, rsync over SSH, Telegram Bot API (4-4 ~ 4-8)
- Node 버전은 `.node-version` 하나로 통일함. 버전은 착수 시 정함 (4-8)
