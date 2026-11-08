import { describe, expect, it } from "vitest";
import { WARNING } from "../src/constants";
import { convertLinks } from "../src/links/convert-links";
import { judgeImage } from "../src/links/image-rules";
import { stripHidden } from "../src/strip-hidden/strip-hidden";
import type { Converted, ImageInfo, ImageVerdict, Warning } from "../src/types";

// 가짜 노트와 가짜 이미지 정보만 씀. 실제 볼트와 이미지 파일은 열지 않음 (blog-plan.md 4-2 5절, 6절)
const PUBLIC = new Set(["dev/note.md"]);

const SMALL = {
  gps: false,
  bytes: 1_000,
  width: 800,
} as const satisfies ImageInfo;

// 경로 목록과 이미지 정보. img/noinfo.png는 정보가 없고, doc/b.pdf는 이미지가 아님
// img/edge.png는 경고 기준과 같은 값(1,048,576바이트, 가로 2,560px)이라 경고하지 않음
const IMAGES = new Map<string, ImageInfo>([
  ["img/a.png", SMALL],
  ["img/b.jpeg", SMALL],
  ["img/C.PNG", SMALL],
  ["img/공백 있는.png", SMALL],
  ["img/x.svg", SMALL],
  ["img/y.bmp", SMALL],
  ["img/gps.png", { ...SMALL, gps: true }],
  ["img/gps-big.png", { gps: true, bytes: 2_000_000, width: 4_000 }],
  ["img/big.gif", { ...SMALL, bytes: 1_048_577 }],
  ["img/wide.webp", { ...SMALL, width: 2_561 }],
  ["img/edge.avif", { gps: false, bytes: 1_048_576, width: 2_560 }],
]);
const VAULT = {
  paths: new Set([...IMAGES.keys(), "img/noinfo.png", "doc/b.pdf"]),
  images: IMAGES,
} as const;

const {
  EXTERNAL_IMAGE,
  GPS_IMAGE,
  LARGE_IMAGE,
  MEDIA_EMBED,
  NO_IMAGE_INFO,
  UNSUPPORTED_IMAGE,
} = WARNING;

// frontmatter 없는 노트이므로 본문 n번째 줄이 노트의 n번째 줄임
const convert = (body: string): Converted =>
  convertLinks(stripHidden(body), PUBLIC, VAULT);

interface Row {
  name: string;
  basis: string;
  body: string;
  expected: string;
  warnings?: Warning[];
  attachments?: string[];
}

const table = (rows: Row[]) =>
  it.each(rows)(
    "$name ($basis)",
    ({ body, expected, warnings = [], attachments = [] }) => {
      const result = convert(body);
      expect(result.body).toBe(expected);
      expect(result.warnings).toEqual(warnings);
      expect(result.attachments).toEqual(attachments);
    },
  );

const kept = (name: string, basis: string, body: string): Row => ({
  name,
  basis,
  body,
  expected: body,
});

const warn = (message: Warning["message"], line = 1): Warning => ({
  message,
  line,
});

// 기대 출력의 주소는 assetUrl 규칙(조각마다 encodeURIComponent)을 따름
const SPACED = `/assets/img/${encodeURIComponent("공백 있는.png")}`;

describe("위키 이미지 임베드를 웹 주소의 이미지로 바꿈", () => {
  table([
    {
      name: "경로 임베드는 /assets/ 주소의 이미지, 대체 텍스트는 비움",
      basis: "4-2 1절, 4-3 A2, A11",
      body: "![[img/a.png]]\n",
      expected: "![](</assets/img/a.png>)\n",
      attachments: ["img/a.png"],
    },
    {
      name: "숫자 별칭은 너비로 주소 조각에 넣음",
      basis: "4-2 1절, BLOG-33 가정 1",
      body: "![[img/a.png|300]]\n",
      expected: "![](</assets/img/a.png#width=300>)\n",
      attachments: ["img/a.png"],
    },
    {
      name: "가로x세로는 너비만 씀",
      basis: "4-2 1절, BLOG-33 가정 7",
      body: "![[img/a.png|300x200]]\n",
      expected: "![](</assets/img/a.png#width=300>)\n",
      attachments: ["img/a.png"],
    },
    {
      name: "숫자가 아닌 별칭은 대체 텍스트",
      basis: "4-3 A11",
      body: "![[img/a.png|설명 *a*]]\n",
      expected: "![설명 \\*a\\*](</assets/img/a.png>)\n",
      attachments: ["img/a.png"],
    },
    {
      name: "0, 단위가 붙은 숫자, 0 높이는 대체 텍스트",
      basis: "BLOG-33 가정 7",
      body: "![[img/a.png|0]] ![[img/a.png|300px]] ![[img/a.png|300x0]]\n",
      expected:
        "![0](</assets/img/a.png>) ![300px](</assets/img/a.png>) ![300x0](</assets/img/a.png>)\n",
      attachments: ["img/a.png"],
    },
    {
      name: "공백과 한글이 있는 경로는 주소만 인코딩",
      basis: "3절, 4-2 1절",
      body: "![[img/공백 있는.png]]\n",
      expected: `![](<${SPACED}>)\n`,
      attachments: ["img/공백 있는.png"],
    },
    {
      name: "jpeg와 대문자 확장자도 지원 이미지",
      basis: "4-2 1절, BLOG-33 가정 2",
      body: "![[img/b.jpeg]] ![[img/C.PNG]]\n",
      expected: "![](</assets/img/b.jpeg>) ![](</assets/img/C.PNG>)\n",
      attachments: ["img/b.jpeg", "img/C.PNG"],
    },
    {
      name: "표 안의 \\|는 대상에서 뺌",
      basis: "4-2 1절",
      body: "| 열 |\n| --- |\n| ![[img/a.png\\|300]] |\n",
      expected: "| 열 |\n| --- |\n| ![](</assets/img/a.png#width=300>) |\n",
      attachments: ["img/a.png"],
    },
    {
      name: "링크 안의 임베드도 이미지",
      basis: "4-2 1절",
      body: "[![[img/a.png]]](https://example.com)\n",
      expected: "[![](</assets/img/a.png>)](https://example.com)\n",
      attachments: ["img/a.png"],
    },
  ]);
});

describe("경로 목록에 정확히 없는 이미지는 글자로 둠", () => {
  table([
    {
      name: "이름만 있는 임베드는 파일 이름 글자",
      basis: "4-2 1절, BLOG-33 가정 8",
      body: "![[a.png]]\n",
      expected: "a\\.png\n",
    },
    {
      name: "없는 경로는 파일 이름만 남기고 폴더 경로는 지움",
      basis: "4-2 1절, BLOG-33 가정 8",
      body: "![[secret/없음.png]] ![[secret/없음.png|300]]\n",
      expected: "없음\\.png 없음\\.png\n",
    },
    {
      name: "대체 텍스트가 있으면 대체 텍스트",
      basis: "4-2 1절",
      body: "![[secret/없음.png|설명]]\n",
      expected: "설명\n",
    },
    {
      name: "대소문자나 NFC가 다르면 다른 경로",
      basis: "4-2 1절, BLOG-33 가정 8",
      body: `![[img/A.png]] ![[img/${"공백 있는".normalize("NFD")}.png]]\n`,
      expected: `A\\.png ${"공백 있는".normalize("NFD")}\\.png\n`,
    },
  ]);
});

describe("내보내지 않는 형식", () => {
  table([
    {
      name: "SVG와 BMP는 경로 목록에 있어도 빼고 경고",
      basis: "4-2 1절, BLOG-33 가정 4",
      body: "![[img/x.svg]] ![[img/y.bmp|그림]]\n",
      expected: "x\\.svg 그림\n",
      warnings: [warn(UNSUPPORTED_IMAGE), warn(UNSUPPORTED_IMAGE)],
    },
    {
      name: "PDF, 오디오, 동영상은 별칭이 있어도 파일 이름 글자와 경고",
      basis: "4-2 1절, 4-3 A2",
      body: "![[doc/b.pdf|설명]] ![[media/c.mp3]] ![[media/d.MP4|300]]\n",
      expected: "b\\.pdf c\\.mp3 d\\.MP4\n",
      warnings: [warn(MEDIA_EMBED), warn(MEDIA_EMBED), warn(MEDIA_EMBED)],
    },
  ]);
});

describe("이미지 정보로 판정함", () => {
  table([
    {
      name: "GPS 정보가 있으면 빼고 경고",
      basis: "4-2 1절, 2절",
      body: "![[img/gps.png|설명]] ![](img/gps.png)\n",
      expected: "설명 gps\\.png\n",
      warnings: [warn(GPS_IMAGE), warn(GPS_IMAGE)],
    },
    {
      name: "정보가 없으면 빼고 경고",
      basis: "BLOG-33 가정 6",
      body: "![[img/noinfo.png]]\n",
      expected: "noinfo\\.png\n",
      warnings: [warn(NO_IMAGE_INFO)],
    },
    {
      name: "1MB 초과나 가로 2,560px 초과는 남기고 경고",
      basis: "4-2 1절, 4-3 A9, BLOG-33 가정 3",
      body: "![[img/big.gif]] ![[img/wide.webp]]\n",
      expected: "![](</assets/img/big.gif>) ![](</assets/img/wide.webp>)\n",
      warnings: [warn(LARGE_IMAGE), warn(LARGE_IMAGE)],
      attachments: ["img/big.gif", "img/wide.webp"],
    },
    {
      name: "기준과 같은 값은 경고하지 않음",
      basis: "4-3 A9, BLOG-33 가정 3",
      body: "![[img/edge.avif]]\n",
      expected: "![](</assets/img/edge.avif>)\n",
      attachments: ["img/edge.avif"],
    },
    {
      name: "경고 줄 번호는 원본 노트 기준",
      basis: "BLOG-32 가정 2",
      body: "---\ntitle: 글\n---\n\n![[img/x.svg]]\n",
      expected: "\nx\\.svg\n",
      warnings: [warn(UNSUPPORTED_IMAGE, 5)],
    },
  ]);
});

describe("표준 마크다운 이미지에도 같은 규칙", () => {
  table([
    {
      name: "볼트 경로는 /assets/ 주소로, 대체 텍스트와 제목은 그대로",
      basis: "4-2 1절, 4-3 A11",
      body: '![그림_1](img/a.png "제목")\n',
      expected: '![그림\\_1](</assets/img/a.png> "제목")\n',
      attachments: ["img/a.png"],
    },
    {
      name: "인코딩한 경로와 <> 경로",
      basis: "4-2 1절",
      body: `![](img/${encodeURIComponent("공백 있는.png")}) ![](<img/공백 있는.png>)\n`,
      expected: `![](<${SPACED}>) ![](<${SPACED}>)\n`,
      attachments: ["img/공백 있는.png"],
    },
    {
      name: "없는 경로는 대체 텍스트, 없으면 파일 이름",
      basis: "4-2 1절",
      body: "![*그림*](secret/없음.png) ![](secret/없음.png)\n",
      expected: "그림 없음\\.png\n",
    },
    {
      name: "SVG, PDF, 지원 목록 밖 확장자, 노트",
      basis: "4-2 1절, BLOG-33 가정 8",
      body: "![그림](img/x.svg) ![설명](doc/b.pdf) ![](img/a.tiff) ![](dev/note.md)\n",
      expected: "그림 b\\.pdf a\\.tiff note\\.md\n",
      warnings: [
        warn(UNSUPPORTED_IMAGE),
        warn(MEDIA_EMBED),
        warn(UNSUPPORTED_IMAGE),
        warn(UNSUPPORTED_IMAGE),
      ],
    },
    {
      name: "링크 안의 이미지는 링크와 따로 판정",
      basis: "4-2 1절",
      body: "[![그림](img/a.png)](dev/note.md) [![그림](img/a.png)](secret/plan.md)\n",
      expected:
        "[![그림](</assets/img/a.png>)](</notes/dev/note>) ![그림](</assets/img/a.png>)\n",
      attachments: ["img/a.png"],
    },
    {
      name: "참조 이미지는 풀어 쓰고, 이미지만 쓰는 비공개 정의는 지움",
      basis: "4-2 1절, 2절",
      body: "![그림][a] ![설명][s]\n\n[a]: img/a.png\n[s]: secret/x.png\n",
      expected: "![그림](</assets/img/a.png>) 설명\n\n\n\n",
      attachments: ["img/a.png"],
    },
    kept("코드 안은 그대로", "4-2 1절", "`![](img/a.png)` `![[img/a.png]]`\n"),
    {
      name: "HTML 블록 안은 대체 텍스트만 남기고 첨부 목록에 넣지 않음",
      basis: "BLOG-32 가정 7, BLOG-33 가정 8",
      body: "<details>\n![그림](img/a.png) ![[img/a.png]] ![[img/a.png|설명]]\n</details>\n",
      expected: "<details>\n그림 a\\.png 설명\n</details>\n",
    },
    {
      name: "같은 이미지는 첨부 목록에 한 번",
      basis: "2절, 4-1 (2)",
      body: "![[img/a.png]] ![](img/a.png) ![[img/a.png|300]]\n",
      expected:
        "![](</assets/img/a.png>) ![](</assets/img/a.png>) ![](</assets/img/a.png#width=300>)\n",
      attachments: ["img/a.png"],
    },
  ]);
});

describe("외부 이미지와 볼트 밖 주소", () => {
  table([
    {
      name: "https와 http 이미지는 일반 링크와 경고, 제목은 그대로",
      basis: "4-2 1절, 4-3 A7, BLOG-33 가정 5",
      body: '![그림](https://example.com/a.png "제목") ![](http://example.com/b.png)\n',
      expected:
        '[그림](https://example.com/a.png "제목") [http\\:\\/\\/example\\.com\\/b\\.png](http://example.com/b.png)\n',
      warnings: [warn(EXTERNAL_IMAGE), warn(EXTERNAL_IMAGE)],
    },
    {
      name: "참조 외부 이미지는 참조 링크로",
      basis: "4-2 1절",
      body: "![그림][e]\n\n[e]: https://example.com/a.png\n",
      expected: "[그림][e]\n\n[e]: https://example.com/a.png\n",
      warnings: [warn(EXTERNAL_IMAGE)],
    },
    {
      name: "링크 안의 외부 이미지는 글자만",
      basis: "4-2 1절",
      body: "[![그림](https://example.com/a.png)](https://example.com)\n",
      expected: "[그림](https://example.com)\n",
      warnings: [warn(EXTERNAL_IMAGE)],
    },
    {
      name: "다른 스킴, 로컬 경로, 깨진 인코딩은 대체 텍스트만",
      basis: "2절, BLOG-33 가정 5",
      body: "![a](obsidian://open?file=x) ![](file:///x/b.png) ![](/Users/x/c.png) ![](mailto:a@example.com) ![e](img/%E0.png)\n",
      expected: "a    e\n",
    },
  ]);
});

// 앞의 판정이 뒤의 판정을 가림. 맞바꿀 수 있는 쌍마다 행을 둠
describe("판정 순서", () => {
  it.each<[string, string, ImageVerdict]>([
    [
      "PDF는 경로 목록에 없어도 파일 이름과 경고",
      "secret/없음.pdf",
      { kind: "name", warning: MEDIA_EMBED },
    ],
    [
      "SVG는 경로 목록에 없어도 경고",
      "secret/없음.svg",
      { kind: "text", warning: UNSUPPORTED_IMAGE },
    ],
    [
      "경로 목록에 없으면 정보를 보지 않음",
      "secret/없음.png",
      { kind: "text" },
    ],
    [
      "GPS 정보가 있으면 큰 이미지여도 뺌",
      "img/gps-big.png",
      { kind: "text", warning: GPS_IMAGE },
    ],
    [
      "SVG는 정보가 있어도 뺌",
      "img/x.svg",
      { kind: "text", warning: UNSUPPORTED_IMAGE },
    ],
  ])("%s (4-2 1절, 2절)", (_name, path, expected) => {
    expect(judgeImage(path, VAULT)).toEqual(expected);
  });
});

describe("뺀 이미지와 비공개 경로의 흔적이 가공 결과에 남지 않음", () => {
  // 뺀 이미지의 폴더 경로와 볼트 밖 주소에 표식을 넣음. 파일 이름과 대체 텍스트는 글자로 남으므로 표식을 넣지 않음 (4-2 1절)
  const gps = "CANARY-301/gps.png";
  const noInfo = "CANARY-302/noinfo.png";
  const svg = "CANARY-303/x.svg";
  const vault = {
    paths: new Set([...VAULT.paths, gps, noInfo, svg]),
    images: new Map([...IMAGES, [gps, { ...SMALL, gps: true }], [svg, SMALL]]),
  };
  const body = [
    `![[${gps}]] ![](${gps}) ![[${noInfo}|설명]] ![[${svg}]] ![](${svg})`,
    "![[CANARY-304/없음.png]] ![](CANARY-305/없음.png) ![[CANARY-306/b.pdf]] ![설명](CANARY-307/c.mp4)",
    "![그림][r] ![](obsidian://open?file=CANARY-308) ![](file:///CANARY-309/a.png) ![](/Users/CANARY-310/a.png)",
    "![[img/a.png]]",
    "",
    "<details>",
    "![그림](CANARY-311/a.png) ![[CANARY-312/a.png]] ![[img/a.png]]",
    "</details>",
    "",
    "[r]: CANARY-313/a.png",
    "",
  ].join("\n");

  it("본문, 경고, 대상 목록, 첨부 목록에 표식이 없음 (2절, 4-2 6절)", () => {
    const result = convertLinks(stripHidden(body), PUBLIC, vault);
    expect(result.body).not.toContain("CANARY");
    expect(JSON.stringify(result)).not.toContain("CANARY");
    expect(result.attachments).toEqual(["img/a.png"]);
    expect(result.allTargets).toEqual([]);
  });
});
