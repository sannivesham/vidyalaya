import { state, recordStudyMinutes, persist } from '../store.js'
import { formatDuration } from '../utils.js'

const PRESETS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }
let mode = 'focus'
let customMinutes = 25
let secondsLeft = PRESETS.focus
let running = false
let intervalId = null

export function render() {
  return `
    <div class="max-w-5xl mx-auto">
      <h1 class="font-display text-2xl font-semibold mb-5">Pomodoro Timer</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="card lg:col-span-2 flex flex-col items-center justify-center py-12">
          <div id="mode-chips" class="flex gap-2 mb-8 flex-wrap justify-center">
            <button class="chip active" data-mode="focus">25 min</button>
            <button class="chip" data-mode="short">5 min break</button>
            <button class="chip" data-mode="long">15 min break</button>
            <button class="chip" data-mode="custom">Custom</button>
          </div>
          <input id="custom-input" type="number" min="1" value="25" class="input w-24 mb-6 text-center hidden" />
          <div class="relative w-56 h-56 flex items-center justify-center mb-8">
            <svg width="224" height="224" class="-rotate-90 absolute inset-0">
              <circle cx="112" cy="112" r="100" stroke-width="8" fill="none" class="stroke-paper-line dark:stroke-ink-soft"></circle>
              <circle id="progress-circle" cx="112" cy="112" r="100" stroke-width="8" stroke="#E3A008" fill="none" stroke-linecap="round" style="transition:stroke-dashoffset 1s linear"></circle>
            </svg>
            <span id="timer-display" class="font-mono text-5xl font-semibold"></span>
          </div>
          <div class="flex gap-3">
            <button id="start-btn" class="btn btn-primary" style="padding:0.625rem 1.25rem;">Start</button>
            <button id="pause-btn" class="btn btn-secondary hidden" style="padding:0.625rem 1.25rem;">Pause</button>
            <button id="reset-btn" class="btn btn-secondary" style="padding:0.625rem 1.25rem;">Reset</button>
          </div>
        </div>
        <div class="card">
          <h3 class="font-display text-base font-semibold mb-4">Focus Stats</h3>
          <div class="flex flex-col gap-4">
            <div><p class="font-mono text-2xl font-semibold">${formatDuration(state.pomodoroStats.todayFocusMinutes || 0)}</p><p class="text-xs text-ink/50 dark:text-paper/50">Today&rsquo;s focus time</p></div>
            <div><p class="font-mono text-2xl font-semibold">${state.pomodoroStats.totalSessions}</p><p class="text-xs text-ink/50 dark:text-paper/50">Total sessions completed</p></div>
            <div><p class="font-mono text-2xl font-semibold">${formatDuration(state.pomodoroStats.totalFocusMinutes || 0)}</p><p class="text-xs text-ink/50 dark:text-paper/50">Lifetime focus time</p></div>
          </div>
        </div>
      </div>
    </div>
  `
}

function updateDisplay() {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const s = String(secondsLeft % 60).padStart(2, '0')
  const displayEl = document.getElementById('timer-display')
  if (displayEl) displayEl.textContent = `${m}:${s}`

  const total = mode === 'custom' ? customMinutes * 60 : PRESETS[mode]
  const circumference = 2 * Math.PI * 100
  const progress = 1 - secondsLeft / total
  const circle = document.getElementById('progress-circle')
  if (circle) {
    circle.setAttribute('stroke-dasharray', circumference)
    circle.setAttribute('stroke-dashoffset', circumference * (1 - progress))
  }
}

function tick() {
  secondsLeft--
  updateDisplay()
  if (secondsLeft <= 0) {
    clearInterval(intervalId)
    running = false
    toggleButtons()
    if (mode === 'focus') {
      const minutes = (mode === 'custom' ? customMinutes : PRESETS.focus / 60)
      recordStudyMinutes(minutes)
      state.pomodoroStats.totalSessions++
      state.pomodoroStats.totalFocusMinutes += minutes
      state.pomodoroStats.todayFocusMinutes = (state.pomodoroStats.todayFocusMinutes || 0) + minutes
      state.pomodoroStats.lastSessionDate = new Date().toISOString()
      persist()
      location.reload()
    }
  }
}

function toggleButtons() {
  document.getElementById('start-btn')?.classList.toggle('hidden', running)
  document.getElementById('pause-btn')?.classList.toggle('hidden', !running)
}

export function mount() {
  window.lucide?.createIcons()
  secondsLeft = PRESETS.focus
  updateDisplay()

  document.getElementById('mode-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]')
    if (!btn) return
    mode = btn.dataset.mode
    document.querySelectorAll('#mode-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.mode === mode))
    document.getElementById('custom-input').classList.toggle('hidden', mode !== 'custom')
    clearInterval(intervalId)
    running = false
    toggleButtons()
    secondsLeft = mode === 'custom' ? customMinutes * 60 : PRESETS[mode]
    updateDisplay()
  })

  document.getElementById('custom-input').addEventListener('input', (e) => {
    customMinutes = Number(e.target.value) || 1
    if (mode === 'custom') { secondsLeft = customMinutes * 60; updateDisplay() }
  })

  document.getElementById('start-btn').addEventListener('click', () => {
    running = true
    toggleButtons()
    intervalId = setInterval(tick, 1000)
  })
  document.getElementById('pause-btn').addEventListener('click', () => {
    running = false
    toggleButtons()
    clearInterval(intervalId)
  })
  document.getElementById('reset-btn').addEventListener('click', () => {
    clearInterval(intervalId)
    running = false
    toggleButtons()
    secondsLeft = mode === 'custom' ? customMinutes * 60 : PRESETS[mode]
    updateDisplay()
  })
}
