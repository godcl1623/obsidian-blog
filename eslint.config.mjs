import { builtinModules } from "node:module";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

const coreMessage =
  "core는 Node API를 쓰지 않음 (파일, git, DB, 현재 시각은 extractor가 다룸)";

// if, for, while의 본문이 블록, return, throw, continue, 함수 호출 한 문장이 아니면 `{}`를 생략하지 않음 (BLOG-30, 2026-10-31 사용자 결정)
const bodyStatements = [
  "IfStatement > .consequent",
  "IfStatement > .alternate:not(IfStatement)",
  ...[
    "ForStatement",
    "ForOfStatement",
    "ForInStatement",
    "WhileStatement",
    "DoWhileStatement",
  ].map((loop) => `${loop} > .body`),
];
const allowedBody =
  ":not(BlockStatement, ReturnStatement, ThrowStatement, ContinueStatement, ExpressionStatement[expression.type='CallExpression'])";
const blockBodies = bodyStatements.map((body) => ({
  selector: `${body}${allowedBody}`,
  message: "본문이 함수 호출, return, throw, continue 한 문장이 아니면 {}를 씀",
}));

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // 보이지 않는 문자가 문자열, 정규식, 주석에 실제 문자로 들어가는 것을 막음. 필요하면 \uXXXX 이스케이프로 씀
    rules: {
      "no-irregular-whitespace": [
        "error",
        {
          skipStrings: false,
          skipTemplates: false,
          skipRegExps: false,
          skipComments: false,
          skipJSXText: false,
        },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.ts"],
    rules: { "no-restricted-syntax": ["error", ...blockBodies] },
  },
  {
    files: ["packages/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: builtinModules
            .filter((name) => !name.startsWith("_"))
            .map((name) => ({ name, message: coreMessage })),
          patterns: [{ group: ["node:*"], message: coreMessage }],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "process", message: coreMessage },
      ],
      // 같은 규칙을 뒤에서 다시 정하면 앞의 선택자를 덮으므로 블록 생략 선택자를 함께 넣음
      "no-restricted-syntax": [
        "error",
        ...blockBodies,
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: coreMessage,
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: coreMessage,
        },
      ],
    },
  },
);
