let el = null
let dragging = false
let offsetX = 0
let offsetY = 0
let moved = false

function ensureWidget() {
  if (el) return el

  el = document.createElement('div')
  el.id = 'pomo-widget'
  el.className = 'hidden'
  el.style.cssText = `
    position:fixed; top:16px; right:16px; z-index:9999;
    background:#1a1a1a; color:#fff; border-radius:12px;
    padding:10px 14px; box-shadow:0 8px 24px rgba(0,0,0,0.35);
    cursor:grab; user-select:none; font-family:inherit;
    display:flex; align-items:center; gap:10px; min-width:120px;
  `
  el.innerHTML = `
    <div style="width:8px;height:8px;border-radius:50%;background:#E3A008;flex-shrink:0;" id="pomo-widget-dot"></div>
    <div>
      <div id="pomo-widget-phase" style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.7;">Focus</div>
      <div id="pomo-widget-time" style="font-family:monospace;font-size:18px;font-weight:600;">25:00</div>
    </div>
  `
  document.body.appendChild(el)

  el.addEventListener('pointerdown', (e) => {
    dragging = true
    moved = false
    el.style.cursor = 'grabbing'
    const rect = el.getBoundingClientRect()
    offsetX = e.clientX - rect.left
    offsetY = e.clientY - rect.top
    el.setPointerCapture(e.pointerId)
  })
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return
    moved = true
    el.style.left = `${e.clientX - offsetX}px`
    el.style.top = `${e.clientY - offsetY}px`
    el.style.right = 'auto'
  })
  el.addEventListener('pointerup', (e) => {
    dragging = false
    el.style.cursor = 'grab'
    el.releasePointerCapture(e.pointerId)
    if (!moved) location.hash = '#/pomodoro'
  })

  return el
}

export function showWidget() {
  ensureWidget().classList.remove('hidden')
}

export function hideWidget() {
  ensureWidget().classList.add('hidden')
}

export function updateWidget(phase, secondsLeft) {
  ensureWidget()
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const s = String(secondsLeft % 60).padStart(2, '0')
  document.getElementById('pomo-widget-time').textContent = `${m}:${s}`
  document.getElementById('pomo-widget-phase').textContent = phase === 'focus' ? 'Focus' : 'Break'
  document.getElementById('pomo-widget-dot').style.background = phase === 'focus' ? '#E3A008' : '#5C8374'
}
