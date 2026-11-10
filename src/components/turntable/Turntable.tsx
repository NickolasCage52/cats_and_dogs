import type { Species } from '../../features/animal-detection/logic'
import type { GenreId } from '../../features/music/genres'
import { genres } from '../../features/music/genres'

export function Turntable({ playing = false, genre = 'lofi', species = 'cat', hero = false, onToggle }: { playing?: boolean; genre?: GenreId; species?: Species; hero?: boolean; onToggle?: () => void }) {
  const preset = genres[genre]
  return <div className={`turntable ${playing ? 'is-playing' : ''} ${hero ? 'turntable-hero' : ''}`} style={{ '--label-color': preset.color } as React.CSSProperties}>
    <div className="turntable-deck">
      <span className="deck-brand">KOTO · 33⅓</span>
      <div className="vinyl-wrap"><div className="vinyl">
        <div className="vinyl-label"><span className="label-paw">✦</span><span>KOTO<br />VINYL</span><i /></div>
      </div></div>
      <div className="tonearm"><span className="tonearm-head" /></div>
      <div className="deck-lower"><div className="deck-lights"><i /><i /><i /></div><span className="deck-caption">{hero ? `your ${species}, your sound` : preset.title}</span>{onToggle ? <button type="button" className="deck-button" onClick={onToggle} aria-label={playing ? 'Приостановить музыку' : 'Слушать винил'}>{playing ? 'Ⅱ' : '▶'}</button> : <span className="deck-button deck-button-decor">▶</span>}</div>
    </div>
    <div className="sound-waves" aria-hidden="true"><i /><i /><i /><i /></div>
  </div>
}
