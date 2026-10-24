const TELEGRAM_CONFIG_KEY = 'vidyalaya-telegram-config'

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
 * Saves the Telegram configuration to localStorage.
 */
export function saveTelegramConfig(config) {
  const current = getTelegramConfig()
  const updated = { ...current, ...config }
  localStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Checks whether Telegram storage is properly configured.
 */
export function isTelegramConfigured() {
  const config = getTelegramConfig()
  return Boolean(config && config.botToken && config.botToken.trim() && config.chatId && config.chatId.trim() && config.enabled !== false)
}

/**
 * Tests connection to Telegram using the provided bot token and optional chat ID.
 */
export async function testTelegramConnection(botToken, chatId) {
  const token = (botToken || '').trim()
  const chat = (chatId || '').trim()

  if (!token) {
    throw new Error('Please enter a Telegram Bot Token.')
  }

  // 1. Verify Bot Token via getMe
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const meData = await meRes.json()

  if (!meData.ok) {
    throw new Error(meData.description || 'Invalid Bot Token. Please check your token from @BotFather.')
  }

  const botInfo = meData.result

  // 2. If chatId provided, test chat access
  let chatInfo = null
  if (chat) {
    try {
      const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chat)}`)
      const chatData = await chatRes.json()
      if (chatData.ok) {
        chatInfo = chatData.result
      } else {
        throw new Error(`Chat verification failed: ${chatData.description}. Make sure your bot is added to this group/channel.`)
      }
    } catch (err) {
      throw new Error(err.message || 'Could not verify Chat ID.')
    }
  }

  return {
    ok: true,
    bot: botInfo,
    chat: chatInfo,
  }
}

/**
 * Uploads a file Blob to Telegram as a document.
 * Returns the Telegram file_id, file_name, file_size, etc.
 */
export async function uploadFileToTelegram(blob, fileName, caption = '') {
  const config = getTelegramConfig()
  if (!config.botToken || !config.chatId) {
    throw new Error('Telegram Bot Token and Chat ID must be configured in Settings.')
  }

  const formData = new FormData()
  formData.append('chat_id', config.chatId.trim())
  formData.append('document', blob, fileName)
  if (caption) {
    formData.append('caption', caption.slice(0, 1000))
  }

  const res = await fetch(`https://api.telegram.org/bot${config.botToken.trim()}/sendDocument`, {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  if (!data.ok) {
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
 * 1. Calls getFile to receive the file_path.
 * 2. Fetches the raw file bytes from https://api.telegram.org/file/bot<token>/<file_path>.
 */
export async function downloadFileFromTelegram(telegramFileId) {
  const config = getTelegramConfig()
  if (!config.botToken) {
    throw new Error('Telegram Bot Token not configured.')
  }

  // Step 1: get file path
  const metaRes = await fetch(`https://api.telegram.org/bot${config.botToken.trim()}/getFile?file_id=${encodeURIComponent(telegramFileId)}`)
  const metaData = await metaRes.json()

  if (!metaData.ok || !metaData.result?.file_path) {
    throw new Error(metaData.description || 'Telegram could not locate this file.')
  }

  const filePath = metaData.result.file_path
  const downloadUrl = `https://api.telegram.org/file/bot${config.botToken.trim()}/${filePath}`

  // Step 2: fetch binary
  const fileRes = await fetch(downloadUrl)
  if (!fileRes.ok) {
    throw new Error(`Failed to download file from Telegram (${fileRes.status})`)
  }

  return await fileRes.blob()
}
