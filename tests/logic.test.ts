import { describe, expect, it } from 'vitest'
import { classifyAnimals, DETECTION_THRESHOLD } from '../src/features/animal-detection/logic'
import { MAX_FILE_SIZE, validateImage } from '../src/utils/image'
import { initialState, reducer } from '../src/app/state'
import { albumTitle } from '../src/features/vinyl-collection/albums'
import { genreOrder, genres, seededIndex } from '../src/features/music/genres'

const animal = (species: string, x: number, score = DETECTION_THRESHOLD) => ({ class: species, score, bbox: [x, 20, 80, 100] as [number, number, number, number] })
describe('two-species detection', () => {
  it('requires the selected species and confidence threshold', () => {
    expect(classifyAnimals([animal('cat', 0)], 400, 'cat')).toMatchObject({ kind: 'found', genre: 'lofi', count: 1 })
    expect(classifyAnimals([animal('dog', 0)], 400, 'dog')).toMatchObject({ kind: 'found', genre: 'rock', count: 1 })
    expect(classifyAnimals([animal('dog', 0)], 400, 'cat')).toEqual({ kind: 'wrong-species', species: 'dog' })
    expect(classifyAnimals([animal('cat', 0, 0.54)], 400, 'cat')).toEqual({ kind: 'uncertain' })
    expect(classifyAnimals([], 400, 'cat')).toEqual({ kind: 'not-found' })
  })
  it('counts multiple matching animals and picks an ensemble genre', () => {
    expect(classifyAnimals([animal('cat', 0), animal('cat', 190), animal('dog', 300)], 400, 'cat')).toMatchObject({ kind: 'found', count: 2, genre: 'funk' })
    expect(classifyAnimals([animal('dog', 0), animal('dog', 190)], 400, 'dog')).toMatchObject({ kind: 'found', count: 2, genre: 'disco' })
  })
  it('maps center position deterministically', () => {
    expect(classifyAnimals([animal('cat', 100)], 400, 'cat')).toMatchObject({ genre: 'jazz' })
    expect(classifyAnimals([animal('cat', 300)], 400, 'cat')).toMatchObject({ genre: 'waltz' })
  })
})
describe('album identity', () => {
  it('has ten distinct genres and stable title and note choices', () => {
    expect(genreOrder).toHaveLength(10)
    expect(new Set(genreOrder.map(id => genres[id].bpm)).size).toBe(10)
    expect(albumTitle('cat', 'jazz', 123)).toBe(albumTitle('cat', 'jazz', 123))
    expect(seededIndex(123, 4, 8)).toBe(seededIndex(123, 4, 8))
  })
})
describe('file validation', () => {
  it('accepts only nonempty JPG, PNG and WebP at or below 10 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(validateImage({ type, size: MAX_FILE_SIZE })).toBeNull()
    expect(validateImage({ type: 'image/gif', size: 100 })).toMatch(/JPG/)
    expect(validateImage({ type: 'image/png', size: MAX_FILE_SIZE + 1 })).toMatch(/10 МБ/)
    expect(validateImage({ type: 'image/png', size: 0 })).toMatch(/пустой/)
  })
})
describe('interface transitions', () => {
  it('separates detection and audio and resets on a new photo', () => {
    const loading = reducer(initialState, { type: 'LOADING' })
    expect(reducer(loading, { type: 'PLAY' }).audio).toBe('paused')
    const found = reducer(reducer(loading, { type: 'ANALYZING' }), { type: 'FOUND', count: 2 })
    expect(reducer(found, { type: 'PLAY' }).audio).toBe('playing')
    expect(reducer(found, { type: 'LOADING' })).toEqual(loading)
    expect(reducer(initialState, { type: 'WRONG_SPECIES', species: 'dog' }).otherSpecies).toBe('dog')
  })
})
