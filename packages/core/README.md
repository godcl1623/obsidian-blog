# @obsidian-blog/core

볼트에서 읽은 경로와 노트 글자를 받아 공개 여부를 판정하고 출력할 내용을 만듦. 파일, git, DB, 현재 시각은 다루지 않음 (blog-plan.md 4-2 5절)

## 디렉터리

| 디렉터리                | 맡은 일                                                                                                                                                                           | 진입 함수                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/publish-decision/` | 노트 하나를 공개, 비공개, 보류로 판정함                                                                                                                                           | `decidePublication` (`decide.ts`)                                                       |
| `src/address/`          | 경로를 주소로 바꾸고, 주소로 쓸 수 없거나 충돌하는 경로를 보류함                                                                                                                  | `checkNotePaths`, `checkAssetPaths` (`held-paths.ts`), `noteUrl`, `assetUrl` (`url.ts`) |
| `src/strip-hidden/`     | 공개 노트에서 화면에 보이지 않지만 출력에 남으면 유출되는 내용(주석, HTML, frontmatter)을 지움                                                                                    | `stripHidden` (`strip-hidden.ts`)                                                       |
| `src/links/`            | 위키링크와 표준 마크다운 링크를 최종 URL의 링크로 바꾸고, 링크가 되지 않는 대상은 표시 텍스트만 남김. 이미지는 `/assets/` 주소의 이미지나 글자로 바꾸고 남긴 이미지의 경로를 모음 | `convertLinks` (`convert-links.ts`), `headingSlug` (`anchor.ts`, 진입점에서 내보냄)     |

- 다른 파일에서 가져다 쓰는 타입과 상수는 `src/types.ts`, `src/constants.ts`에 둠 (`.claude/docs/conventions.md` 1절)

## 부르는 순서

- `stripHidden`은 `decidePublication`이 공개로 판정한 노트에만 부름
- 링크 변환(`convertLinks`)은 `stripHidden`의 결과를 받음. HTML 안에 있던 링크가 글자로 바뀌며 살아나기 때문임 (BLOG-31 가정 5)
- `convertLinks`의 `allTargets`에는 비공개 경로가 들어 있으므로 퍼블리싱 환경 DB의 역방향 색인에만 씀. manifest의 링크 목록은 `publicTargets`로만 만듦 (BLOG-32 가정 1)
- `convertLinks`의 셋째 인자는 볼트 첨부 경로 목록(`checkAssetPaths`가 보류하지 않은 것)과 경로별 이미지 정보(GPS 정보 유무, 바이트, 가로 px)임. 이미지 헤더는 extractor가 읽어 넘김 (blog-plan.md 4-2 5절)
- `convertLinks`의 `attachments`는 그 노트가 내보내는 첨부 파일 경로이며 뺀 이미지는 들어 있지 않음. 첨부 파일 승인과 참조 횟수 관리는 이것으로만 함 (2절, 4-1 (2))
- 남긴 이미지의 너비는 주소 조각 `#width=300`으로 넘김. 렌더링이 조각을 지우고 `width` 속성으로 바꿈. 조각의 앞부분은 `src/constants.ts`의 `WIDTH_FRAGMENT`를 함께 씀. 렌더링은 아직 없음 (BLOG-33 가정 1)
- 경로 검사(`checkNotePaths`, `checkAssetPaths`)와 노트 판정 사이의 순서는 아직 정하지 않음
