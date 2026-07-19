export function useContentProtection() {
    function enable() {
        document.addEventListener('contextmenu', preventDefault)
        document.addEventListener('keydown', blockShortcuts)
        document.addEventListener('dragstart', preventDefault)
    }

    function disable() {
        document.removeEventListener('contextmenu', preventDefault)
        document.removeEventListener('keydown', blockShortcuts)
        document.removeEventListener('dragstart', preventDefault)
    }

    return { enable, disable }
}

function preventDefault(e) {
    e.preventDefault()
}

function blockShortcuts(e) {
    const blocked =
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        e.key === 'F12'

    if (blocked) e.preventDefault()
}
