// 写真の前処理（ブラウザ内で完結）
// canvas に描き直して JPEG に再エンコードする。
// これで EXIF（位置情報など撮影時のメタデータ）が消える = 「位置情報は消してから送る」の実装
export async function toCleanJpegBase64(
  file: File,
  maxSize = 1280
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
}
