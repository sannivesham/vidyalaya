import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js'
import { db } from './firebase-config.js'
import { isToday, isSameDay } from './utils.js'

const LOCAL_KEY_PREFIX = 'vidyalaya-cache-'

function defaultState() {
  return {
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

let currentUid = null
let saveTimer = null
let ready = false

function localCacheKey(uid) {
  return LOCAL_KEY_PREFIX + uid
}

function loadLocalCache(uid) {
  try {
    const raw = localStorage.getItem(localCacheKey(uid))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveLocalCache(uid) {
  try {
    localStorage.setItem(localCacheKey(uid), JSON.stringify(state))
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
 * Loads this user's data: tries Firestore first, falls back to a local
 * cache (useful the instant login happens, before the network round trip
 * finishes) and finally to defaults for a brand-new account.
 */
export async function initState(user) {
  currentUid = user.uid
  ready = false

  const cached = loadLocalCache(currentUid)
  if (cached) Object.assign(state, defaultState(), cached)

  try {
    const snap = await getDoc(doc(db, 'vidyalayaUsers', currentUid))
    if (snap.exists()) {
      Object.assign(state, defaultState(), snap.data())
    } else {
      // brand new user — seed profile from their Google account
      state.profile.name = user.displayName || 'Student'
      state.profile.email = user.email || ''
      state.profile.photoURL = user.photoURL || ''
      state.profile.joined = new Date().toISOString()
      await setDoc(doc(db, 'vidyalayaUsers', currentUid), state)
    }
  } catch (err) {
    // offline or Firestore unreachable — proceed with whatever we have locally
    console.warn('Could not reach Firestore, using local cache:', err)
  }

  applyDailyResets()
  ready = true
  saveLocalCache(currentUid)
}

export function clearState() {
  Object.assign(state, defaultState())
  currentUid = null
  ready = false
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
}

export function isReady() {
  return ready
}

/**
 * Persists state to the local cache immediately, and to Firestore on a
 * short debounce so rapid successive edits (e.g. typing) don't spam writes.
 */
export function persist() {
  if (!currentUid) return
  saveLocalCache(currentUid)

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(doc(db, 'vidyalayaUsers', currentUid), state)
    } catch (err) {
      console.warn('Cloud sync failed, will retry on next change:', err)
    }
  }, 600)
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
  const file = {
    id: uidLocal(),
    status: 'Not Started',
    uploadedAt: new Date().toISOString(),
    favorite: false,
    readProgress: 0,
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

// ---- Notes & bookmarks (embedded per-file, synced as part of the user doc) ----

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
