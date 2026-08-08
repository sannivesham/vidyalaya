const NAV = [
  { to: '#/', label: 'Dashboard', icon: 'layout-dashboard' },
  { to: '#/library', label: 'Library', icon: 'library' },
  { to: '#/timetable', label: 'Timetable', icon: 'calendar-clock' },
  { to: '#/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '#/tasks', label: 'Tasks', icon: 'list-todo' },
  { to: '#/pomodoro', label: 'Pomodoro', icon: 'timer' },
  { to: '#/analytics', label: 'Analytics', icon: 'bar-chart-3' },
  { to: '#/achievements', label: 'Achievements', icon: 'award' },
]

const MOBILE_NAV = [
  { to: '#/', label: 'Home', icon: 'layout-dashboard' },
  { to: '#/library', label: 'Library', icon: 'library' },
  { to: '#/timetable', label: 'Plan', icon: 'calendar-clock' },
  { to: '#/tasks', label: 'Tasks', icon: 'list-todo' },
  { to: '#/pomodoro', label: 'Focus', icon: 'timer' },
]

function icon(name, size = 17) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`
}

export function renderShell(currentHash) {
  const sidebarLinks = NAV.map(({ to, label, icon: ic }) => `
    <a href="${to}" class="nav-link ${currentHash === to ? 'active' : ''}">
      ${icon(ic)} ${label}
    </a>`).join('')

  const mobileLinks = MOBILE_NAV.map(({ to, label, icon: ic }) => `
    <a href="${to}" class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium ${currentHash === to ? 'text-marigold-dark' : 'text-ink/50 dark:text-paper/50'}">
      ${icon(ic, 19)} ${label}
    </a>`).join('')

  return `
    <div class="min-h-screen flex">
      <aside class="hidden md:flex flex-col w-60 shrink-0 border-r border-paper-line dark:border-ink-soft px-4 py-6">
        <div class="flex items-center gap-2 px-2 mb-8">
          <div class="w-8 h-8 rounded-md bg-ink dark:bg-paper flex items-center justify-center">
            ${icon('book-open', 16)}
          </div>
          <span class="font-display text-lg font-semibold tracking-tight">Vidyalaya</span>
        </div>
        <nav class="flex-1 flex flex-col gap-1">${sidebarLinks}</nav>
        <a href="#/settings" class="nav-link mt-2 ${currentHash === '#/settings' ? 'active' : ''}">${icon('settings')} Settings</a>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <header class="flex items-center justify-between gap-4 px-4 md:px-8 py-4 border-b border-paper-line dark:border-ink-soft">
          <p id="topbar-date" class="text-xs text-ink/50 dark:text-paper/50 font-mono"></p>
          <div class="flex items-center gap-2">
            <button id="theme-toggle" class="p-2 rounded-lg hover:bg-ink/5 dark:hover:bg-paper/10" aria-label="Toggle theme">
              ${icon('moon')}
            </button>
            <a href="#/profile" class="w-8 h-8 rounded-full bg-marigold/20 flex items-center justify-center hover:bg-marigold/30" aria-label="Profile">
              ${icon('user', 15)}
            </a>
          </div>
        </header>

        <main id="page" class="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6"></main>
      </div>

      <nav class="mobile-only fixed bottom-0 inset-x-0 z-40 bg-paper dark:bg-ink border-t border-paper-line dark:border-ink-soft flex items-center justify-around py-2">
        ${mobileLinks}
      </nav>
    </div>
  `
}

export function updateTopbarDate() {
  const el = document.getElementById('topbar-date')
  if (el) {
    el.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  }
}
