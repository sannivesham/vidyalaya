export function uid() {
  return crypto.randomUUID()
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(date))
}

export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d)
}

export function formatDuration(minutes) {
  minutes = Math.round(minutes)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function percent(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function isToday(date) {
  const d = new Date(date), n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

export function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

/**
 * Synthesizes an audio chime using Web Audio API.
 * type: 'focus' (focus ended -> start break) or 'break' (break ended -> start focus)
 */
export function playTimerChime(type = 'focus') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'focus') {
      // 3 ascending pleasant notes: C5, E5, G5
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.setValueAtTime(659.25, now + 0.15)
      osc.frequency.setValueAtTime(783.99, now + 0.3)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
      osc.start(now)
      osc.stop(now + 0.9)
    } else {
      // 2 gentle descending tones: G5, C5
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(783.99, now)
      osc.frequency.setValueAtTime(523.25, now + 0.2)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
      osc.start(now)
      osc.stop(now + 0.8)
    }
  } catch (err) {
    console.warn('Web Audio chime not available:', err)
  }
}

export const FOLDER_COLORS = [
  '#E3A008', // Marigold
  '#5C8374', // Sage
  '#B23A2E', // Rust
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#10B981', // Emerald
]

export const FOLDER_ICONS = [
  'folder',
  'calculator',
  'binary',
  'cpu',
  'book-open',
  'flask-conical',
  'code-2',
  'graduation-cap',
  'layers',
  'file-text',
]

export const CATEGORIES = ['ECE', 'Programming', 'AI & ML', 'College Subjects', 'ISRO', 'GATE', 'Notes', 'Placements', 'Personal']
export const PRIORITIES = ['High', 'Medium', 'Low']
export const TASK_CATEGORIES = ['Study', 'Personal', 'Project', 'Assignment']
export const TASK_SUBCATEGORIES = {
  Study: ['Reading', 'Revision', 'Practice Problems', 'Notes Making', 'Exam Prep'],
  Personal: ['Health', 'Errands', 'Family', 'Finance', 'Other'],
  Project: ['Research', 'Development', 'Documentation', 'Testing', 'Presentation'],
  Assignment: ['Homework', 'Lab Report', 'Group Work', 'Submission'],
}
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
