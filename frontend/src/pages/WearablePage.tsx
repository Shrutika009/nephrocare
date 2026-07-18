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
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Inactive'
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
      } else if (riskLevel === 'Inactive') {
        glowGrad.addColorStop(0, 'rgba(100, 116, 139, 0.05)')
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
        } else if (riskLevel === 'Inactive') {
          r = 100; g = 116; b = 139
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

  const isBluetoothSupported = typeof window !== 'undefined' && 'bluetooth' in navigator
  const isSerialSupported = typeof window !== 'undefined' && 'serial' in navigator

  // Web Bluetooth / Serial States
  const [bluetoothStatus, setBluetoothStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [connectionType, setConnectionType] = useState<'ble' | 'serial' | null>(null)
  const [bleDevice, setBleDevice] = useState<any>(null)
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null)
  const [serialPort, setSerialPort] = useState<any>(null)
  const [serialReader, setSerialReader] = useState<any>(null)
  const [bleData, setBleData] = useState<{
    temperature: number | null
    heartRate: number | null
    spo2: number | null
    fingerDetected: boolean
    ir: number | null
  }>({
    temperature: null,
    heartRate: null,
    spo2: null,
    fingerDetected: false,
    ir: null
  })

  // Connect to ESP32 Wearable BLE
  const connectBluetooth = async () => {
    if (!isBluetoothSupported) {
      setError('Web Bluetooth is not supported in this browser or context. Please make sure you are using Google Chrome, Microsoft Edge, or Opera, and accessing the app via a secure origin (http://localhost:5175 or HTTPS).')
      setBluetoothStatus('error')
      return
    }
    setBluetoothStatus('connecting')
    setError('')
    let buffer = ''

    try {
      // 1. Request BLE device filtering by our custom service UUID
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'] }]
      })

      setBleDevice(device)
      setConnectionType('ble')

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', onDeviceDisconnected)

      // 2. Connect to GATT server
      const server = await device.gatt.connect()

      // 3. Get the custom BLE service
      const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b')

      // 4. Get the characteristic
      const characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8')
      setBleCharacteristic(characteristic)

      // 5. Start notifications
      await characteristic.startNotifications()

      // 6. Register data change listener
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value
        const decoder = new TextDecoder('utf-8')
        const chunk = decoder.decode(value)
        buffer += chunk

        // Split by newline since the ESP32 appends \n
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep the last incomplete part

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line.trim())
              setBleData({
                temperature: data.temperature,
                heartRate: data.heartRate,
                spo2: data.spo2,
                fingerDetected: !!data.fingerDetected,
                ir: data.ir
              })

              // Send update to the backend telemetry to sync history/graphs
              postHardwareTelemetry(data.heartRate, data.spo2, data.temperature)
            } catch (err) {
              console.error('Failed to parse BLE JSON telemetry:', line, err)
            }
          }
        }
      })

      setBluetoothStatus('connected')
    } catch (err: any) {
      console.error('Web Bluetooth Error:', err)
      setError(err.message || 'Failed to connect via Bluetooth. Please ensure Bluetooth is enabled and the ESP32 is powered on.')
      setBluetoothStatus('error')
    }
  }

  // Connect to ESP32 Wearable via USB Serial
  const connectSerial = async () => {
    if (!isSerialSupported) {
      setError('Web Serial is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.')
      setBluetoothStatus('error')
      return
    }
    setBluetoothStatus('connecting')
    setError('')

    try {
      const port = await (navigator as any).serial.requestPort()
      await port.open({ baudRate: 115200 })
      setSerialPort(port)
      setConnectionType('serial')

      // Start asynchronous reading loop
      setTimeout(async () => {
        try {
          const textDecoder = new TextDecoderStream()
          port.readable.pipeTo(textDecoder.writable)
          const reader = textDecoder.readable.getReader()
          setSerialReader(reader)
          setBluetoothStatus('connected')

          let buffer = ''
          while (true) {
            const { value, done } = await reader.read()
            if (done) {
              break
            }
            if (value) {
              buffer += value
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const data = JSON.parse(line.trim())
                    setBleData({
                      temperature: data.temperature,
                      heartRate: data.heartRate,
                      spo2: data.spo2,
                      fingerDetected: !!data.fingerDetected,
                      ir: data.ir
                    })
                    postHardwareTelemetry(data.heartRate, data.spo2, data.temperature)
                  } catch (e) {
                    console.error('Failed to parse Serial JSON:', line, e)
                  }
                }
              }
            }
          }
        } catch (readErr) {
          console.error('Serial read error or user disconnected:', readErr)
          onDeviceDisconnected()
        }
      }, 50)
    } catch (err: any) {
      console.error('Web Serial Error:', err)
      setError(err.message || 'Failed to connect via USB Serial.')
      setBluetoothStatus('error')
    }
  }

  const disconnectDevice = async () => {
    if (connectionType === 'ble') {
      if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect()
      } else {
        onDeviceDisconnected()
      }
    } else if (connectionType === 'serial') {
      try {
        if (serialReader) {
          await serialReader.cancel()
        }
        if (serialPort) {
          await serialPort.close()
        }
      } catch (e) {
        console.error(e)
      }
      onDeviceDisconnected()
    }
  }

  const onDeviceDisconnected = () => {
    setBluetoothStatus('disconnected')
    setConnectionType(null)
    setBleDevice(null)
    setBleCharacteristic(null)
    setSerialPort(null)
    setSerialReader(null)
    setBleData({
      temperature: null,
      heartRate: null,
      spo2: null,
      fingerDetected: false,
      ir: null
    })
  }

  // Cleanup BLE and Serial connections on unmount
  useEffect(() => {
    return () => {
      if (connectionType === 'ble' && bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect()
      } else if (connectionType === 'serial' && serialPort) {
        try {
          if (serialReader) serialReader.cancel()
          serialPort.close()
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [bleDevice, serialPort, connectionType, serialReader])

  // Post hardware telemetry to backend to sync graphs/history
  const postHardwareTelemetry = async (hr: number | null, spo2: number | null, temp: number | null) => {
    try {
      const payload: any = {}
      if (hr !== null) payload.heart_rate = hr
      if (spo2 !== null) payload.spo2 = spo2
      if (temp !== null) payload.skin_temp = temp

      await fetch(`${API_BASE_URL}/api/wearable/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('Failed to update telemetry backend:', err)
    }
  }

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

  useEffect(() => {
    fetchTelemetry()
    const interval = setInterval(() => {
      fetchTelemetry()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const current = telemetry?.current
  const history = telemetry?.history || []
  const isHardwareActive = bluetoothStatus === 'connected' || !!(telemetry as any)?.hardware_active

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

  // Calculate real-time AI outputs from active hardware telemetry
  const stressScore = isHardwareActive && current ? current.kidney_stress_index : 0
  const hydrationScore = isHardwareActive && current ? (current.hydration_status === 'Hydrated' ? 95 : current.hydration_status === 'Mild Dehydration' ? 65 : 25) : 0
  const riskLevel: 'Low' | 'Moderate' | 'High' | 'Inactive' = isHardwareActive ? (stressScore > 65 ? 'High' : stressScore > 35 ? 'Moderate' : 'Low') : 'Inactive'

  const stressColor = riskLevel === 'High' ? '#a01432' : riskLevel === 'Moderate' ? '#f59e0b' : riskLevel === 'Inactive' ? '#64748b' : '#10b981'
  const stressCategory = riskLevel === 'High' ? 'Severe Stress' : riskLevel === 'Moderate' ? 'Moderate Stress' : riskLevel === 'Inactive' ? 'Inactive' : 'Low Stress'

  return (
    <div className="wearable-page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <header className="wearable-header" style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1>
          <Icon name="activity" size={32} />
          ESP32 Wearable Telemetry
        </h1>
        <p>Live biometric signals streamed from your custom hardware device.</p>
      </header>

      {error && (
        <div className="alert-message-card danger" style={{ marginBottom: 24 }}>
          <strong>Connection Error</strong>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Connection & Live Data Panel */}
        <section className="wearable-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="activity" size={22} />
              ESP32 Live Link
            </h2>
            <span className="pin-info-badge" style={{ backgroundColor: isHardwareActive ? '#e0f2fe' : '#f1f5f9', color: isHardwareActive ? '#0369a1' : '#64748b', fontWeight: 'bold' }}>
              {isHardwareActive ? '🟢 ACTIVE' : '⚪ DISCONNECTED'}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-8px', marginBottom: '16px' }}>
            Pair over Bluetooth (BLE) or plug in via USB Serial to read real-time biometrics.
          </p>

          {/* Warnings if unsupported */}
          {!isBluetoothSupported && isSerialSupported && (
            <div style={{ background: '#fffbeb', padding: '12px 14px', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '12px', color: '#b45309', marginBottom: '16px', lineHeight: '1.5' }}>
              ⚠️ <strong>Web Bluetooth Disabled:</strong> Bluetooth is disabled or unsupported in this browser/OS. Connect your ESP32 via USB and click <strong>"Connect USB"</strong>.
            </div>
          )}

          {!isBluetoothSupported && !isSerialSupported && (
            <div style={{ background: '#fff5f5', padding: '12px 14px', borderRadius: '8px', border: '1px solid #fee2e2', fontSize: '12px', color: '#b91c1c', marginBottom: '16px', lineHeight: '1.5' }}>
              ❌ <strong>Browser APIs Unsupported:</strong> Your browser does not support Web Bluetooth or Web Serial. Use Google Chrome or MS Edge on desktop.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: bluetoothStatus === 'connected' ? '#10b981' : bluetoothStatus === 'connecting' ? '#f59e0b' : '#94a3b8',
                  boxShadow: bluetoothStatus === 'connected' ? '0 0 8px #10b981' : 'none'
                }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                  {bluetoothStatus === 'connected' ? `Connected (${connectionType === 'ble' ? 'Bluetooth' : 'USB Serial'})` : bluetoothStatus === 'connecting' ? 'Connecting...' : 'Ready for Connection'}
                </span>
              </div>

              {bluetoothStatus === 'connected' ? (
                <button
                  type="button"
                  onClick={disconnectDevice}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  Disconnect
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={connectBluetooth}
                    disabled={bluetoothStatus === 'connecting' || !isBluetoothSupported}
                    style={{
                      background: isBluetoothSupported ? '#3b82f6' : '#94a3b8',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: isBluetoothSupported ? 'pointer' : 'not-allowed',
                      opacity: bluetoothStatus === 'connecting' ? 0.7 : 1,
                      transition: 'background 0.2s'
                    }}
                  >
                    Connect BLE
                  </button>
                  
                  <button
                    type="button"
                    onClick={connectSerial}
                    disabled={bluetoothStatus === 'connecting' || !isSerialSupported}
                    style={{
                      background: isSerialSupported ? '#0b7f72' : '#94a3b8',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: isSerialSupported ? 'pointer' : 'not-allowed',
                      opacity: bluetoothStatus === 'connecting' ? 0.7 : 1,
                      transition: 'background 0.2s'
                    }}
                  >
                    Connect USB
                  </button>
                </div>
              )}
            </div>

            {/* Live Data Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginTop: '8px'
            }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Finger Sensor</div>
                <div style={{
                  marginTop: '8px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: (isHardwareActive && bleData.fingerDetected) ? '#10b981' : '#f59e0b'
                }}>
                  {isHardwareActive ? (bleData.fingerDetected ? '👉 Detected' : '⚠️ No Finger') : '--'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Heart Rate</div>
                <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: '900', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {isHardwareActive && bleData.heartRate !== null ? `${bleData.heartRate} bpm` : '--'}
                  {isHardwareActive && bleData.heartRate !== null && bleData.fingerDetected && (
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                  )}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Blood Oxygen (SpO₂)</div>
                <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: '900', color: '#083b66' }}>
                  {isHardwareActive && bleData.spo2 !== null ? `${bleData.spo2}%` : '--'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Skin Temperature</div>
                <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: '900', color: '#0b7f72' }}>
                  {isHardwareActive && bleData.temperature !== null ? `${bleData.temperature.toFixed(1)} °C` : '--'}
                </div>
              </div>
            </div>

            {isHardwareActive && bleData.ir !== null && (
              <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', background: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                Raw Sensor Reflectivity (IR): <strong>{bleData.ir.toLocaleString()}</strong>
              </div>
            )}
          </div>
        </section>

        {/* AI Bio-Analysis & Alerts */}
        {isHardwareActive && current && (
          <section className="wearable-card">
            <h2 style={{ margin: 0, border: 'none', padding: 0, marginBottom: '16px' }}>
              <Icon name="spark" size={22} />
              AI Analysis & Risks
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>HYDRATION STATUS</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: hydrationScore < 50 ? '#a01432' : '#083b66', marginTop: '4px' }}>
                  {current.hydration_status}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>KIDNEY STRESS INDEX</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: stressColor, marginTop: '4px' }}>
                  {stressScore}%
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>RISK LEVEL</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: stressColor, marginTop: '4px' }}>
                  {riskLevel}
                </div>
              </div>
            </div>

            {/* AI Warning Banners */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {current.hyperkalemia_pattern && (
                <div className="alert-message-card danger">
                  <strong>ECG Alert: Hyperkalemic Pattern</strong>
                  <span style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    ECG analysis detects a peaked T-wave amplitude anomaly (T/QRS ratio: {(current.t_wave_amplitude && current.qrs_amplitude) ? (current.t_wave_amplitude / current.qrs_amplitude).toFixed(2) : '0.60'}).
                  </span>
                </div>
              )}

              {current.hydration_status === 'Severe Dehydration' && (
                <div className="alert-message-card warning">
                  <strong>Dehydration Alert: Extreme Risk</strong>
                  <span style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Sweat conductivity exceeds baseline by &gt;25% and heart rate variability (HRV) has dropped.
                  </span>
                </div>
              )}

              {current.fluid_retention === 'Severe Retention' && (
                <div className="alert-message-card warning">
                  <strong>Fluid Retention Alert: Systemic Congestion</strong>
                  <span style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Bioimpedance has drifted down to {current.bioimpedance} Ω, indicating extracellular fluid retention.
                  </span>
                </div>
              )}

              {!current.hyperkalemia_pattern && current.hydration_status !== 'Severe Dehydration' && current.fluid_retention !== 'Severe Retention' && (
                <div className="alert-message-card success">
                  <strong>All Systems Normal</strong>
                  <span style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Wearable sensors report optimal biometric values.
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Clinical safety note */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
          💡 <strong>Clinical safety note:</strong> Biometric sensors track physiological trends rather than absolute diagnostic values. Readings can lag blood serum concentrations by roughly 10–30 minutes.
        </div>
      </div>

      {/* BOTTOM SECTION: 7-Day Trend Charts */}
      {history.length > 0 && (
        <>
          <h2 className="charts-section-title" style={{ marginTop: '32px' }}>Sensor Trends History</h2>
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
                      <linearGradient id="colorCond" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="dayLabel" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" name="Sweat Conductivity (μS)" dataKey="sweat_conductivity" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCond)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </>
      )}
    </div>
  )
}
