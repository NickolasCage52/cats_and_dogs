// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from '../src/app/App'
import { detectAnimals, getModel } from '../src/features/animal-detection/model'
import { listAlbums, putAlbum } from '../src/features/vinyl-collection/store'
import type { Album } from '../src/features/vinyl-collection/albums'

vi.mock('../src/features/animal-detection/model', () => ({ getModel: vi.fn(), detectAnimals: vi.fn() }))
vi.mock('../src/features/vinyl-collection/store', () => ({ listAlbums: vi.fn(), putAlbum: vi.fn(), deleteAlbum: vi.fn() }))
vi.mock('../src/features/vinyl-collection/albums', async importOriginal => {
  const original = await importOriginal<typeof import('../src/features/vinyl-collection/albums')>()
  return { ...original, seedFromFile: vi.fn(async () => 42), canvasToCover: vi.fn(async () => new Blob(['cover'], { type: 'image/webp' })) }
})
vi.mock('../src/utils/image', async importOriginal => {
  const original = await importOriginal<typeof import('../src/utils/image')>()
  return { ...original, imageToCanvas: vi.fn(async () => { const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 300; return canvas }) }
})
vi.mock('../src/features/music/engine', () => ({
  MusicEngine: class {
    playing = false
    async play() { this.playing = true }
    pause() { this.playing = false }
    async changeGenre() {}
    setVolume() {}; setMuted() {}; setVinylEnabled() {}; setBeatListener() {}; async dispose() {}
  }
}))
beforeEach(() => {
  vi.stubGlobal('crypto', { randomUUID: () => 'test-album' })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal('scrollTo', vi.fn())
  Element.prototype.scrollIntoView = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.mocked(getModel).mockResolvedValue({} as Awaited<ReturnType<typeof getModel>>)
  vi.mocked(listAlbums).mockResolvedValue([])
  vi.mocked(putAlbum).mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })
function upload(type = 'image/jpeg') {
  fireEvent.change(screen.getByLabelText('Выбрать фотографию питомца'), { target: { files: [new File(['photo'], 'photo.jpg', { type })] } })
}
describe('photo to album flow', () => {
  it('detects a cat, saves an album, then controls playback', async () => {
    vi.mocked(detectAnimals).mockResolvedValue([{ class: 'cat', score: 0.93, bbox: [130, 20, 80, 100] }])
    render(<App />); upload()
    await screen.findByText(/ПИТОМЕЦ НАЙДЕН/)
    expect(putAlbum).toHaveBeenCalledOnce()
    expect(screen.getByText(/Cozy Jazz/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Слушать винил/ }))
    await screen.findByRole('button', { name: /Пауза/ })
    fireEvent.click(screen.getByRole('button', { name: /Пауза/ }))
    await screen.findByRole('button', { name: /Слушать винил/ })
  })
  it('detects a dog only in dog mode and never saves the wrong species', async () => {
    vi.mocked(detectAnimals).mockResolvedValue([{ class: 'dog', score: 0.91, bbox: [0, 20, 80, 100] }])
    render(<App />); upload()
    await screen.findByText('На фото нашлась собака!')
    expect(putAlbum).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Собаки' })[0])
    upload()
    await screen.findByText(/ПИТОМЕЦ НАЙДЕН/)
    expect(putAlbum).toHaveBeenCalledOnce()
  })
  it('does not create an album when no animal is found or file is invalid', async () => {
    vi.mocked(detectAnimals).mockResolvedValue([])
    render(<App />); upload('image/gif')
    await screen.findByText(/Подойдёт JPG/)
    expect(getModel).not.toHaveBeenCalled()
    upload()
    await screen.findByText('Кажется, питомец спрятался!')
    expect(putAlbum).not.toHaveBeenCalled()
  })
  it('shows storage failure honestly', async () => {
    vi.mocked(detectAnimals).mockResolvedValue([{ class: 'cat', score: 0.9, bbox: [0, 0, 80, 100] }])
    vi.mocked(putAlbum).mockRejectedValue(new Error('quota'))
    render(<App />); upload()
    await waitFor(() => expect(screen.getByText(/Не удалось сохранить пластинку/)).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Повторить сохранение' })).toBeTruthy()
  })
  it('reopens a stored album without running detection again', async () => {
    const album: Album = { id: 'saved', species: 'dog', name: 'Мой ритм', createdAt: '2026-11-10T00:00:00.000Z', imageBlob: new Blob(['cover'], { type: 'image/webp' }), imageMimeType: 'image/webp', genreId: 'bossa', musicSeed: 42, musicEngineVersion: 2, animalCount: 1, vinylEffectEnabled: true }
    vi.mocked(listAlbums).mockResolvedValue([album])
    render(<App />)
    await screen.findByRole('button', { name: 'Открыть пластинку Мой ритм' })
    fireEvent.click(screen.getByRole('button', { name: 'Открыть пластинку Мой ритм' }))
    await screen.findByRole('button', { name: /Слушать винил/ })
    expect(getModel).not.toHaveBeenCalled()
    expect(screen.getByText('ГАВ! ПИТОМЕЦ НАЙДЕН')).toBeTruthy()
    expect(screen.getByText(/3D недоступно/)).toBeTruthy()
  })
  it('ignores a second upload while the first analysis is running', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof detectAnimals>>) => void
    vi.mocked(detectAnimals).mockImplementation(() => new Promise(done => { resolve = done }))
    render(<App />); upload()
    await screen.findByText(/Ищем котика/)
    upload()
    resolve([{ class: 'cat', score: 0.95, bbox: [0, 0, 80, 100] }])
    await screen.findByText(/ПИТОМЕЦ НАЙДЕН/)
    expect(putAlbum).toHaveBeenCalledOnce()
  })
})
