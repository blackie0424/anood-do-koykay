export function hideSplash() {
    const splash = document.getElementById('app-splash')
    if (!splash) return

    splash.classList.add('splash-hidden')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
}
