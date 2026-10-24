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

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const DRIVE_SCOPE = ''
export const DRIVE_CLIENT_ID = ''
