import { state, recordStudyMinutes, persist } from '../store.js'
import { formatDuration } from '../utils.js'
import { showWidget, hideWidget, updateWidget } from '../pomodoro-widget.js'

const FOCUS_MIN = 25
const SHORT_BREAK_MIN = 5
const LONG_BREAK_MIN = 15
const LONG_BREAK_EVERY = 4 // every 4th completed focus block gets a long break

// session state — persists across re-renders as long as the tab stays open
let sessionActive = false     // true once "Start Session" has been pressed
let sessionTotalMinutes = 120 // user-set total study time for the whole session
let sessionElapsedMinutes = 0 // focus minutes banked so far this session
let cyclesCompleted = 0
let phase = 'focus'           // 'focus' | 'break'
let secondsLeft = FOCUS_MIN * 60
let running = false
let intervalId = null

export function render() {
  return `
    <div class="max-w-5xl mx-auto">
      <h1 class="font-display text-2xl font-semibold mb-5">Pomodoro Timer</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="card lg:col-span-2 flex flex-col items-center py-10">

          <div id="setup-panel" class="w-full max-w-xs flex flex-col items-center gap-3 mb-6 ${sessionActive ? 'hidden' : ''}">
            <label class="text-xs font-medium self-start">Total study time for this session</label>
            <div class="flex items-center gap-2 w-full">
              <input id="session-hours" type="number" min="0.5" step="0.5" value="${(sessionTotalMinutes / 60).toFixed(1)}" class="input text-center" />
              <span class="text-sm text-ink/50 dark:text-paper/50 shrink-0">hours</span>
            </div>
            <p class="text-xs text-ink/50 dark:text-paper/50 text-center">
              Auto-cycles 25 min focus \u2192 5 min break (15 min every 4th round) until your total time is used up. Keep this tab open in the background \u2014 it keeps running while you work in another tab.
            </p>
            <button id="start-session-btn" class="btn btn-primary mt-1" style="padding:0.625rem 1.5rem;">Start Session</button>
          </div>

          <div id="session-status" class="w-full flex flex-col items-center ${sessionActive ? '' : 'hidden'}">
            <p id="phase-label" class="text-xs uppercase tracking-wide font-semibold mb-1 ${phase === 'focus' ? 'text-marigold-dark' : 'text-sage'}"></p>
            <p id="cycle-label" class="text-xs text-ink/50 dark:text-paper/50 mb-6"></p>

            <div class="relative w-56 h-56 flex items-center justify-center mb-6">
              <svg width="224" height="224" class="-rotate-90 absolute inset-0">
                <circle cx="112" cy="112" r="100" stroke-width="8" fill="none" class="stroke-paper-line dark:stroke-ink-soft"></circle>
                <circle id="progress-circle" cx="112" cy="112" r="100" stroke-width="8" stroke="#E3A008" fill="none" stroke-linecap="round" style="transition:stroke-dashoffset 1s linear"></circle>
              </svg>
              <span id="timer-display" class="font-mono text-5xl font-semibold"></span>
            </div>

            <div class="w-full max-w-xs mb-6">
              <div class="flex justify-between text-xs text-ink/50 dark:text-paper/50 mb-1.5">
                <span>Session progress</span>
                <span id="session-progress-label" class="font-mono"></span>
              </div>
              <div class="progress-track"><div id="session-progress-fill" class="progress-fill"></div></div>
            </div>

            <div class="flex gap-3">
              <button id="start-btn" class="btn btn-primary" style="padding:0.625rem 1.25rem;">Start</button>
              <button id="pause-btn" class="btn btn-secondary hidden" style="padding:0.625rem 1.25rem;">Pause</button>
              <button id="end-session-btn" class="btn btn-danger" style="padding:0.625rem 1.25rem;">End Session</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="font-display text-base font-semibold mb-4">Focus Stats</h3>
          <div class="flex flex-col gap-4">
            <div><p class="font-mono text-2xl font-semibold" id="stat-today">${formatDuration(state.pomodoroStats.todayFocusMinutes || 0)}</p><p class="text-xs text-ink/50 dark:text-paper/50">Today&rsquo;s focus time</p></div>
            <div><p class="font-mono text-2xl font-semibold" id="stat-sessions">${state.pomodoroStats.totalSessions}</p><p class="text-xs text-ink/50 dark:text-paper/50">Total focus blocks completed</p></div>
            <div><p class="font-mono text-2xl font-semibold" id="stat-lifetime">${formatDuration(state.pomodoroStats.totalFocusMinutes || 0)}</p><p class="text-xs text-ink/50 dark:text-paper/50">Lifetime focus time</p></div>
          </div>
        </div>
      </div>
    </div>
  `
}

function phaseTotalSeconds() {
  if (phase === 'focus') return FOCUS_MIN * 60
  const isLongBreak = cyclesCompleted > 0 && cyclesCompleted % LONG_BREAK_EVERY === 0
  return (isLongBreak ? LONG_BREAK_MIN : SHORT_BREAK_MIN) * 60
}

function updateDisplay() {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const s = String(secondsLeft % 60).padStart(2, '0')
  const displayEl = document.getElementById('timer-display')
  if (displayEl) displayEl.textContent = `${m}:${s}`
  updateWidget(phase, secondsLeft)

  const total = phaseTotalSeconds()
  const circumference = 2 * Math.PI * 100
  const progress = 1 - secondsLeft / total
  const circle = document.getElementById('progress-circle')
  if (circle) {
    circle.style.stroke = phase === 'focus' ? '#E3A008' : '#5C8374'
    circle.setAttribute('stroke-dasharray', circumference)
    circle.setAttribute('stroke-dashoffset', circumference * (1 - progress))
  }

  const phaseLabel = document.getElementById('phase-label')
  if (phaseLabel) {
    phaseLabel.textContent = phase === 'focus' ? 'Focus' : 'Break'
    phaseLabel.className = `text-xs uppercase tracking-wide font-semibold mb-1 ${phase === 'focus' ? 'text-marigold-dark' : 'text-sage'}`
  }
  const cycleLabel = document.getElementById('cycle-label')
  if (cycleLabel) cycleLabel.textContent = `Round ${cyclesCompleted + 1}`

  const sessionPct = Math.min(100, Math.round((sessionElapsedMinutes / sessionTotalMinutes) * 100))
  const progLabel = document.getElementById('session-progress-label')
  if (progLabel) progLabel.textContent = `${formatDuration(sessionElapsedMinutes)} / ${formatDuration(sessionTotalMinutes)}`
  const progFill = document.getElementById('session-progress-fill')
  if (progFill) progFill.style.width = `${sessionPct}%`
}

function tick() {
  secondsLeft--
  updateDisplay()
  if (secondsLeft <= 0) {
    onPhaseComplete()
  }
}

function onPhaseComplete() {
  clearInterval(intervalId)

  if (phase === 'focus') {
    recordStudyMinutes(FOCUS_MIN)
    state.pomodoroStats.totalSessions++
    state.pomodoroStats.totalFocusMinutes += FOCUS_MIN
    state.pomodoroStats.todayFocusMinutes = (state.pomodoroStats.todayFocusMinutes || 0) + FOCUS_MIN
    state.pomodoroStats.lastSessionDate = new Date().toISOString()
    persist()
    refreshStatCards()

    sessionElapsedMinutes += FOCUS_MIN
    cyclesCompleted++

    if (sessionElapsedMinutes >= sessionTotalMinutes) {
      finishSession()
      return
    }
    phase = 'break'
  } else {
    if (sessionElapsedMinutes >= sessionTotalMinutes) {
      finishSession()
      return
    }
    phase = 'focus'
  }

  secondsLeft = phaseTotalSeconds()
  updateDisplay()
  // auto-continue into the next phase without needing another click
  running = true
  toggleButtons()
  intervalId = setInterval(tick, 1000)
}

function finishSession() {
  running = false
  sessionActive = false
  document.getElementById('setup-panel')?.classList.remove('hidden')
  document.getElementById('session-status')?.classList.add('hidden')
  sessionElapsedMinutes = 0
  cyclesCompleted = 0
  phase = 'focus'
  hideWidget()
}

function refreshStatCards() {
  const today = document.getElementById('stat-today')
  const sessions = document.getElementById('stat-sessions')
  const lifetime = document.getElementById('stat-lifetime')
  if (today) today.textContent = formatDuration(state.pomodoroStats.todayFocusMinutes || 0)
  if (sessions) sessions.textContent = state.pomodoroStats.totalSessions
  if (lifetime) lifetime.textContent = formatDuration(state.pomodoroStats.totalFocusMinutes || 0)
}

function toggleButtons() {
  document.getElementById('start-btn')?.classList.toggle('hidden', running)
  document.getElementById('pause-btn')?.classList.toggle('hidden', !running)
}

export function mount() {
  window.lucide?.createIcons()

  if (sessionActive) {
    updateDisplay()
    toggleButtons()
    showWidget()
  }

  document.getElementById('start-session-btn')?.addEventListener('click', () => {
    const hours = Number(document.getElementById('session-hours').value) || 2
    sessionTotalMinutes = Math.round(hours * 60)
    sessionElapsedMinutes = 0
    cyclesCompleted = 0
    phase = 'focus'
    secondsLeft = FOCUS_MIN * 60
    sessionActive = true

    document.getElementById('setup-panel').classList.add('hidden')
    document.getElementById('session-status').classList.remove('hidden')
    updateDisplay()

    running = true
    toggleButtons()
    intervalId = setInterval(tick, 1000)
    showWidget()
  })

  document.getElementById('start-btn')?.addEventListener('click', () => {
    running = true
    toggleButtons()
    intervalId = setInterval(tick, 1000)
    showWidget()
  })
  document.getElementById('pause-btn')?.addEventListener('click', () => {
    running = false
    toggleButtons()
    clearInterval(intervalId)
  })
  document.getElementById('end-session-btn')?.addEventListener('click', () => {
    clearInterval(intervalId)
    finishSession()
  })
}
