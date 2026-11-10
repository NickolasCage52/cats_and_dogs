import type { Species } from '../animal-detection/logic'
import type { GenreId } from '../music/genres'

export const MUSIC_ENGINE_VERSION = 2
export type Album = {
  id: string
  species: Species
  name: string
  createdAt: string
  imageBlob: Blob
  imageMimeType: string
  genreId: GenreId
  musicSeed: number
  musicEngineVersion: number
  animalCount: number
  vinylEffectEnabled: boolean
}

export async function seedFromFile(file: File, species: Species, count: number): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let hash = species === 'cat' ? 2166136261 : 2166136261 ^ 0x9e3779b9
  for (let i = 0; i < bytes.length; i++) hash = Math.imul(hash ^ bytes[i], 16777619)
  return (hash ^ Math.imul(count, 2654435761)) >>> 0
}

export function albumTitle(species: Species, genre: GenreId, seed: number): string {
  const starts = species === 'cat' ? ['Полуночные лапки', 'Мурчащий ритм', 'Уютный хвост', 'Сонный винил'] : ['Хвостатый грув', 'Прогулка под музыку', 'Лапы в ритме', 'Тёплый нос']
  const ends: Record<GenreId, string> = { lofi: 'Lo-fi', jazz: 'Jazz', rock: 'Rock', disco: 'Disco', blues: 'Blues', funk: 'Funk', ambient: 'Ambient', bossa: 'Bossa', synthwave: 'Synthwave', waltz: 'Waltz' }
  return `${starts[seed % starts.length]} · ${ends[genre]}`
}

export function canvasToCover(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const cover = document.createElement('canvas')
    const scale = Math.min(1, 700 / Math.max(canvas.width, canvas.height))
    cover.width = Math.max(1, Math.round(canvas.width * scale))
    cover.height = Math.max(1, Math.round(canvas.height * scale))
    cover.getContext('2d')?.drawImage(canvas, 0, 0, cover.width, cover.height)
    cover.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось подготовить обложку.')), 'image/webp', 0.82)
  })
}
