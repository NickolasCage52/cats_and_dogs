import { Component, lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlbumCover } from '../components/AlbumCover'
import { CatIllustration } from '../components/cats/CatIllustration'
import { Mascot } from '../components/cats/Mascot'
import { Turntable } from '../components/turntable/Turntable'
import { classifyAnimals } from '../features/animal-detection/logic'
import type { Species } from '../features/animal-detection/logic'
import { detectAnimals, getModel } from '../features/animal-detection/model'
import { FeedbackForm } from '../features/feedback/FeedbackForm'
import { MusicEngine } from '../features/music/engine'
import { genreOrder, genres } from '../features/music/genres'
import type { GenreId } from '../features/music/genres'
import { albumTitle, canvasToCover, MUSIC_ENGINE_VERSION, seedFromFile } from '../features/vinyl-collection/albums'
import type { Album } from '../features/vinyl-collection/albums'
import { deleteAlbum, listAlbums, putAlbum } from '../features/vinyl-collection/store'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { imageToCanvas, validateImage } from '../utils/image'
import { initialState, reducer } from './state'

const StudioScene = lazy(() => import('../features/turntable/StudioScene').then(module => ({ default: module.StudioScene })))
type CollectionFilter = 'all' | Species
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
function webGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!context) return false
    ;(context as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [species, setSpecies] = useState<Species>('cat')
  const [albums, setAlbums] = useState<Album[]>([])
  const [selected, setSelected] = useState<Album | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [storageError, setStorageError] = useState('')
  const [tempPreview, setTempPreview] = useState<string | null>(null)
  const [filter, setFilter] = useState<CollectionFilter>('all')
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [muted, setMuted] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [beat, setBeat] = useState(-1)
  const [use3d, setUse3d] = useState(false)
  const [reduced, setReduced] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const job = useRef(0), busy = useRef(false), audioBusy = useRef(false)
  const engine = useRef<MusicEngine | null>(null)
  const previewRef = useRef<string | null>(null)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const genreChange = useRef(0)
  const albumImage = useObjectUrl(selected?.imageBlob ?? null)
  const playing = state.audio === 'playing'

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update(); query.addEventListener?.('change', update)
    setUse3d(webGLAvailable())
    listAlbums().then(setAlbums).catch(() => setStorageError('Не удалось открыть коллекцию в этом браузере. Новые пластинки могут не сохраниться.'))
    return () => { query.removeEventListener?.('change', update); job.current++; void engine.current?.dispose(); if (previewRef.current) URL.revokeObjectURL(previewRef.current) }
  }, [])

  function setPreview(url: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url; setTempPreview(url)
  }
  function stopAudio() { engine.current?.pause(); dispatch({ type: 'PAUSE' }); setAudioError('') }
  function reset() {
    job.current++; genreChange.current++; busy.current = false; stopAudio(); setSelected(null); setPreview(null)
    setSaveState('idle'); setEditing(false); dispatch({ type: 'RESET' })
    if (input.current) input.current.value = ''
  }
  function switchSpecies(next: Species) {
    if (next === species) return
    if (state.phase === 'loading-model' || state.phase === 'analyzing') reset()
    setSpecies(next)
  }
  async function handleFile(file?: File) {
    if (!file || busy.current) return
    reset()
    const issue = validateImage(file)
    if (issue) { dispatch({ type: 'ERROR', message: issue }); return }
    busy.current = true
    const current = ++job.current
    dispatch({ type: 'LOADING' })
    setPreview(URL.createObjectURL(file))
    let canvas: HTMLCanvasElement | null = null
    try {
      canvas = await imageToCanvas(file)
      if (current !== job.current) return
      const model = await getModel()
      if (current !== job.current) return
      dispatch({ type: 'ANALYZING' })
      const detections = await detectAnimals(model, canvas)
      if (current !== job.current) return
      const result = classifyAnimals(detections, canvas.width, species)
      if (result.kind === 'wrong-species') { dispatch({ type: 'WRONG_SPECIES', species: result.species }); return }
      if (result.kind === 'uncertain') { dispatch({ type: 'UNCERTAIN' }); return }
      if (result.kind === 'not-found') { dispatch({ type: 'NOT_FOUND' }); return }
      const [seed, imageBlob] = await Promise.all([seedFromFile(file, species, result.count), canvasToCover(canvas)])
      if (current !== job.current) return
      const album: Album = {
        id: crypto.randomUUID(), species, name: albumTitle(species, result.genre, seed),
        createdAt: new Date().toISOString(), imageBlob, imageMimeType: imageBlob.type,
        genreId: result.genre, musicSeed: seed, musicEngineVersion: MUSIC_ENGINE_VERSION,
        animalCount: result.count, vinylEffectEnabled: true
      }
      setSelected(album); setPreview(null); setSaveState('saving')
      dispatch({ type: 'FOUND', count: result.count })
      try {
        await putAlbum(album)
        const refreshed = await listAlbums()
        setAlbums(refreshed)
        if (current === job.current) setSaveState('saved')
      } catch { if (current === job.current) setSaveState('error') }
    } catch (error) {
      if (current === job.current) {
        const message = error instanceof Error ? error.message : ''
        dispatch({ type: 'ERROR', message: /bitmap|decode|canvas|image/i.test(message) ? 'Не удалось открыть фотографию. Выбери другой файл.' : 'Не удалось загрузить модель распознавания. Проверь локальные файлы модели и попробуй ещё раз.' })
      }
    } finally {
      if (canvas) { canvas.width = 0; canvas.height = 0 }
      if (current === job.current) busy.current = false
    }
  }
  async function saveAlbum(next: Album) {
    setSelected(next); setSaveState('saving')
    const current = job.current
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => putAlbum(next))
    try {
      await saveQueue.current
      const refreshed = await listAlbums()
      setAlbums(refreshed)
      if (current === job.current) setSaveState('saved')
    } catch { if (current === job.current) setSaveState('error') }
  }
  async function toggleAudio() {
    if (!selected || state.phase !== 'found' || audioBusy.current) return
    if (playing) { stopAudio(); return }
    const currentJob = job.current
    audioBusy.current = true; dispatch({ type: 'START' })
    try {
      if (!engine.current) engine.current = new MusicEngine()
      engine.current.setVolume(volume); engine.current.setMuted(muted)
      engine.current.setVinylEnabled(selected.vinylEffectEnabled)
      engine.current.setBeatListener(setBeat)
      await engine.current.play(selected.genreId, selected.musicSeed)
      if (currentJob !== job.current || !engine.current.playing) { dispatch({ type: 'PAUSE' }); return }
      setAudioError(''); dispatch({ type: 'PLAY' })
    } catch { engine.current?.pause(); dispatch({ type: 'PAUSE' }); setAudioError('Браузер не смог запустить звук. Попробуй ещё раз после касания кнопки.') }
    finally { audioBusy.current = false }
  }
  async function changeGenre(genre: GenreId) {
    if (!selected) return
    const version = ++genreChange.current
    const next = { ...selected, genreId: genre }
    setSelected(next)
    try { await engine.current?.changeGenre(genre) }
    catch { if (version === genreChange.current) { stopAudio(); setAudioError('Не удалось переключить жанр. Попробуй запустить пластинку снова.') }; return }
    if (version !== genreChange.current) return
    void saveAlbum(next)
  }
  function openAlbum(album: Album) {
    job.current++; genreChange.current++; stopAudio(); setSelected(album); setPreview(null); setSaveState('saved')
    setEditing(false); dispatch({ type: 'FOUND', count: album.animalCount })
    document.getElementById('studio')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
  }
  async function removeAlbum(album: Album) {
    if (!window.confirm(`Удалить пластинку «${album.name}»? Это действие нельзя отменить.`)) return
    try {
      await saveQueue.current.catch(() => {})
      await deleteAlbum(album.id)
      setAlbums(await listAlbums())
      if (selected?.id === album.id) reset()
    } catch { setStorageError('Не удалось удалить пластинку. Попробуй ещё раз.') }
  }
  const activeSpecies = selected?.species ?? species
  const processing = state.phase === 'loading-model' || state.phase === 'analyzing'
  const visibleAlbums = albums.filter(album => filter === 'all' || album.species === filter)

  return <>
    <header className="site-header wrap">
      <a className="wordmark" href="#top" aria-label="КОТОВИНИЛ — наверх"><span className="brand-disc" aria-hidden="true">✦</span> КОТОВИНИЛ</a>
      <nav aria-label="Навигация"><a href="#studio">Студия</a><a href="#collection">Коллекция</a><a href="#feedback">Обратная связь</a></nav>
      <div className="species-switch" role="group" aria-label="Выбрать животное"><button type="button" aria-pressed={species === 'cat'} onClick={() => switchSpecies('cat')}>Коты</button><button type="button" aria-pressed={species === 'dog'} onClick={() => switchSpecies('dog')}>Собаки</button></div>
    </header>
    <main id="top">
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> МАЛЕНЬКАЯ МУЗЫКАЛЬНАЯ ВСЕЛЕННАЯ</span><h1 id="hero-title">У каждого хвостика <em>своя пластинка.</em></h1><p>Преврати фотографию любимого питомца в маленькую музыкальную историю.</p>
          <div className="hero-actions"><a className="button button-primary" href="#studio">Создать пластинку <span aria-hidden="true">↗</span></a><a className="button button-outline" href="#collection">Моя коллекция</a></div>
          <span className="hero-note">Загрузи питомца. Поймай настроение. Запусти винил.</span>
        </div>
        <div className="hero-art"><div className="hero-arch" /><span className="hero-spark spark-one">✳</span><span className="hero-spark spark-two">♪</span><Turntable hero species={species} /><Mascot species={species} dancing={playing} /><span className="art-stamp">GOOD VIBES<br />33⅓ RPM</span></div>
        <span className="hero-index">01 / СОЗДАЙ СВОЮ ПЛАСТИНКУ</span>
      </section>
      <section id="how" className="how-section" aria-labelledby="how-title"><div className="wrap how-inner"><div className="section-heading"><span className="eyebrow">ПРОСТО И ПО-НАСТОЯЩЕМУ</span><h2 id="how-title">От фото до <em>первой ноты.</em></h2></div><ol className="how-cards"><li><span>01</span><h3>Выбери фото</h3><p>Кот или собака — главное, чтобы питомца было видно.</p></li><li><span>02</span><h3>Мы найдём хвостика</h3><p>Модель проверит снимок прямо в твоём браузере.</p></li><li><span>03</span><h3>Включи винил</h3><p>Пластинка останется в твоей коллекции на этом устройстве.</p></li></ol></div></section>
      <section id="studio" className="studio-section" aria-labelledby="studio-title"><div className="wrap studio-inner">
        <div className="studio-heading"><span className="eyebrow"><span className="eyebrow-line" /> МУЗЫКАЛЬНАЯ СТУДИЯ</span><h2 id="studio-title">Пора записать <em>новую пластинку.</em></h2><p>Выбери режим и загрузи фото. Музыка начнётся, когда ты нажмёшь Play.</p></div>
        <div className="studio-species"><span>Кого ищем?</span><div className="species-switch" role="group" aria-label="Режим распознавания"><button type="button" aria-pressed={species === 'cat'} onClick={() => switchSpecies('cat')}>Котика</button><button type="button" aria-pressed={species === 'dog'} onClick={() => switchSpecies('dog')}>Собаку</button></div></div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" aria-label="Выбрать фотографию питомца" onChange={event => { void handleFile(event.target.files?.[0]); event.target.value = '' }} />
        <div className="studio-panel" aria-live="polite">
          {state.phase === 'idle' && <div className="upload-layout"><div className={`upload-zone ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]) }}><div className="upload-icon" aria-hidden="true">✳</div><h3>Здесь начнётся музыка</h3><p>Перетащи фото {species === 'cat' ? 'котика' : 'собаки'} или выбери файл на устройстве.</p><button className="button button-primary" type="button" onClick={() => input.current?.click()}>Выбрать фото <span aria-hidden="true">↗</span></button><span className="file-note">JPG, PNG или WebP · до 10 МБ</span></div><div className="upload-art"><Mascot species={species} compact /><span className="upload-art-caption">{species === 'cat' ? 'ЖДУ КОТИКА' : 'ЖДУ СОБАКУ'}</span></div></div>}
          {processing && <div className="status-layout"><div className="preview-frame">{tempPreview && <img src={tempPreview} alt="Загруженная фотография" />}<div className="scan-line" /></div><div><span className="eyebrow">РАБОТАЕМ СО СНИМКОМ</span><h3>{state.phase === 'loading-model' ? 'Готовим распознавание…' : `Ищем ${species === 'cat' ? 'котика' : 'собаку'} на фотографии…`}</h3><p>Первый запуск модели может занять немного времени. Фото остаётся в браузере.</p><span className="loading-dots" aria-label="Обработка идёт"><i /><i /><i /></span></div></div>}
          {state.phase === 'found' && selected && <div className="album-result">
            <div className="scene-column"><div className="scene-frame" role="img" aria-label="Проигрыватель и музыкант">{use3d ? <SceneBoundary fallback={<div className="scene-fallback"><Turntable playing={playing} genre={selected.genreId} species={selected.species} /><p>3D недоступно. Музыка и коллекция работают.</p></div>}><Suspense fallback={<Turntable playing={playing} genre={selected.genreId} species={selected.species} />}><StudioScene species={activeSpecies} genre={selected.genreId} playing={playing} beat={beat} reduced={reduced} /></Suspense></SceneBoundary> : <div className="scene-fallback"><Turntable playing={playing} genre={selected.genreId} species={selected.species} /><p>На этом устройстве 3D недоступно. Музыка работает.</p></div>}</div><span className="scene-caption">Винил · {playing ? 'играет' : 'ждёт тебя'} · {genres[selected.genreId].bpm} BPM</span></div>
            <div className="album-details"><span className="result-tag">{activeSpecies === 'cat' ? 'МЯУ!' : 'ГАВ!'} {state.count > 1 ? `НАЙДЕНО ${state.count}` : 'ПИТОМЕЦ НАЙДЕН'}</span><h3>Твоя пластинка <em>готова.</em></h3><p>Мы нашли питомца и выбрали для него виниловый вайб.</p><div className="album-preview"><AlbumCover album={selected} /><div className="album-meta"><span>НОВАЯ ЗАПИСЬ · {new Date(selected.createdAt).toLocaleDateString('ru-RU')}</span>{editing ? <form onSubmit={event => { event.preventDefault(); const name = draftName.trim().slice(0, 70); if (name) void saveAlbum({ ...selected, name }); setEditing(false) }}><input aria-label="Название альбома" value={draftName} maxLength={70} onChange={event => setDraftName(event.target.value)} /><button type="submit">Сохранить</button><button type="button" onClick={() => setEditing(false)}>Отмена</button></form> : <div className="album-name"><strong>{selected.name}</strong><button className="icon-text-button" type="button" onClick={() => { setDraftName(selected.name); setEditing(true) }}>Переименовать</button></div>}<small>{genres[selected.genreId].title} · {selected.animalCount > 1 ? `${selected.animalCount} питомца` : '1 питомец'}</small></div></div>
              <p className="mood-description">{genres[selected.genreId].description}</p>
              <div className="music-controls"><button className="button button-primary" type="button" disabled={state.audio === 'starting'} onClick={() => void toggleAudio()}>{playing ? 'Пауза' : state.audio === 'starting' ? 'Запускаем…' : 'Слушать винил'} <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button><button className="text-button" type="button" disabled={saveState === 'saving'} onClick={reset}>Другое фото ↗</button></div>
              <div className="control-row"><label htmlFor="genre">Жанр</label><select id="genre" value={selected.genreId} disabled={state.audio === 'starting'} onChange={event => void changeGenre(event.target.value as GenreId)}>{genreOrder.map(id => <option key={id} value={id}>{genres[id].title}</option>)}</select></div>
              <div className="control-row"><label htmlFor="volume">Громкость</label><input id="volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => { const next = Number(event.target.value); setVolume(next); engine.current?.setVolume(next) }} /><button className="mute-button" type="button" aria-pressed={muted} onClick={() => { setMuted(!muted); engine.current?.setMuted(!muted) }}>{muted ? 'Звук выкл.' : 'Звук вкл.'}</button></div>
              <div className="control-row vinyl-control"><span>Звучание</span><button className="mute-button" type="button" disabled={state.audio === 'starting'} aria-pressed={selected.vinylEffectEnabled} onClick={() => { const next = !selected.vinylEffectEnabled; engine.current?.setVinylEnabled(next); void saveAlbum({ ...selected, vinylEffectEnabled: next }) }}>{selected.vinylEffectEnabled ? 'Виниловый звук' : 'Чистый звук'}</button></div>
              {audioError && <p role="alert" className="audio-error">{audioError}</p>}
              <p className={`save-indicator ${saveState}`} role="status">{saveState === 'saved' ? '✦ Пластинка в твоей коллекции' : saveState === 'saving' ? 'Сохраняем пластинку…' : saveState === 'error' ? 'Не удалось сохранить пластинку. Проверь свободное место.' : ''}</p>
              {saveState === 'error' && <button className="text-button" type="button" onClick={() => void saveAlbum(selected)}>Повторить сохранение</button>}
              <div className="album-actions"><a href="#collection">Посмотреть коллекцию ↗</a><button type="button" disabled={saveState === 'saving'} onClick={() => void removeAlbum(selected)}>Удалить пластинку</button></div>
            </div>
          </div>}
          {(['wrong-species', 'not-found', 'uncertain', 'error'] as const).includes(state.phase as 'wrong-species' | 'not-found' | 'uncertain' | 'error') && <div className="empty-layout"><div className="empty-art">{state.phase === 'not-found' && species === 'cat' ? <CatIllustration breed="persian" /> : <Mascot species={species} compact />}</div><div><span className="eyebrow">ПОПРОБУЕМ ЕЩЁ РАЗ?</span><h3>{state.phase === 'wrong-species' ? (state.otherSpecies === 'dog' ? 'На фото нашлась собака!' : 'На фото нашёлся котик!') : state.phase === 'uncertain' ? 'Не удалось уверенно распознать питомца' : state.phase === 'not-found' ? 'Кажется, питомец спрятался!' : 'Что-то пошло не так'}</h3><p>{state.phase === 'wrong-species' ? 'Переключи режим, чтобы создать для него пластинку.' : state.phase === 'uncertain' ? 'Попробуй снимок, где питомца видно целиком и при хорошем свете.' : state.phase === 'not-found' ? 'Мы не нашли питомца на этом фото. Попробуй другой снимок.' : state.message}</p><div className="music-controls"><button className="button button-primary" type="button" onClick={() => input.current?.click()}>Попробовать ещё раз <span aria-hidden="true">↗</span></button>{state.phase === 'wrong-species' && state.otherSpecies && <button type="button" className="text-button" onClick={() => switchSpecies(state.otherSpecies!)}>Режим «{state.otherSpecies === 'cat' ? 'Коты' : 'Собаки'}»</button>}</div></div></div>}
        </div><p className="privacy-note">✦ Распознавание и музыка работают на твоём устройстве. Фото не отправляется на сервер.</p>
      </div></section>
      <section className="collection-section" id="collection" aria-labelledby="collection-title"><div className="wrap collection-inner"><div className="collection-heading"><div><span className="eyebrow">ТВОЯ МУЗЫКАЛЬНАЯ ПОЛКА</span><h2 id="collection-title">Коллекция <em>хвостиков.</em></h2><p>Каждая пластинка хранит свою фотографию и музыкальный рисунок.</p></div><div className="collection-filter" role="group" aria-label="Фильтр коллекции">{([['all', 'Все'], ['cat', 'Котики'], ['dog', 'Собаки']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
        {storageError && <p role="alert" className="storage-error">{storageError}</p>}
        <div className="record-shelf">{visibleAlbums.length ? visibleAlbums.map(album => <button type="button" className={`shelf-item ${selected?.id === album.id ? 'selected' : ''}`} key={album.id} onClick={() => openAlbum(album)} aria-label={`Открыть пластинку ${album.name}`}><AlbumCover album={album} /><span className="shelf-title">{album.name}</span></button>) : <div className="shelf-empty"><div className="shelf-empty-disc" aria-hidden="true">✦</div><h3>{albums.length ? 'На этой полке пока пусто' : 'Первая пластинка ждёт тебя'}</h3><p>{albums.length ? 'Попробуй другой фильтр.' : 'Загрузи фото питомца — и она появится здесь.'}</p><a href="#studio" className="button button-primary">Создать пластинку ↗</a></div>}</div><p className="storage-note">Коллекция хранится только в этом браузере. При очистке его данных пластинки исчезнут.</p>
      </div></section>
      <FeedbackForm species={species} />
    </main>
    <footer className="footer"><div className="wrap footer-inner"><div><a className="wordmark footer-brand" href="#top"><span className="brand-disc">✦</span> КОТОВИНИЛ</a><p>Немного музыки, немного магии и очень много хвостиков.</p></div><div className="footer-right"><p>Сделано с любовью к питомцам и винилу.</p><small>Локальное распознавание: TensorFlow.js и COCO-SSD (Apache 2.0). 3D: Three.js и React Three Fiber (MIT). Музыка и иллюстрации созданы для этого сайта.</small></div></div></footer>
  </>
}
