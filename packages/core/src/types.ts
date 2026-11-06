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

// 주석과 태그를 정리한 본문과 경고. 경고 줄 번호는 나누기 전 본문 기준임
export interface CleanedBody {
  body: string;
  warnings: Warning[];
}

// frontmatter에서 내보내는 값
export interface Properties {
  title?: string;
  description?: string;
}

// 숨은 유출 경로를 지운 결과: frontmatter를 뺀 본문과 frontmatter에서 내보내는 값 (blog-plan.md 4-2 2절, 3절)
export interface Stripped extends Properties {
  body: string;
  warnings: Warning[];
}
