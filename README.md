# obsidian-blog

Obsidian 볼트에서 공개로 표시한 노트만 골라 기술 블로그로 내보내는 프로젝트입니다. 설계는 끝났고 구현을 시작하는 단계라, 아직 실행할 앱은 없습니다.

구조와 데이터 흐름은 [`.claude/docs/architecture.md`](.claude/docs/architecture.md)에 정리되어 있습니다.

## 필요한 환경

| 도구    | 버전    | 정하는 곳                         |
| ------- | ------- | --------------------------------- |
| Node.js | 26      | `.node-version`                   |
| pnpm    | 12.12.1 | `package.json`의 `packageManager` |

- Node는 `.node-version`을 읽는 버전 관리자(fnm 등)로 맞추면 됩니다.
- pnpm은 `packageManager`에 적힌 버전으로 자동 전환됩니다.

## 설치

```sh
pnpm install
git config core.hooksPath .githooks
```

두 번째 줄은 저장소의 git hook을 쓰도록 하는 설정으로, 클론한 뒤 한 번만 실행하면 됩니다. 이 hook은 새 워크트리를 만들 때 gitignore된 로컬 문서 폴더를 링크합니다. 그 폴더가 없으면 경고만 출력하고 넘어갑니다.

## 검증

```sh
pnpm verify
```

아래 검사를 순서대로 실행하고, 하나라도 실패하면 멈춥니다.

1. Node 메이저 버전이 `.node-version`과 같은지 확인
2. Prettier 포맷 검사
3. ESLint (`core` 패키지에서 Node 내장 모듈을 쓰면 오류)
4. TypeScript 타입 검사
5. Vitest 테스트

포맷을 맞추려면 `pnpm format`을 실행합니다.

셸이 폴더에 들어갈 때 Node 버전을 자동으로 바꾸지 않는다면, 버전 관리자로 감싸서 실행합니다.

```sh
fnm exec --using=26 -- pnpm verify
```

## 구조

```
packages/
  core/       공개 판정, 링크 변환 등 순수 함수 (파일, git, DB, 현재 시각을 다루지 않음)
  extractor/  볼트에서 공개 노트를 추출해 웹 서버로 보내는 CLI
  web/        공개된 노트를 보여 주는 Astro 앱
scripts/      검증 보조 스크립트
.githooks/    git hook
```

## 브랜치

- `develop`: 개발 기본 브랜치. 기능 브랜치는 여기서 따고 여기로 PR을 올립니다.
- `main`: 배포 브랜치. `main`에 병합하면 배포됩니다.
