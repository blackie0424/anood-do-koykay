function getCsrfToken() {
  return decodeURIComponent(
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1] ?? ''
  )
}

export function apiFetch(url, options = {}) {
  const { headers: callerHeaders = {}, ...rest } = options
  return fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': getCsrfToken(),
      ...callerHeaders,
    },
  })
}
