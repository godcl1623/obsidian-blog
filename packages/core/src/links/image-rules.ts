import {
  IMAGE_EXTENSION,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_WIDTH,
  MEDIA_EXTENSION,
  WARNING,
} from "../constants";
import type { ImageVerdict, VaultAttachments } from "../types";

// 볼트 경로 하나를 이미지로 남길지 정함. 어느 경우에도 노트는 보류하지 않음 (4-2 1절, 2절)
// 확장자를 먼저 보므로 볼트에 없는 PDF나 SVG도 같은 글자와 경고를 받음
// 경로 목록에 정확히 없는 이미지는 비공개 노트 링크처럼 경고 없이 글자로 둠 (BLOG-33 가정 8)
// 정보가 없는 이미지는 GPS 정보를 확인할 수 없으므로 뺌 (BLOG-33 가정 6)
export const judgeImage = (
  path: string,
  vault: VaultAttachments,
): ImageVerdict => {
  const media = MEDIA_EXTENSION.test(path);
  if (media) return { kind: "name", warning: WARNING.MEDIA_EMBED };
  const supported = IMAGE_EXTENSION.test(path);
  if (!supported) return { kind: "text", warning: WARNING.UNSUPPORTED_IMAGE };
  const listed = vault.paths.has(path);
  if (!listed) return { kind: "text" };
  const info = vault.images.get(path);
  const known = info !== undefined;
  if (!known) return { kind: "text", warning: WARNING.NO_IMAGE_INFO };
  const { gps, bytes, width } = info;
  if (gps) return { kind: "text", warning: WARNING.GPS_IMAGE };
  const large = bytes > MAX_IMAGE_BYTES || width > MAX_IMAGE_WIDTH;
  return large
    ? { kind: "image", warning: WARNING.LARGE_IMAGE }
    : { kind: "image" };
};
