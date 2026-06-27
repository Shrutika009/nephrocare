import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/Icon'
import { API_BASE_URL } from '../constants'
import { Page, PredictionForm } from '../types'

type Message = {
  role: 'user' | 'assistant'
  content: string
  assessment?: string
  explanation?: string
  educational_information?: string
  kidney_specific_guidance?: string
  questions_for_nephrologist?: string[]
  references?: string[]
  emergency_detected?: boolean
  timestamp: string
}

interface ChatbotPageProps {
  showPage: (page: Page) => void
  user: { name: string; email: string } | null
  form: PredictionForm
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬಿ)' },
  { code: 'ur', name: 'Urdu (اردو)' }
]

const QUICK_REPLIES = [
  "What foods should I avoid with high potassium?",
  "What is the normal range of eGFR?",
  "What does Stage 3 Chronic Kidney Disease mean?",
  "Can I take ibuprofen if I have kidney issues?"
]

export function ChatbotPage({ showPage, user, form }: ChatbotPageProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${user ? user.name : 'there'}! I am your AI Nephrology Assistant. I can explain kidney functions, KDIGO guidelines, evaluate lab results, check drug safety, and answer your kidney-health questions. How can I support you today?`,
      assessment: `Hello ${user ? user.name : 'there'}! I am your AI Nephrology Assistant. I can explain kidney functions, KDIGO guidelines, evaluate lab results, check drug safety, and answer your kidney-health questions. How can I support you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  
  // Custom context editable state
  const [customAge, setCustomAge] = useState<string>(form.age ? form.age.toString() : '48')
  const [customGender, setCustomGender] = useState<string>(form.sex || 'female')
  const [customEgfr, setCustomEgfr] = useState<string>('60')
  const [customCreatinine, setCustomCreatinine] = useState<string>(form.serum_creatinine ? form.serum_creatinine.toString() : '1.2')
  const [customPotassium, setCustomPotassium] = useState<string>(form.potassium ? form.potassium.toString() : '4.4')
  const [customSodium, setCustomSodium] = useState<string>(form.sodium ? form.sodium.toString() : '138')
  const [customMedications, setCustomMedications] = useState<string>('')
  const [customComorbidities, setCustomComorbidities] = useState<string>('')

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build patient context object
    const patientContext = {
      user_id: user ? user.email : 'anonymous',
      age: parseInt(customAge) || undefined,
      gender: customGender,
      current_egfr: parseFloat(customEgfr) || undefined,
      current_creatinine: parseFloat(customCreatinine) || undefined,
      current_potassium: parseFloat(customPotassium) || undefined,
      current_sodium: parseFloat(customSodium) || undefined,
      medications: customMedications.split(',').map(m => m.trim()).filter(m => m !== ''),
      comorbidities: customComorbidities.split(',').map(c => c.trim()).filter(c => c !== '')
    }

    // Build conversation history in format required by api
    const history = messages.slice(1).map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          language: selectedLang,
          history: history,
          patient_context: patientContext
        })
      })

      if (!response.ok) {
        throw new Error('API server returned an error.')
      }

      const data = await response.json()
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.assessment,
        assessment: data.assessment,
        explanation: data.explanation,
        educational_information: data.educational_information,
        kidney_specific_guidance: data.kidney_specific_guidance,
        questions_for_nephrologist: data.questions_for_nephrologist || [],
        references: data.references || [],
        emergency_detected: data.emergency_detected,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      console.error(error)
      const errorMsg: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error communicating with the AI server. Please make sure the backend server is running and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wearable-page-container" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', minHeight: 'calc(100vh - 120px)' }}>
      {/* LEFT COLUMN: Main Chat Interface */}
      <div className="wearable-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#083b66', margin: 0, fontSize: '22px' }}>
              <span style={{ color: 'var(--blue)', display: 'inline-flex' }}><Icon name="activity" size={24} /></span>
              AI Nephrology Assistant
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              KDIGO-compliant medical support. (Education only, not diagnostics)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Language:</label>
            <select
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', cursor: 'pointer', background: 'white' }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Safety Warning */}
        <div style={{ background: '#fffbeb', borderLeft: '4px solid #d97706', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ color: '#d97706', marginTop: '2px', display: 'inline-flex' }}><Icon name="alert" size={18} /></span>
          <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.5 }}>
            <strong>Safety Disclaimer:</strong> This assistant is designed to provide health education and references to standard nephrology guidelines. It does not replace professional medical evaluations. **In case of emergency symptoms (difficulty breathing, chest pain), go to the nearest emergency room immediately.**
          </div>
        </div>

        {/* Chat Balloon History */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px', marginBottom: '16px', minHeight: '350px', maxHeight: '550px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%',
                background: msg.role === 'user' ? 'var(--blue)' : '#f8fafc',
                color: msg.role === 'user' ? 'white' : '#0f172a',
                padding: '16px',
                borderRadius: '16px',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                {/* Standard Message content */}
                <div style={{ fontSize: '14.5px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {msg.content}
                </div>

                {/* Structured Medical Breakdown (Assistant responses only) */}
                {msg.role === 'assistant' && (msg.explanation || msg.kidney_specific_guidance || (msg.questions_for_nephrologist && msg.questions_for_nephrologist.length > 0)) && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {msg.explanation && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '2px' }}>Clinical Explanation</div>
                        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>{msg.explanation}</div>
                      </div>
                    )}

                    {msg.educational_information && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', marginBottom: '2px' }}>Educational Context</div>
                        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>{msg.educational_information}</div>
                      </div>
                    )}

                    {msg.kidney_specific_guidance && (
                      <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--green)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '2px' }}>Kidney Nutrition & Lifestyle Guidance</div>
                        <div style={{ fontSize: '13px', color: '#14532d', lineHeight: 1.5 }}>{msg.kidney_specific_guidance}</div>
                      </div>
                    )}

                    {msg.questions_for_nephrologist && msg.questions_for_nephrologist.length > 0 && (
                      <div style={{ background: '#f0f9ff', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--blue)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>Questions for your Doctor</div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#0c4a6e', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {msg.questions_for_nephrologist.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {msg.references && msg.references.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong>References:</strong>
                        <ul style={{ margin: 0, paddingLeft: '14px' }}>
                          {msg.references.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '10px', opacity: 0.6 }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: '#f1f5f9', padding: '12px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span className="pulsing-kidney" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} />
                AI is compiling guidelines context...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick replies */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {QUICK_REPLIES.map((reply, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(reply)}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12.5px',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="quick-reply-chip"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input box */}
        <form onSubmit={e => { e.preventDefault(); handleSendMessage(input) }} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            disabled={loading}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about guidelines, potassium levels, drug safety, stage details..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: 'var(--blue)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Send
            <Icon name="arrow" size={16} />
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Interactive Patient Context Dashboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <section className="wearable-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#083b66', margin: '0 0 16px', fontSize: '18px' }}>
            <span style={{ color: 'var(--green)', display: 'inline-flex' }}><Icon name="file-text" size={20} /></span>
            Active Patient Context
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
            Configure metrics below to customize the AI assistant's advice to your specific vitals/CKD stage.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Age</label>
                <input
                  type="number"
                  value={customAge}
                  onChange={e => setCustomAge(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gender</label>
                <select
                  value={customGender}
                  onChange={e => setCustomGender(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>eGFR (mL/min)</label>
                <input
                  type="number"
                  value={customEgfr}
                  onChange={e => setCustomEgfr(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Creatinine (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customCreatinine}
                  onChange={e => setCustomCreatinine(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Potassium (mmol/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customPotassium}
                  onChange={e => setCustomPotassium(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Sodium (mmol/L)</label>
                <input
                  type="number"
                  value={customSodium}
                  onChange={e => setCustomSodium(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Active Medications (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Lisinopril, Atorvastatin"
                value={customMedications}
                onChange={e => setCustomMedications(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Comorbidities (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Hypertension, Diabetes Type 2"
                value={customComorbidities}
                onChange={e => setCustomComorbidities(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>
        </section>

        <section className="wearable-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #f7fbff 0%, #ffffff 100%)' }}>
          <h4 style={{ margin: '0 0 8px', color: '#0369a1', fontSize: '14px' }}>Multilingual Nephrology Model</h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#38bdf8', lineHeight: 1.5 }}>
            Our model has full RAG semantic guidelines querying and is dynamically optimized for 11 regional Indian languages to aid low-literacy or remote patients.
          </p>
        </section>
      </div>
    </div>
  )
}
