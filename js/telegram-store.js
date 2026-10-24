const TELEGRAM_CONFIG_KEY = 'vidyalaya-telegram-config'
const TELEGRAM_USER_KEY = 'vidyalaya-telegram-user'

let authListeners = []

/**
 * Retrieves the stored Telegram configuration.
 * { botToken: string, chatId: string, enabled: boolean }
 */
export function getTelegramConfig() {
  try {
    const raw = localStorage.getItem(TELEGRAM_CONFIG_KEY)
    return raw ? JSON.parse(raw) : { botToken: '', chatId: '', enabled: true }
  } catch {
    return { botToken: '', chatId: '', enabled: true }
  }
}

/**
 * Saves the Telegram configuration.
 */
export function saveTelegramConfig(config) {
  const current = getTelegramConfig()
  const updated = { ...current, ...config }
  localStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Retrieves the currently logged-in Telegram user.
 * { id, first_name, last_name, username, photo_url, botToken, auth_date }
 */
export function getTelegramUser() {
  try {
    const raw = localStorage.getItem(TELEGRAM_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Saves or clears the logged-in Telegram user.
 */
export function setTelegramUser(user) {
  if (!user) {
    localStorage.removeItem(TELEGRAM_USER_KEY)
  } else {
    localStorage.setItem(TELEGRAM_USER_KEY, JSON.stringify(user))
  }
  notifyAuthListeners(user)
}

export function isTelegramLoggedIn() {
  const user = getTelegramUser()
  return Boolean(user && (user.id || user.username))
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
 * Returns true if Telegram is available (either logged in or configured).
 */
export function isTelegramConfigured() {
  const user = getTelegramUser()
  const config = getTelegramConfig()
  const hasToken = Boolean((user && user.botToken) || (config && config.botToken))
  const hasDestination = Boolean((user && (user.id || user.username)) || (config && config.chatId))
  return hasToken && hasDestination
}

/**
 * Gets effective Bot Token and Target Chat ID (user's Saved Messages / private chat).
 */
export function getActiveTelegramCredentials() {
  const user = getTelegramUser()
  const config = getTelegramConfig()

  const botToken = (user?.botToken || config?.botToken || '').trim()
  const chatId = (user?.id || user?.username || config?.chatId || '').trim()

  return { botToken, chatId, user }
}

/**
 * Tests connection to Telegram using bot token and chat target.
 */
export async function testTelegramConnection(botToken, chatId) {
  const token = (botToken || '').trim()
  const chat = (chatId || '').trim()

  if (!token) {
    throw new Error('Please enter your Telegram Bot Token.')
  }

  // 1. Verify Bot Token
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const meData = await meRes.json()

  if (!meData.ok) {
    throw new Error(meData.description || 'Invalid Bot Token. Check your token from @BotFather.')
  }

  const botInfo = meData.result
  let chatInfo = null

  // 2. If chat/user target is provided, verify
  if (chat) {
    try {
      const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chat)}`)
      const chatData = await chatRes.json()
      if (chatData.ok) {
        chatInfo = chatData.result
      }
    } catch {
      // Ignored for privacy-restricted direct user IDs before user sends /start
    }
  }

  return {
    ok: true,
    bot: botInfo,
    chat: chatInfo,
  }
}

/**
 * Uploads a file directly to the user's Telegram (Saved Messages / private chat).
 */
export async function uploadFileToTelegram(blob, fileName, caption = '') {
  const { botToken, chatId } = getActiveTelegramCredentials()

  if (!botToken || !chatId) {
    throw new Error('Please log in with Telegram in your Profile to send uploads to Saved Messages.')
  }

  const formData = new FormData()
  formData.append('chat_id', chatId)
  formData.append('document', blob, fileName)
  if (caption) {
    formData.append('caption', caption.slice(0, 1000))
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  if (!data.ok) {
    // If user hasn't messaged the bot yet
    if (data.description && data.description.includes('chat not found')) {
      throw new Error(`Please open your Telegram and press "Start" on your bot once so it has permission to send you files.`)
    }
    throw new Error(data.description || 'Telegram upload failed.')
  }

  const doc = data.result.document
  return {
    telegramFileId: doc.file_id,
    telegramUniqueId: doc.file_unique_id,
    telegramMessageId: data.result.message_id,
    fileName: doc.file_name || fileName,
    fileSize: doc.file_size,
    mimeType: doc.mime_type,
  }
}

/**
 * Downloads a file from Telegram by file_id.
 */
export async function downloadFileFromTelegram(telegramFileId) {
  const { botToken } = getActiveTelegramCredentials()
  if (!botToken) {
    throw new Error('Telegram Bot Token not available.')
  }

  const metaRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(telegramFileId)}`)
  const metaData = await metaRes.json()

  if (!metaData.ok || !metaData.result?.file_path) {
    throw new Error(metaData.description || 'Telegram could not locate this file.')
  }

  const filePath = metaData.result.file_path
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`

  const fileRes = await fetch(downloadUrl)
  if (!fileRes.ok) {
    throw new Error(`Failed to download file from Telegram (${fileRes.status})`)
  }

  return await fileRes.blob()
}
