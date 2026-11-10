import { useEffect, useState } from 'react'
import type { Species } from '../animal-detection/logic'
import { validateFeedback } from './validation'
import type { FeedbackPayload } from './validation'

export function FeedbackForm({ species }: { species: Species }) {
  const [available, setAvailable] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState<FeedbackPayload>({ name: '', email: '', message: '', website: '' })
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/feedback', { signal: controller.signal }).then(async response => {
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json() as { available?: boolean }
        setAvailable(body.available === true)
      }
    }).catch(() => {})
    return () => controller.abort()
  }, [])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (status === 'sending' || !available) return
    const issue = validateFeedback(form)
    if (issue) { setError(issue); setStatus('error'); return }
    setStatus('sending'); setError('')
    try {
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Сообщение не отправлено. Попробуй позже.')
      setStatus('success'); setForm({ name: '', email: '', message: '', website: '' })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось отправить сообщение.'); setStatus('error') }
  }
  return <section className="feedback-section" id="feedback" aria-labelledby="feedback-title"><div className="wrap feedback-inner">
    <div><span className="eyebrow">ОБРАТНАЯ СВЯЗЬ</span><h2 id="feedback-title">Есть идея? <em>{species === 'cat' ? 'Мяукни' : 'Гавкни'} нам!</em></h2><p>Расскажи, чего не хватает в твоей музыкальной комнате.</p><div className="feedback-decoration" aria-hidden="true">✦ ♪ ✦</div></div>
    <form onSubmit={event => void submit(event)} noValidate>
      <div className="feedback-fields"><label>Имя<input required maxLength={80} autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Email<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label></div>
      <label>Сообщение<textarea required maxLength={2000} rows={4} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} /></label>
      <label hidden>Ваш сайт<input tabIndex={-1} autoComplete="off" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })} /></label>
      <div className="feedback-actions"><button className="button button-primary" type="submit" disabled={!available || status === 'sending'}>{status === 'sending' ? 'Отправляем…' : 'Отправить сообщение'} <span aria-hidden="true">↗</span></button><span>Данные формы используются для ответа и передаются почтовому провайдеру.</span></div>
      {!available && <p className="feedback-status" role="status">Форма пока недоступна: для отправки нужен настроенный почтовый сервис.</p>}
      {status === 'success' && <p className="feedback-status success" role="status">Ура! Твоё сообщение отправлено.</p>}
      {status === 'error' && <p className="feedback-status error" role="alert">{error}</p>}
    </form>
  </div></section>
}
