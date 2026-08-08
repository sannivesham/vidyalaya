import { state } from '../store.js'
import { isSameDay, escapeHtml } from '../utils.js'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
let cursor = new Date()
let selected = new Date()

function buildGrid(year, month) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

function eventsFor(day) {
  if (!day) return []
  const dayTasks = state.tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, day)).map((t) => ({ type: 'task', ...t }))
  const dayTimetable = state.timetable.filter((s) => s.days?.includes(day.getDay())).map((s) => ({ type: 'timetable', ...s }))
  return [...dayTasks, ...dayTimetable]
}

export function render() {
  return `<div class="max-w-6xl mx-auto"><h1 class="font-display text-2xl font-semibold mb-5">Calendar</h1><div id="cal-root"></div></div>`
}

function renderCalendar() {
  const root = document.getElementById('cal-root')
  if (!root) return
  const cells = buildGrid(cursor.getFullYear(), cursor.getMonth())
  const selectedEvents = eventsFor(selected)

  root.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display text-lg font-semibold">${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}</h2>
          <div class="flex gap-1">
            <button id="cal-prev" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="chevron-left" style="width:16px;height:16px"></i></button>
            <button id="cal-next" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></button>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-mono uppercase text-ink/40 dark:text-paper/40 mb-1">
          ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => `<div>${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1" id="cal-cells">
          ${cells.map((day, idx) => {
            if (!day) return `<div></div>`
            const events = eventsFor(day)
            const isSelected = isSameDay(day, selected)
            const isToday = isSameDay(day, new Date())
            return `<button data-idx="${idx}" class="aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-1 ${isSelected ? 'bg-ink text-paper dark:bg-paper dark:text-ink' : isToday ? 'border border-marigold' : 'hover:bg-ink/5 dark:hover:bg-paper/10'}">
              ${day.getDate()}
              ${events.length > 0 ? '<span class="w-1 h-1 rounded-full bg-marigold"></span>' : ''}
            </button>`
          }).join('')}
        </div>
      </div>
      <div>
        <h3 class="font-display text-sm font-semibold mb-3">${selected.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
        ${selectedEvents.length === 0 ? `<p class="text-sm text-ink/50 dark:text-paper/50">Nothing scheduled.</p>` : `
          <ul class="flex flex-col gap-2">
            ${selectedEvents.map((ev) => `
              <li class="p-3 rounded-lg border border-paper-line dark:border-ink-soft text-sm">
                <p class="font-medium">${escapeHtml(ev.title || ev.subject)}</p>
                <p class="text-xs text-ink/50 dark:text-paper/50" style="text-transform:capitalize">${ev.type === 'task' ? `Task \u00b7 ${ev.priority} priority` : `Timetable \u00b7 ${ev.time}`}</p>
              </li>`).join('')}
          </ul>`}
      </div>
    </div>
  `
  window.lucide?.createIcons()

  document.getElementById('cal-prev').addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); renderCalendar() })
  document.getElementById('cal-next').addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); renderCalendar() })
  document.getElementById('cal-cells').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-idx]')
    if (!btn) return
    const day = cells[Number(btn.dataset.idx)]
    if (day) { selected = day; renderCalendar() }
  })
}

export function mount() {
  window.lucide?.createIcons()
  renderCalendar()
}
