import { Resend } from 'resend'
import { validateFeedback } from '../src/features/feedback/validation'
import type { FeedbackPayload } from '../src/features/feedback/validation'

const recent = new Map<string, number[]>()
const limit = 5, windowMs = 15 * 60_000
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
export function hasMailConfig() { return Boolean(process.env.RESEND_API_KEY && process.env.FEEDBACK_TO_EMAIL && process.env.FEEDBACK_FROM_EMAIL) }
export function rateAllowed(key: string, now = Date.now()): boolean {
  const current = (recent.get(key) || []).filter(time => now - time < windowMs)
  if (current.length >= limit) { recent.set(key, current); return false }
  current.push(now); recent.set(key, current)
  if (recent.size > 1000) for (const [entry, times] of recent) if (!times.length || now - times.at(-1)! > windowMs) recent.delete(entry)
  return true
}

export async function handleFeedback(request: Request, send?: (payload: { from: string; to: string; replyTo: string; subject: string; text: string }) => Promise<{ data?: { id?: string } | null; error?: unknown }>): Promise<Response> {
  if (request.method === 'GET') return json({ available: hasMailConfig() })
  if (request.method !== 'POST') return json({ error: 'Метод не поддерживается.' }, 405)
  if (!hasMailConfig()) return json({ error: 'Форма пока недоступна. Попробуй позже.' }, 503)
  const origin = request.headers.get('origin')
  try { if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'Запрос отклонён.' }, 403) }
  catch { return json({ error: 'Запрос отклонён.' }, 403) }
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Ожидается JSON.' }, 415)
  if (Number(request.headers.get('content-length') || 0) > 6000) return json({ error: 'Сообщение слишком длинное.' }, 413)
  const reader = request.body?.getReader()
  if (!reader) return json({ error: 'Проверь данные формы.' }, 400)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 6000) { await reader.cancel(); return json({ error: 'Сообщение слишком длинное.' }, 413) }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const body = new TextDecoder().decode(bytes)
  let payload: FeedbackPayload
  try { payload = JSON.parse(body) as FeedbackPayload } catch { return json({ error: 'Проверь данные формы.' }, 400) }
  if (typeof payload?.name !== 'string' || typeof payload?.email !== 'string' || typeof payload?.message !== 'string' || (payload.website != null && typeof payload.website !== 'string')) return json({ error: 'Проверь данные формы.' }, 400)
  const issue = validateFeedback(payload)
  if (issue) return json({ error: issue }, 400)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateAllowed(ip)) return json({ error: 'Слишком много сообщений. Попробуй позже.' }, 429)
  const transmit = send || (async data => {
    const result = await new Resend(process.env.RESEND_API_KEY!).emails.send(data)
    return { data: result.data, error: result.error }
  })
  try {
    const result = await transmit({
      from: process.env.FEEDBACK_FROM_EMAIL!, to: process.env.FEEDBACK_TO_EMAIL!,
      replyTo: payload.email.trim(), subject: 'КОТОВИНИЛ — сообщение от посетителя',
      text: `Имя: ${payload.name.trim()}\nEmail: ${payload.email.trim()}\n\n${payload.message.trim()}`
    })
    if (result.error || !result.data?.id) return json({ error: 'Почтовый сервис не принял сообщение. Попробуй позже.' }, 502)
    return json({ ok: true })
  } catch { return json({ error: 'Не удалось отправить сообщение. Попробуй позже.' }, 502) }
}
export default { fetch: handleFeedback }
