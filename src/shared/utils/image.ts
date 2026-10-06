import { toast } from 'sonner';

const PHOTO_NAME_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

/**
 * The photos picked in a photo input, with a toast for anything else.
 *
 * Photo inputs carry no `accept`. Chrome on Android hands an images-only
 * `accept="image/*"` to the system Photo Picker, which opens the gallery with
 * no way to the camera; without one it asks "camera or files?" like any other
 * upload. Any file can be picked then, so the non-photos are dropped here, and
 * the input is cleared so it does not go on showing their name.
 */
export function pickPhotos(input: HTMLInputElement): File[] {
  const picked = Array.from(input.files ?? []);
  const photos = picked.filter(
    (file) => file.type.startsWith('image/') || PHOTO_NAME_RE.test(file.name),
  );
  const others = picked.filter((file) => !photos.includes(file));
  if (others.length) {
    input.value = '';
    toast.error(
      others.length === 1
        ? `"${others[0].name}" is not a photo.`
        : `${others.length} of the files picked are not photos.`,
    );
  }
  return photos;
}

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
