import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js'
import { auth, googleProvider } from './firebase-config.js'

let currentUser = null

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
  currentUser = result.user
  return result.user
}

export async function signOutUser() {
  currentUser = null
  await signOut(auth)
}

export async function getAccessToken() {
  return null
}
