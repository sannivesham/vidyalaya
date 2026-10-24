/**
 * Telegram MTProto User Account Client for Vidyalaya.
 * Connects directly via Telegram MTProto over WebSockets.
 * Allows logging in with phone number + Telegram OTP and uploading directly to "Saved Messages".
 */

const DEFAULT_API_ID = 2040
const DEFAULT_API_HASH = 'b18441a1ff607e10a989891a5462e627'

const SESSION_KEY = 'vidyalaya-tg-session'
const USER_KEY = 'vidyalaya-tg-user'
const PHONE_CACHE_KEY = 'vidyalaya-tg-pending-phone'
const HASH_CACHE_KEY = 'vidyalaya-tg-pending-hash'

let activeClient = null
let currentPhoneCodeHash = sessionStorage.getItem(HASH_CACHE_KEY) || null
let currentPhoneNumber = sessionStorage.getItem(PHONE_CACHE_KEY) || null

export function getApiCredentials() {
  const customId = localStorage.getItem('vidyalaya-tg-api-id')
  const customHash = localStorage.getItem('vidyalaya-tg-api-hash')
  return {
    apiId: customId ? parseInt(customId, 10) : DEFAULT_API_ID,
    apiHash: customHash ? customHash.trim() : DEFAULT_API_HASH,
    isCustom: Boolean(customId && customHash),
  }
}

export function saveApiCredentials(apiId, apiHash) {
  if (apiId && apiHash) {
    localStorage.setItem('vidyalaya-tg-api-id', String(apiId).trim())
    localStorage.setItem('vidyalaya-tg-api-hash', String(apiHash).trim())
  } else {
    localStorage.removeItem('vidyalaya-tg-api-id')
    localStorage.removeItem('vidyalaya-tg-api-hash')
  }
}

export function isTelegramUserLoggedIn() {
  return Boolean(localStorage.getItem(SESSION_KEY) && localStorage.getItem(USER_KEY))
}

export function getLoggedInTelegramUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Initializes and connects the Telegram MTProto client.
 */
export async function getTelegramClient() {
  if (!window.TelegramMTProto) {
    throw new Error('Telegram MTProto library is still loading. Please refresh the page.')
  }

  const { TelegramClient, StringSession } = window.TelegramMTProto
  const { apiId, apiHash } = getApiCredentials()
  const savedSession = localStorage.getItem(SESSION_KEY) || ''

  if (activeClient && activeClient.connected) {
    return activeClient
  }

  const stringSession = new StringSession(savedSession)
  activeClient = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  })

  await activeClient.connect()
  return activeClient
}

/**
 * Step 1: Send OTP to the user's phone number.
 */
export async function sendTelegramOtp(phoneNumber) {
  let cleanPhone = (phoneNumber || '').trim().replace(/[\s\-()]/g, '')
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+' + cleanPhone
  }

  if (cleanPhone.length < 8) {
    throw new Error('Please enter a valid phone number with country code (e.g. +919876543210)')
  }

  currentPhoneNumber = cleanPhone
  sessionStorage.setItem(PHONE_CACHE_KEY, currentPhoneNumber)

  const client = await getTelegramClient()
  const { apiId, apiHash } = getApiCredentials()

  try {
    const result = await client.sendCode(
      { apiId, apiHash },
      currentPhoneNumber
    )

    currentPhoneCodeHash = result.phoneCodeHash
    sessionStorage.setItem(HASH_CACHE_KEY, currentPhoneCodeHash)

    return {
      ok: true,
      phoneNumber: currentPhoneNumber,
      phoneCodeHash: currentPhoneCodeHash,
      isCodeViaApp: result.isCodeViaApp !== false,
    }
  } catch (err) {
    console.error('Send OTP error:', err)
    let msg = err.errorMessage || err.message || 'Failed to send OTP code.'
    if (msg.includes('PHONE_NUMBER_INVALID')) msg = 'Invalid phone number. Ensure it includes country code (e.g. +91).'
    if (msg.includes('FLOOD_WAIT')) msg = 'Too many attempts. Please wait a few minutes before trying again.'
    throw new Error(msg)
  }
}

/**
 * Step 2: Verify OTP code received on Telegram.
 */
export async function verifyTelegramOtp(code) {
  const cleanCode = (code || '').trim().replace(/[\s\-]/g, '')
  if (!cleanCode) {
    throw new Error('Please enter the OTP code sent to your Telegram app.')
  }

  if (!currentPhoneNumber) currentPhoneNumber = sessionStorage.getItem(PHONE_CACHE_KEY)
  if (!currentPhoneCodeHash) currentPhoneCodeHash = sessionStorage.getItem(HASH_CACHE_KEY)

  if (!currentPhoneNumber || !currentPhoneCodeHash) {
    throw new Error('Session expired. Please request a new OTP code.')
  }

  const client = await getTelegramClient()
  const { Api } = window.TelegramMTProto

  try {
    const authResult = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: currentPhoneNumber,
        phoneCodeHash: currentPhoneCodeHash,
        phoneCode: cleanCode,
      })
    )

    return await handleSuccessfulAuth(client, authResult.user || authResult)
  } catch (err) {
    console.warn('Verify OTP warning:', err)
    const msg = err.errorMessage || err.message || ''

    if (msg.includes('SESSION_PASSWORD_NEEDED')) {
      return {
        ok: false,
        needs2fa: true,
        message: 'Your account has Two-Step Verification (2FA) enabled. Please enter your password.',
      }
    }
    if (msg.includes('PHONE_CODE_INVALID')) {
      throw new Error('The OTP code entered is incorrect. Please check the code in your Telegram app.')
    }
    if (msg.includes('PHONE_CODE_EXPIRED')) {
      throw new Error('The OTP code has expired. Please request a new code.')
    }

    throw new Error(msg || 'Authentication failed. Please verify your code.')
  }
}

/**
 * Step 3: Handle 2FA Password if account has cloud password enabled.
 */
export async function verifyTelegram2faPassword(password) {
  if (!password) {
    throw new Error('Please enter your 2FA cloud password.')
  }

  const client = await getTelegramClient()
  const { apiId, apiHash } = getApiCredentials()

  try {
    const userResult = await client.signInWithPassword(
      { apiId, apiHash },
      {
        password: () => password.trim(),
        onError: () => false,
      }
    )
    return await handleSuccessfulAuth(client, userResult)
  } catch (err) {
    console.error('2FA error:', err)
    let msg = err.errorMessage || err.message || ''
    if (msg.includes('PASSWORD_HASH_INVALID')) msg = 'Incorrect 2FA password. Please try again.'
    throw new Error(msg || '2FA authentication failed.')
  }
}

async function handleSuccessfulAuth(client, userResult) {
  // Save persistent string session
  const sessionString = client.session.save()
  localStorage.setItem(SESSION_KEY, sessionString)

  // Clear pending OTP state
  sessionStorage.removeItem(PHONE_CACHE_KEY)
  sessionStorage.removeItem(HASH_CACHE_KEY)

  // Get user profile
  let me = null
  try {
    me = await client.getMe()
  } catch {
    me = userResult
  }

  const userData = {
    id: me?.id ? me.id.toString() : 'me',
    firstName: me?.firstName || me?.first_name || 'Student',
    lastName: me?.lastName || me?.last_name || '',
    username: me?.username || '',
    phone: me?.phone || currentPhoneNumber,
    connectedAt: new Date().toISOString(),
  }

  localStorage.setItem(USER_KEY, JSON.stringify(userData))
  localStorage.setItem('vidyalaya-telegram-user', JSON.stringify(userData))

  return {
    ok: true,
    user: userData,
  }
}

/**
 * Log out from Telegram MTProto session.
 */
export async function signOutTelegramUser() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem('vidyalaya-telegram-user')
  localStorage.removeItem('vidyalaya-telegram-config')
  sessionStorage.removeItem(PHONE_CACHE_KEY)
  sessionStorage.removeItem(HASH_CACHE_KEY)

  currentPhoneNumber = null
  currentPhoneCodeHash = null

  if (activeClient) {
    try {
      await activeClient.disconnect()
    } catch {
      // Ignored
    }
    activeClient = null
  }
}

/**
 * Uploads a document directly to Telegram "Saved Messages" (chat: "me").
 */
export async function uploadToSavedMessages(blob, fileName, caption = '') {
  if (!isTelegramUserLoggedIn()) {
    throw new Error('Please log in with your Telegram account in Profile first.')
  }

  const client = await getTelegramClient()
  const { CustomFile } = window.TelegramMTProto

  // Read blob into ArrayBuffer / Uint8Array
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Buffer = new Uint8Array(arrayBuffer)

  // Use CustomFile for browser upload
  const fileToUpload = new CustomFile(fileName, blob.size, '', uint8Buffer)

  try {
    // "me" translates to Saved Messages in Telegram MTProto
    const sentMessage = await client.sendFile('me', {
      file: fileToUpload,
      caption: caption || `Vidyalaya Study File: ${fileName}`,
      workers: 2,
    })

    return {
      messageId: sentMessage.id,
      date: sentMessage.date,
      fileName,
      fileSize: blob.size,
    }
  } catch (err) {
    console.error('Upload to Saved Messages error:', err)
    throw new Error('Telegram Saved Messages upload failed: ' + (err.message || err.errorMessage || err))
  }
}
