import type { ReactNode } from 'react'

export type IconName = 'activity' | 'alert' | 'arrow' | 'camera' | 'chart' | 'check' | 'chef' | 'clipboard' | 'food' | 'heart' | 'lab' | 'menu' | 'message' | 'report' | 'shield' | 'spark' | 'stethoscope' | 'user' | 'x'

const icons: Record<IconName, ReactNode> = {
  activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
  alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  camera: <><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3.5" /></>,
  chart: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chef: <><path d="M6 13.9V19h12v-5.1" /><path d="M6.5 14a4 4 0 0 1 1-7.9 5 5 0 0 1 9 0 4 4 0 0 1 1 7.9" /><path d="M8 19v2h8v-2" /></>,
  clipboard: <><rect width="14" height="18" x="5" y="3" rx="2" /><path d="M9 3V1h6v2" /><path d="m9 12 2 2 4-4" /></>,
  food: <><path d="M7 3v7" /><path d="M4 3v4a3 3 0 0 0 6 0V3" /><path d="M7 10v11" /><path d="M17 3c-2 2-3 5-3 8h5V3h-2Z" /><path d="M19 11v10" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  lab: <><path d="M9 3h6" /><path d="M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M8 15h8" /></>,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
  report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  spark: <><path d="m12 3-1.4 4.2L6 9l4.6 1.8L12 15l1.4-4.2L18 9l-4.6-1.8Z" /><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7Z" /></>,
  stethoscope: <><path d="M4 3v6a4 4 0 0 0 8 0V3" /><path d="M8 13v2a5 5 0 0 0 10 0v-1" /><circle cx="18" cy="10" r="2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  x: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}
