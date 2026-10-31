import { HOLD_REASON } from "./constants";
import { findAssetConflicts, findNoteConflicts } from "./conflict";
import { checkEncodable, checkNfc, checkNoteName } from "./path-format";
import type { HoldReason } from "./types";

// 보류할 경로와 사유를 돌려줌. 사유는 하나만이며 NFC, 주소로 바꿀 수 없음, 충돌 순서임.
// 주소로 바꿀 수 없는 경로는 주소가 없으므로 충돌 비교에서 뺌 (BLOG-30 가정 4, 6, 7)
const checkPaths = (
  paths: readonly string[],
  checkAddress: (path: string) => HoldReason | undefined,
  findConflicts: (paths: readonly string[]) => Set<string>,
): Map<string, HoldReason> => {
  const held = new Map<string, HoldReason>();
  const addressable: string[] = [];
  for (const path of paths) {
    const address = checkAddress(path);
    const reason = checkNfc(path) ?? address;
    if (reason) held.set(path, reason);
    if (!address) addressable.push(path);
  }
  for (const path of findConflicts(addressable)) {
    if (!held.has(path)) held.set(path, HOLD_REASON.URL_CONFLICT);
  }
  return held;
};

export const checkNotePaths = (
  paths: readonly string[],
): Map<string, HoldReason> =>
  checkPaths(
    paths,
    (path) => checkEncodable(path) ?? checkNoteName(path),
    findNoteConflicts,
  );

export const checkAssetPaths = (
  paths: readonly string[],
): Map<string, HoldReason> =>
  checkPaths(paths, checkEncodable, findAssetConflicts);
