export const DIAGNOSTIC_EVENT_TYPES = [
    'touchstart',
    'touchend',
    'pointerdown',
    'pointerup',
    'click',
    'dblclick',
]

export function describeElement(element) {
    if (!element?.tagName) return 'null'

    const ariaLabel = element.getAttribute?.('aria-label') || '-'
    const disabled = element.hasAttribute?.('disabled') ?? false
    const ariaDisabled = element.getAttribute?.('aria-disabled') === 'true'

    return `${element.tagName} aria-label="${ariaLabel}" disabled=${disabled} aria-disabled=${ariaDisabled}`
}

function eventPoint(event) {
    const touch = event.changedTouches?.[0] ?? event.touches?.[0]
    const clientX = touch?.clientX ?? event.clientX
    const clientY = touch?.clientY ?? event.clientY

    return Number.isFinite(clientX) && Number.isFinite(clientY)
        ? { clientX, clientY }
        : null
}

export function createDiagnosticEntry(event, {
    id,
    now,
    previousAt,
    scale,
    getStyle,
    elementFromPoint,
}) {
    const point = eventPoint(event)
    const hitTarget = point ? elementFromPoint?.(point.clientX, point.clientY) : null
    let touchAction = '-'

    try {
        touchAction = getStyle?.(event.target)?.touchAction || '-'
    } catch {
        // 診斷工具不能因非 Element target 中斷頁面操作。
    }

    return {
        id,
        at: now,
        deltaMs: previousAt == null ? 0 : now - previousAt,
        type: event.type,
        target: describeElement(event.target),
        touchAction,
        hit: describeElement(hitTarget),
        defaultPrevented: event.defaultPrevented,
        cancelable: event.cancelable,
        scale,
        delayedScale: null,
    }
}

export function formatDiagnosticEntry(entry) {
    const delayed = entry.delayedScale == null ? '' : ` scale@+400ms=${entry.delayedScale}`

    return [
        `${entry.type} +${Math.round(entry.deltaMs)}ms scale=${entry.scale}${delayed}`,
        `target=${entry.target} touchAction=${entry.touchAction}`,
        `hit=${entry.hit}`,
        `defaultPrevented=${entry.defaultPrevented} cancelable=${entry.cancelable}`,
    ].join('\n')
}

export function appendRecent(entries, entry, limit = 12) {
    return [...entries, entry].slice(-limit)
}

export function withDelayedScale(entries, id, scale) {
    return entries.map((entry) => (
        entry.id === id ? { ...entry, delayedScale: scale } : entry
    ))
}
