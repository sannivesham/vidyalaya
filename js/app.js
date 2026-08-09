import { renderShell, updateTopbarDate } from './layout.js'
import { onAuthChange } from './auth.js'
import { initState, initGuestState } from './store.js'
import { showToast } from './toast.js'

import * as Dashboard from './pages/dashboard.js'
import * as Library from './pages/library.js'
import * as Reader from './pages/reader.js'
import * as Timetable from './pages/timetable.js'
import * as CalendarPage from './pages/calendar.js'
import * as Tasks from './pages/tasks.js'
import * as Pomodoro from './pages/pomodoro.js'
import * as Analytics from './pages/analytics.js'
import * as Achievements from './pages/achievements.js'
import * as Profile from './pages/profile.js'
import * as Settings from './pages/settings.js'

// apply saved theme before first paint
const savedTheme = localStorage.getItem('vidyalaya-theme') || 'light'
document.documentElement.classList.toggle('dark', savedTheme === 'dark')

// start in guest/local mode immediately so the app is usable with zero
// network wait — no forced login screen. Signing in happens from Profile.
initGuestState()

const ROUTES = [
  { pattern: /^#\/$/, page: Dashboard },
  { pattern: /^#\/library/, page: Library },
  { pattern: /^#\/reader\/(.+)$/, page: Reader, param: true },
  { pattern: /^#\/timetable$/, page: Timetable },
  { pattern: /^#\/calendar$/, page: CalendarPage },
  { pattern: /^#\/tasks$/, page: Tasks },
  { pattern: /^#\/pomodoro$/, page: Pomodoro },
  { pattern: /^#\/analytics$/, page: Analytics },
  { pattern: /^#\/achievements$/, page: Achievements },
  { pattern: /^#\/profile$/, page: Profile },
  { pattern: /^#\/settings$/, page: Settings },
]

function resolveRoute() {
  const hash = location.hash || '#/'
  const [path, queryStr] = hash.split('?')
  const params = new URLSearchParams(queryStr || '')

  for (const route of ROUTES) {
    const match = path.match(route.pattern)
    if (match) return { route, params, routeParam: route.param ? decodeURIComponent(match[1]) : null, activeHash: normalizeActiveHash(path) }
  }
  return { route: ROUTES[0], params, routeParam: null, activeHash: '#/' }
}

function normalizeActiveHash(path) {
  if (path.startsWith('#/reader')) return null
  if (path.startsWith('#/library')) return '#/library'
  return path
}

function renderApp() {
  const { route, params, routeParam, activeHash } = resolveRoute()

  const app = document.getElementById('app')
  const needsShell = !app.querySelector('#page')
  if (needsShell) {
    app.innerHTML = renderShell(activeHash)
    bindShellEvents()
  } else {
    document.querySelectorAll('.nav-link').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('href') === activeHash)
    })
  }

  updateTopbarDate()

  const pageEl = document.getElementById('page')
  pageEl.innerHTML = route.page.render(params, routeParam)
  window.lucide?.createIcons()
  route.page.mount(params, routeParam)
  window.scrollTo(0, 0)
}

function bindShellEvents() {
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('vidyalaya-theme', isDark ? 'dark' : 'light')
    const icon = document.querySelector('#theme-toggle i')
    if (icon) icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon')
    window.lucide?.createIcons()
  })
}

// Reacts to sign-in/sign-out (triggered from the Profile page), loading
// cloud data or falling back to guest/local data, then re-rendering
// whichever page is currently open so it reflects the right data.
onAuthChange(async (user) => {
  if (user) {
    try {
      await initState(user)
    } catch {
      showToast('Could not load your cloud data — showing local data instead', 'error')
    }
  } else {
    initGuestState()
  }
  renderApp()
})

window.addEventListener('hashchange', renderApp)
window.addEventListener('DOMContentLoaded', renderApp)

// in case DOMContentLoaded already fired before this module executed
if (document.readyState !== 'loading') renderApp()
