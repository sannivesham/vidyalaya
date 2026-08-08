import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js'
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js'
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js'

const firebaseConfig = {
  apiKey: 'AIzaSyB_4v6ican35f-dyiMCBCYKBG1PXFPmATo',
  authDomain: 'vidyalaya-web.firebaseapp.com',
  projectId: 'vidyalaya-web',
  storageBucket: 'vidyalaya-web.firebasestorage.app',
  messagingSenderId: '669430819990',
  appId: '1:669430819990:web:aee12334f927a65e2866b7',
  measurementId: 'G-HZN98T6LP5',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Drive scope so a single Google sign-in also grants file access
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope(DRIVE_SCOPE)
googleProvider.setCustomParameters({ prompt: 'select_account' })

// The OAuth client created manually in Google Cloud Console — used only for
// silent Drive token refresh via Google Identity Services (GIS), separate
// from whatever client Firebase Auth itself uses for sign-in.
export const DRIVE_CLIENT_ID = '669430819990-d0hqg4qen4o3o25jom3eg1jrq3atpgn6.apps.googleusercontent.com'
