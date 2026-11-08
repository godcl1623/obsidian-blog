import type { Document, LineCounter } from "yaml";
import type { HOLD_REASON, SPAN_TYPES, WARNING } from "./constants";

// 보류 사유는 HOLD_REASON의 고정 문구 가운데 하나뿐임
export type HoldReason = (typeof HOLD_REASON)[keyof typeof HOLD_REASON];

export type Decision =
  | { kind: "public" }
  | { kind: "private" }
  | { kind: "held"; reason: HoldReason; line?: number };

// 판정 단계의 결과: 판정이 났으면 decision, 아니면 다음 단계에 넘길 value
export type Step<T> = { decision: Decision } | { value: T };

// YAML로 읽은 frontmatter. lineCounter는 노드 위치를 줄 번호로 바꿀 때 씀
export interface ParsedFrontmatter {
  text: string;
  doc: Document;
  lineCounter: LineCounter;
}

// 경고 문구는 WARNING의 고정 문구 가운데 하나뿐이고, 줄 번호는 원본 노트 기준임
export type WarningMessage = (typeof WARNING)[keyof typeof WARNING];

export interface Warning {
  message: WarningMessage;
  line: number;
}

export type SpanType = (typeof SPAN_TYPES)[number];

// 마크다운 구문 트리 노드의 종류, 원문 범위 [start, end), 값(줄 앞 컨테이너 표시를 뺀 내용)
export interface Span {
  type: SpanType;
  start: number;
  end: number;
  value: string;
}

// 원문 [start, end)를 text로 바꾸는 편집
export interface Edit {
  start: number;
  end: number;
  text: string;
}

// 노트를 나눈 결과. frontmatter가 없으면 frontmatter는 없고 lineOffset은 0임
export interface NoteParts {
  frontmatter?: string;
  body: string;
  lineOffset: number;
}

// 주석과 태그를 정리한 본문과 경고. 경고 줄 번호는 나누기 전 본문 기준임. history는 적용한 편집을 순서대로 담음
export interface CleanedBody {
  body: string;
  warnings: Warning[];
  history: Edit[];
}

// frontmatter에서 내보내는 값
export interface Properties {
  title?: string;
  description?: string;
}

// 숨은 유출 경로를 지운 결과: frontmatter를 뺀 본문과 frontmatter에서 내보내는 값 (blog-plan.md 4-2 2절, 3절)
// lineAt은 body의 위치를 원본 노트의 줄 번호로 바꿈. 뒤 단계의 경고도 원본 기준 줄 번호를 쓰게 하기 위함 (BLOG-32 가정 2)
export interface Stripped extends Properties {
  body: string;
  warnings: Warning[];
  lineAt: (offset: number) => number;
}

// 원문 범위 [start, end)
export interface Range {
  start: number;
  end: number;
}

export interface MarkdownPoint {
  offset?: number;
}

export interface MarkdownPosition {
  start: MarkdownPoint;
  end: MarkdownPoint;
}

// 링크 판정에 쓰는 마크다운 구문 트리 노드. 필드는 remark-parse(mdast)의 것 가운데 쓰는 것만 적음
export interface MarkdownNode {
  type: string;
  position?: MarkdownPosition;
  children?: MarkdownNode[];
  url?: string;
  title?: string | null;
  identifier?: string;
  label?: string | null;
  alt?: string | null;
}

// 링크 판정에 쓰는 구문 트리 정보. code는 코드(펜스, 들여쓰기, 인라인), html은 HTML 노드의 범위
// links는 인라인 링크, 자동 링크, 참조 링크. images는 인라인 이미지와 참조 이미지
// definitions는 모든 참조 정의, defined는 이름마다 쓰이는 처음 정의, imageOnly는 참조 이미지만 쓰는 정의의 이름
export interface LinkSyntax {
  code: Range[];
  html: Range[];
  links: MarkdownNode[];
  images: MarkdownNode[];
  definitions: MarkdownNode[];
  defined: ReadonlyMap<string, MarkdownNode>;
  imageOnly: ReadonlySet<string>;
}

// 이미지 하나의 정보. 이미지 헤더는 extractor가 읽어 넘김 (blog-plan.md 4-2 1절, 5절, 4-3 A9)
export interface ImageInfo {
  gps: boolean;
  bytes: number;
  width: number;
}

// 첨부 파일 판정에 쓰는 볼트 정보 (BLOG-33)
// paths: 볼트의 첨부 파일 경로 가운데 checkAssetPaths가 보류하지 않은 것. images: 경로별 이미지 정보
export interface VaultAttachments {
  paths: ReadonlySet<string>;
  images: ReadonlyMap<string, ImageInfo>;
}

// 이미지 하나의 판정 (BLOG-33)
// image는 남김, text는 대체 텍스트(없으면 파일 이름), name은 파일 이름만 글자로 남김
export interface ImageVerdict {
  kind: "image" | "text" | "name";
  warning?: WarningMessage;
}

// 위키링크나 마크다운 링크가 가리키는 곳. path가 빈 문자열이면 같은 노트임
export interface LinkTarget {
  path: string;
  headings: string[];
  block: boolean;
}

// 표준 마크다운 링크나 이미지의 주소를 판정한 결과. external은 그대로 둠
export type Href =
  | { kind: "external" }
  | { kind: "blocked" }
  | { kind: "internal"; target: LinkTarget };

// `[[...]]`나 `![[...]]` 하나. alias는 처음 | 뒤이며 빈 별칭은 없는 것으로 봄
export interface Wikilink extends Range {
  embed: boolean;
  target: LinkTarget;
  alias?: string;
}

// 대상을 판정한 결과. url이 없으면 표시 텍스트만 남김. note는 같은 노트가 아닐 때 대상 노트 경로
export interface Resolution {
  url?: string;
  note?: string;
}

// 링크 하나가 가리킨 노트와 실제 링크로 바뀌었는지
export interface LinkedNote {
  path: string;
  linked: boolean;
}

// 링크 판정 단계 하나의 결과
export interface LinkEdits {
  edits: Edit[];
  warnings: Warning[];
  notes: LinkedNote[];
}

// 링크 판정 단계가 받는 것
export interface LinkContext {
  body: string;
  syntax: LinkSyntax;
  publicPaths: ReadonlySet<string>;
  vault: VaultAttachments;
  lineAt: (offset: number) => number;
}

// 이미지 판정 단계의 결과. attachments는 남긴 이미지의 볼트 경로
export interface ImageEdits {
  edits: Edit[];
  warnings: Warning[];
  attachments: string[];
}

// 링크를 바꾼 결과 (BLOG-32 가정 1)
// allTargets: 모든 내부 대상(공개, 비공개, 볼트에 없는 대상). 비공개 경로가 들어 있으므로 퍼블리싱 환경 DB의 역방향 색인에만 씀
// publicTargets: 실제 링크로 바뀐 공개 대상. manifest의 공개 노트 사이 링크 목록은 이것으로만 만듦
// attachments: 이 노트가 참조해 내보내는 첨부 파일 경로. 뺀 이미지는 넣지 않음. 승인과 참조 횟수 관리에 씀 (2절, 4-1 (2), BLOG-33)
export interface Converted {
  body: string;
  warnings: Warning[];
  allTargets: string[];
  publicTargets: string[];
  attachments: string[];
}
