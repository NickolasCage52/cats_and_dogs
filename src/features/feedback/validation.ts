export type FeedbackPayload = { name: string; email: string; message: string; website?: string }
export function validateFeedback(input: FeedbackPayload): string | null {
  if (!input.name.trim() || input.name.trim().length > 80) return 'Укажи имя до 80 символов.'
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(input.email.trim()) || input.email.length > 254) return 'Проверь адрес электронной почты.'
  if (!input.message.trim() || input.message.trim().length > 2000) return 'Напиши сообщение до 2000 символов.'
  if (input.website) return 'Не удалось отправить сообщение.'
  return null
}
