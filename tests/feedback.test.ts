import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleFeedback } from '../api/feedback'
import { validateFeedback } from '../src/features/feedback/validation'

const url = 'https://example.test/api/feedback'
const payload = { name: 'Никита', email: 'nikita@example.test', message: 'Отличная пластинка!' }
const request = (body: unknown) => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
afterEach(() => { vi.unstubAllEnvs() })
describe('feedback endpoint', () => {
  it('validates fields and reports missing mail configuration', async () => {
    expect(validateFeedback({ ...payload, message: '' })).toMatch(/сообщение/)
    expect((await handleFeedback(request(payload))).status).toBe(503)
    vi.stubEnv('RESEND_API_KEY', 'test'); vi.stubEnv('FEEDBACK_TO_EMAIL', 'to@example.test'); vi.stubEnv('FEEDBACK_FROM_EMAIL', 'from@example.test')
    expect((await handleFeedback(request({ ...payload, website: 'bot' }))).status).toBe(400)
    expect((await handleFeedback(request({ ...payload, message: 'x'.repeat(7000) }))).status).toBe(413)
  })
  it('reports provider failure and success only after a real positive response', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test'); vi.stubEnv('FEEDBACK_TO_EMAIL', 'to@example.test'); vi.stubEnv('FEEDBACK_FROM_EMAIL', 'from@example.test')
    const failed = await handleFeedback(request(payload), async () => ({ error: 'rejected' }))
    expect(failed.status).toBe(502)
    expect((await handleFeedback(request(payload), async () => ({ data: null, error: null }))).status).toBe(502)
    const send = vi.fn(async () => ({ data: { id: 'email_test_1' }, error: undefined }))
    const success = await handleFeedback(request(payload), send)
    expect(success.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
    expect((await success.json()).ok).toBe(true)
  })
})
