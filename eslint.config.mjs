import { builtinModules } from "node:module";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import {
  baseRules,
  commonRules,
  typeScriptRules,
  typeScriptSyntax,
} from "./.claude/docs/conventions/typescript/eslint-rules.mjs";

const coreMessage =
  "core는 Node API를 쓰지 않음 (파일, git, DB, 현재 시각은 extractor가 다룸)";

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  { rules: baseRules },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.{ts,js,mjs}"],
    rules: commonRules,
  },
  {
    files: ["**/*.ts"],
    rules: typeScriptRules,
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
      // 같은 규칙을 뒤에서 다시 정하면 앞의 선택자를 덮으므로 공통 선택자를 함께 넣음
      "no-restricted-syntax": [
        "error",
        ...typeScriptSyntax,
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
