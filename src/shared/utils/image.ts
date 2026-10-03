/**
 * Shrink a camera photo to something a site's connection can actually send:
 * at most `maxEdge` pixels on the long side, as a JPEG. Anything that is not a
 * picture, or that would not get smaller, goes as it is.
 */
export async function shrinkPhoto(file: File, maxEdge = 1600, quality = 0.75): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900_000) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // A browser without createImageBitmap, or a file it cannot decode: send the
    // original rather than losing the photo.
    return file;
  }
}
