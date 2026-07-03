import React, { useState, useEffect, useRef } from 'react'
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

interface Point3D {
  x: number
  y: number
  z: number
}

interface RotatingKidney3DCanvasProps {
  stressScore: number
  riskLevel: 'Low' | 'Moderate' | 'High'
}

interface Polygon {
  p1: { x: number; y: number; z: number }
  p2: { x: number; y: number; z: number }
  p3: { x: number; y: number; z: number }
  p4: { x: number; y: number; z: number }
  avgZ: number
}

export function RotatingKidney3DCanvas({ stressScore, riskLevel }: RotatingKidney3DCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let angle = 0

    const generateKidneyPoints = (isLeft: boolean): Point3D[] => {
      const points: Point3D[] = []
      const uSteps = 16
      const vSteps = 16
      const scale = 23

      for (let i = 0; i < uSteps; i++) {
        const u = (i / uSteps) * Math.PI * 2
        for (let j = 0; j < vSteps; j++) {
          const v = (j / vSteps) * Math.PI - Math.PI / 2

          let x = Math.cos(v) * Math.cos(u)
          let y = Math.sin(v)
          let z = Math.cos(v) * Math.sin(u)

          // 1. Flatten the kidney slightly in anterior-posterior (Z) dimension
          z *= 0.62

          // 2. Adjust proportions to look like a real vertical organ
          x *= 1.15
          y *= 2.45

          // 3. Apply C-shape bend along the Y-axis (tapered at poles)
          const bendFactor = 1.0 - (y * y) / (2.45 * 2.45)
          const bendAmt = 0.55 * bendFactor
          if (isLeft) {
            x = x - bendAmt
          } else {
            x = x + bendAmt
          }

          // 4. Create deep renal hilum indentation facing the center
          const hilumAngle = isLeft ? 0 : Math.PI
          const angleDiff = Math.abs(u - hilumAngle)
          const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff)
          const hilumDepth = 0.45 * Math.exp(-2.6 * Math.pow(normalizedDiff, 2)) * bendFactor
          
          if (isLeft) {
            x = x - hilumDepth
          } else {
            x = x + hilumDepth
          }

          // 5. Position symmetric layout
          const finalX = isLeft ? (x - 1.05) * scale : (x + 1.05) * scale
          const finalY = y * scale
          const finalZ = z * scale

          points.push({ x: finalX, y: finalY, z: finalZ })
        }
      }
      return points
    }

    const leftKidney = generateKidneyPoints(true)
    const rightKidney = generateKidneyPoints(false)

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const width = canvas.width
      const height = canvas.height
      const centerX = width / 2
      const centerY = height / 2

      // Background ambient glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 130)
      if (riskLevel === 'High') {
        glowGrad.addColorStop(0, 'rgba(160, 20, 50, 0.16)')
      } else if (riskLevel === 'Moderate') {
        glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.08)')
      } else {
        glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.08)')
      }
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, 0, width, height)

      const cosY = Math.cos(angle)
      const sinY = Math.sin(angle)
      const tiltX = 0.22
      const cosX = Math.cos(tiltX)
      const sinX = Math.sin(tiltX)

      const projectPoints = (points: Point3D[]) => {
        return points.map(p => {
          const ryx = p.x * cosY - p.z * sinY
          const ryz = p.x * sinY + p.z * cosY
          const rxx = ryx
          const rxy = p.y * cosX - ryz * sinX
          const rxz = p.y * sinX + ryz * cosX

          const scalePersp = 260 / (260 + rxz)
          const projX = centerX + rxx * scalePersp
          const projY = centerY + rxy * scalePersp

          return { x: projX, y: projY, z: rxz }
        })
      }

      const leftProj = projectPoints(leftKidney)
      const rightProj = projectPoints(rightKidney)

      const steps = 16
      const polygons: Polygon[] = []

      const buildPolys = (processed: { x: number; y: number; z: number }[]) => {
        for (let uIdx = 0; uIdx < steps; uIdx++) {
          for (let vIdx = 0; vIdx < steps; vIdx++) {
            const i1 = (uIdx * steps) + vIdx
            const i2 = (((uIdx + 1) % steps) * steps) + vIdx
            const i3 = (((uIdx + 1) % steps) * steps) + ((vIdx + 1) % steps)
            const i4 = (uIdx * steps) + ((vIdx + 1) % steps)

            const p1 = processed[i1]
            const p2 = processed[i2]
            const p3 = processed[i3]
            const p4 = processed[i4]

            const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4
            polygons.push({ p1, p2, p3, p4, avgZ })
          }
        }
      }

      buildPolys(leftProj)
      buildPolys(rightProj)

      // Depth sort polygons (Painter's algorithm: draw back first)
      polygons.sort((a, b) => b.avgZ - a.avgZ)

      // Light source vector (front, top, right)
      const lx = 0.38
      const ly = -0.38
      const lz = -0.84

      polygons.forEach(poly => {
        // Face normal calculation
        const ax = poly.p2.x - poly.p1.x
        const ay = poly.p2.y - poly.p1.y
        const az = poly.p2.z - poly.p1.z

        const bx = poly.p4.x - poly.p1.x
        const by = poly.p4.y - poly.p1.y
        const bz = poly.p4.z - poly.p1.z

        let nx = ay * bz - az * by
        let ny = az * ax - ax * bz
        let nz = ax * by - ay * bx

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        if (len > 0) {
          nx /= len
          ny /= len
          nz /= len
        }

        // Shading intensity
        const dot = nx * lx + ny * ly + nz * lz
        const intensity = 0.38 + 0.62 * Math.max(0, dot)

        // Base color theme
        let r = 16, g = 185, b = 129
        if (riskLevel === 'High') {
          r = 160; g = 20; b = 50
        } else if (riskLevel === 'Moderate') {
          r = 245; g = 158; b = 11
        }

        const fillR = Math.round(r * intensity)
        const fillG = Math.round(g * intensity)
        const fillB = Math.round(b * intensity)

        // Fog factor for depth cueing
        const fog = Math.max(0.18, Math.min(1.0, (140 - poly.avgZ) / 185))
        const fillStyle = `rgba(${fillR}, ${fillG}, ${fillB}, ${0.85 * fog})`
        const strokeStyle = `rgba(${Math.round(r * 1.15 * intensity)}, ${Math.round(g * 1.15 * intensity)}, ${Math.round(b * 1.15 * intensity)}, ${0.15 * fog})`

        ctx.fillStyle = fillStyle
        ctx.strokeStyle = strokeStyle
        ctx.lineWidth = 0.45

        ctx.beginPath()
        ctx.moveTo(poly.p1.x, poly.p1.y)
        ctx.lineTo(poly.p2.x, poly.p2.y)
        ctx.lineTo(poly.p3.x, poly.p3.y)
        ctx.lineTo(poly.p4.x, poly.p4.y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      })

      angle += 0.015
      animationId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationId)
  }, [stressScore, riskLevel])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={230}
      style={{
        display: 'block',
        background: '#090d16',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.85)',
        width: '100%'
      }}
    />
  )
}

export function WearablePage() {
  const [telemetry, setTelemetry] = useState<WearableResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPin, setSelectedPin] = useState<string>('G34')
  const [submittingScenario, setSubmittingScenario] = useState(false)

  // Interactive Digital Twin Configuration Panel State
  const [isManualMode, setIsManualMode] = useState(false)
  const [twinInputs, setTwinInputs] = useState({
    hr: 72,
    hrv: 65,
    temperature: 36.6,
    waterIntake: 2000,
    age: 45,
    weight: 70,
    stage: 'Stage 1'
  })

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
    const interval = setInterval(() => {
      fetchTelemetry()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const current = telemetry?.current
  const history = telemetry?.history || []
  const activeScenario = telemetry?.scenario || 'normal'

  // Sync inputs with live telemetry values when in Live Mode
  useEffect(() => {
    if (current && !isManualMode) {
      setTwinInputs(prev => ({
        ...prev,
        hr: current.heart_rate,
        hrv: current.hrv,
        temperature: current.skin_temp,
        stage: activeScenario === 'electrolyte' ? 'Stage 4' : activeScenario === 'fluid' ? 'Stage 3' : activeScenario === 'dehydration' ? 'Stage 2' : 'Stage 1',
        waterIntake: activeScenario === 'dehydration' ? 500 : activeScenario === 'fluid' ? 800 : activeScenario === 'electrolyte' ? 1000 : 2200
      }))
    }
  }, [telemetry, activeScenario, isManualMode])

  if (loading) {
    return (
      <div className="wearable-page-container">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p>Connecting to wearable simulation API...</p>
        </div>
      </div>
    )
  }

  // Format date for chart labels (e.g. "Day 1", "Day 2"...)
  const chartData = history.map((item, idx) => ({
    ...item,
    dayLabel: `Day ${idx + 1}`,
    formattedTemp: `${item.skin_temp}°C`,
    formattedConductivity: `${item.sweat_conductivity} μS`,
    formattedImpedance: `${item.bioimpedance} Ω`,
    formattedHR: `${item.heart_rate} bpm`
  }))

  // Calculate real-time AI outputs
  const waterFactor = Math.min(100, (twinInputs.waterIntake / 2500) * 100)
  const tempDehydration = Math.max(0, (twinInputs.temperature - 36.8) * 15)
  const hrDehydration = Math.max(0, (twinInputs.hr - 75) * 0.2)
  const hydrationScore = Math.max(0, Math.min(100, Math.round(waterFactor - tempDehydration - hrDehydration)))

  const hrvStress = Math.max(0, (70 - twinInputs.hrv) * 0.8)
  const hrStress = Math.max(0, (twinInputs.hr - 80) * 0.5)
  const tempStress = Math.abs(twinInputs.temperature - 36.7) * 12
  const hydrStress = Math.max(0, (70 - hydrationScore) * 0.7)
  
  const stageMap: Record<string, number> = {
    'Stage 1': 10,
    'Stage 2': 25,
    'Stage 3': 45,
    'Stage 4': 70,
    'Stage 5': 90
  }
  const stageBaseline = stageMap[twinInputs.stage] || 10

  const stressScore = Math.max(0, Math.min(100, Math.round(
    (hrvStress + hrStress + tempStress + hydrStress) * 0.4 + stageBaseline * 0.6
  )))

  let riskLevel: 'Low' | 'Moderate' | 'High' = 'Low'
  if (stressScore > 65) {
    riskLevel = 'High'
  } else if (stressScore > 35) {
    riskLevel = 'Moderate'
  }

  const stressColor = riskLevel === 'High' ? '#a01432' : riskLevel === 'Moderate' ? '#f59e0b' : '#10b981'
  const stressCategory = riskLevel === 'High' ? 'Severe Stress' : riskLevel === 'Moderate' ? 'Moderate Stress' : 'Low Stress'

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
        {/* LEFT COLUMN: Digital Kidney Twin & Configurator Panel */}
        <section className="wearable-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>
              <Icon name="spark" size={22} />
              Digital Kidney Twin
            </h2>
            
            {/* Mode Selector Toggle */}
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
              <button 
                type="button" 
                onClick={() => setIsManualMode(false)}
                style={{ padding: '4px 8px', border: 'none', background: !isManualMode ? 'white' : 'transparent', color: !isManualMode ? '#0f172a' : '#64748b', borderRadius: '6px', boxShadow: !isManualMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer' }}
              >
                Telemetry Mode
              </button>
              <button 
                type="button" 
                onClick={() => setIsManualMode(true)}
                style={{ padding: '4px 8px', border: 'none', background: isManualMode ? 'white' : 'transparent', color: isManualMode ? '#0f172a' : '#64748b', borderRadius: '6px', boxShadow: isManualMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer' }}
              >
                Interactive Twin
              </button>
            </div>
          </div>

          <div className="digital-twin-container">
            <div className="twin-visualization" style={{ width: '100%', height: 'auto', marginBottom: '20px' }}>
              <RotatingKidney3DCanvas stressScore={stressScore} riskLevel={riskLevel} />
            </div>

            <div className="stress-metrics-panel" style={{ width: '100%' }}>
              <div className="stress-index-value" style={{ color: stressColor, fontSize: '38px', fontWeight: 900 }}>
                {stressScore}%
              </div>
              <div className="stress-label" style={{ fontWeight: 'bold', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stressCategory} Index
              </div>
              
              <div className="stress-progress-bar" style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', margin: '12px 0 20px', overflow: 'hidden' }}>
                <div
                  className="stress-progress-fill"
                  style={{
                    width: `${stressScore}%`,
                    backgroundColor: stressColor,
                    height: '100%',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              {/* AI outputs */}
              <div className="twin-quick-metrics">
                <div className="quick-metric-tile">
                  <span>Hydration</span>
                  <strong style={{ color: hydrationScore < 50 ? '#a01432' : '#083b66' }}>{hydrationScore}%</strong>
                </div>
                <div className="quick-metric-tile">
                  <span>Kidney Stress</span>
                  <strong style={{ color: stressScore > 65 ? '#a01432' : '#083b66' }}>{stressScore}%</strong>
                </div>
                <div className="quick-metric-tile">
                  <span>Risk Level</span>
                  <strong style={{ color: stressColor }}>{riskLevel}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration inputs */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#083b66', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="lab" size={16} /> Twin Configurator {isManualMode ? '(Interactive)' : '(Locked to Telemetry)'}
              </h3>
              {isManualMode && (
                <button 
                  type="button" 
                  onClick={() => {
                    setTwinInputs({ hr: 72, hrv: 65, temperature: 36.6, waterIntake: 2000, age: 45, weight: 70, stage: 'Stage 1' })
                  }} 
                  style={{ fontSize: '11px', color: '#083b66', background: '#f1f5f9', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Reset Inputs
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', opacity: isManualMode ? 1 : 0.65, pointerEvents: isManualMode ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
              
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Heart Rate:</strong>
                  <span>{twinInputs.hr} bpm</span>
                </span>
                <input 
                  type="range" 
                  min="40" 
                  max="180" 
                  value={twinInputs.hr} 
                  onChange={(e) => setTwinInputs({ ...twinInputs, hr: parseInt(e.target.value) })} 
                  style={{ width: '100%', accentColor: stressColor }} 
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Heart Rate Variability (HRV):</strong>
                  <span>{twinInputs.hrv} ms</span>
                </span>
                <input 
                  type="range" 
                  min="5" 
                  max="150" 
                  value={twinInputs.hrv} 
                  onChange={(e) => setTwinInputs({ ...twinInputs, hrv: parseInt(e.target.value) })} 
                  style={{ width: '100%', accentColor: stressColor }} 
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Skin Temperature:</strong>
                  <span>{twinInputs.temperature.toFixed(1)} °C</span>
                </span>
                <input 
                  type="range" 
                  min="35" 
                  max="41" 
                  step="0.1"
                  value={twinInputs.temperature} 
                  onChange={(e) => setTwinInputs({ ...twinInputs, temperature: parseFloat(e.target.value) })} 
                  style={{ width: '100%', accentColor: stressColor }} 
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Water Intake:</strong>
                  <span>{twinInputs.waterIntake} ml</span>
                </span>
                <input 
                  type="range" 
                  min="0" 
                  max="4000" 
                  step="50"
                  value={twinInputs.waterIntake} 
                  onChange={(e) => setTwinInputs({ ...twinInputs, waterIntake: parseInt(e.target.value) })} 
                  style={{ width: '100%', accentColor: stressColor }} 
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Patient Age:</strong>
                  <span>{twinInputs.age} Yrs</span>
                </span>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={twinInputs.age} 
                  onChange={(e) => setTwinInputs({ ...twinInputs, age: parseInt(e.target.value) })} 
                  style={{ width: '100%', accentColor: stressColor }} 
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Patient Weight:</strong>
                  <span>{twinInputs.weight} kg</span>
                </span>
                <input 
                  type="range" 
                  min="30" 
                  max="150" 
                  value={twinInputs.weight} 
                  onChange={(e) => setTwinInputs({ ...twinInputs, weight: parseInt(e.target.value) })} 
                  style={{ width: '100%', accentColor: stressColor }} 
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569', gridColumn: 'span 2' }}>
                <strong>Existing Kidney Disease Stage:</strong>
                <select 
                  value={twinInputs.stage} 
                  onChange={(e) => setTwinInputs({ ...twinInputs, stage: e.target.value })}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontWeight: 'bold' }}
                >
                  <option value="Stage 1">Stage 1: Normal or high GFR (eGFR &ge; 90)</option>
                  <option value="Stage 2">Stage 2: Mild GFR decrease (eGFR 60-89)</option>
                  <option value="Stage 3">Stage 3: Moderate GFR decrease (eGFR 30-59)</option>
                  <option value="Stage 4">Stage 4: Severe GFR decrease (eGFR 15-29)</option>
                  <option value="Stage 5">Stage 5: Kidney failure (eGFR &lt; 15)</option>
                </select>
              </label>
            </div>

            {!isManualMode && (
              <div style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                💡 <strong>Telemetry Locked Mode:</strong> Sliders are currently linked to the ESP32 sensor simulation values. Click <strong>"Interactive Twin"</strong> at the top right of this card to unlock sliders and manually configure patient telemetry trends.
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
