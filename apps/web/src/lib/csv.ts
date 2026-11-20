/** Build an RFC 4180 CSV string. Cells starting with = + - @ are prefixed to stop spreadsheet formula injection. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v)
    // phone numbers like "+92 300 1234567" can't execute, so they are left as-is
    if (typeof v === 'string' && /^[=+\-@]/.test(s) && !/^\+[\d ]+$/.test(s)) s = `'${s}`
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  // BOM so Excel opens UTF-8 (Urdu names) correctly
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
