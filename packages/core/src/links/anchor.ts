import { slug } from "github-slugger";

// 제목 앵커는 추출기와 웹이 이 함수 하나로 만듦 (blog-plan.md 4-2 1절, 4-3 A2)
// 같은 제목에 번호를 붙이지 않는 slug임. 다른 노트의 제목으로 가는 링크는 그 노트의 첫 번째 같은 제목으로 감 (BLOG-32 가정 8)
export const headingSlug = (heading: string): string => slug(heading);
