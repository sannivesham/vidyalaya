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
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

export const CATEGORIES = ['ECE', 'Programming', 'AI & ML', 'College Subjects', 'ISRO', 'GATE', 'Notes', 'Placements', 'Personal']
export const PRIORITIES = ['High', 'Medium', 'Low']
export const TASK_CATEGORIES = ['Study', 'Personal', 'Project', 'Assignment']
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
