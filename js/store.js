import { isToday, isSameDay } from './utils.js'

const KEYS = {
  tasks: 'vidyalaya-tasks',
  timetable: 'vidyalaya-timetable',
  files: 'vidyalaya-file-meta',
  streak: 'vidyalaya-streak',
  dailyGoal: 'vidyalaya-daily-goal',
  studyLog: 'vidyalaya-study-log',
  achievements: 'vidyalaya-achievements',
  pomodoroStats: 'vidyalaya-pomodoro-stats',
  profile: 'vidyalaya-profile',
  theme: 'vidyalaya-theme',
  accent: 'vidyalaya-accent',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const BADGE_DEFS = [
  { id: 'first-upload', label: 'First Upload', check: (s) => s.files.length >= 1 },
  { id: 'ten-docs', label: '10 Documents Completed', check: (s) => s.completedCount >= 10 },
  { id: 'fifty-docs', label: '50 Documents Completed', check: (s) => s.completedCount >= 50 },
  { id: 'hundred-docs', label: '100 Documents Completed', check: (s) => s.completedCount >= 100 },
  { id: 'streak-7', label: '7 Day Streak', check: (s) => s.streak.current >= 7 },
  { id: 'streak-30', label: '30 Day Streak', check: (s) => s.streak.current >= 30 },
]

// ---- central in-memory state, hydrated from localStorage ----
export const state = {
  tasks: read(KEYS.tasks, []),
  timetable: read(KEYS.timetable, []),
  files: read(KEYS.files, []),
  streak: read(KEYS.streak, { current: 0, longest: 0, lastStudyDate: null }),
  dailyGoal: read(KEYS.dailyGoal, { target: 3, progressMinutes: 0, date: null }),
  studyLog: read(KEYS.studyLog, []),
  achievements: read(KEYS.achievements, []),
  pomodoroStats: read(KEYS.pomodoroStats, { totalSessions: 0, totalFocusMinutes: 0, todayFocusMinutes: 0, lastSessionDate: null }),
  profile: read(KEYS.profile, { name: 'Student', email: '', joined: new Date().toISOString() }),
}

// reset daily/today counters if stale
if (!state.dailyGoal.date || !isToday(state.dailyGoal.date)) {
  state.dailyGoal.progressMinutes = 0
  state.dailyGoal.date = new Date().toISOString()
}
if (!state.pomodoroStats.lastSessionDate || !isToday(state.pomodoroStats.lastSessionDate)) {
  state.pomodoroStats.todayFocusMinutes = 0
}

export function persist() {
  write(KEYS.tasks, state.tasks)
  write(KEYS.timetable, state.timetable)
  write(KEYS.files, state.files)
  write(KEYS.streak, state.streak)
  write(KEYS.dailyGoal, state.dailyGoal)
  write(KEYS.studyLog, state.studyLog)
  write(KEYS.achievements, state.achievements)
  write(KEYS.pomodoroStats, state.pomodoroStats)
  write(KEYS.profile, state.profile)
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

export function addFile(meta) {
  const file = { id: uidLocal(), status: 'Not Started', uploadedAt: new Date().toISOString(), favorite: false, readProgress: 0, ...meta }
  state.files.unshift(file)
  checkAchievements()
  persist()
  return file
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

// ---- IndexedDB: file blobs, notes, bookmarks ----
const DB_NAME = 'vidyalaya-db'
let dbPromise = null

function getDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('fileBlobs')) db.createObjectStore('fileBlobs')
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
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fileBlobs', 'readwrite')
    tx.objectStore('fileBlobs').put(blob, fileId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getFileBlob(fileId) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fileBlobs', 'readonly')
    const req = tx.objectStore('fileBlobs').get(fileId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addNote(note) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite')
    tx.objectStore('notes').put(note)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getNotesForFile(fileId) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readonly')
    const req = tx.objectStore('notes').index('fileId').getAll(fileId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteNote(id) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite')
    tx.objectStore('notes').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function addBookmark(bm) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readwrite')
    tx.objectStore('bookmarks').put(bm)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getBookmarksForFile(fileId) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readonly')
    const req = tx.objectStore('bookmarks').index('fileId').getAll(fileId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteBookmark(id) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readwrite')
    tx.objectStore('bookmarks').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
