import { state } from '../store.js'
import { formatDuration, addDays } from '../utils.js'

export function render() {
  const totalMinutes = state.studyLog.reduce((sum, l) => sum + l.minutes, 0)
  const completedCount = state.files.filter((f) => f.status === 'Completed').length

  return `
    <div class="max-w-6xl mx-auto">
      <h1 class="font-display text-2xl font-semibold mb-5">Study Analytics</h1>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard('clock', 'Total Study Time', formatDuration(totalMinutes))}
        ${statCard('file-check-2', 'Documents Completed', completedCount)}
        ${statCard('flame', 'Longest Streak', `${state.streak.longest} days`)}
        ${statCard('book-open-check', 'Pomodoro Sessions', state.pomodoroStats.totalSessions)}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="font-display text-sm font-semibold mb-4">This Week&rsquo;s Study Minutes</h3>
          <div id="week-chart" class="flex items-end gap-3 h-48"></div>
        </div>
        <div class="card">
          <h3 class="font-display text-sm font-semibold mb-4">Library by Category</h3>
          <div id="category-chart"></div>
        </div>
      </div>
    </div>
  `
}

function statCard(ic, label, value) {
  return `
    <div class="card flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-marigold/15 flex items-center justify-center shrink-0">
        <i data-lucide="${ic}" class="text-marigold-dark" style="width:18px;height:18px"></i>
      </div>
      <div><p class="font-mono text-xl font-semibold leading-none">${value}</p><p class="text-xs text-ink/50 dark:text-paper/50 mt-1">${label}</p></div>
    </div>`
}

function renderWeekChart() {
  const el = document.getElementById('week-chart')
  if (!el) return
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(), -i)
    const key = d.toISOString().slice(0, 10)
    const entry = state.studyLog.find((l) => l.date === key)
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), minutes: entry ? entry.minutes : 0 })
  }
  const max = Math.max(...days.map((d) => d.minutes), 30)

  el.innerHTML = days.map((d) => `
    <div class="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
      <div class="w-full bg-marigold rounded-t" style="height:${Math.max((d.minutes / max) * 100, 2)}%"></div>
      <span class="text-[10px] text-ink/50 dark:text-paper/50">${d.label}</span>
    </div>`).join('')
}

const PIE_COLORS = ['#E3A008', '#5C8374', '#B23A2E', '#3B6EA5', '#8B5CF6', '#F4C24B', '#7FA695']

function renderCategoryChart() {
  const el = document.getElementById('category-chart')
  if (!el) return
  const counts = {}
  state.files.forEach((f) => { counts[f.category] = (counts[f.category] || 0) + 1 })
  const entries = Object.entries(counts)

  if (entries.length === 0) {
    el.innerHTML = `<p class="text-sm text-ink/50 dark:text-paper/50 py-16 text-center">Upload files to see this chart.</p>`
    return
  }

  el.innerHTML = `<div class="flex flex-col gap-2">
    ${entries.map(([name, count], idx) => {
      const total = state.files.length
      const pct = Math.round((count / total) * 100)
      return `
        <div>
          <div class="flex justify-between text-xs mb-1"><span>${name}</span><span class="font-mono text-ink/50 dark:text-paper/50">${count}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${PIE_COLORS[idx % PIE_COLORS.length]}"></div></div>
        </div>`
    }).join('')}
  </div>`
}

export function mount() {
  window.lucide?.createIcons()
  renderWeekChart()
  renderCategoryChart()
}
