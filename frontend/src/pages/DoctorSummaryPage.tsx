import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import type { Page } from '../types'
import '../styles/summary.css'

type DoctorSummaryPageProps = {
  showPage: (page: Page) => void
  user: { name: string; email: string } | null
}

export function DoctorSummaryPage({ showPage, user }: DoctorSummaryPageProps) {
  const [predictions, setPredictions] = useState<any[]>([])
  const [ultrasounds, setUltrasounds] = useState<any[]>([])
  const [symptoms, setSymptoms] = useState<any[]>([])

  useEffect(() => {
    try {
      const pred = JSON.parse(window.localStorage.getItem('nephrocare_predictions') || '[]')
      setPredictions(pred)
      const ultra = JSON.parse(window.localStorage.getItem('nephrocare_ultrasound_scans') || '[]')
      setUltrasounds(ultra)
      const symp = JSON.parse(window.localStorage.getItem('nephrocare_symptom_logs') || '[]')
      setSymptoms(symp)
    } catch (e) {
      console.warn('Error parsing local storage for summary', e)
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const latestPrediction = predictions.length > 0 ? predictions[0] : null
  const latestUltrasound = ultrasounds.length > 0 ? ultrasounds[0] : null
  const recentSymptoms = symptoms.slice(0, 3)

  return (
    <div className="summary-page-container">
      <div className="summary-card">
        <div className="no-print">
          <button className="btn-print" onClick={handlePrint} style={{ float: 'right' }}>
            <Icon name="file-text" size={16} /> Download PDF
          </button>
          <button onClick={() => showPage('dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
            &larr; Back to Dashboard
          </button>
        </div>
        
        <div className="summary-header">
          <h1>NephroCare Clinical Summary Report</h1>
          <p>Generated on {new Date().toLocaleDateString()} for Patient: <strong>{user ? user.name : 'Guest'}</strong></p>
        </div>

        <div className="summary-section">
          <h2><Icon name="activity" size={20} /> Latest Biomarker Prediction</h2>
          {latestPrediction ? (
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Date</div>
                <div className="summary-value">{new Date(latestPrediction.timestamp).toLocaleDateString()}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">eGFR</div>
                <div className="summary-value">{latestPrediction.egfr} mL/min/1.73m²</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">CKD Risk</div>
                <div className="summary-value">{latestPrediction.risk_percentage}%</div>
              </div>
              <div className="summary-item" style={{ gridColumn: '1 / -1' }}>
                <div className="summary-label">Key Metrics</div>
                <div className="summary-value" style={{ fontSize: '14px', fontWeight: 'normal' }}>
                  Creatinine: {latestPrediction.creatinine} mg/dL | UACR: {latestPrediction.uacr} mg/g | BP: {latestPrediction.blood_pressure} mmHg
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No clinical predictions recorded.</p>
          )}
        </div>

        <div className="summary-section">
          <h2><Icon name="camera" size={20} /> Ultrasound Diagnostics</h2>
          {latestUltrasound ? (
            <div>
              <div className="summary-grid">
                <div className="summary-item">
                  <div className="summary-label">Date</div>
                  <div className="summary-value">{new Date(latestUltrasound.timestamp).toLocaleDateString()}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Severity</div>
                  <div className="summary-value" style={{ color: latestUltrasound.severity === 'High' ? 'var(--maroon)' : 'inherit' }}>{latestUltrasound.severity}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Quality</div>
                  <div className="summary-value">{latestUltrasound.image_quality}</div>
                </div>
              </div>
              
              <div style={{ marginTop: '16px' }}>
                <div className="summary-label">Key Observations</div>
                <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '14px', color: '#334155' }}>
                  {latestUltrasound.observations?.map((obs: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{obs}</li>
                  ))}
                </ul>
              </div>

              {latestUltrasound.image_url && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <img src={latestUltrasound.image_url} alt="Ultrasound Scan" className="summary-image" />
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No ultrasound scans recorded.</p>
          )}
        </div>

        <div className="summary-section" style={{ marginBottom: 0 }}>
          <h2><Icon name="clipboard" size={20} /> Recent Patient Symptoms</h2>
          {recentSymptoms.length > 0 ? (
            <div className="summary-grid">
              {recentSymptoms.map((symp: any, idx: number) => (
                <div key={idx} className="summary-item">
                  <div className="summary-label">{new Date(symp.timestamp).toLocaleDateString()}</div>
                  <div className="summary-value" style={{ fontSize: '15px' }}>{symp.symptom}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Severity: {symp.severity}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No symptoms reported recently.</p>
          )}
        </div>
        
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          Disclaimer: This report aggregates user-inputted data and AI screening support. It is not a formal medical diagnosis. Professional medical interpretation is required.
        </div>
      </div>
    </div>
  )
}
