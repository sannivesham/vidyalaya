import { renderShell, updateTopbarDate } from './layout.js'
import { onAuthChange, signInWithGoogle } from './auth.js'
import { initState, clearState } from './store.js'
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

// ---- Auth gating ----
// Nothing renders until we know whether the person is signed in. Once they
// are, we load their data from Firestore before the app shell appears.

function renderLoginScreen() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="max-w-sm w-full text-center">
        <div class="w-12 h-12 rounded-md bg-ink dark:bg-paper flex items-center justify-center mx-auto mb-5">
          <i data-lucide="book-open" style="width:22px;height:22px"></i>
        </div>
        <h1 class="font-display text-2xl font-semibold mb-2">Vidyalaya</h1>
        <p class="text-sm text-ink/60 dark:text-paper/60 mb-8">Sign in to sync your study library, tasks, and progress across every device.</p>
        <button id="google-signin" class="btn btn-primary w-full justify-center">
          <i data-lucide="log-in" style="width:16px;height:16px"></i> Sign in with Google
        </button>
        <p id="signin-error" class="text-xs text-rust mt-4 hidden"></p>
      </div>
    </div>
  `
  window.lucide?.createIcons()
  document.getElementById('google-signin').addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    btn.textContent = 'Opening sign-in…'
    try {
      await signInWithGoogle()
      // onAuthChange below will pick up the new signed-in state and render the app
    } catch (err) {
      const errEl = document.getElementById('signin-error')
      errEl.textContent = 'Sign-in was cancelled or failed. Please try again.'
      errEl.classList.remove('hidden')
      btn.disabled = false
      btn.innerHTML = '<i data-lucide="log-in" style="width:16px;height:16px"></i> Sign in with Google'
      window.lucide?.createIcons()
    }
  })
}

function renderLoadingScreen() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center">
      <p class="text-sm text-ink/50 dark:text-paper/50 font-mono">Loading your data…</p>
    </div>
  `
}

onAuthChange(async (user) => {
  if (user) {
    renderLoadingScreen()
    try {
      await initState(user)
    } catch (err) {
      showToast('Could not load your data. Check your connection.', 'error')
    }
    window.addEventListener('hashchange', renderApp)
    renderApp()
  } else {
    clearState()
    window.removeEventListener('hashchange', renderApp)
    renderLoginScreen()
  }
})
