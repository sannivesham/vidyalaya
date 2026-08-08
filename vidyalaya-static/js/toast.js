let container = null

function ensureContainer() {
  if (container) return container
  container = document.createElement('div')
  container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end'
  document.body.appendChild(container)
  return container
}

export function showToast(message, variant = 'default') {
  const el = document.createElement('div')
  el.className = `toast ${variant === 'default' ? '' : variant}`
  el.textContent = message
  ensureContainer().appendChild(el)
  setTimeout(() => el.remove(), 3000)
}
