import { state } from '../store.js'
import { formatDuration, formatTime, escapeHtml } from '../utils.js'

const QUOTES = [
  'Small steps, repeated daily, outrun big leaps taken rarely.',
  'The page you read today is the exam question you already know tomorrow.',
  'Discipline is choosing between what you want now and what you want most.',
  'Consistency turns ordinary effort into extraordinary results.',
  'You don\u2019t need more time \u2014 you need fewer distractions.',
  'Every hour of focus is a deposit in your future self.',
]

export function render() {
  const quote = QUOTES[(new Date().getDate() + new Date().getMonth()) % QUOTES.length]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const targetMinutes = state.dailyGoal.target * 60
  const goalPct = Math.min(100, Math.round(((state.dailyGoal.progressMinutes || 0) / targetMinutes) * 100))

  const inProgress = state.files
    .filter((f) => f.status === 'Reading')
    .sort((a, b) => new Date(b.lastOpened || 0) - new Date(a.lastOpened || 0))
    .slice(0, 3)

  const upcomingTasks = state.tasks
    .filter((t) => !t.completed)
    .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
    .slice(0, 4)

  const today = new Date().getDay()
  const upcomingSlots = state.timetable
    .filter((s) => s.days?.includes(today))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 4)

  const priorityDot = { High: 'bg-rust', Medium: 'bg-marigold', Low: 'bg-sage' }

  return `
    <div class="max-w-6xl mx-auto">
      <div class="index-card p-6 mb-6">
        <p class="text-xs uppercase tracking-wide text-marigold-dark font-semibold mb-1">${greeting}</p>
        <h1 class="font-display text-2xl md:text-3xl font-semibold mb-3">${escapeHtml(state.profile.name)}</h1>
        <p class="text-sm text-ink/60 dark:text-paper/60 italic notebook-rule py-1">&ldquo;${quote}&rdquo;</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="flex flex-col gap-6">
          <div class="card flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-rust/10 flex items-center justify-center shrink-0">
              <i data-lucide="flame" class="text-rust" style="width:22px;height:22px"></i>
            </div>
            <div>
              <p class="font-mono text-2xl font-semibold leading-none">${state.streak.current}<span class="text-sm font-body font-normal ml-1 text-ink/50 dark:text-paper/50">days</span></p>
              <p class="text-xs text-ink/50 dark:text-paper/50 mt-1">Study streak &middot; best ${state.streak.longest}</p>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center gap-2 mb-3">
              <i data-lucide="target" class="text-marigold-dark" style="width:16px;height:16px"></i>
              <h2 class="font-display text-base font-semibold">Today&rsquo;s Goal</h2>
            </div>
            <p class="text-sm text-ink/60 dark:text-paper/60 mb-2">${formatDuration(state.dailyGoal.progressMinutes || 0)} of ${formatDuration(targetMinutes)} studied</p>
            <div class="progress-track"><div class="progress-fill" style="width:${goalPct}%"></div></div>
            <p class="text-right text-xs font-mono mt-1.5 text-ink/50 dark:text-paper/50">${goalPct}%</p>
          </div>
        </div>

        <div class="card">
          <h2 class="font-display text-base font-semibold mb-4">Continue Reading</h2>
          ${inProgress.length === 0
            ? emptyState('book-open', 'Nothing in progress', 'Open a file from your library to start reading.')
            : `<div class="flex flex-col gap-3">${inProgress.map((f) => `
                <a href="#/reader/${f.id}" class="block text-left p-3 rounded-lg border border-paper-line dark:border-ink-soft hover:border-marigold/60">
                  <p class="text-sm font-medium truncate">${escapeHtml(f.title)}</p>
                  <p class="text-xs text-ink/50 dark:text-paper/50 mb-2">${escapeHtml(f.subject || f.category)}</p>
                  <div class="progress-track"><div class="progress-fill" style="width:${f.readProgress || 0}%"></div></div>
                </a>`).join('')}</div>`}
        </div>

        <div class="card">
          <h2 class="font-display text-base font-semibold mb-4">Quick Actions</h2>
          <div class="grid grid-cols-3 gap-3">
            ${quickAction('upload', 'Upload File', '#/library?upload=1')}
            ${quickAction('calendar-plus', 'Timetable', '#/timetable')}
            ${quickAction('list-plus', 'Add Task', '#/tasks')}
            ${quickAction('book-open-check', 'Continue', '#/library')}
            ${quickAction('star', 'Favorites', '#/library?filter=favorites')}
            ${quickAction('bar-chart-3', 'Progress', '#/analytics')}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="card">
          <div class="flex items-center gap-2 mb-4">
            <i data-lucide="list-todo" class="text-marigold-dark" style="width:16px;height:16px"></i>
            <h2 class="font-display text-base font-semibold">Upcoming Tasks</h2>
          </div>
          ${upcomingTasks.length === 0 ? emptyState(null, 'All caught up', 'No pending tasks.') : `
            <ul class="flex flex-col gap-3">
              ${upcomingTasks.map((t) => `
                <li class="flex items-start gap-2">
                  <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${priorityDot[t.priority]}"></span>
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">${escapeHtml(t.title)}</p>
                    ${t.dueDate ? `<p class="text-xs text-ink/50 dark:text-paper/50">Due ${new Date(t.dueDate).toLocaleDateString()}</p>` : ''}
                  </div>
                </li>`).join('')}
            </ul>`}
          <a href="#/tasks" class="text-xs text-marigold-dark font-medium mt-4 inline-block hover:underline">View all tasks &rarr;</a>
        </div>

        <div class="card">
          <div class="flex items-center gap-2 mb-4">
            <i data-lucide="calendar-clock" class="text-marigold-dark" style="width:16px;height:16px"></i>
            <h2 class="font-display text-base font-semibold">Today&rsquo;s Timetable</h2>
          </div>
          ${upcomingSlots.length === 0 ? emptyState(null, 'Nothing scheduled', 'No sessions planned for today.') : `
            <ul class="flex flex-col gap-3">
              ${upcomingSlots.map((s) => `
                <li class="flex items-center gap-3">
                  <span class="w-2 h-2 rounded-full shrink-0" style="background:${s.color}"></span>
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">${escapeHtml(s.subject)}</p>
                    <p class="text-xs text-ink/50 dark:text-paper/50 font-mono">${formatTime(s.time)}</p>
                  </div>
                </li>`).join('')}
            </ul>`}
          <a href="#/timetable" class="text-xs text-marigold-dark font-medium mt-4 inline-block hover:underline">View full timetable &rarr;</a>
        </div>
      </div>
    </div>
  `
}

function quickAction(ic, label, href) {
  return `
    <a href="${href}" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-paper-line dark:border-ink-soft hover:border-marigold/60 hover:bg-marigold/5 text-center">
      <i data-lucide="${ic}" class="text-marigold-dark" style="width:18px;height:18px"></i>
      <span class="text-[11px] font-medium leading-tight">${label}</span>
    </a>`
}

export function emptyState(ic, title, description) {
  return `
    <div class="flex flex-col items-center justify-center text-center py-12 px-4">
      ${ic ? `<div class="w-12 h-12 rounded-full bg-marigold/15 flex items-center justify-center mb-4"><i data-lucide="${ic}" class="text-marigold-dark" style="width:22px;height:22px"></i></div>` : ''}
      <h3 class="font-display text-base font-semibold mb-1">${title}</h3>
      <p class="text-sm text-ink/60 dark:text-paper/60 max-w-xs">${description}</p>
    </div>`
}

export function mount() {}
