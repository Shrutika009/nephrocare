import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import type { Page, WhatsAppLog, ToastType } from '../types'
import '../styles/alerts.css'

type AlertsPageProps = {
  showPage: (page: Page) => void
  user: { name: string; email: string } | null
  addToast: (type: ToastType, title: string, message: string, action?: any) => void
}

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }
  return [storedValue, setValue] as const
}

export function AlertsPage({ showPage, user, addToast }: AlertsPageProps) {
  const [whatsappEnabled, setWhatsappEnabled] = useLocalStorage('nephrocare_whatsapp_enabled', false)
  const [phone, setPhone] = useLocalStorage('nephrocare_phone', '')
  const [whatsappLogs, setWhatsappLogs] = useLocalStorage<WhatsAppLog[]>('nephrocare_whatsapp_history', [])

  const [medReminder, setMedReminder] = useLocalStorage('nephrocare_med_reminder', false)
  const [foodReminder, setFoodReminder] = useLocalStorage('nephrocare_food_reminder', false)

  if (!user) {
    return (
      <main className="dashboard-page auth-wall">
        <div className="auth-wall-card">
          <div className="auth-wall-icon">
            <Icon name="shield" size={48} />
          </div>
          <h2>Smart Alerts is Locked</h2>
          <p>Please log in or create an account to configure your alerts.</p>
          <div className="auth-wall-actions">
            <button className="login-btn-primary" onClick={() => showPage('login')}>Log In</button>
            <button className="signup-btn-secondary" onClick={() => showPage('signup')}>Sign Up</button>
          </div>
        </div>
      </main>
    )
  }

  const testWhatsApp = async () => {
    if (!phone) {
      addToast('warning', 'Missing Phone', 'Please enter a phone number to test WhatsApp.')
      return
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: `🔔 NephroCare Test Alert\n\n*Connection Successful*\nYour WhatsApp alerts are now configured.`
        })
      })
      const data = await response.json()
      if (data.success) {
        addToast('success', 'Test Sent', `Test message sent to ${phone}`)
        setWhatsappLogs([{ timestamp: new Date().toISOString(), title: 'Test Alert', message: 'Connection Successful', status: 'Sent' }, ...whatsappLogs].slice(0, 50))
      } else {
        addToast(
          'whatsapp',
          'Test Simulated',
          `Message simulated to ${phone}`,
          data.whatsapp_web_url ? { label: 'Send via WhatsApp Web', url: data.whatsapp_web_url } : undefined
        )
        setWhatsappLogs([{ timestamp: new Date().toISOString(), title: 'Test Alert', message: 'Connection Simulated', status: 'Simulated' }, ...whatsappLogs].slice(0, 50))
      }
    } catch (err) {
      console.error(err)
      addToast('danger', 'Test Failed', 'Could not reach the WhatsApp API.')
      setWhatsappLogs([{ timestamp: new Date().toISOString(), title: 'Test Alert', message: 'Connection Failed', status: 'Failed' }, ...whatsappLogs].slice(0, 50))
    }
  }

  return (
    <div className="alerts-page-container">
      <div className="alerts-header">
        <h1><Icon name="alert" size={28} /> Smart Alerts & Reminders</h1>
        <p>Configure automated reminders and emergency WhatsApp notifications.</p>
      </div>

      <div className="alerts-grid">
        <div className="alerts-column">
          <div className="alerts-card">
            <h2><Icon name="clock" size={20} /> Automated Routines</h2>
            <p className="alerts-desc">Get timely notifications about your essential CKD routines.</p>
            
            <div className="routine-toggle">
              <div className="routine-info">
                <h3>Medication Reminder</h3>
                <p>Alerts every few hours to take your prescriptions.</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={medReminder} 
                  onChange={(e) => {
                    setMedReminder(e.target.checked)
                    if (e.target.checked) addToast('info', 'Medication Alerts On', 'We will periodically remind you.')
                  }} 
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="routine-toggle">
              <div className="routine-info">
                <h3>Diet & Hydration Logging</h3>
                <p>Gentle nudges to keep your food diary updated.</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={foodReminder} 
                  onChange={(e) => {
                    setFoodReminder(e.target.checked)
                    if (e.target.checked) addToast('success', 'Diet Alerts On', 'We will periodically remind you.')
                  }} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="alerts-card">
            <h2><Icon name="message-circle" size={20} /> WhatsApp Integration</h2>
            <p className="alerts-desc">Receive critical alerts (like severe symptoms or highly abnormal lab results) directly to your phone.</p>
            
            <div className="wa-config-box">
              <div className="form-group">
                <label>Phone Number (with Country Code)</label>
                <input 
                  type="text" 
                  placeholder="+1234567890" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="wa-input"
                />
              </div>

              <label className="toggle-switch inline-toggle">
                <input 
                  type="checkbox" 
                  checked={whatsappEnabled} 
                  onChange={e => setWhatsappEnabled(e.target.checked)} 
                />
                <span className="slider round"></span>
                <span style={{ marginLeft: '12px', fontWeight: 'bold', color: whatsappEnabled ? 'var(--deep)' : '#64748b' }}>
                  {whatsappEnabled ? 'WhatsApp Alerts Enabled' : 'Enable WhatsApp Alerts'}
                </span>
              </label>
              
              <button className="btn-test" onClick={testWhatsApp} disabled={!whatsappEnabled}>
                Send Test Alert
              </button>
            </div>
          </div>
        </div>

        <div className="alerts-column">
          <div className="alerts-card" style={{ height: '100%' }}>
            <h2><Icon name="activity" size={20} /> Notification History</h2>
            <div className="alerts-history-list">
              {whatsappLogs.length === 0 ? (
                <div className="empty-history">
                  <Icon name="info" size={32} />
                  <p>No alerts have been sent yet.</p>
                </div>
              ) : (
                whatsappLogs.map((log, idx) => (
                  <div key={idx} className={`history-item status-${log.status.toLowerCase()}`}>
                    <div className="history-item-header">
                      <strong>{log.title}</strong>
                      <span className="history-time">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p>{log.message}</p>
                    <span className={`history-badge badge-${log.status.toLowerCase()}`}>{log.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
