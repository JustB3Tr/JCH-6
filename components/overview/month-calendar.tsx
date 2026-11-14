'use client'

import { useMemo, useState } from 'react'

type CalendarEvent = { date: string; title: string; mine: boolean }

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MonthCalendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date()
  const [monthOffset, setMonthOffset] = useState(0)

  const { cells, monthLabel, eventsByDay } = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
    const year = base.getFullYear()
    const month = base.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const byDay = new Map<number, CalendarEvent[]>()
    for (const e of events) {
      const d = new Date(e.date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const list = byDay.get(d.getDate()) ?? []
        list.push(e)
        byDay.set(d.getDate(), list)
      }
    }

    const grid: Array<{ day: number | null }> = []
    for (let i = 0; i < firstWeekday; i++) grid.push({ day: null })
    for (let d = 1; d <= daysInMonth; d++) grid.push({ day: d })

    return {
      cells: grid,
      monthLabel: base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      eventsByDay: byDay,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, monthOffset])

  const isToday = (day: number) =>
    monthOffset === 0 && day === today.getDate()

  return (
    <div className="mt-3 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m - 1)}
          className="rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-secondary"
          aria-label="Previous month"
        >
          ←
        </button>
        <p className="font-medium" aria-live="polite">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m + 1)}
          className="rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-secondary"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <span key={i} aria-hidden>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.day === null) return <span key={i} />
          const dayEvents = eventsByDay.get(cell.day) ?? []
          return (
            <div
              key={i}
              className={`flex min-h-14 flex-col items-center rounded-lg p-1 text-xs ${
                isToday(cell.day) ? 'bg-primary/10 font-semibold' : ''
              }`}
            >
              <span className={isToday(cell.day) ? 'text-primary' : ''}>{cell.day}</span>
              <div className="mt-0.5 flex w-full flex-col gap-0.5">
                {dayEvents.slice(0, 2).map((e, j) => (
                  <span
                    key={j}
                    title={e.title}
                    className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                      e.mine ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-secondary" aria-hidden /> Community event
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-accent" aria-hidden /> Your RSVP
        </span>
      </p>
    </div>
  )
}
