import dayjs from 'dayjs'

/** Rendezvous still awaiting doctor action (ms-rendez-vous: `scheduled`). */
export function isScheduledRendezvousStatus(status: string | undefined | null): boolean {
  return String(status || '').toLowerCase() === 'scheduled'
}

/**
 * Scheduled appointments whose end time (or start if no end) is already past —
 * should be auto-cancelled so the slot is released and the list stays accurate.
 */
export function getExpiredScheduledAppointments<
  T extends { status?: string; endTime?: string; startTime?: string },
>(appts: T[], now: dayjs.Dayjs = dayjs()): T[] {
  return appts.filter(a => {
    if (!isScheduledRendezvousStatus(a.status)) return false
    const end = dayjs(a.endTime || a.startTime)
    return end.isValid() && end.isBefore(now)
  })
}
