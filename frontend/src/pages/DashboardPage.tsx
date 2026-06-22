import { useState, useEffect, useMemo } from 'react'
import { Icon } from '../components/Icon'
import type { Page, PredictionResult, PredictionForm, MealPlanResponse, FoodAnalysis, FoodScanResponse, UltrasoundScanResult } from '../types'
import type { FoodTab } from './FoodToolsPage'
import { API_BASE_URL } from '../constants'
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Local storage hook
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

interface PredictionHistory {
  timestamp: string;
  egfr: number;
  creatinine: number;
  uacr: number;
  blood_pressure: number;
  blood_urea: number;
  sodium: number;
  potassium: number;
  hemoglobin: number;
  risk_percent: number;
  stage: string;
}

interface UltrasoundHistory {
  timestamp: string;
  severity: string;
  image_quality: string;
  kidney_size_mm?: number;
  cortical_thickness_mm?: number;
  observations: string[];
  recommendation: string;
  image_url?: string;
}

interface SymptomLog {
  timestamp: string;
  fatigue: 'none' | 'mild' | 'moderate' | 'severe';
  swelling: 'none' | 'mild' | 'moderate' | 'severe';
  nausea: 'none' | 'mild' | 'moderate' | 'severe';
  appetite: 'none' | 'mild' | 'moderate' | 'severe';
  urination: 'none' | 'mild' | 'moderate' | 'severe';
}

interface FoodCheckLog {
  timestamp: string;
  food_name: string;
  safety_status: string;
  category: string;
}

interface WhatsAppLog {
  timestamp: string;
  title: string;
  message: string;
  status: string;
}

type DashboardPageProps = {
  user: { name: string; email: string } | null
  showPage: (page: Page) => void
  predictionResult?: PredictionResult | null
  predictionForm?: PredictionForm
  mealPlan?: MealPlanResponse | null
  checkFood?: any
  foodCheck?: FoodAnalysis | null
  foodScan?: FoodScanResponse | null
  ultrasoundResult?: UltrasoundScanResult | null
  ultrasoundMetrics?: any
  setFoodTab?: (tab: FoodTab) => void
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

// Trend Line Chart Component
const SparkLine = ({ data, color, height = 40, label }: { data: number[], color: string, height?: number, label: string }) => {
  if (data.length < 2) return <div className="empty-chart">Not enough data to plot {label}</div>;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const padding = 5;
  const w = 200;
  const h = height - padding * 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - padding - ((d - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="sparkline-container">
      <div className="sparkline-label">{label}</div>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
      <div className="sparkline-value-range">
        <span>{data[data.length - 1].toFixed(1)}</span>
      </div>
    </div>
  );
};

export function DashboardPage({ 
  user, 
  showPage, 
  predictionResult, 
  predictionForm,
  mealPlan,
  checkFood,
  foodCheck,
  foodScan,
  ultrasoundResult,
  ultrasoundMetrics,
  setFoodTab,
  addToast
}: DashboardPageProps) {
  // Histories
  const [predictions] = useLocalStorage<PredictionHistory[]>('nephrocare_predictions', [])
  const [ultrasounds] = useLocalStorage<UltrasoundHistory[]>('nephrocare_ultrasound_scans', [])
  const [symptomLogs, setSymptomLogs] = useLocalStorage<SymptomLog[]>('nephrocare_symptom_logs', [])
  const [foodChecks, setFoodChecks] = useLocalStorage<FoodCheckLog[]>('nephrocare_food_checks', [])
  const sendWhatsAppNotification = async (title: string, message: string) => {
    const whatsappEnabled = JSON.parse(window.localStorage.getItem('nephrocare_whatsapp_enabled') || 'false');
    const phoneRaw = window.localStorage.getItem('nephrocare_phone') || '';
    const phone = phoneRaw.replace(/"/g, ''); // Fix json stringified quotes if any
    
    if (!whatsappEnabled || !phone) {
      return;
    }

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
        addToast('whatsapp', 'WhatsApp Alert Sent', `📱 Sent to ${phone}: ${title}`)
        const wLogs = JSON.parse(window.localStorage.getItem('nephrocare_whatsapp_history') || '[]');
        window.localStorage.setItem('nephrocare_whatsapp_history', JSON.stringify([{ timestamp: new Date().toISOString(), title, message, status: 'Sent' }, ...wLogs].slice(0, 50)));
      } else {
        addToast(
          'whatsapp',
          'WhatsApp Simulated',
          `📱 [Simulated to ${phone}]: ${title}`,
          data.whatsapp_web_url ? { label: 'Send via WhatsApp Web', url: data.whatsapp_web_url } : undefined
        )
        const wLogs = JSON.parse(window.localStorage.getItem('nephrocare_whatsapp_history') || '[]');
        window.localStorage.setItem('nephrocare_whatsapp_history', JSON.stringify([{ timestamp: new Date().toISOString(), title, message, status: 'Simulated' }, ...wLogs].slice(0, 50)));
      }
    } catch (err) {
      console.error('Error dispatching WhatsApp alert:', err)
      const cleanPhone = phone.replace(/[^\d]/g, '')
      const webUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(`🔔 NephroCare Alert\n\n*${title}*\n${message}`)}`
      addToast(
        'whatsapp',
        'WhatsApp Simulated',
        `📱 [Simulated to ${phone}]: ${title}`,
        { label: 'Send via WhatsApp Web', url: webUrl }
      )
      const wLogs = JSON.parse(window.localStorage.getItem('nephrocare_whatsapp_history') || '[]');
      window.localStorage.setItem('nephrocare_whatsapp_history', JSON.stringify([{ timestamp: new Date().toISOString(), title, message, status: 'Failed' }, ...wLogs].slice(0, 50)));
    }
  }

  // Symptom handling
  const latestSymptoms = symptomLogs[0] || { fatigue: 'none', swelling: 'none', nausea: 'none', appetite: 'none', urination: 'none' };
  const handleSymptomChange = (symptom: keyof Omit<SymptomLog, 'timestamp'>, severity: 'none' | 'mild' | 'moderate' | 'severe') => {
    const newLog: SymptomLog = {
      ...latestSymptoms,
      timestamp: new Date().toISOString(),
      [symptom]: severity
    };
    setSymptomLogs([newLog, ...symptomLogs]);
    if (severity === 'severe') {
      sendWhatsAppNotification(`Severe ${symptom.toUpperCase()}`, `You logged severe ${symptom}. Please contact your clinical coordinator immediately.`);
    }
  }

  // Quick Food Check inside Dashboard
  const [quickFoodQuery, setQuickFoodQuery] = useState('');
  const [quickFoodChecking, setQuickFoodChecking] = useState(false);
  const handleQuickFoodCheck = async () => {
    if (!quickFoodQuery.trim()) return;
    setQuickFoodChecking(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/check-food?query=${encodeURIComponent(quickFoodQuery)}`)
      if (res.ok) {
        const data = await res.json();
        const topFood = data.analyses?.[0];
        if (topFood) {
          const newLog: FoodCheckLog = {
            timestamp: new Date().toISOString(),
            food_name: topFood.food_name,
            safety_status: topFood.status,
            category: topFood.category
          };
          setFoodChecks([newLog, ...foodChecks]);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setQuickFoodChecking(false);
    setQuickFoodQuery('');
  }

  if (!user) {
    return (
      <main className="dashboard-page auth-wall">
        <div className="auth-wall-card">
          <div className="auth-wall-icon">
            <Icon name="shield" size={48} />
          </div>
          <h2>Monitoring Dashboard is Locked</h2>
          <p>Please log in or create an account to access your personal dashboard.</p>
          <div className="auth-wall-actions">
            <button className="login-btn-primary" onClick={() => showPage('login')}>Log In</button>
            <button className="signup-btn-secondary" onClick={() => showPage('signup')}>Sign Up</button>
          </div>
        </div>
      </main>
    )
  }

  const latestPrediction = predictions[0];
  const latestUltrasound = ultrasounds[0];

  return (
    <main className="dashboard-page">

      <header className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="dashboard-badge">PATIENT PORTAL</span>
            <h1>Welcome back, {user.name}</h1>
            <p>Here is your unified kidney health summary and clinical monitoring tracker.</p>
          </div>
          <div>
            <button className="login-btn-primary" onClick={() => showPage('doctor-summary')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="file-text" size={16} /> Generate Doctor Report
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">


        {/* 1. CKD Risk Prediction */}
        <section className="dash-card feature-card">
          <div className="card-header">
            <Icon name="activity" size={20} />
            <h3>CKD Risk Prediction</h3>
          </div>
          <div className="card-body">
            {latestPrediction ? (
              <div className="risk-display" style={{textAlign: 'center'}}>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Risk', value: latestPrediction.risk_percent },
                        { name: 'Safe', value: 100 - latestPrediction.risk_percent }
                      ]}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#9F1239" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{marginTop: '-25px', fontWeight: 800, fontSize: '24px', color: '#9F1239'}}>
                  {latestPrediction.risk_percent.toFixed(1)}%
                </div>
                <div style={{marginTop: '16px'}}>
                  <p>Assessed on: {new Date(latestPrediction.timestamp).toLocaleDateString()}</p>
                  <button className="btn-secondary" onClick={() => showPage('ckd-prediction')} style={{width: '100%', marginTop: '8px'}}>Run New Prediction</button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Run the AI risk check to predict your kidney function stage.</p>
                <button className="btn-primary" onClick={() => showPage('ckd-prediction')} style={{marginTop: '12px'}}>Start Prediction</button>
              </div>
            )}
          </div>
        </section>

        {/* 2. CKD Stage Screening */}
        <section className="dash-card feature-card">
          <div className="card-header">
            <Icon name="activity" size={20} />
            <h3>CKD Stage Screening</h3>
          </div>
          <div className="card-body">
            {latestPrediction ? (
              <div className="stage-display">
                <div className="stage-metric" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
                  <div>
                    <span className="stage-value" style={{fontSize: '32px', fontWeight: 800, color: '#9F1239'}}>{latestPrediction.stage}</span>
                    <span className="stage-label" style={{display: 'block', fontSize: '14px', color: '#64748b'}}>Current Stage</span>
                  </div>
                  <div style={{textAlign: 'right', fontSize: '14px', color: '#64748b'}}>
                    <div>eGFR: <strong>{latestPrediction.egfr}</strong></div>
                    <div>ACR: <strong>{latestPrediction.uacr}</strong></div>
                  </div>
                </div>
                {predictions.length >= 2 && (
                  <div style={{marginTop: '16px'}}>
                    <div style={{fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase'}}>Stage Evolution</div>
                    <ResponsiveContainer width="100%" height={80}>
                      <AreaChart data={[...predictions].reverse()}>
                        <defs>
                          <linearGradient id="colorEgfr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="egfr" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEgfr)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <p>Assessment Required to determine clinical stage.</p>
                <button className="btn-primary" onClick={() => showPage('ckd-prediction')} style={{marginTop: '12px'}}>Screen Stage</button>
              </div>
            )}
          </div>
        </section>

        {/* 4. Ultrasound Analysis */}
        <section className="dash-card feature-card">
          <div className="card-header">
            <Icon name="activity" size={20} />
            <h3>Ultrasound Analysis</h3>
          </div>
          <div className="card-body">
            {latestUltrasound ? (
              <div className="ultrasound-display">
                {latestUltrasound.image_url && <img src={latestUltrasound.image_url} alt="Scan" className="scan-thumb" />}
                <div>Severity: <strong>{latestUltrasound.severity}</strong></div>
                <div>Size: {latestUltrasound.kidney_size_mm || '--'} mm</div>
                <div>Thickness: {latestUltrasound.cortical_thickness_mm || '--'} mm</div>
                <button className="btn-secondary" onClick={() => showPage('ultrasound')}>View Details</button>
              </div>
            ) : (
              <div className="empty-state">
                <p>No Ultrasound Scans analyzed. Screen kidney structural markers with the AI scan tool.</p>
                <button className="btn-primary" onClick={() => showPage('ultrasound')}>Upload Scan</button>
              </div>
            )}
          </div>
        </section>

        {/* 3. Lab Report Analysis */}
        <section className="dash-card feature-card col-span-2">
          <div className="card-header">
            <Icon name="file-text" size={20} />
            <h3>Recent Lab Values</h3>
          </div>
          <div className="card-body">
            {latestPrediction ? (
              <div className="lab-grid">
                <div className={`lab-item ${latestPrediction.creatinine > 1.3 ? 'danger' : 'normal'}`}>
                  <span>Creatinine</span>
                  <strong>{latestPrediction.creatinine} mg/dL</strong>
                </div>
                <div className={`lab-item ${latestPrediction.potassium > 5.1 ? 'danger' : 'normal'}`}>
                  <span>Potassium</span>
                  <strong>{latestPrediction.potassium} mmol/L</strong>
                </div>
                <div className={`lab-item ${latestPrediction.sodium < 135 || latestPrediction.sodium > 145 ? 'warning' : 'normal'}`}>
                  <span>Sodium</span>
                  <strong>{latestPrediction.sodium} mEq/L</strong>
                </div>
                <div className="lab-item normal">
                  <span>Hemoglobin</span>
                  <strong>{latestPrediction.hemoglobin} g/dL</strong>
                </div>
                <div className="lab-item normal">
                  <span>Blood Urea</span>
                  <strong>{latestPrediction.blood_urea} mg/dL</strong>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No Lab Reports uploaded yet. Upload a PDF clinical lab report to autofill your metrics.</p>
                <button className="btn-primary" onClick={() => showPage('ckd-prediction')}>Upload Report</button>
              </div>
            )}
          </div>
        </section>



        {/* 6. Food Recommendation Engine */}
        <section className="dash-card feature-card">
          <div className="card-header">
            <Icon name="heart" size={20} />
            <h3>Food Recommendations</h3>
          </div>
          <div className="card-body">
            {latestPrediction ? (
              <div className="recommendations-display">
                <p>Tailored for Stage: <strong>{latestPrediction.stage}</strong></p>
                <div className="rec-box safe">
                  <strong>Recommended:</strong> Apples, Blueberries, Cabbage
                </div>
                <div className="rec-box avoid">
                  <strong>Limit/Avoid:</strong> Bananas, High-potassium dal, Processed meats
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Please complete a CKD prediction to view tailored food recommendations.</p>
                <button className="btn-primary" onClick={() => showPage('ckd-prediction')}>Find Stage</button>
              </div>
            )}
          </div>
        </section>

        {/* 7. AI Meal Planner */}
        <section className="dash-card feature-card">
          <div className="card-header">
            <Icon name="calendar" size={20} />
            <h3>AI Meal Planner</h3>
          </div>
          <div className="card-body">
            {mealPlan ? (
              <div className="meal-plan-display">
                <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                  <div style={{flex: 1}}>
                    <div className="meal-row"><strong>Breakfast:</strong> {mealPlan.breakfast.map(f => f.food_name).join(', ')}</div>
                    <div className="meal-row"><strong>Lunch:</strong> {mealPlan.lunch.map(f => f.food_name).join(', ')}</div>
                    <div className="meal-row"><strong>Dinner:</strong> {mealPlan.dinner.map(f => f.food_name).join(', ')}</div>
                  </div>
                  <div style={{width: '120px', height: '120px'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Protein', value: [...mealPlan.breakfast, ...mealPlan.lunch, ...mealPlan.dinner].reduce((acc, curr) => acc + (curr.protein_g || 0), 0) },
                            { name: 'Potassium', value: [...mealPlan.breakfast, ...mealPlan.lunch, ...mealPlan.dinner].reduce((acc, curr) => acc + (curr.potassium_mg || 0), 0) / 10 },
                            { name: 'Phosphorus', value: [...mealPlan.breakfast, ...mealPlan.lunch, ...mealPlan.dinner].reduce((acc, curr) => acc + (curr.phosphorus_mg || 0), 0) / 10 }
                          ]}
                          innerRadius={30}
                          outerRadius={50}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#0ea5e9" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => { if(setFoodTab) setFoodTab('plan'); showPage('food-tools'); }} style={{marginTop: '16px', width: '100%'}}>View Full Plan</button>
              </div>
            ) : (
              <div className="empty-state">
                <p>Generate a kidney-safe meal plan adjusted for your kidney stage.</p>
                <button className="btn-primary" onClick={() => { if(setFoodTab) setFoodTab('plan'); showPage('food-tools'); }} style={{marginTop: '12px'}}>Generate Plan</button>
              </div>
            )}
          </div>
        </section>



        {/* 8. Symptom Tracker */}
        <section className="dash-card feature-card col-span-3">
          <div className="card-header">
            <Icon name="activity" size={20} />
            <h3>Symptom Tracker</h3>
          </div>
          <div className="card-body">
            <div className="symptom-toggles">
              {['fatigue', 'swelling', 'nausea', 'appetite', 'urination'].map((symp) => {
                const symptomKey = symp as keyof Omit<SymptomLog, 'timestamp'>;
                const currentSeverity = latestSymptoms[symptomKey];
                return (
                  <div key={symp} className="symptom-row">
                    <span className="symptom-name">{symp.charAt(0).toUpperCase() + symp.slice(1)}</span>
                    <div className="severity-selector">
                      {['none', 'mild', 'moderate', 'severe'].map(sev => (
                        <button 
                          key={sev}
                          className={`severity-btn ${currentSeverity === sev ? 'active ' + sev : ''}`}
                          onClick={() => handleSymptomChange(symptomKey, sev as any)}
                        >
                          {sev.charAt(0).toUpperCase() + sev.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 11. Doctor Summary */}
        <section className="dash-card feature-card col-span-3">
          <div className="card-header">
            <Icon name="file-text" size={20} />
            <h3>Doctor Summary</h3>
          </div>
          <div className="card-body">
            {latestPrediction ? (
              <div className="doc-summary">
                <p>Generate a comprehensive PDF consultation report based on your latest metrics.</p>
                <button className="btn-primary" onClick={() => alert('PDF generation initiated.')}>Download Report</button>
              </div>
            ) : (
              <div className="empty-state">
                <p>Complete prediction check to unlock consultation reports.</p>
              </div>
            )}
          </div>
        </section>

        {/* 12. Monitoring Dashboard Analytics */}
        <section className="dash-card feature-card col-span-3">
          <div className="card-header">
            <Icon name="activity" size={20} />
            <h3>Health Trend Analytics</h3>
          </div>
          <div className="card-body">
            {predictions.length >= 2 ? (
              <div style={{display: 'flex', gap: '32px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '300px'}}>
                  <h4 style={{marginBottom: '16px', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px'}}>Risk Percentage Trend</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={[...predictions].reverse()}>
                      <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleDateString()} stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip labelFormatter={(t) => new Date(t).toLocaleDateString()} cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="risk_percent" fill="url(#colorRisk)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{flex: 1, minWidth: '300px'}}>
                  <h4 style={{marginBottom: '16px', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px'}}>Creatinine Levels</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={[...predictions].reverse()}>
                      <defs>
                        <linearGradient id="colorCreatinine" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleDateString()} stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip labelFormatter={(t) => new Date(t).toLocaleDateString()} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="creatinine" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCreatinine)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{gridColumn: '1 / -1'}}>
                <p>Analytics require at least 2 entries in your health logs to plot trends. Currently tracking {predictions.length} predictions.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  )
}
