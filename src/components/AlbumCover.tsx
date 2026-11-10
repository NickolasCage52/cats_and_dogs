import type { Album } from '../features/vinyl-collection/albums'
import { genres } from '../features/music/genres'
import { useObjectUrl } from '../hooks/useObjectUrl'

export function AlbumCover({ album, size = 'normal' }: { album: Album; size?: 'normal' | 'large' }) {
  const image = useObjectUrl(album.imageBlob)
  return <div className={`album-cover album-cover-${size}`} style={{ '--album-color': genres[album.genreId].color } as React.CSSProperties}>
    <div className="cover-photo">{image && <img src={image} alt={`Питомец на обложке «${album.name}»`} />}</div>
    <div className="cover-top"><span>КОТОВИНИЛ · {album.species === 'cat' ? 'CAT' : 'DOG'}</span><span className="cover-disc">●</span></div>
    <div className="cover-bottom"><strong>{album.name}</strong><small>{genres[album.genreId].title} · 33⅓ RPM</small></div>
  </div>
}
