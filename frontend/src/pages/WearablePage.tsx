import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import { API_BASE_URL } from '../constants'
import type { TelemetryData, WearableResponse } from '../types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface PinDetail {
  pin: string
  label: string
  sensor: string
  proxy: string
  voltage: string
  description: string
}

const PIN_DETAILS: Record<string, PinDetail> = {
  'G34': {
    pin: 'GPIO 34',
    label: 'Analog Input',
    sensor: 'AD8232 ECG AFE',
    proxy: 'Cardiac Electrical Pattern',
    voltage: '3.3V Analog',
    description: 'Reads cardiac electrical activity. The AI Risk Engine tracks the ratio of T-wave amplitude relative to QRS amplitude to flag potential peaked T-wave anomalies (T/QRS > 0.50), indicating early ECG changes associated with hyperkalemia.'
  },
  'G25': {
    pin: 'GPIO 25',
    label: 'Lead-off Detect +',
    sensor: 'AD8232 ECG AFE',
    proxy: 'Skin Contact State (LO+)',
    voltage: '3.3V Digital',
    description: 'Signals whether the positive ECG electrode pad has detached from the patient\'s chest.'
  },
  'G26': {
    pin: 'GPIO 26',
    label: 'Lead-off Detect -',
    sensor: 'AD8232 ECG AFE',
    proxy: 'Skin Contact State (LO-)',
    voltage: '3.3V Digital',
    description: 'Signals whether the negative ECG electrode pad has detached from the patient\'s chest.'
  },
  'G21': {
    pin: 'GPIO 21',
    label: 'I2C SDA',
    sensor: 'MAX30102 PPG',
    proxy: 'HR, HRV, SpO₂',
    voltage: '3.3V Digital',
    description: 'Serial Data line for the optical PPG sensor. Monitors heartbeat micro-variability (HRV) to flag sympathetic kidney stress signals.'
  },
  'G22': {
    pin: 'GPIO 22',
    label: 'I2C SCL',
    sensor: 'MAX30102 PPG',
    proxy: 'I2C Clock Line',
    voltage: '3.3V Digital',
    description: 'Serial Clock line synchronizing optical pulse data transfers between the MAX30102 and the ESP32.'
  },
  'G4': {
    pin: 'GPIO 4',
    label: '1-Wire Bus',
    sensor: 'DS18B20 Temp',
    proxy: 'Skin Temperature',
    voltage: '3.3V (Needs 4.7kΩ Pull-up)',
    description: 'Monitors micro-temperature fluctuations. Pairs with bioimpedance to distinguish between normal sweating/exertion and systemic retention inflammation.'
  },
  'G35': {
    pin: 'GPIO 35',
    label: 'ADC Input',
    sensor: 'Ag/AgCl Electrodes',
    proxy: 'Sweat Conductivity',
    voltage: '3.3V Analog',
    description: 'Tracks sweat electrolyte levels (Na⁺/K⁺ proxy). Rising sweat conductivity is flagged as an early-stage dehydration and ion leakage indicator.'
  },
  'G32': {
    pin: 'GPIO 32',
    label: 'I2C SDA (Bio)',
    sensor: 'AD5933 AFE',
    proxy: 'Fluid Status / Impedance',
    voltage: '3.3V Digital',
    description: 'SDA connection for the impedance analyzer. Lower impedance values over time correlate with extracellular fluid retention and edema.'
  },
  'G33': {
    pin: 'GPIO 33',
    label: 'I2C SCL (Bio)',
    sensor: 'AD5933 AFE',
    proxy: 'I2C Clock Line',
    voltage: '3.3V Digital',
    description: 'Synchronizes frequency-sweep requests for electrical bioimpedance spectroscopy measurements.'
  }
}

export function WearablePage() {
  const [telemetry, setTelemetry] = useState<WearableResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPin, setSelectedPin] = useState<string>('G34')
  const [submittingScenario, setSubmittingScenario] = useState(false)

  // Fetch telemetry
  const fetchTelemetry = async () => {
    try {
      setError('')
      const res = await fetch(`${API_BASE_URL}/api/wearable/telemetry`)
      if (!res.ok) throw new Error('Failed to retrieve wearable telemetry.')
      const data = await res.json()
      setTelemetry(data)
    } catch (err: any) {
      setError(err.message || 'Error communicating with the backend.')
    } finally {
      setLoading(false)
    }
  }

  // Trigger scenario change
  const handleScenarioChange = async (scenario: string) => {
    try {
      setSubmittingScenario(true)
      const res = await fetch(`${API_BASE_URL}/api/wearable/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      })
      if (!res.ok) throw new Error('Failed to update telemetry simulation.')
      const data = await res.json()
      setTelemetry(data)
    } catch (err: any) {
      setError(err.message || 'Error triggering scenario.')
    } finally {
      setSubmittingScenario(false)
    }
  }

  useEffect(() => {
    fetchTelemetry()
  }, [])

  if (loading) {
    return (
      <div className="wearable-page-container">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p>Connecting to wearable simulation API...</p>
        </div>
      </div>
    )
  }

  const current = telemetry?.current
  const history = telemetry?.history || []
  const activeScenario = telemetry?.scenario || 'normal'

  // Format date for chart labels (e.g. "Day 1", "Day 2"...)
  const chartData = history.map((item, idx) => ({
    ...item,
    dayLabel: `Day ${idx + 1}`,
    formattedTemp: `${item.skin_temp}°C`,
    formattedConductivity: `${item.sweat_conductivity} μS`,
    formattedImpedance: `${item.bioimpedance} Ω`,
    formattedHR: `${item.heart_rate} bpm`
  }))

  // Decide kidney glow CSS class based on stress index
  let kidneyGlowClass = 'kidney-glow-low'
  let stressColor = '#10b981' // emerald
  let stressCategory = 'Low Stress'

  if (current) {
    if (current.kidney_stress_index > 65) {
      kidneyGlowClass = 'kidney-glow-high'
      stressColor = '#a01432' // nephrocare maroon
      stressCategory = 'Severe Stress'
    } else if (current.kidney_stress_index > 35) {
      kidneyGlowClass = 'kidney-glow-mod'
      stressColor = '#f59e0b' // amber
      stressCategory = 'Moderate Stress'
    }
  }

  return (
    <div className="wearable-page-container">
      <header className="wearable-header">
        <h1>
          <Icon name="activity" size={32} />
          Digital Kidney Twin & Wearable
        </h1>
        <p>Real-time early warning trend analysis and multimodal sensor fusion pipeline.</p>
      </header>

      {error && (
        <div className="alert-message-card danger" style={{ marginBottom: 24 }}>
          <strong>Connection Error</strong>
          {error}
        </div>
      )}

      <div className="wearable-grid">
        {/* LEFT COLUMN: Digital Kidney Twin Visualization */}
        <section className="wearable-card">
          <h2>
            <Icon name="spark" size={22} />
            Digital Kidney Twin
          </h2>
          <div className="digital-twin-container">
            <div className="twin-visualization">
              <div className="kidney-svg-wrapper">
                {/* Left Kidney */}
                <svg className={`kidney-svg ${kidneyGlowClass}`} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 10 C20 10, 10 40, 10 80 C10 120, 30 140, 50 140 C70 140, 60 100, 50 80 C40 60, 50 30, 50 10 Z" />
                </svg>
                {/* Right Kidney */}
                <svg className={`kidney-svg ${kidneyGlowClass}`} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 10 C80 10, 90 40, 90 80 C90 120, 70 140, 50 140 C30 140, 40 100, 50 80 C60 60, 50 30, 50 10 Z" />
                </svg>
              </div>
            </div>

            {current && (
              <div className="stress-metrics-panel">
                <div className="stress-index-value" style={{ color: stressColor }}>
                  {current.kidney_stress_index}%
                </div>
                <div className="stress-label">{stressCategory} Index</div>
                <div className="stress-progress-bar">
                  <div
                    className="stress-progress-fill"
                    style={{
                      width: `${current.kidney_stress_index}%`,
                      backgroundColor: stressColor
                    }}
                  />
                </div>

                <div className="twin-quick-metrics">
                  <div className="quick-metric-tile">
                    <span>Hydration</span>
                    <strong>{current.hydration_status}</strong>
                  </div>
                  <div className="quick-metric-tile">
                    <span>Electrolytes</span>
                    <strong>{current.electrolyte_risk} Risk</strong>
                  </div>
                  <div className="quick-metric-tile">
                    <span>Fluid Retention</span>
                    <strong>{current.fluid_retention}</strong>
                  </div>
                  <div className="quick-metric-tile">
                    <span>ECG Path</span>
                    <strong>{current.hyperkalemia_pattern ? 'Anomaly Detected' : 'Normal'}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Hardware Schematic & Scenarios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Hardware Schematic */}
          <section className="wearable-card">
            <h2>
              <Icon name="lab" size={22} />
              ESP32 Wearable Wiring Schematic
            </h2>
            <div className="hardware-schematic-container">
              <div className="esp32-visual-board">
                <div className="schematic-pins-layout">
                  {/* Left Pin Column */}
                  <div className="pin-column">
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G34' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G34')}
                    >
                      G34 (ECG Out)
                    </button>
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G25' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G25')}
                    >
                      G25 (LO+)
                    </button>
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G26' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G26')}
                    >
                      G26 (LO-)
                    </button>
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G4' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G4')}
                    >
                      G4 (1-Wire)
                    </button>
                  </div>

                  {/* Right Pin Column */}
                  <div className="pin-column">
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G21' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G21')}
                    >
                      G21 (SDA PPG)
                    </button>
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G22' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G22')}
                    >
                      G22 (SCL PPG)
                    </button>
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G35' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G35')}
                    >
                      G35 (Sweat)
                    </button>
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G32' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G32')}
                    >
                      G32 (SDA Impedance)
                    </button>
                    <button
                      type="button"
                      className={`esp32-pin ${selectedPin === 'G33' ? 'active-pin' : ''}`}
                      onClick={() => setSelectedPin('G33')}
                    >
                      G33 (SCL Impedance)
                    </button>
                  </div>
                </div>
                <div className="esp32-usb-port" />
              </div>

              {selectedPin && PIN_DETAILS[selectedPin] && (
                <div className="pin-info-detail-box">
                  <h4>
                    {PIN_DETAILS[selectedPin].pin} - {PIN_DETAILS[selectedPin].sensor}
                  </h4>
                  <div style={{ marginBottom: 8 }}>
                    <span className="pin-info-badge">{PIN_DETAILS[selectedPin].voltage}</span>
                  </div>
                  <p>{PIN_DETAILS[selectedPin].description}</p>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    <strong>Signal Proxy:</strong> {PIN_DETAILS[selectedPin].proxy}
                  </div>
                  {selectedPin === 'G34' && current && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#0f172a' }}>
                      <strong>Simulated Waveform Metrics:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                        <div>T-Wave Amp: {current.t_wave_amplitude} mV</div>
                        <div>QRS (R-Wave) Amp: {current.qrs_amplitude} mV</div>
                        <div style={{ gridColumn: 'span 2' }}>
                          Ratio (T/QRS): <strong style={{ color: (current.t_wave_amplitude && current.qrs_amplitude && (current.t_wave_amplitude / current.qrs_amplitude) > 0.5) ? '#a01432' : 'inherit' }}>
                            {(current.t_wave_amplitude && current.qrs_amplitude) ? (current.t_wave_amplitude / current.qrs_amplitude).toFixed(2) : '0.15'}
                          </strong>
                          {current.hyperkalemia_pattern ? ' (Peaked T-wave anomaly flagged)' : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Scenario Simulator */}
          <section className="wearable-card">
            <h2>
              <Icon name="chef" size={22} />
              Interactive Telemetry Simulator
            </h2>
            <div className="scenario-selector-grid">
              <button
                type="button"
                className={`scenario-btn ${activeScenario === 'normal' ? 'active' : ''}`}
                onClick={() => handleScenarioChange('normal')}
                disabled={submittingScenario}
              >
                <strong>Normal Baseline</strong>
                <span>Resting parameters</span>
              </button>

              <button
                type="button"
                className={`scenario-btn ${activeScenario === 'dehydration' ? 'active' : ''}`}
                onClick={() => handleScenarioChange('dehydration')}
                disabled={submittingScenario}
              >
                <strong>Dehydration</strong>
                <span>High sweat, high HR</span>
              </button>

              <button
                type="button"
                className={`scenario-btn ${activeScenario === 'electrolyte' ? 'active' : ''}`}
                onClick={() => handleScenarioChange('electrolyte')}
                disabled={submittingScenario}
              >
                <strong>Electrolyte Risk</strong>
                <span>ECG anomaly, high sweat</span>
              </button>

              <button
                type="button"
                className={`scenario-btn ${activeScenario === 'fluid' ? 'active' : ''}`}
                onClick={() => handleScenarioChange('fluid')}
                disabled={submittingScenario}
              >
                <strong>Fluid Overload</strong>
                <span>Low bioimpedance</span>
              </button>
            </div>

            {/* AI Risk Flags & Banners */}
            <div className="alerts-status-box">
              {current && current.hyperkalemia_pattern && (
                <div className="alert-message-card danger">
                  <div>
                    <strong>ECG Alert: Hyperkalemic Pattern Detected</strong>
                    <span style={{ fontSize: 13 }}>
                      ECG analysis detects a peaked T-wave amplitude anomaly (T/QRS ratio: {current && current.t_wave_amplitude && current.qrs_amplitude ? (current.t_wave_amplitude / current.qrs_amplitude).toFixed(2) : '0.60'}) coupled with elevated sweat conductivity.
                    </span>
                  </div>
                </div>
              )}

              {current && current.hydration_status === 'Severe Dehydration' && (
                <div className="alert-message-card warning">
                  <div>
                    <strong>Dehydration Alert: Extreme Dehydration Risk</strong>
                    <span style={{ fontSize: 13 }}>
                      Sweat conductivity exceeds baseline by &gt;25% and heart rate variability (HRV) has dropped significantly.
                    </span>
                  </div>
                </div>
              )}

              {current && current.fluid_retention === 'Severe Retention' && (
                <div className="alert-message-card warning">
                  <div>
                    <strong>Fluid Retention Alert: Systemic Congestion Risk</strong>
                    <span style={{ fontSize: 13 }}>
                      Bioimpedance has drifted down to {current.bioimpedance} Ω, representing a significant increase in extracellular fluid volume.
                    </span>
                  </div>
                </div>
              )}

              {current && activeScenario === 'normal' && (
                <div className="alert-message-card success">
                  <div>
                    <strong>All Systems Normal</strong>
                    <span style={{ fontSize: 13 }}>
                      Wearable sensors report optimal biometric values. Digital Twin synchronized.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="clinical-disclaimer-box">
              <strong>Clinical safety note:</strong> Sweat conductivity sensors track electrolyte concentration trends rather than absolute diagnostic values. Sweat biomarker concentration lags blood by roughly 10–30 minutes.
            </div>
          </section>
        </div>
      </div>

      {/* BOTTOM SECTION: 7-Day Trend Charts */}
      <h2 className="charts-section-title">Multimodal Sensor Trends (7-Day Rolling)</h2>
      <div className="wearable-charts-grid">
        {/* Heart Rate & HRV */}
        <article className="chart-card">
          <h3>
            Heart Rate & HRV Trend
            <span>Sympathetic Stress Proxy</span>
          </h3>
          <div className="chart-container-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="dayLabel" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip />
                <Area type="monotone" name="Heart Rate (bpm)" dataKey="heart_rate" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHr)" />
                <Area type="monotone" name="HRV (ms)" dataKey="hrv" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHrv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Sweat Conductivity */}
        <article className="chart-card">
          <h3>
            Sweat Conductivity
            <span>Electrolyte & Ion Loss (Na⁺/K⁺ Proxy)</span>
          </h3>
          <div className="chart-container-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSweat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="dayLabel" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip />
                <Area type="monotone" name="Sweat Conductivity (μS)" dataKey="sweat_conductivity" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSweat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Bioimpedance (Fluid) */}
        <article className="chart-card">
          <h3>
            Bioimpedance Spectroscopy
            <span>Extracellular Fluid Volume (Tissue Hydration)</span>
          </h3>
          <div className="chart-container-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBioimp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a01432" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a01432" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="dayLabel" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} domain={[250, 600]} />
                <Tooltip />
                <Area type="monotone" name="Bioimpedance (Ω)" dataKey="bioimpedance" stroke="#a01432" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBioimp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Skin Temperature */}
        <article className="chart-card">
          <h3>
            Skin Temperature
            <span>Inflammation & Local Vasodilation Proxy</span>
          </h3>
          <div className="chart-container-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0b7f72" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0b7f72" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="dayLabel" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} domain={[36.0, 38.0]} />
                <Tooltip />
                <Area type="monotone" name="Skin Temp (°C)" dataKey="skin_temp" stroke="#0b7f72" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </div>
  )
}
