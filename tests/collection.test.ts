import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { deleteAlbum, listAlbums, putAlbum } from '../src/features/vinyl-collection/store'
import { MUSIC_ENGINE_VERSION } from '../src/features/vinyl-collection/albums'
import type { Album } from '../src/features/vinyl-collection/albums'

describe('IndexedDB album collection', () => {
  it('persists image, seed, genre and edits across reopen; deletion is durable', async () => {
    const album: Album = {
      id: crypto.randomUUID(), species: 'dog', name: 'Первый альбом',
      createdAt: new Date().toISOString(), imageBlob: new Blob(['image'], { type: 'image/webp' }),
      imageMimeType: 'image/webp', genreId: 'bossa', musicSeed: 54321,
      musicEngineVersion: MUSIC_ENGINE_VERSION, animalCount: 2, vinylEffectEnabled: true
    }
    await putAlbum(album)
    expect((await listAlbums()).find(item => item.id === album.id)).toMatchObject({ name: 'Первый альбом', genreId: 'bossa', musicSeed: 54321, animalCount: 2 })
    await putAlbum({ ...album, name: 'Новый альбом', genreId: 'jazz', vinylEffectEnabled: false })
    const reopened = (await listAlbums()).find(item => item.id === album.id)!
    expect(reopened).toMatchObject({ name: 'Новый альбом', genreId: 'jazz', musicSeed: 54321, vinylEffectEnabled: false })
    expect(reopened.imageBlob.size).toBe(5)
    await deleteAlbum(album.id)
    expect((await listAlbums()).find(item => item.id === album.id)).toBeUndefined()
  })
})
