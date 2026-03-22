import { useState, useEffect } from 'react'
import { buildRRule, parseRRule, describeRecurrence } from '@/lib/recurrenceHelper'

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

const DAYS = [
  { key: 'MO', label: 'Mo' },
  { key: 'TU', label: 'Tu' },
  { key: 'WE', label: 'We' },
  { key: 'TH', label: 'Th' },
  { key: 'FR', label: 'Fr' },
  { key: 'SA', label: 'Sa' },
  { key: 'SU', label: 'Su' },
] as const

const FREQ_LABELS: Record<Freq, { singular: string; plural: string }> = {
  DAILY: { singular: 'day', plural: 'days' },
  WEEKLY: { singular: 'week', plural: 'weeks' },
  MONTHLY: { singular: 'month', plural: 'months' },
  YEARLY: { singular: 'year', plural: 'years' },
}

interface RecurrenceBuilderProps {
  value: string | null
  onChange: (rrule: string | null) => void
}

export function RecurrenceBuilder({ value, onChange }: RecurrenceBuilderProps) {
  const [enabled, setEnabled] = useState(!!value)
  const [freq, setFreq] = useState<Freq>('WEEKLY')
  const [interval, setInterval] = useState(1)
  const [byDay, setByDay] = useState<string[]>([])

  // Parse existing value on mount / when value changes externally
  useEffect(() => {
    if (value) {
      const parsed = parseRRule(value)
      setFreq(parsed.freq)
      setInterval(parsed.interval)
      setByDay(parsed.byDay)
      setEnabled(true)
    } else {
      setEnabled(false)
    }
  }, [value])

  function emitChange(newFreq: Freq, newInterval: number, newByDay: string[]) {
    onChange(buildRRule(newFreq, newInterval, newByDay))
  }

  function handleToggle() {
    if (enabled) {
      setEnabled(false)
      onChange(null)
    } else {
      setEnabled(true)
      emitChange(freq, interval, byDay)
    }
  }

  function handleFreqChange(newFreq: Freq) {
    setFreq(newFreq)
    // Clear day selection when switching away from weekly
    const newByDay = newFreq === 'WEEKLY' ? byDay : []
    setByDay(newByDay)
    emitChange(newFreq, interval, newByDay)
  }

  function handleIntervalChange(newInterval: number) {
    const clamped = Math.max(1, Math.min(99, newInterval))
    setInterval(clamped)
    emitChange(freq, clamped, byDay)
  }

  function toggleDay(day: string) {
    const newByDay = byDay.includes(day)
      ? byDay.filter(d => d !== day)
      : [...byDay, day]
    setByDay(newByDay)
    emitChange(freq, interval, newByDay)
  }

  return (
    <div className="space-y-2">
      {/* Row 1: Toggle + interval + frequency */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
            enabled
              ? 'border-teal-300 bg-teal-50 text-teal-700'
              : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
          }`}
          title={enabled && value ? describeRecurrence(value) : 'Add recurrence'}
        >
          <RepeatIcon />
          {enabled ? 'Repeat' : 'Repeat'}
        </button>

        {enabled && (
          <>
            <span className="text-xs text-gray-500">every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
              className="w-12 text-sm text-center border border-gray-200 rounded-md px-1 py-0.5"
            />
            <select
              value={freq}
              onChange={(e) => handleFreqChange(e.target.value as Freq)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              {(Object.keys(FREQ_LABELS) as Freq[]).map(f => (
                <option key={f} value={f}>
                  {interval > 1 ? FREQ_LABELS[f].plural : FREQ_LABELS[f].singular}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Row 2: Day picker (weekly only) */}
      {enabled && freq === 'WEEKLY' && (
        <div className="flex items-center gap-1 pl-1">
          <span className="text-xs text-gray-500 mr-1">on</span>
          {DAYS.map(day => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={`w-7 h-7 text-xs rounded-full font-medium transition-colors ${
                byDay.includes(day.key)
                  ? 'bg-accent-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RepeatIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}
