import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import type { Page } from '../types'

type DashboardPageProps = {
  user: { name: string; email: string } | null
  showPage: (page: Page) => void
}

interface Toast {
  id: string
  type: 'danger' | 'warning' | 'info' | 'success' | 'whatsapp'
  title: string
  message: string
  action?: {
    label: string
    url: string
  }
}

export function DashboardPage({ user, showPage }: DashboardPageProps) {
  // Local state for sliders - updates instantly in real time
  const [egfr, setEgfr] = useState(74)
  const [creatinine, setCreatinine] = useState(1.1)
  const [systolic, setSystolic] = useState(118)
  const [diastolic, setDiastolic] = useState(76)
  const [uacr, setUacr] = useState(24)

  // Symptom tracker state
  const [symptoms, setSymptoms] = useState<Record<string, 'none' | 'mild' | 'moderate' | 'severe'>>({
    fatigue: 'mild',
    swelling: 'none',
    urination: 'none',
    appetite: 'none',
    nausea: 'none'
  })

  // Toasts state for real-time notifications
  const [toasts, setToasts] = useState<Toast[]>([])

  // WhatsApp assistant settings state
  const [phone, setPhone] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [whatsappSaving, setWhatsappSaving] = useState(false)
  const [whatsappMsg, setWhatsappMsg] = useState('')

  // Doctor Report modal state
  const [generatingReport, setGeneratingReport] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Helper to add toast notifications
  const addToast = (
    type: 'danger' | 'warning' | 'info' | 'success' | 'whatsapp', 
    title: string, 
    message: string,
    action?: { label: string; url: string }
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, title, message, action }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, action ? 8000 : 4500)
  }

  // Trigger companion WhatsApp alert if enabled
  const sendWhatsAppNotification = async (title: string, message: string) => {
    if (!whatsappEnabled || !phone) return

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          message: `🔔 NephroCare Alert\n\n*${title}*\n${message}`
        })
      })
      const data = await response.json()
      if (data.success) {
        addToast(
          'whatsapp',
          'WhatsApp Alert Sent',
          `📱 Sent to ${phone}: ${title} - ${message}`
        )
      } else {
        addToast(
          'whatsapp',
          'WhatsApp Simulated',
          `📱 [Simulated to ${phone}]: ${title} - ${message}`,
          data.whatsapp_web_url ? { label: 'Send via WhatsApp Web', url: data.whatsapp_web_url } : undefined
        )
      }
    } catch (err) {
      console.error('Error dispatching WhatsApp alert:', err)
      const cleanPhone = phone.replace(/[^\d]/g, '')
      const webUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(`🔔 NephroCare Alert\n\n*${title}*\n${message}`)}`
      addToast(
        'whatsapp',
        'WhatsApp Simulated',
        `📱 [Simulated to ${phone}]: ${title} - ${message}`,
        { label: 'Send via WhatsApp Web', url: webUrl }
      )
    }
  }

  // Track metric changes to fire real-time clinical alerts
  const handleEgfrChange = (val: number) => {
    const prev = egfr
    setEgfr(val)
    if (val < 60 && prev >= 60) {
      addToast('danger', 'Critical eGFR Drop', `eGFR decreased to ${val} mL/min (Stage 3+ range). Impaired kidney clearance.`)
      sendWhatsAppNotification('Critical eGFR Drop', `eGFR is now ${val} mL/min. Please avoid NSAIDs and check in with your clinic.`)
    } else if (val >= 60 && prev < 60) {
      addToast('success', 'eGFR Recovered', `eGFR is back in the stable range (${val} mL/min).`)
      sendWhatsAppNotification('eGFR Recovered', `eGFR is back in the stable range (${val} mL/min).`)
    }
  }

  const handleCreatinineChange = (val: number) => {
    const prev = creatinine
    setCreatinine(val)
    if (val > 1.3 && prev <= 1.3) {
      addToast('warning', 'Elevated Creatinine', `Creatinine has reached ${val.toFixed(1)} mg/dL, exceeding target range.`)
      sendWhatsAppNotification('Elevated Creatinine', `Creatinine has reached ${val.toFixed(1)} mg/dL. Monitor levels closely.`)
    } else if (val <= 1.3 && prev > 1.3) {
      addToast('success', 'Creatinine Normal', `Creatinine levels stabilized at ${val.toFixed(1)} mg/dL.`)
      sendWhatsAppNotification('Creatinine Normal', `Creatinine levels stabilized at ${val.toFixed(1)} mg/dL.`)
    }
  }

  const handleSystolicChange = (val: number) => {
    const prev = systolic
    setSystolic(val)
    if (val >= 140 && prev < 140) {
      addToast('danger', 'Hypertension Detected', `Blood pressure rose to ${val}/${diastolic} mmHg (Hypertensive Stage 2).`)
      sendWhatsAppNotification('Hypertension Detected', `Blood pressure rose to ${val}/${diastolic} mmHg. Rest and check again.`)
    } else if (val < 130 && prev >= 130) {
      addToast('success', 'Systolic Pressure Normal', `Systolic pressure returned to a safe ${val} mmHg.`)
    }
  }

  const handleDiastolicChange = (val: number) => {
    const prev = diastolic
    setDiastolic(val)
    if (val >= 90 && prev < 90) {
      addToast('danger', 'Diastolic Hypertension', `Blood pressure is high at ${systolic}/${val} mmHg.`)
      sendWhatsAppNotification('Diastolic Hypertension', `Blood pressure is high at ${systolic}/${val} mmHg.`)
    } else if (val < 80 && prev >= 80) {
      addToast('success', 'Diastolic Pressure Normal', `Diastolic pressure returned to a safe ${val} mmHg.`)
    }
  }

  const handleUacrChange = (val: number) => {
    const prev = uacr
    setUacr(val)
    if (val >= 30 && prev < 30) {
      addToast('warning', 'Microalbuminuria Detected', `Urine ACR rose to ${val} mg/g, indicating protein leakage.`)
      sendWhatsAppNotification('Microalbuminuria Detected', `Urine ACR rose to ${val} mg/g. Early sign of kidney stress.`)
    } else if (val < 30 && prev >= 30) {
      addToast('success', 'Urine ACR Stabilized', `Urine ACR returned to healthy levels (${val} mg/g).`)
    }
  }

  const handleSymptomToggle = (symptom: string, severity: 'none' | 'mild' | 'moderate' | 'severe') => {
    const prev = symptoms[symptom]
    setSymptoms(prevSymptoms => ({ ...prevSymptoms, [symptom]: severity }))
    if (severity === 'severe' && prev !== 'severe') {
      addToast('danger', `Severe ${symptom.toUpperCase()} Reported`, 'Clinical coordinator flagged severe symptom. Seek medical input.')
      sendWhatsAppNotification(`Severe ${symptom.toUpperCase()} Alert`, `You marked severe ${symptom} on your portal. Contact clinic.`)
    } else if (severity === 'none' && prev === 'severe') {
      addToast('success', `${symptom.toUpperCase()} Cleared`, 'Symptom resolved.')
    }
  }

  // Auth Wall
  if (!user) {
    return (
      <main className="dashboard-page auth-wall">
        <div className="auth-wall-card">
          <div className="auth-wall-icon">
            <Icon name="shield" size={48} />
          </div>
          <h2>Monitoring Dashboard is Locked</h2>
          <p>Please log in or create an account to access your personal dashboard, track kidney metrics, configure WhatsApp reminders, and generate clinical reports.</p>
          <div className="auth-wall-actions">
            <button className="login-btn-primary" onClick={() => showPage('login')}>Log In</button>
            <button className="signup-btn-secondary" onClick={() => showPage('signup')}>Sign Up</button>
          </div>
        </div>
      </main>
    )
  }

  // Calculate CKD stage dynamically from eGFR value
  const getStageInfo = (eGFRVal: number) => {
    if (eGFRVal >= 90) return { cat: 'G1', title: 'Stage G1', desc: 'Normal kidney function' }
    if (eGFRVal >= 60) return { cat: 'G2', title: 'Stage G2', desc: 'Mildly decreased kidney function' }
    if (eGFRVal >= 45) return { cat: 'G3a', title: 'Stage G3a', desc: 'Mildly to moderately decreased' }
    if (eGFRVal >= 30) return { cat: 'G3b', title: 'Stage G3b', desc: 'Moderately to severely decreased' }
    if (eGFRVal >= 15) return { cat: 'G4', title: 'Stage G4', desc: 'Severely decreased kidney function' }
    return { cat: 'G5', title: 'Stage G5', desc: 'Kidney failure range' }
  }

  const stage = getStageInfo(egfr)

  // Real-time local alerts calculation
  const getAlerts = () => {
    const alertsList: { type: 'danger' | 'warning' | 'info' | 'success'; title: string; message: string }[] = []

    // Blood Pressure alerts
    if (systolic >= 140 || diastolic >= 90) {
      alertsList.push({
        type: 'danger',
        title: 'Hypertension Alert',
        message: `Your current blood pressure is ${systolic}/${diastolic} mmHg (High). Limit sodium intake and consult your physician.`
      })
    } else if (systolic >= 130 || diastolic >= 80) {
      alertsList.push({
        type: 'warning',
        title: 'Elevated Blood Pressure',
        message: `Blood pressure is ${systolic}/${diastolic} mmHg. Maintain a low-salt diet and monitor daily.`
      })
    } else {
      alertsList.push({
        type: 'success',
        title: 'BP within Target Range',
        message: `Excellent blood pressure control (${systolic}/${diastolic} mmHg). Keep up the good work.`
      })
    }

    // eGFR alerts
    if (egfr < 60) {
      alertsList.push({
        type: 'danger',
        title: 'Decreased kidney function (eGFR < 60)',
        message: `eGFR of ${egfr} mL/min/1.73m² indicates impaired kidney clearance. Avoid NSAIDs and seek clinician review.`
      })
    } else {
      alertsList.push({
        type: 'info',
        title: 'eGFR in Stable Range',
        message: `eGFR at ${egfr} mL/min/1.73m² (${stage.title}) is currently stable.`
      })
    }

    // Creatinine alerts
    if (creatinine > 1.3) {
      alertsList.push({
        type: 'warning',
        title: 'Elevated Creatinine',
        message: `Creatinine of ${creatinine} mg/dL is higher than normal reference range (0.6-1.3 mg/dL).`
      })
    }

    // Urine ACR alerts
    if (uacr >= 30) {
      alertsList.push({
        type: 'warning',
        title: 'Microalbuminuria Detected',
        message: `Urine ACR is ${uacr} mg/g (Target: < 30 mg/g). Indicates early signs of kidney protein leakage.`
      })
    }

    // Symptom tracker notifications
    const severeSymptoms = Object.entries(symptoms).filter(([_, val]) => val === 'severe')
    if (severeSymptoms.length > 0) {
      alertsList.push({
        type: 'danger',
        title: 'Severe Symptoms Noted',
        message: `You reported severe ${severeSymptoms.map(([key]) => key).join(', ')}. Contact your doctor's office immediately.`
      })
    }

    return alertsList
  }

  const handleSaveWhatsapp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) {
      setWhatsappMsg('Please enter a valid phone number.')
      addToast('warning', 'Setup Failed', 'Enter a phone number to enable reminders.')
      return
    }
    setWhatsappSaving(true)
    setWhatsappMsg('')
    setTimeout(() => {
      setWhatsappSaving(false)
      setWhatsappEnabled(true)
      setWhatsappMsg(`WhatsApp reminders configured for ${phone}!`)
      addToast('success', 'WhatsApp Enabled', `Reminders linked to ${phone}.`)
    }, 1000)
  }

  const handleGenerateReport = () => {
    setGeneratingReport(true)
    setTimeout(() => {
      setGeneratingReport(false)
      setShowReportModal(true)
      addToast('success', 'Report Compiled', 'Clinical consultations summary generated successfully.')
    }, 1200)
  }

  // Simulated Reminder Triggers
  const triggerMedicationAlert = () => {
    if (!whatsappEnabled || !phone) {
      addToast('info', 'WhatsApp Config Needed', 'Please save your phone number to enable reminder testing.')
      return
    }
    sendWhatsAppNotification(
      'Medication Reminder',
      '💊 Daily Care: Time for your morning dose of Enalapril (BP) and Multivitamins. Take with water.'
    )
  }

  const triggerWaterAlert = () => {
    if (!whatsappEnabled || !phone) {
      addToast('info', 'WhatsApp Config Needed', 'Please save your phone number to enable reminder testing.')
      return
    }
    sendWhatsAppNotification(
      'Hydration Alert',
      '💧 Hydration check: Remember to drink 250ml of water. Total target: 1.8 liters today.'
    )
  }

  const triggerMealAlert = () => {
    if (!whatsappEnabled || !phone) {
      addToast('info', 'WhatsApp Config Needed', 'Please save your phone number to enable reminder testing.')
      return
    }
    sendWhatsAppNotification(
      'Dietary Planner',
      '🥗 Nutrition: Choose a low-sodium, low-potassium snack like an apple or half a cup of blueberries.'
    )
  }

  const liveAlerts = getAlerts()

  return (
    <main className="dashboard-page font-raleway animate-fade-in" style={{ position: 'relative' }}>
      {/* Ambient background glows */}
      <div className="db-glow-blob blob-1"></div>
      <div className="db-glow-blob blob-2"></div>
      <div className="db-glow-blob blob-3"></div>

      {/* Toast Notification HUD */}
      <div className="toast-hud-container" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-alert-card ${toast.type}`}>
            <div className="toast-hud-icon">
              <Icon 
                name={
                  toast.type === 'whatsapp' 
                    ? 'message' 
                    : toast.type === 'success' 
                      ? 'check' 
                      : 'alert'
                } 
                size={22} 
              />
            </div>
            <div className="toast-hud-content">
              <div className="toast-hud-title">{toast.title}</div>
              <div className="toast-hud-message">{toast.message}</div>
              {toast.action && (
                <a 
                  href={toast.action.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="toast-action-btn"
                >
                  {toast.action.label}
                </a>
              )}
            </div>
            <button 
              type="button"
              className="toast-hud-close" 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              aria-label="Close notification"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Header section */}
      <section className="dashboard-header animate-slide-up">
        <div className="db-welcome">
          <span className="eyebrow">Patient Portal</span>
          <h1>Welcome back, {user.name}</h1>
          <p className="db-welcome-subtitle">Here is your kidney health summary and clinical monitoring tracker for today.</p>
        </div>
        <div className="db-quick-stats">
          <div className="quick-badge-widget">
            <span className="q-label">Current Stage</span>
            <span className="q-val maroon-text">{stage.title}</span>
            <span className="q-trend green-text"><Icon name="check" size={14} /> Stable</span>
          </div>
          <div className="quick-badge-widget">
            <span className="q-label">Reminders</span>
            <span className="q-val">{whatsappEnabled ? 'Active' : 'Disabled'}</span>
            <span className={`q-trend ${whatsappEnabled ? 'green-text' : 'orange-text'}`}>
              {whatsappEnabled ? 'WhatsApp Ready' : 'Setup required'}
            </span>
          </div>
        </div>
      </section>

      {/* Main glass-panel grid layout (No cards) */}
      <div className="dashboard-grid">
        
        {/* Left column: Lab Metrics and Interactive Tuner */}
        <div className="dashboard-left-col">
          <div className="glass-panel main-metrics-panel animate-slide-up-delay-1">
            <div className="panel-header">
              <h2>Key Kidney Metrics</h2>
              <p>Values updated from your latest clinical reports. Adjust sliders to see warning alerts update.</p>
            </div>

            {/* Interactive sliders to simulate clinical changes */}
            <div className="metric-tuners">
              <div className="tuner-group">
                <div className="tuner-label">
                  <span>eGFR (Kidney Function)</span>
                  <strong className="maroon-text">{egfr} <small>mL/min</small></strong>
                </div>
                <input 
                  type="range" 
                  className="slider-egfr"
                  min="10" 
                  max="120" 
                  value={egfr} 
                  onChange={(e) => handleEgfrChange(Number(e.target.value))} 
                />
              </div>

              <div className="tuner-group">
                <div className="tuner-label">
                  <span>Serum Creatinine</span>
                  <strong className="maroon-text">{creatinine.toFixed(1)} <small>mg/dL</small></strong>
                </div>
                <input 
                  type="range" 
                  className="slider-creatinine"
                  min="0.4" 
                  max="8.0" 
                  step="0.1" 
                  value={creatinine} 
                  onChange={(e) => handleCreatinineChange(Number(e.target.value))} 
                />
              </div>

              <div className="tuner-group">
                <div className="tuner-label">
                  <span>Systolic Blood Pressure</span>
                  <strong className="maroon-text">{systolic} <small>mmHg</small></strong>
                </div>
                <input 
                  type="range" 
                  className="slider-systolic"
                  min="90" 
                  max="180" 
                  value={systolic} 
                  onChange={(e) => handleSystolicChange(Number(e.target.value))} 
                  title="Systolic"
                />
              </div>

              <div className="tuner-group">
                <div className="tuner-label">
                  <span>Diastolic Blood Pressure</span>
                  <strong className="maroon-text">{diastolic} <small>mmHg</small></strong>
                </div>
                <input 
                  type="range" 
                  className="slider-diastolic"
                  min="50" 
                  max="110" 
                  value={diastolic} 
                  onChange={(e) => handleDiastolicChange(Number(e.target.value))} 
                  title="Diastolic"
                />
              </div>

              <div className="tuner-group">
                <div className="tuner-label">
                  <span>Urine ACR (Albumin-to-Creatinine Ratio)</span>
                  <strong className="maroon-text">{uacr} <small>mg/g</small></strong>
                </div>
                <input 
                  type="range" 
                  className="slider-uacr"
                  min="10" 
                  max="300" 
                  step="5"
                  value={uacr} 
                  onChange={(e) => handleUacrChange(Number(e.target.value))} 
                />
              </div>
            </div>

            {/* Grid of readouts */}
            <div className="metrics-grid">
              <div className="metric-box-card">
                <div className="m-title">eGFR Function</div>
                <div className="m-value">{egfr}</div>
                <div className="m-unit">mL/min/1.73m²</div>
                <span className={`m-badge ${egfr >= 90 ? 'green-bg' : egfr >= 60 ? 'yellow-bg' : 'red-bg'}`}>
                  {egfr >= 90 ? 'Optimal' : egfr >= 60 ? 'Stage 2' : 'Stage 3+'}
                </span>
                <div className="m-spark">
                  <svg viewBox="0 0 100 25" width="100%" height="25">
                    <path d={`M 0 18 Q 25 ${22 - (egfr - 10)/5} 50 ${20 - (egfr - 10)/5} T 100 ${23 - (egfr - 10)/5}`} fill="none" stroke="var(--maroon)" strokeWidth="2" />
                    <circle cx="100" cy={23 - (egfr - 10)/5} r="3" fill="var(--maroon)" />
                  </svg>
                </div>
              </div>

              <div className="metric-box-card">
                <div className="m-title">Creatinine</div>
                <div className="m-value">{creatinine.toFixed(1)}</div>
                <div className="m-unit">mg/dL</div>
                <span className={`m-badge ${creatinine <= 1.3 ? 'green-bg' : 'red-bg'}`}>
                  {creatinine <= 1.3 ? 'Normal' : 'High'}
                </span>
                <div className="m-spark">
                  <svg viewBox="0 0 100 25" width="100%" height="25">
                    <path d={`M 0 10 Q 25 ${12 + creatinine} 50 ${10 + creatinine} T 100 ${8 + creatinine}`} fill="none" stroke="var(--green)" strokeWidth="2" />
                    <circle cx="100" cy={8 + creatinine} r="3" fill="var(--green)" />
                  </svg>
                </div>
              </div>

              <div className="metric-box-card">
                <div className="m-title">Blood Pressure</div>
                <div className="m-value">{systolic}/{diastolic}</div>
                <div className="m-unit">mmHg</div>
                <span className={`m-badge ${systolic < 130 && diastolic < 80 ? 'green-bg' : systolic >= 140 || diastolic >= 90 ? 'red-bg' : 'yellow-bg'}`}>
                  {systolic < 130 && diastolic < 80 ? 'Normal' : systolic >= 140 || diastolic >= 90 ? 'High' : 'Elevated'}
                </span>
                <div className="m-spark">
                  <svg viewBox="0 0 100 25" width="100%" height="25">
                    <path d="M 0 12 Q 25 15 50 10 T 100 12" fill="none" stroke="var(--blue)" strokeWidth="2" />
                    <circle cx="100" cy="12" r="3" fill="var(--blue)" />
                  </svg>
                </div>
              </div>

              <div className="metric-box-card">
                <div className="m-title">Urine ACR</div>
                <div className="m-value">{uacr}</div>
                <div className="m-unit">mg/g</div>
                <span className={`m-badge ${uacr < 30 ? 'green-bg' : 'red-bg'}`}>
                  {uacr < 30 ? 'Normal' : 'Microalbuminuria'}
                </span>
                <div className="m-spark">
                  <svg viewBox="0 0 100 25" width="100%" height="25">
                    <path d="M 0 16 Q 25 14 50 16 T 100 15" fill="none" stroke="var(--gold)" strokeWidth="2" />
                    <circle cx="100" cy="15" r="3" fill="var(--gold)" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Symptom Tracker */}
          <div className="glass-panel symptom-tracker-panel animate-slide-up-delay-2">
            <div className="panel-header">
              <h2>Symptom Tracker</h2>
              <p>Monitor your symptoms daily. High-risk symptoms trigger early warning clinical alerts.</p>
            </div>
            
            <div className="symptom-tracker-list">
              {Object.keys(symptoms).map(symptom => (
                <div className="symptom-row" key={symptom}>
                  <span className="symptom-name">{symptom.charAt(0).toUpperCase() + symptom.slice(1)}</span>
                  <div className="symptom-choices">
                    {(['none', 'mild', 'moderate', 'severe'] as const).map(sev => (
                      <button
                        type="button"
                        key={sev}
                        className={`symptom-choice-btn ${sev} ${symptoms[symptom] === sev ? 'active' : ''}`}
                        onClick={() => handleSymptomToggle(symptom, sev)}
                      >
                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Alerts, WhatsApp, and Reports */}
        <div className="dashboard-right-col">
          
          {/* WhatsApp Assistant Integration */}
          <div className="glass-panel whatsapp-panel animate-slide-up-delay-1">
            <div className="panel-header">
              <div className="wa-title-row">
                <Icon name="message" size={24} />
                <h2>WhatsApp Health Assistant</h2>
              </div>
              <p>Configure automated reminders on WhatsApp for your medication schedule, water intake, and appointment checkups.</p>
            </div>

            <form onSubmit={handleSaveWhatsapp} className="whatsapp-setup-form">
              <div className="form-group">
                <label htmlFor="wa-phone">Phone Number (with Country Code)</label>
                <input 
                  id="wa-phone"
                  type="tel" 
                  placeholder="e.g. +1 555-0199" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={whatsappSaving}
                />
              </div>
              <div className="reminder-options">
                <label className="checkbox-option">
                  <input type="checkbox" defaultChecked /> Medication Reminders (9:00 AM)
                </label>
                <label className="checkbox-option">
                  <input type="checkbox" defaultChecked /> Water Intake Reminders (Every 2 Hours)
                </label>
                <label className="checkbox-option">
                  <input type="checkbox" defaultChecked /> Diet & Meal Planner Notifications
                </label>
              </div>

              <button type="submit" className="whatsapp-save-btn" disabled={whatsappSaving}>
                {whatsappSaving ? 'Saving...' : whatsappEnabled ? 'Update Settings' : 'Enable WhatsApp Reminders'}
              </button>

              {whatsappMsg && (
                <p className={`whatsapp-status-msg ${whatsappEnabled ? 'success' : 'error'}`}>
                  {whatsappMsg}
                </p>
              )}
            </form>
          </div>

          {/* Interactive Reminders Testing Lab */}
          <div className="glass-panel testing-lab-panel animate-slide-up-delay-2">
            <div className="panel-header">
              <div className="wa-title-row">
                <Icon name="spark" size={24} />
                <h2>Care Notification Simulator</h2>
              </div>
              <p>Test the real-time WhatsApp alert and clinical notification pipelines instantly.</p>
            </div>
            <div className="testing-actions">
              <button type="button" className="test-btn btn-medication" onClick={triggerMedicationAlert}>
                <span className="btn-icon">💊</span>
                <span className="btn-text">Test Med Reminder</span>
              </button>
              <button type="button" className="test-btn btn-water" onClick={triggerWaterAlert}>
                <span className="btn-icon">💧</span>
                <span className="btn-text">Test Hydration Alert</span>
              </button>
              <button type="button" className="test-btn btn-diet" onClick={triggerMealAlert}>
                <span className="btn-icon">🥗</span>
                <span className="btn-text">Test Diet Suggestion</span>
              </button>
            </div>
          </div>

          {/* Early Warning Alerts */}
          <div className="glass-panel alerts-panel animate-slide-up-delay-2">
            <div className="panel-header">
              <h2>Early Warning Alerts</h2>
              <p>Calculated dynamically based on your blood pressure, symptoms, and lab results.</p>
            </div>
            <div className="alerts-list">
              {liveAlerts.length === 0 ? (
                <div className="empty-alerts">All systems optimal. No alerts active.</div>
              ) : (
                liveAlerts.map((alert, idx) => (
                  <div className={`alert-item-box ${alert.type}`} key={idx}>
                    <div className="alert-item-icon">
                      <Icon name={alert.type === 'danger' ? 'alert' : alert.type === 'warning' ? 'alert' : 'spark'} size={18} />
                    </div>
                    <div className="alert-item-body">
                      <strong>{alert.title}</strong>
                      <p>{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Doctor Summary Report */}
          <div className="glass-panel report-generator-panel animate-slide-up-delay-3">
            <div className="panel-header">
              <h2>Doctor Consultation Summary</h2>
              <p>Generate a professional clinical health summary with kidney stage, lab values, and symptom trend graphs for your doctor visit.</p>
            </div>
            <div className="report-action-block">
              <div className="report-preview-tiny">
                <Icon name="report" size={32} />
                <div>
                  <strong>NephroCare Clinical Summary</strong>
                  <span>Compiled: June 21, 2026</span>
                </div>
              </div>
              <button 
                type="button" 
                className="generate-report-btn"
                onClick={handleGenerateReport}
                disabled={generatingReport}
              >
                {generatingReport ? (
                  <>
                    <span className="spinner-inline"></span>
                    Compiling report details...
                  </>
                ) : (
                  'Generate Summary Report'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Report modal */}
      {showReportModal && (
        <div className="report-modal-overlay">
          <div className="report-modal-card">
            <div className="report-modal-header">
              <div className="modal-title">
                <Icon name="report" size={28} />
                <h2>NephroCare Patient Health Summary</h2>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowReportModal(false)}><Icon name="x" size={20} /></button>
            </div>

            <div className="report-modal-body printable-area">
              <div className="clinical-header-block">
                <div>
                  <h3>NephroCare Clinical Report</h3>
                  <p className="doc-disclaimer">For Clinical Review & Doctor Consultation Only</p>
                </div>
                <div className="clinical-meta">
                  <div><strong>Patient:</strong> {user.name}</div>
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>Report Date:</strong> June 21, 2026</div>
                </div>
              </div>

              <div className="clinical-section">
                <h4>1. Estimated Kidney Stage</h4>
                <div className="stage-readout-row">
                  <div className="stage-box">
                    <span className="stage-num">{stage.cat}</span>
                    <span className="stage-label">CKD Category</span>
                  </div>
                  <p>
                    <strong>Functional Status: </strong>
                    {stage.title} ({stage.desc}). eGFR is {egfr} mL/min/1.73m².
                  </p>
                </div>
              </div>

              <div className="clinical-section">
                <h4>2. Diagnostic Lab Metrics</h4>
                <table className="clinical-labs-table">
                  <thead>
                    <tr>
                      <th>Marker Name</th>
                      <th>Value</th>
                      <th>Reference Range</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>eGFR (Kidney Function)</td>
                      <td>{egfr} mL/min/1.73m²</td>
                      <td>&gt; 90 mL/min</td>
                      <td><span className={`status-tag ${egfr >= 60 ? 'normal' : 'abnormal'}`}>{egfr >= 60 ? 'Stable' : 'Decreased'}</span></td>
                    </tr>
                    <tr>
                      <td>Serum Creatinine</td>
                      <td>{creatinine.toFixed(1)} mg/dL</td>
                      <td>0.6 - 1.3 mg/dL</td>
                      <td><span className={`status-tag ${creatinine <= 1.3 ? 'normal' : 'abnormal'}`}>{creatinine <= 1.3 ? 'Normal' : 'High'}</span></td>
                    </tr>
                    <tr>
                      <td>Blood Pressure</td>
                      <td>{systolic}/{diastolic} mmHg</td>
                      <td>&lt; 120/80 mmHg</td>
                      <td><span className={`status-tag ${systolic < 130 && diastolic < 80 ? 'normal' : 'abnormal'}`}>{systolic < 130 && diastolic < 80 ? 'Optimal' : 'Elevated'}</span></td>
                    </tr>
                    <tr>
                      <td>Urine ACR</td>
                      <td>{uacr} mg/g</td>
                      <td>&lt; 30 mg/g</td>
                      <td><span className={`status-tag ${uacr < 30 ? 'normal' : 'abnormal'}`}>{uacr < 30 ? 'Normal' : 'Microalbuminuria'}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="clinical-section">
                <h4>3. Patient Reported Symptoms</h4>
                <div className="clinical-symptom-summary">
                  {Object.entries(symptoms).map(([name, val]) => (
                    <div className="sym-summary-item" key={name}>
                      <span className="name">{name.charAt(0).toUpperCase() + name.slice(1)}:</span>
                      <strong className={`val ${val === 'severe' ? 'red-text' : val === 'moderate' ? 'orange-text' : 'green-text'}`}>
                        {val.toUpperCase()}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="clinical-section">
                <h4>4. Clinical Recommendations</h4>
                <ul className="clinical-diet-bullets">
                  {egfr < 60 && <li>Follow a low-protein diet and restrict high-potassium foods.</li>}
                  {uacr >= 30 && <li>Strict blood pressure control is advised to minimize albuminuria progression.</li>}
                  <li>Sodium limit: &lt; 2,000 mg per day. Avoid processed and canned foods.</li>
                  <li>Maintain fluid intake steady at 1.5 - 2 liters unless dialysis restriction is indicated.</li>
                </ul>
              </div>
            </div>

            <div className="report-modal-footer no-print">
              <button type="button" className="btn-print-doc" onClick={() => window.print()}>Print / Save PDF</button>
              <button type="button" className="btn-close-modal" onClick={() => setShowReportModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
