import type { ReturnableReturnEventAttachment } from '../../types';

interface ReturnTripPhotosProps {
  photos: ReturnableReturnEventAttachment[];
}

/** The gate's photos of what came back on one return trip, as a thumbnail row. */
export function ReturnTripPhotos({ photos }: ReturnTripPhotosProps) {
  if (!photos.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {photos.map((photo) => (
        <a
          key={photo.id}
          href={photo.file}
          target="_blank"
          rel="noreferrer"
          title={`Photo taken at the gate by ${photo.created_by_name || 'the gate'}`}
          className="block overflow-hidden rounded-md border transition-shadow hover:shadow-md"
        >
          <img
            src={photo.file}
            alt={photo.caption || 'Returned material'}
            loading="lazy"
            className="h-16 w-16 object-cover"
          />
        </a>
      ))}
    </div>
  );
}
