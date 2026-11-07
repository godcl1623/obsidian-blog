# TypeScript·JavaScript 코드 규칙

- 범용 규칙은 [conventions/typescript/conventions.md](conventions/typescript/conventions.md)를 따르고, 이 문서에는 이 저장소 전용 규칙만 적음. 범용 lint 규칙은 [conventions/typescript/eslint-rules.mjs](conventions/typescript/eslint-rules.mjs)에 있고 `eslint.config.mjs`가 가져다 씀. 두 파일은 `harness.py sync`가 복사한 사본이라 직접 고치지 않음 (BLOG-41, 2026-11-07 사용자 결정)
- 이 저장소의 모든 TypeScript·JavaScript 파일(`packages/*/src`, `packages/*/test`, `scripts`, 설정 파일)에 적용함. 절 머리에 TypeScript 전용이라고 적은 규칙은 TypeScript 파일에만 적용함 (BLOG-30, 2026-10-31 사용자 결정)
- lint로 막을 수 있는 규칙(예: if·반복문 본문의 `{}` 생략)은 `eslint.config.mjs`에 두고, 이 문서에는 lint로 강제하기 어려운 것만 적음 (BLOG-30, 2026-10-31 사용자 결정)
- 규칙이 생기기 전에 쓴 코드에도 소급해 적용함 (BLOG-29, 2026-10-30 사용자 결정)

## 1. 타입과 상수

- TypeScript 전용. 스크립트에는 타입과 `src/`가 없음
- 다른 파일에서 가져다 쓰도록 export하는 타입은 패키지의 `src/types.ts`에, 상수는 `src/constants.ts`에 둠. 테스트 도우미는 `test/types.ts`, `test/constants.ts`에 둠
- 한 파일이 커지면 `src/types/`, `src/constants/` 디렉터리로 나누고 관심사별 파일을 둠

## 2. 가져오기

- TypeScript 전용. Node가 직접 실행하는 `.mjs`는 확장자를 적어야 가져올 수 있음
- 상대 경로 가져오기는 확장자를 적지 않음 (`from "./constants"`). TS 코드는 번들러(extractor·core 단일 파일 번들, web의 Astro)와 vitest로만 실행되므로 tsconfig `moduleResolution`을 `Bundler`로 둠 (blog-plan.md 4-2 5절)
