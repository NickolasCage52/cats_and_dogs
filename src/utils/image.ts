export const MAX_FILE_SIZE = 10 * 1024 * 1024
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!allowed.has(file.type)) return 'Подойдёт JPG, PNG или WebP. Выбери файл в одном из этих форматов.'
  if (file.size > MAX_FILE_SIZE) return 'Файл больше 10 МБ. Выбери фотографию поменьше.'
  if (file.size === 0) return 'Файл пустой. Выбери другую фотографию.'
  return null
}

export async function imageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    bitmap.close()
  }
}
