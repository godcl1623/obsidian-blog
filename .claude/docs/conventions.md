# TypeScript·JavaScript 코드 규칙

- 이 저장소의 모든 TypeScript·JavaScript 파일(`packages/*/src`, `packages/*/test`, `scripts`, 설정 파일)에 적용함. 절 머리에 TypeScript 전용이라고 적은 규칙은 TypeScript 파일에만 적용함 (BLOG-30, 2026-10-31 사용자 결정)
- lint로 막을 수 있는 규칙(예: if·반복문 본문의 `{}` 생략)은 `eslint.config.mjs`에 두고, 이 문서에는 lint로 강제하기 어려운 것만 적음 (BLOG-30, 2026-10-31 사용자 결정)
- 규칙이 생기기 전에 쓴 코드에도 소급해 적용함 (BLOG-29, 2026-10-30 사용자 결정)

## 1. 타입과 상수

- TypeScript 전용. 스크립트에는 타입과 `src/`가 없음
- 다른 파일에서 가져다 쓰도록 export하는 타입은 패키지의 `src/types.ts`에, 상수는 `src/constants.ts`에 둠. 테스트 도우미는 `test/types.ts`, `test/constants.ts`에 둠
- 그 파일 안에서만 쓰는 타입과 상수(export하지 않는 것)는 쓰는 곳에 둠
- 한 파일이 커지면 `src/types/`, `src/constants/` 디렉터리로 나누고 관심사별 파일을 둠
- 타입은 추론을 우선하고, 추론으로 부족할 때만 선언함. 선언할 때는 인라인 객체 타입을 쓰지 않고, 객체는 interface로, 유니언 등 타입 별칭이 필요한 것만 type으로 씀(lint가 막음) (BLOG-31, 2026-11-06 사용자 결정)
- 반환 타입: export 함수는 적음(lint가 막음). 파일 안에서만 쓰는 함수는 반환 모양이 갈리면(예: `Found | undefined`, 분기마다 다른 객체) 적고, 한 모양만 돌려주면 추론에 맡김 (BLOG-31, 2026-11-06 사용자 결정)

## 2. 함수

- `this` 바인딩을 쓰는 경우가 아니면 화살표 함수로 씀 (`const f = (x: T): R => ...`). `function` 선언은 쓰지 않음
- 화살표 함수는 끌어올려지지 않으므로, 쓰는 곳보다 위에 정의함
- 조건은 참일 때의 뜻을 나타내는 이름의 상수로 먼저 정의한 뒤 씀(예: `const closed = end !== -1`). 조건 자리에 식을 쓰지 않는 것은 lint가 막고, 이름이 뜻을 나타내는지는 검토가 봄 (BLOG-31, 2026-11-06 사용자 결정)

## 3. 함수 나누기

- 함수 하나가 여러 관심사를 판단하면 관심사마다 함수로 나누고, 나눈 함수를 차례로 부르는 함수로 합침
- 나눈 함수는 관심사별 파일에 둠. 합치는 함수는 부르는 순서만 담고 판단은 하지 않음

## 4. 가져오기

- TypeScript 전용. Node가 직접 실행하는 `.mjs`는 확장자를 적어야 가져올 수 있음
- 상대 경로 가져오기는 확장자를 적지 않음 (`from "./constants"`). TS 코드는 번들러(extractor·core 단일 파일 번들, web의 Astro)와 vitest로만 실행되므로 tsconfig `moduleResolution`을 `Bundler`로 둠 (blog-plan.md 4-2 5절)
