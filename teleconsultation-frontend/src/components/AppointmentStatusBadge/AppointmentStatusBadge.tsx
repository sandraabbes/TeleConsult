import './AppointmentStatusBadge.css'

/** Canonical tones for styling (aligned with product spec). */
export type AppointmentStatusTone = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NOSHOW' | 'PENDING' | 'RESCHEDULE_REQUESTED'

export function normalizeAppointmentStatusTone(raw: string | null | undefined): AppointmentStatusTone {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')

  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED'
  if (s === 'COMPLETED') return 'COMPLETED'
  if (s === 'NO_SHOW' || s === 'NOSHOW') return 'NOSHOW'
  if (s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION' || s === 'IN_CONSULTATION') return 'CONFIRMED'
  if (s === 'RESCHEDULE_REQUESTED') return 'RESCHEDULE_REQUESTED'
  return 'PENDING'
}

export function getAppointmentStatusLabel(raw: string | null | undefined): string {
  const tone = normalizeAppointmentStatusTone(raw)
  const labels: Record<AppointmentStatusTone, string> = {
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    NOSHOW: 'No show',
    PENDING: 'Pending',
    RESCHEDULE_REQUESTED: 'Reschedule Requested',
  }



  if (tone !== 'PENDING') return labels[tone]

  const s = String(raw || '').trim().toUpperCase()
  if (s === 'IN_CONSULTATION') return 'In Consultation'
  if (s === 'SCHEDULED' || s === 'PENDING_PAYMENT') return 'Payment required'
  if (s === 'PENDING') return 'Awaiting approval'
  if (s === 'RESCHEDULED') return 'Rescheduled'
  return 'Pending'
}

type Props = {
  status: string | null | undefined
  className?: string
}

export default function AppointmentStatusBadge({ status, className = '' }: Props) {
  const tone = normalizeAppointmentStatusTone(status)
  const label = getAppointmentStatusLabel(status)
  return (
    <span className={`appt-status-badge-unified appt-status-badge-unified--${tone.toLowerCase()} ${className}`.trim()}>
      {label}
    </span>
  )
}
