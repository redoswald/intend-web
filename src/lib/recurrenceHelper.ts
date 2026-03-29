import { RRule } from 'rrule'

/**
 * Calculate the next occurrence after a given date using an RRULE string.
 * DB stores rules without the "RRULE:" prefix (e.g. "FREQ=WEEKLY;BYDAY=MO,TH").
 */
export function getNextOccurrence(rruleString: string, afterDate: Date): Date | null {
  // Anchor DTSTART to midnight UTC on the afterDate so that
  // occurrences land on clean day boundaries instead of being
  // tied to the arbitrary time-of-day when the RRule is constructed.
  const y = afterDate.getUTCFullYear()
  const m = String(afterDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(afterDate.getUTCDate()).padStart(2, '0')
  const rule = RRule.fromString(
    `DTSTART:${y}${m}${d}T000000Z\nRRULE:${rruleString}`
  )
  return rule.after(afterDate)
}

/**
 * Return a human-readable description of an RRULE string.
 * e.g. "FREQ=WEEKLY;BYDAY=MO,TH" → "every week on Monday, Thursday"
 */
export function describeRecurrence(rruleString: string): string {
  try {
    const rule = RRule.fromString(`RRULE:${rruleString}`)
    return rule.toText()
  } catch {
    return rruleString
  }
}

/**
 * Build an RRULE string from UI builder state.
 */
export function buildRRule(
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  interval: number,
  byDay?: string[] // e.g. ['MO', 'TH']
): string {
  const parts = [`FREQ=${freq}`]
  if (interval > 1) parts.push(`INTERVAL=${interval}`)
  if (freq === 'WEEKLY' && byDay && byDay.length > 0) {
    parts.push(`BYDAY=${byDay.join(',')}`)
  }
  return parts.join(';')
}

/**
 * Parse an RRULE string back into builder-friendly state.
 */
export function parseRRule(rruleString: string): {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  byDay: string[]
} {
  const parts = new Map(
    rruleString.split(';').map(p => {
      const [key, val] = p.split('=')
      return [key, val] as [string, string]
    })
  )

  const freq = (parts.get('FREQ') ?? 'WEEKLY') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  const interval = parseInt(parts.get('INTERVAL') ?? '1', 10)
  const byDay = parts.get('BYDAY')?.split(',') ?? []

  return { freq, interval, byDay }
}
