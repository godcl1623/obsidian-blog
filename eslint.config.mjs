import { builtinModules } from "node:module";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

const coreMessage =
  "core는 Node API를 쓰지 않음 (파일, git, DB, 현재 시각은 extractor가 다룸)";

// if·else와 반복문(for, for-in, for-of, while, do-while)의 본문이 블록, return, throw, continue, break,
// 함수 호출(await, ?. 호출 포함) 한 문장이 아니면 `{}`를 생략하지 않음 (BLOG-30, 2026-10-31 사용자 결정)
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
const allowedBodies = [
  "BlockStatement",
  "ReturnStatement",
  "ThrowStatement",
  "ContinueStatement",
  "BreakStatement",
  "ExpressionStatement[expression.type='CallExpression']",
  "ExpressionStatement[expression.type='ChainExpression'][expression.expression.type='CallExpression']",
  "ExpressionStatement[expression.type='AwaitExpression'][expression.argument.type='CallExpression']",
  "ExpressionStatement[expression.type='AwaitExpression'][expression.argument.type='ChainExpression'][expression.argument.expression.type='CallExpression']",
];
const allowedBody = `:not(${allowedBodies.join(", ")})`;
const blockBodies = bodyStatements.map((body) => ({
  selector: `${body}${allowedBody}`,
  message:
    "본문이 함수 호출, return, throw, continue, break 한 문장이 아니면 {}를 씀",
}));

// if, 반복문, 삼항의 조건에는 이름 붙인 상수, `!상수`, 값(`true` 등)만 씀. 끝없는 반복은 while (true)로 씀 (BLOG-31, 2026-11-06 사용자 결정)
const conditionOwners =
  ":matches(IfStatement, WhileStatement, DoWhileStatement, ForStatement, ConditionalExpression)";
const allowedConditions =
  ":not(Identifier, Literal, UnaryExpression[operator='!'][argument.type='Identifier'])";
const conditionRules = [
  {
    selector: `${conditionOwners} > ${allowedConditions}.test`,
    message: "조건은 뜻을 나타내는 이름의 상수로 먼저 정의한 뒤 씀",
  },
  {
    selector: "ForStatement[test=null]",
    message: "끝없는 반복은 for (;;) 대신 while (true)로 씀",
  },
];

// 타입이 필요하면 인라인 객체 타입을 쓰지 않고 interface로 선언함. 타입 별칭이 바로 유니언일 때 그 구성원인 객체 타입만 허용함
// (`Readonly<{}>`, `{} & B`, `Array<{}>`는 막음) (BLOG-31, 2026-11-06 사용자 결정)
const inlineTypeRule = {
  selector:
    "TSTypeLiteral:not(TSTypeAliasDeclaration > TSUnionType > TSTypeLiteral)",
  message: "인라인 객체 타입 대신 interface로 선언함",
};

// undefined를 돌려줄 때는 `return undefined;`나 `return void 0;` 대신 `return;`으로 끝냄 (BLOG-31, 2026-11-06 사용자 결정)
// eslint-plugin-unicorn의 no-useless-undefined는 반환 타입을 적은 함수를 건너뛰므로 쓰지 않음
const returnRules = [
  {
    selector: "ReturnStatement > Identifier.argument[name='undefined']",
    message: "undefined를 돌려줄 때는 return;으로 끝냄",
  },
  {
    selector:
      "ReturnStatement > UnaryExpression.argument[operator='void'][argument.type='Literal']",
    message: "undefined를 돌려줄 때는 return;으로 끝냄",
  },
];

// TypeScript 전용. 대문자 이름의 배열·객체 상수는 `as const`를 붙임(`as const satisfies T` 포함) (BLOG-31, 2026-11-06 사용자 결정)
const constantName = "[id.name=/^[A-Z][A-Z0-9_]*$/]";
const literalInit = "/^(ArrayExpression|ObjectExpression)$/";
const asConstMessage = "대문자 이름의 배열·객체 상수에는 as const를 붙임";
const asConstRules = [
  `VariableDeclarator${constantName}[init.type=${literalInit}]`,
  `VariableDeclarator${constantName}[init.type='TSSatisfiesExpression'][init.expression.type=${literalInit}]`,
  `VariableDeclarator${constantName}[init.type='TSAsExpression'][init.expression.type=${literalInit}]:not([init.typeAnnotation.typeName.name='const'])`,
].map((selector) => ({ selector, message: asConstMessage }));

// 같은 규칙을 뒤에서 다시 정하면 앞의 선택자를 덮으므로 공통 선택자를 한곳에 모음
const commonSyntax = [
  ...blockBodies,
  ...conditionRules,
  inlineTypeRule,
  ...returnRules,
];
const typeScriptSyntax = [...commonSyntax, ...asConstRules];

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
    files: ["**/*.{ts,js,mjs}"],
    rules: {
      "no-restricted-syntax": ["error", ...commonSyntax],
      // 매개변수가 3개를 넘으면 객체 매개변수 하나로 받음 (BLOG-31, 2026-11-06 사용자 결정)
      "max-params": ["error", 3],
    },
  },
  {
    // 객체 타입은 interface로 선언하고, 유니언 등 타입 별칭이 필요할 때만 type을 씀.
    // export 함수는 반환 타입을 적음 (BLOG-31, 2026-11-06 사용자 결정)
    files: ["**/*.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...typeScriptSyntax],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/explicit-module-boundary-types": "error",
    },
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
