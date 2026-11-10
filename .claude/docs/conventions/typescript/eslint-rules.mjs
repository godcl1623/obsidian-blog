// 규칙 설정만 내보냄. 플러그인 등록(@eslint/js, typescript-eslint 등)과 적용할 파일(files)은 프로젝트가 정함

// if·else와 반복문(for, for-in, for-of, while, do-while)의 본문이 블록, return, throw, continue, break,
// 함수 호출(await, ?. 호출 포함) 한 문장이 아니면 `{}`를 생략하지 않음
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

// if, 반복문, 삼항의 조건에는 이름 붙인 상수, `!상수`, 값(`true` 등)만 씀. 끝없는 반복은 while (true)로 씀
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
// (`Readonly<{}>`, `{} & B`, `Array<{}>`는 막음)
const inlineTypeRule = {
  selector:
    "TSTypeLiteral:not(TSTypeAliasDeclaration > TSUnionType > TSTypeLiteral)",
  message: "인라인 객체 타입 대신 interface로 선언함",
};

// undefined를 돌려줄 때는 `return undefined;`나 `return void <식>;` 대신 `return;`으로 끝냄. `return void g();`는 `g(); return;`으로 씀
// eslint-plugin-unicorn의 no-useless-undefined는 반환 타입을 적은 함수를 건너뛰므로 쓰지 않음
const returnRules = [
  {
    selector: "ReturnStatement > Identifier.argument[name='undefined']",
    message: "undefined를 돌려줄 때는 return;으로 끝냄",
  },
  {
    selector: "ReturnStatement > UnaryExpression.argument[operator='void']",
    message: "undefined를 돌려줄 때는 return;으로 끝냄",
  },
];

// TypeScript 파일에 적용함. 대문자 이름의 배열·객체 상수는 `as const`를 붙임(`as const satisfies T` 포함)
const constantName = "[id.name=/^[A-Z][A-Z0-9_]*$/]";
const literalInit = "/^(ArrayExpression|ObjectExpression)$/";
const asConstMessage = "대문자 이름의 배열·객체 상수에는 as const를 붙임";
const asConstRules = [
  `VariableDeclarator${constantName}[init.type=${literalInit}]`,
  `VariableDeclarator${constantName}[init.type='TSSatisfiesExpression'][init.expression.type=${literalInit}]`,
  `VariableDeclarator${constantName}[init.type='TSAsExpression'][init.expression.type=${literalInit}]:not([init.typeAnnotation.typeName.name='const'])`,
].map((selector) => ({ selector, message: asConstMessage }));

// 같은 규칙을 뒤에서 다시 정하면 앞의 선택자를 덮으므로 공통 선택자를 한곳에 모음.
// 프로젝트가 no-restricted-syntax에 선택자를 더할 때는 이 배열을 펼친 뒤에 덧붙임
export const commonSyntax = [
  ...blockBodies,
  ...conditionRules,
  inlineTypeRule,
  ...returnRules,
];

export const typeScriptSyntax = [...commonSyntax, ...asConstRules];

// 모든 파일: 보이지 않는 문자가 문자열, 정규식, 주석에 실제 문자로 들어가는 것을 막음. 필요하면 \uXXXX 이스케이프로 씀
export const baseRules = {
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
};

// TypeScript·JavaScript 파일
export const commonRules = {
  "no-restricted-syntax": ["error", ...commonSyntax],
  // 매개변수가 3개를 넘으면 객체 매개변수 하나로 받음
  "max-params": ["error", 3],
};

// TypeScript·JavaScript 파일: 문장 사이 빈 줄. 같은 문장 쌍에 여러 항목이 맞으면 뒤 항목이 이김. @stylistic 플러그인 등록이 필요함
// - 이어진 const·let·export 문장은 한 덩어리로 보고 덩어리 앞뒤에만 빈 줄을 둠. 다만 export 문장끼리는 빈 줄을 둠. 선언 바로 뒤의 if는 붙여 둘 수 있음
// - return 앞, if·반복문·switch·try와 블록으로 끝나는 문장 뒤에는 빈 줄을 둠. 블록으로 끝나는 선언(`const f = () => {}`) 뒤도 포함함
// - `block-like`는 마지막 토큰이 블록·switch의 `}`인 문장만 고르므로, 함수 블록을 넘기는 호출문(`xs.forEach(() => {});`)과
//   클래스 식 선언(`const C = class {};`)은 선택자로 더함
// 블록 맨 앞 문장의 앞은 이 규칙이 보지 않음(prettier가 빈 줄을 지움)
const declarations = ["const", "let", "export"];
const callWithBlock = {
  selector:
    "ExpressionStatement:matches([expression.type='CallExpression'], [expression.type='AwaitExpression'], [expression.type='ChainExpression']):has(:matches(ArrowFunctionExpression, FunctionExpression) > BlockStatement.body)",
};
const classDeclaration = {
  selector: "VariableDeclaration:has(ClassExpression)",
};

export const paddingRules = {
  "@stylistic/padding-line-between-statements": [
    "error",
    { blankLine: "always", prev: "*", next: declarations },
    { blankLine: "always", prev: declarations, next: "*" },
    { blankLine: "any", prev: declarations, next: declarations },
    { blankLine: "always", prev: "export", next: "export" },
    { blankLine: "any", prev: declarations, next: "if" },
    { blankLine: "always", prev: "*", next: "return" },
    {
      blankLine: "always",
      prev: [
        "if",
        "for",
        "while",
        "do",
        "switch",
        "try",
        "block-like",
        callWithBlock,
        classDeclaration,
      ],
      next: "*",
    },
  ],
};

// TypeScript 파일: 객체 타입은 interface로 선언하고, 유니언 등 타입 별칭이 필요할 때만 type을 씀.
// export 함수는 반환 타입을 적음. @typescript-eslint 플러그인 등록이 필요함
export const typeScriptRules = {
  "no-restricted-syntax": ["error", ...typeScriptSyntax],
  "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
  "@typescript-eslint/explicit-module-boundary-types": "error",
};
