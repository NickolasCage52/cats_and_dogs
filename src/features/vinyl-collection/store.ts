import { openDB } from 'idb'
import type { Album } from './albums'

const dbPromise = () => openDB('kotovinyl-albums', 1, { upgrade(db) {
  if (!db.objectStoreNames.contains('albums')) db.createObjectStore('albums', { keyPath: 'id' })
} })

export async function listAlbums(): Promise<Album[]> {
  const db = await dbPromise()
  return (await db.getAll('albums') as Album[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export async function putAlbum(album: Album): Promise<void> {
  const db = await dbPromise()
  await db.put('albums', album)
}
export async function deleteAlbum(id: string): Promise<void> {
  const db = await dbPromise()
  await db.delete('albums', id)
}
