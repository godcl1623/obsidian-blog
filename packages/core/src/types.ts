import type { Document, LineCounter } from "yaml";
import type { HOLD_REASON } from "./constants";

// 보류 사유는 HOLD_REASON의 고정 문구 가운데 하나뿐임
export type HoldReason = (typeof HOLD_REASON)[keyof typeof HOLD_REASON];

export type Decision =
  | { kind: "public" }
  | { kind: "private" }
  | { kind: "held"; reason: HoldReason; line?: number };

// 판정 단계의 결과: 판정이 났으면 decision, 아니면 다음 단계에 넘길 value
export type Step<T> = { decision: Decision } | { value: T };

// YAML로 읽은 frontmatter. lineCounter는 노드 위치를 줄 번호로 바꿀 때 씀
export type ParsedFrontmatter = {
  text: string;
  doc: Document;
  lineCounter: LineCounter;
};
