const PAGE_RANGE_PATTERN = /(\d+)(?:\s*-\s*(\d+))?/g

export function parseReferenceKnowledgePages(pages, pageStart = null, pageEnd = null) {
  if (Number.isInteger(pageStart) && Number.isInteger(pageEnd)) {
    return { start: pageStart, end: pageEnd }
  }

  const matches = Array.from(String(pages ?? '').matchAll(PAGE_RANGE_PATTERN))

  if (!matches.length) {
    return { start: Number.MAX_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER }
  }

  const ranges = matches.map((match) => {
    const start = Number(match[1])
    const end = match[2] ? Number(match[2]) : start

    return {
      start: Math.min(start, end),
      end: Math.max(start, end),
    }
  })

  return {
    start: Math.min(...ranges.map((range) => range.start)),
    end: Math.max(...ranges.map((range) => range.end)),
  }
}

function compareReference(left, right) {
  const leftId = left.reference?.id
  const rightId = right.reference?.id

  if (typeof leftId === 'number' && typeof rightId === 'number' && leftId !== rightId) {
    return leftId - rightId
  }

  if (leftId == null && rightId != null) return 1
  if (leftId != null && rightId == null) return -1

  return (left.reference?.name || '未指定文獻').localeCompare(right.reference?.name || '未指定文獻', 'zh-Hant')
}

function comparePages(left, right) {
  const leftRange = parseReferenceKnowledgePages(left.pages, left.page_start, left.page_end)
  const rightRange = parseReferenceKnowledgePages(right.pages, right.page_start, right.page_end)

  if (leftRange.start !== rightRange.start) {
    return leftRange.start - rightRange.start
  }

  if (leftRange.end !== rightRange.end) {
    return leftRange.end - rightRange.end
  }

  return (left.id || 0) - (right.id || 0)
}

export function sortReferenceKnowledge(items = []) {
  return [...items].sort((left, right) => {
    const referenceComparison = compareReference(left, right)

    if (referenceComparison !== 0) {
      return referenceComparison
    }

    return comparePages(left, right)
  })
}

export function groupReferenceKnowledgeByReference(items = []) {
  const groups = new Map()

  for (const item of sortReferenceKnowledge(items)) {
    const referenceId = item.reference?.id
    const referenceName = item.reference?.name || '未指定文獻'
    const key = referenceId ?? `unassigned-${referenceName}`

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        reference: {
          id: referenceId,
          name: referenceName,
          image_url: item.reference?.image_url || null,
        },
        items: [],
      })
    }

    groups.get(key).items.push(item)
  }

  return Array.from(groups.values())
}
