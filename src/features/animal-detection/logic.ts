import type { GenreId } from '../music/genres'

export type Detection = { class: string; score: number; bbox: [number, number, number, number] }
export type Species = 'cat' | 'dog'
export type AnimalResult =
  | { kind: 'found'; species: Species; count: number; genre: GenreId; boxes: Detection[] }
  | { kind: 'wrong-species'; species: Species }
  | { kind: 'uncertain' }
  | { kind: 'not-found' }

export const DETECTION_THRESHOLD = 0.55
const catGenres: GenreId[] = ['lofi', 'jazz', 'funk', 'ambient', 'waltz']
const dogGenres: GenreId[] = ['rock', 'disco', 'blues', 'bossa', 'synthwave']

export function classifyAnimals(detections: Detection[], width: number, species: Species): AnimalResult {
  const accepted = detections.filter(item => item.class === species && item.score >= DETECTION_THRESHOLD)
  if (accepted.length) {
    const center = accepted.reduce((sum, item) => sum + item.bbox[0] + item.bbox[2] / 2, 0) / accepted.length
    const slot = Math.min(4, Math.max(0, Math.floor(center / Math.max(1, width) * 5)))
    const genres = species === 'cat' ? catGenres : dogGenres
    return { kind: 'found', species, count: accepted.length, genre: accepted.length > 1 ? (species === 'cat' ? 'funk' : 'disco') : genres[slot], boxes: accepted }
  }
  const other = species === 'cat' ? 'dog' : 'cat'
  if (detections.some(item => item.class === other && item.score >= DETECTION_THRESHOLD)) return { kind: 'wrong-species', species: other }
  if (detections.some(item => item.class === species && item.score >= 0.2)) return { kind: 'uncertain' }
  return { kind: 'not-found' }
}
