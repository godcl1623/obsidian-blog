import { NOTE_EXTENSION } from "./constants";

// `a/b/c` → [`a`, `a/b`]
const folders = (key: string): string[] => {
  const parts = key.split("/");
  return parts.slice(1).map((_, i) => parts.slice(0, i + 1).join("/"));
};

const append = (map: Map<string, string[]>, key: string, path: string) =>
  map.set(key, [...(map.get(key) ?? []), path]);

// 주소 키가 같은 경로끼리, 그리고 주소 키가 다른 경로의 폴더와 같으면 그 경로와 폴더 안의 경로 모두 충돌함.
// 충돌한 공개 대상은 모두 보류함 (blog-plan.md 4-1 (0), 4-3 A1)
const findConflicts = (
  paths: readonly string[],
  toKey: (path: string) => string,
): Set<string> => {
  const byKey = new Map<string, string[]>();
  const byFolder = new Map<string, string[]>();
  for (const path of paths) {
    const key = toKey(path);
    append(byKey, key, path);
    for (const folder of folders(key)) append(byFolder, folder, path);
  }
  const conflicts = new Set<string>();
  for (const [key, same] of byKey) {
    const inside = byFolder.get(key) ?? [];
    if (same.length > 1 || inside.length > 0)
      for (const path of [...same, ...inside]) conflicts.add(path);
  }
  return conflicts;
};

// 주소 키는 NFC로 바꾼 경로. 대소문자는 그대로 둠 (주소가 대소문자를 구분함, blog-plan.md 3절, BLOG-30 가정 4)
export const findNoteConflicts = (paths: readonly string[]): Set<string> =>
  findConflicts(paths, (path) =>
    path.normalize("NFC").replace(NOTE_EXTENSION, ""),
  );

export const findAssetConflicts = (paths: readonly string[]): Set<string> =>
  findConflicts(paths, (path) => path.normalize("NFC"));
