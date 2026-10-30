import { builtinModules } from "node:module";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

const coreMessage =
  "core는 Node API를 쓰지 않음 (파일, git, DB, 현재 시각은 extractor가 다룸)";

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
      "no-restricted-syntax": [
        "error",
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
