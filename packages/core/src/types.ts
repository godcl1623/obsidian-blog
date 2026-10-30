import type { Document, LineCounter } from "yaml";

export type Decision =
  | { kind: "public" }
  | { kind: "private" }
  | { kind: "held"; reason: string; line?: number };

// 판정 단계의 결과: 판정이 났으면 decision, 아니면 다음 단계에 넘길 value
export type Step<T> = { decision: Decision } | { value: T };

// YAML로 읽은 frontmatter. lineCounter는 노드 위치를 줄 번호로 바꿀 때 씀
export type ParsedFrontmatter = {
  text: string;
  doc: Document;
  lineCounter: LineCounter;
};
