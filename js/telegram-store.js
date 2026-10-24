import { isTelegramUserLoggedIn, uploadToSavedMessages, getLoggedInTelegramUser } from './telegram-mtproto.js'

const TELEGRAM_CONFIG_KEY = 'vidyalaya-telegram-config'
const TELEGRAM_USER_KEY = 'vidyalaya-telegram-user'

let authListeners = []

/**
 * Retrieves the stored Telegram configuration.
 */
export function getTelegramConfig() {
  try {
    const raw = localStorage.getItem(TELEGRAM_CONFIG_KEY)
    return raw ? JSON.parse(raw) : { botToken: '', chatId: '', enabled: true }
  } catch {
    return { botToken: '', chatId: '', enabled: true }
  }
}

export function saveTelegramConfig(config) {
  const current = getTelegramConfig()
  const updated = { ...current, ...config }
  localStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(updated))
  return updated
}

export function getTelegramUser() {
  // First check MTProto user account session
  const mtprotoUser = getLoggedInTelegramUser()
  if (mtprotoUser) return mtprotoUser

  try {
    const raw = localStorage.getItem(TELEGRAM_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setTelegramUser(user) {
  if (!user) {
    localStorage.removeItem(TELEGRAM_USER_KEY)
    localStorage.removeItem('vidyalaya-tg-user')
    localStorage.removeItem('vidyalaya-tg-session')
    sessionStorage.removeItem('vidyalaya-tg-pending-phone')
    sessionStorage.removeItem('vidyalaya-tg-pending-hash')
  } else {
    localStorage.setItem(TELEGRAM_USER_KEY, JSON.stringify(user))
  }
  notifyAuthListeners(user)
}

export function isTelegramLoggedIn() {
  return isTelegramUserLoggedIn() || Boolean(getTelegramUser()?.id)
}

export function onTelegramAuthChange(callback) {
  authListeners.push(callback)
  return () => {
    authListeners = authListeners.filter((cb) => cb !== callback)
  }
}

function notifyAuthListeners(user) {
  authListeners.forEach((cb) => {
    try { cb(user) } catch (err) { console.warn(err) }
  })
}

/**
 * Returns true if Telegram is connected (either via MTProto phone login or bot fallback).
 */
export function isTelegramConfigured() {
  if (isTelegramUserLoggedIn()) return true
  const user = getTelegramUser()
  const config = getTelegramConfig()
  return Boolean((user && user.botToken) || (config && config.botToken))
}

/**
 * Uploads a file directly to Telegram Saved Messages.
 */
export async function uploadFileToTelegram(blob, fileName, caption = '') {
  // 1. Direct MTProto Saved Messages (Phone Number + OTP login)
  if (isTelegramUserLoggedIn()) {
    const result = await uploadToSavedMessages(blob, fileName, caption)
    return {
      telegramFileId: result.messageId.toString(),
      telegramMessageId: result.messageId,
      fileName: result.fileName,
      fileSize: result.fileSize,
      storageType: 'saved_messages',
    }
  }

  // 2. Bot fallback if bot token is present
  const user = getTelegramUser()
  const config = getTelegramConfig()
  const botToken = (user?.botToken || config?.botToken || '').trim()
  const chatId = (user?.id || user?.username || config?.chatId || '').trim()

  if (botToken && chatId) {
    const formData = new FormData()
    formData.append('chat_id', chatId)
    formData.append('document', blob, fileName)
    if (caption) formData.append('caption', caption.slice(0, 1000))

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.description || 'Telegram upload failed.')

    const doc = data.result.document
    return {
      telegramFileId: doc.file_id,
      telegramUniqueId: doc.file_unique_id,
      telegramMessageId: data.result.message_id,
      fileName: doc.file_name || fileName,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      storageType: 'telegram_bot',
    }
  }

  throw new Error('Please log in with Telegram in Profile to send uploads to Saved Messages.')
}

/**
 * Downloads a file from Telegram.
 */
export async function downloadFileFromTelegram(telegramFileId) {
  const user = getTelegramUser()
  const config = getTelegramConfig()
  const botToken = (user?.botToken || config?.botToken || '').trim()

  if (!botToken) {
    return null
  }

  try {
    const metaRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(telegramFileId)}`)
    const metaData = await metaRes.json()
    if (!metaData.ok || !metaData.result?.file_path) return null

    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${metaData.result.file_path}`
    const fileRes = await fetch(fileUrl)
    return fileRes.ok ? await fileRes.blob() : null
  } catch (err) {
    console.warn('Download error:', err)
    return null
  }
}
