import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js'
import { auth, googleProvider, DRIVE_CLIENT_ID, DRIVE_SCOPE } from './firebase-config.js'

let currentUser = null
let accessToken = null
let accessTokenExpiry = 0 // epoch ms
let gisTokenClient = null
let gisReady = false

// ---- Google Identity Services (loaded via <script> tag in index.html) ----
function ensureGis() {
  if (gisReady) return true
  if (!window.google?.accounts?.oauth2) return false
  gisTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: DRIVE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    prompt: '',
    callback: () => {}, // overridden per-call below
  })
  gisReady = true
  return true
}

function requestTokenSilently() {
  return new Promise((resolve) => {
    if (!ensureGis()) return resolve(null)
    gisTokenClient.callback = (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token
        accessTokenExpiry = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3500 * 1000)
        resolve(accessToken)
      } else {
        resolve(null)
      }
    }
    try {
      gisTokenClient.requestAccessToken({ prompt: '' })
    } catch {
      resolve(null)
    }
  })
}

function requestTokenInteractively() {
  return new Promise((resolve, reject) => {
    if (!ensureGis()) return reject(new Error('Google sign-in script not loaded yet'))
    gisTokenClient.callback = (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token
        accessTokenExpiry = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3500 * 1000)
        resolve(accessToken)
      } else {
        reject(new Error('Drive access was not granted'))
      }
    }
    gisTokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

// ---- Public API ----

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user
    callback(user)
  })
}

export function getCurrentUser() {
  return currentUser
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (credential?.accessToken) {
    accessToken = credential.accessToken
    // Firebase doesn't tell us the exact expiry of this token; assume ~55 min
    accessTokenExpiry = Date.now() + 55 * 60 * 1000
  }
  return result.user
}

export async function signOutUser() {
  accessToken = null
  accessTokenExpiry = 0
  await signOut(auth)
}

/**
 * Returns a valid Drive API access token, refreshing silently if needed,
 * falling back to an interactive consent prompt if silent refresh fails
 * (e.g. first time this browser/session needs Drive access separately
 * from the initial sign-in popup).
 */
export async function getAccessToken() {
  const SAFETY_MARGIN = 60 * 1000
  if (accessToken && Date.now() < accessTokenExpiry - SAFETY_MARGIN) {
    return accessToken
  }
  const silent = await requestTokenSilently()
  if (silent) return silent
  return requestTokenInteractively()
}
