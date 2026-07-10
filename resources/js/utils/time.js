export function secondsToMmss(sec) {
    if (sec == null) return ''
    const m = Math.floor(sec / 60)
    const s = (sec % 60).toFixed(1)
    return `${m}:${s.padStart(4, '0')}`
}

export function parseTime(val) {
    if (val == null || val === '') return null
    const s = String(val).trim()
    if (s.includes(':')) {
        const [m, sec] = s.split(':')
        return Math.round((parseInt(m) * 60 + parseFloat(sec)) * 10) / 10
    }
    const n = parseFloat(s)
    return isNaN(n) ? null : Math.round(n * 10) / 10
}
