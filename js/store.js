import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js'
import { db } from './firebase-config.js'
import { isToday, isSameDay } from './utils.js'
import { showToast } from './toast.js'

const LOCAL_KEY_PREFIX = 'vidyalaya-cache-'
const GUEST_KEY = 'guest'

export const DEFAULT_FOLDERS = [
  { id: 'f-maths', name: 'Engineering Mathematics', semester: 'Semester 1', color: '#E3A008', icon: 'calculator', createdAt: new Date().toISOString() },
  { id: 'f-dsa', name: 'Data Structures & Algorithms', semester: 'Semester 3', color: '#5C8374', icon: 'binary', createdAt: new Date().toISOString() },
  { id: 'f-ece', name: 'Digital Electronics', semester: 'Semester 3', color: '#B23A2E', icon: 'cpu', createdAt: new Date().toISOString() },
]

function defaultState() {
  return {
    folders: [...DEFAULT_FOLDERS],
    tasks: [],
    timetable: [],
    files: [],
    streak: { current: 0, longest: 0, lastStudyDate: null },
    dailyGoal: { target: 3, progressMinutes: 0, date: null },
    studyLog: [],
    achievements: [],
    pomodoroStats: { totalSessions: 0, totalFocusMinutes: 0, todayFocusMinutes: 0, lastSessionDate: null },
    profile: { name: 'Student', email: '', photoURL: '', joined: new Date().toISOString() },
  }
}

export const BADGE_DEFS = [
  { id: 'first-upload', label: 'First Upload', check: (s) => s.files.length >= 1 },
  { id: 'ten-docs', label: '10 Documents Completed', check: (s) => s.completedCount >= 10 },
  { id: 'fifty-docs', label: '50 Documents Completed', check: (s) => s.completedCount >= 50 },
  { id: 'hundred-docs', label: '100 Documents Completed', check: (s) => s.completedCount >= 100 },
  { id: 'streak-7', label: '7 Day Streak', check: (s) => s.streak.current >= 7 },
  { id: 'streak-30', label: '30 Day Streak', check: (s) => s.streak.current >= 30 },
]

export const state = defaultState()

let currentUid = null // null = browsing locally, not signed in
let saveTimer = null
let ready = false

function cacheKey() {
  return LOCAL_KEY_PREFIX + (currentUid || GUEST_KEY)
}

function loadLocalCache(key) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveLocalCache() {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify(state))
  } catch {
    /* ignore quota errors */
  }
}

function applyDailyResets() {
  if (!state.dailyGoal.date || !isToday(state.dailyGoal.date)) {
    state.dailyGoal.progressMinutes = 0
    state.dailyGoal.date = new Date().toISOString()
  }
  if (!state.pomodoroStats.lastSessionDate || !isToday(state.pomodoroStats.lastSessionDate)) {
    state.pomodoroStats.todayFocusMinutes = 0
  }
}

/**
 * Loads local-only data for someone who hasn't signed in.
 */
export function initGuestState() {
  currentUid = null
  const cached = loadLocalCache(GUEST_KEY)
  Object.assign(state, defaultState(), cached || {})
  if (!state.folders || !state.folders.length) {
    state.folders = [...DEFAULT_FOLDERS]
  }
  applyDailyResets()
  ready = true
}

/**
 * Called when a user signs in.
 */
export async function initState(user) {
  currentUid = user.uid
  ready = false

  const cachedForUser = loadLocalCache(currentUid)
  if (cachedForUser) Object.assign(state, defaultState(), cachedForUser)

  try {
    const snap = await getDoc(doc(db, 'vidyalayaUsers', currentUid))
    if (snap.exists()) {
      Object.assign(state, defaultState(), snap.data())
    } else {
      state.profile.name = user.displayName || state.profile.name || 'Student'
      state.profile.email = user.email || ''
      state.profile.photoURL = user.photoURL || ''
      if (!state.profile.joined) state.profile.joined = new Date().toISOString()
      await setDoc(doc(db, 'vidyalayaUsers', currentUid), state)
    }
  } catch (err) {
    console.warn('Could not reach Firestore, using local cache:', err)
  }

  if (!state.folders || !state.folders.length) {
    state.folders = [...DEFAULT_FOLDERS]
  }
  applyDailyResets()
  ready = true
  saveLocalCache()
}

export function isReady() {
  return ready
}

export function isSignedIn() {
  return !!currentUid
}

/**
 * Persists state to local cache immediately and debounces cloud sync if logged in.
 */
export function persist() {
  saveLocalCache()
  if (!currentUid) return

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(doc(db, 'vidyalayaUsers', currentUid), state)
    } catch (err) {
      console.warn('Cloud sync failed:', err)
    }
  }, 800)
}

export function recordStudyMinutes(minutes) {
  const today = new Date().toISOString().slice(0, 10)
  const idx = state.studyLog.findIndex((l) => l.date === today)
  if (idx === -1) state.studyLog.push({ date: today, minutes })
  else state.studyLog[idx].minutes += minutes

  state.dailyGoal.progressMinutes = (state.dailyGoal.progressMinutes || 0) + minutes
  state.dailyGoal.date = new Date().toISOString()

  if (!state.streak.lastStudyDate || !isSameDay(state.streak.lastStudyDate, new Date())) {
    const wasYesterday = state.streak.lastStudyDate &&
      isSameDay(new Date(state.streak.lastStudyDate).getTime() + 86400000, new Date())
    state.streak.current = wasYesterday ? state.streak.current + 1 : 1
    state.streak.longest = Math.max(state.streak.longest, state.streak.current)
    state.streak.lastStudyDate = new Date().toISOString()
  }
  checkAchievements()
  persist()
}

// ---- Folders / Subjects Management ----

export function addFolder({ name, semester = '', color = '#E3A008', icon = 'folder', description = '' }) {
  const folder = {
    id: 'f-' + uidLocal(),
    name: name.trim(),
    semester: semester.trim(),
    color,
    icon,
    description: description.trim(),
    createdAt: new Date().toISOString(),
  }
  if (!state.folders) state.folders = []
  state.folders.push(folder)
  persist()
  return folder
}

export function updateFolder(folderId, patch) {
  const folder = state.folders.find((f) => f.id === folderId)
  if (folder) {
    Object.assign(folder, patch)
    // If folder name changed, update corresponding subject name on all its files
    if (patch.name) {
      state.files.forEach((f) => {
        if (f.folderId === folderId) f.subject = patch.name
      })
    }
    persist()
  }
  return folder
}

export function deleteFolder(folderId, deleteFiles = false) {
  const idx = state.folders.findIndex((f) => f.id === folderId)
  if (idx !== -1) {
    state.folders.splice(idx, 1)
    if (deleteFiles) {
      // Remove all files inside this folder
      const filesToDelete = state.files.filter((f) => f.folderId === folderId)
      filesToDelete.forEach((f) => deleteFileBlob(f.id))
      state.files = state.files.filter((f) => f.folderId !== folderId)
    } else {
      // Unlink files so they remain in library as unfiled
      state.files.forEach((f) => {
        if (f.folderId === folderId) {
          f.folderId = null
        }
      })
    }
    persist()
  }
}

export function getFolder(folderId) {
  return (state.folders || []).find((f) => f.id === folderId) || null
}

export function getFilesForFolder(folderId) {
  return (state.files || []).filter((f) => f.folderId === folderId)
}

// ---- File Management ----

export function addFile(meta) {
  const file = {
    id: uidLocal(),
    status: 'Not Started',
    uploadedAt: new Date().toISOString(),
    favorite: false,
    readProgress: 0,
    folderId: meta.folderId || null,
    notes: [],
    bookmarks: [],
    ...meta,
  }
  state.files.unshift(file)
  checkAchievements()
  persist()
  return file
}

export function updateFile(fileId, patch) {
  const f = state.files.find((x) => x.id === fileId)
  if (f) Object.assign(f, patch)
  persist()
  return f
}

export async function removeFile(fileId) {
  const idx = state.files.findIndex((x) => x.id === fileId)
  if (idx !== -1) {
    state.files.splice(idx, 1)
    await deleteFileBlob(fileId)
    persist()
  }
}

export function markFileStatus(fileId, status) {
  const f = state.files.find((x) => x.id === fileId)
  if (f) { f.status = status; f.lastOpened = new Date().toISOString() }
  checkAchievements()
  persist()
}

function checkAchievements() {
  const completedCount = state.files.filter((f) => f.status === 'Completed').length
  const snapshot = { files: state.files, streak: state.streak, completedCount }
  BADGE_DEFS.forEach((b) => {
    if (b.check(snapshot) && !state.achievements.includes(b.id)) {
      state.achievements.push(b.id)
    }
  })
}

function uidLocal() {
  return crypto.randomUUID()
}

// ---- IndexedDB: local binary blobs storage ----
const DB_NAME = 'vidyalaya-storage'
let dbPromise = null

function getDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('fileBlobs')) {
        db.createObjectStore('fileBlobs')
      }
      if (!db.objectStoreNames.contains('notes')) {
        const s = db.createObjectStore('notes', { keyPath: 'id' })
        s.createIndex('fileId', 'fileId')
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        const s = db.createObjectStore('bookmarks', { keyPath: 'id' })
        s.createIndex('fileId', 'fileId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function saveFileBlob(fileId, blob) {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fileBlobs', 'readwrite')
      tx.objectStore('fileBlobs').put(blob, fileId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('IndexedDB save failed:', err)
  }
}

export async function getFileBlob(fileId) {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fileBlobs', 'readonly')
      const req = tx.objectStore('fileBlobs').get(fileId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('IndexedDB get failed:', err)
    return null
  }
}

export async function deleteFileBlob(fileId) {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fileBlobs', 'readwrite')
      tx.objectStore('fileBlobs').delete(fileId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('IndexedDB delete failed:', err)
  }
}

// ---- Notes & Bookmarks ----

export async function addNote(note) {
  const f = state.files.find((x) => x.id === note.fileId)
  if (!f) return
  if (!f.notes) f.notes = []
  f.notes.push(note)
  persist()
}

export async function getNotesForFile(fileId) {
  const f = state.files.find((x) => x.id === fileId)
  return f?.notes || []
}

export async function deleteNote(id) {
  for (const f of state.files) {
    if (!f.notes) continue
    const idx = f.notes.findIndex((n) => n.id === id)
    if (idx !== -1) { f.notes.splice(idx, 1); break }
  }
  persist()
}

export async function addBookmark(bm) {
  const f = state.files.find((x) => x.id === bm.fileId)
  if (!f) return
  if (!f.bookmarks) f.bookmarks = []
  f.bookmarks.push(bm)
  persist()
}

export async function getBookmarksForFile(fileId) {
  const f = state.files.find((x) => x.id === fileId)
  return f?.bookmarks || []
}

export async function deleteBookmark(id) {
  for (const f of state.files) {
    if (!f.bookmarks) continue
    const idx = f.bookmarks.findIndex((b) => b.id === id)
    if (idx !== -1) { f.bookmarks.splice(idx, 1); break }
  }
  persist()
}
