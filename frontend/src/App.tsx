import { ChangeEvent, FormEvent, ReactNode, useState } from 'react'

type IconName = 'activity' | 'alert' | 'arrow' | 'camera' | 'chart' | 'check' | 'chef' | 'clipboard' | 'food' | 'heart' | 'lab' | 'menu' | 'message' | 'report' | 'shield' | 'spark' | 'stethoscope' | 'user' | 'x'

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

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

const features = [
  { icon: 'activity' as IconName, title: 'CKD Risk Prediction' },
  { icon: 'lab' as IconName, title: 'Lab Report Analysis' },
  { icon: 'food' as IconName, title: 'Food Recommendation' },
  { icon: 'shield' as IconName, title: 'Food Safety Checker' },
  { icon: 'chef' as IconName, title: 'AI Meal Planner' },
  { icon: 'message' as IconName, title: 'WhatsApp Assistant' },
  { icon: 'clipboard' as IconName, title: 'Symptom Tracker' },
  { icon: 'heart' as IconName, title: 'Monitoring Dashboard' },
  { icon: 'alert' as IconName, title: 'Early Warning Alerts' },
  { icon: 'report' as IconName, title: 'Doctor Summary Report' },
]

type PredictionForm = {
  age: number | ''
  sex: string
  urine_albumin: number | ''
  blood_pressure: number | ''
  blood_glucose_random: number | ''
  blood_urea: number | ''
  serum_creatinine: number | ''
  sodium: number | ''
  potassium: number | ''
  hemoglobin: number | ''
  hypertension: string
  diabetes_mellitus: string
}

const initialPredictionForm: PredictionForm = {
  age: 48,
  sex: 'female',
  urine_albumin: 30,
  blood_pressure: 80,
  blood_glucose_random: 121,
  blood_urea: 36,
  serum_creatinine: 1.2,
  sodium: 138,
  potassium: 4.4,
  hemoglobin: 15.4,
  hypertension: 'no',
  diabetes_mellitus: 'no',
}

const blankPredictionForm: PredictionForm = {
  age: '',
  sex: '',
  urine_albumin: '',
  blood_pressure: '',
  blood_glucose_random: '',
  blood_urea: '',
  serum_creatinine: '',
  sodium: '',
  potassium: '',
  hemoglobin: '',
  hypertension: '',
  diabetes_mellitus: '',
}

const numericPredictionKeys: (keyof PredictionForm)[] = [
  'age',
  'urine_albumin',
  'blood_pressure',
  'blood_glucose_random',
  'blood_urea',
  'serum_creatinine',
  'sodium',
  'potassium',
  'hemoglobin',
]

type PredictionResult = {
  input: PredictionForm
  model: { source: string; trained_model_available: boolean; model_error?: string | null }
  risk: { probability: number; percent: number; label: string }
  kidney_function: { egfr_2021: number | null; egfr_category: string }
  lab_markers: { key: string; label: string; value: number; unit: string; status: string; range: string }[]
  warnings: { key: string; label: string; value: number; unit: string; status: string; range: string }[]
  recommendations: string[]
}

type FoodAnalysis = {
  food_name: string
  category: string
  protein_g: number
  energy_kcal: number
  potassium_mg: number
  phosphorus_mg: number
  sodium_mg: number
  status: string
  kidney_score: number
  matched_food?: string
}

type FoodScanResponse = {
  detected_foods: string[]
  analyses: FoodAnalysis[]
  warning?: string | null
}

type FoodPlanResponse = {
  stage: string
  recommendations: FoodAnalysis[]
}

type MealPlanResponse = {
  breakfast: FoodAnalysis[]
  lunch: FoodAnalysis[]
  snack: FoodAnalysis[]
  dinner: FoodAnalysis[]
  notes: string[]
}

const stageDescriptions: Record<string, { title: string; description: string }> = {
  G1: { title: 'Stage 1', description: 'Normal or high eGFR. CKD usually requires other evidence such as albumin in urine.' },
  G2: { title: 'Stage 2', description: 'Mild decrease in kidney function. Review albumin and clinical context.' },
  G3a: { title: 'Stage 3a', description: 'Mild to moderate decrease in kidney function.' },
  G3b: { title: 'Stage 3b', description: 'Moderate to severe decrease in kidney function.' },
  G4: { title: 'Stage 4', description: 'Severe decrease in kidney function. Nephrology planning is important.' },
  G5: { title: 'Stage 5', description: 'Kidney failure range. Urgent clinician review is needed.' },
  Unknown: { title: 'Stage unknown', description: 'Stage cannot be estimated from the submitted values.' },
}

const stageOrder = ['G1', 'G2', 'G3a', 'G3b', 'G4', 'G5']
const pageWidth = 612
const pageHeight = 792

const labInputLabels: Record<keyof PredictionForm, string> = {
  age: 'Age',
  sex: 'Sex',
  urine_albumin: 'Urine albumin',
  blood_pressure: 'Blood pressure',
  blood_glucose_random: 'Blood glucose random',
  blood_urea: 'Blood urea',
  serum_creatinine: 'Serum creatinine',
  sodium: 'Sodium',
  potassium: 'Potassium',
  hemoglobin: 'Hemoglobin',
  hypertension: 'Hypertension',
  diabetes_mellitus: 'Diabetes mellitus',
}

const labInputUnits: Partial<Record<keyof PredictionForm, string>> = {
  age: 'years',
  urine_albumin: 'mg/g',
  blood_pressure: 'mmHg',
  blood_glucose_random: 'mg/dL',
  blood_urea: 'mg/dL',
  serum_creatinine: 'mg/dL',
  sodium: 'mmol/L',
  potassium: 'mmol/L',
  hemoglobin: 'g/dL',
}

function formatPercent(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, '')}%`
}

function formatValue(value: number | string | null | undefined, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value)
  return value
}

function stageNumber(stageKey: string) {
  if (stageKey === 'G3a' || stageKey === 'G3b') return '3'
  return stageKey.replace('G', '') || '-'
}

function stageGfrBand(stageKey: string) {
  const bands: Record<string, string> = {
    G1: '> 90',
    G2: '89-60',
    G3a: '59-45',
    G3b: '44-30',
    G4: '29-15',
    G5: '< 15',
  }
  return bands[stageKey] ?? 'Unknown'
}

function stageSeverity(stageKey: string) {
  const severities: Record<string, string> = {
    G1: 'Normal or high kidney function',
    G2: 'Mild decrease in function',
    G3a: 'Mild to moderate decrease in function',
    G3b: 'Moderate to severe decrease in function',
    G4: 'Severe decrease in function',
    G5: 'Kidney failure range',
  }
  return severities[stageKey] ?? 'Stage cannot be estimated'
}

function modelSourceLabel(source: string) {
  return source === 'xgboost_notebook_model' ? 'NephroCare risk check' : 'NephroCare risk check'
}

function modelSourceSummary(result: PredictionResult) {
  return 'Your estimated CKD risk is based on the health details you entered.'
}

function reportData(result: PredictionResult) {
  const stageKey = result.kidney_function.egfr_category
  return {
    stageKey,
    stageNumber: stageNumber(stageKey),
    stageTitle: stageDescriptions[stageKey]?.title ?? 'Stage unknown',
    stageSeverity: stageSeverity(stageKey),
    gfrBand: stageGfrBand(stageKey),
    riskPercent: Math.max(0, Math.min(99.99, result.risk.probability * 100)),
    source: modelSourceLabel(result.model.source),
    sexShort: String(result.input.sex).toLowerCase().startsWith('m') ? 'M' : 'F',
  }
}

function wrapText(text: string, maxLength = 82) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxLength && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  })
  if (line) lines.push(line)
  return lines
}

function pdfEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

type PdfPage = { content: string }

function pdfText(x: number, y: number, text: string, size = 11, color = '0 0 0', font = '/F1') {
  return `BT ${color} rg ${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`
}

function pdfWrappedText(x: number, y: number, text: string, size = 11, color = '0 0 0', maxLength = 76) {
  const lines = wrapText(text, maxLength)
  return lines.map((line, index) => pdfText(x, y - index * Math.round(size * 1.45), line, size, color)).join('\n')
}

function pdfRect(x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  if (stroke) {
    return `q ${fill} rg ${stroke} RG 1 w ${x} ${y} ${w} ${h} re B Q`
  }
  return `q ${fill} rg ${x} ${y} ${w} ${h} re f Q`
}

function buildPredictionPdf(result: PredictionResult): Blob {
  const now = new Date()
  const report = reportData(result)
  const page: string[] = []
  const teal = '0.00 0.34 0.31'
  const red = '0.95 0.20 0.27'
  const muted = '0.37 0.43 0.42'
  const pale = '0.94 0.95 0.92'
  const dark = '0.04 0.20 0.19'
  const vitals = [
    { label: 'Urine albumin', value: formatValue(result.input.urine_albumin), unit: 'mg/g' },
    { label: 'Sex', value: report.sexShort, unit: result.input.sex },
    { label: 'Age', value: formatValue(result.input.age), unit: 'years' },
    { label: 'eGFR', value: formatValue(result.kidney_function.egfr_2021), unit: 'mL/min/1.73 m2' },
  ]

  page.push(
    pdfRect(0, 0, pageWidth, pageHeight, pale),
    pdfRect(0, 742, pageWidth, 50, teal),
    pdfText(42, 762, 'NephroCare CKD Prediction System', 15, '1 1 1'),
    pdfText(430, 762, `Generated ${now.toLocaleDateString()}`, 9, '0.85 0.95 0.93'),
    pdfText(248, 686, 'YOUR RESULTS', 28, teal),
  )

  vitals.forEach((item, index) => {
    const x = 62 + index * 126
    page.push(
      pdfText(x, 636, item.value, 18, index === 0 || index === 3 ? red : teal),
      pdfText(x + 36, 638, item.unit, 8, teal),
      pdfText(x, 620, item.label.toUpperCase(), 8, teal)
    )
  })

  page.push(
    pdfRect(60, 574, 190, 1, teal),
    pdfRect(250, 568, 112, 13, teal),
    pdfText(280, 572, 'ASSESSMENT', 8, '1 1 1'),
    pdfRect(362, 574, 190, 1, teal),
    pdfText(270, 508, `STAGE ${report.stageNumber}`, 32, red),
    pdfText(198, 486, report.stageSeverity.toUpperCase(), 11, red)
  )

  page.push(
    pdfText(83, 440, 'CKD STAGES', 10, teal),
    pdfText(220, 440, 'GLOMERULAR FILTRATION RATE', 10, teal)
  )
  stageOrder.forEach((stage, index) => {
    const y = 410 - index * 28
    const active = stage === report.stageKey
    page.push(
      pdfRect(90, y - 8, 96, 20, active ? red : '0.98 0.88 0.76'),
      pdfText(124, y - 1, stageNumber(stage), 14, active ? '1 1 1' : teal),
      pdfRect(226, y - 8, 96, 20, active ? red : '0.98 0.88 0.76'),
      pdfText(256, y - 1, stageGfrBand(stage), 10, active ? '1 1 1' : '1 1 1')
    )
  })

  page.push(
    pdfWrappedText(360, 440, modelSourceSummary(result), 10, teal, 42),
    pdfRect(380, 390, 176, 22, teal),
    pdfText(430, 398, 'ESTIMATED CKD RISK', 9, '1 1 1'),
    pdfText(406, 352, formatPercent(report.riskPercent), 30, teal),
    pdfText(360, 304, 'This estimate is for screening support and should be discussed with a clinician.', 11, teal)
  )

  page.push(
    pdfText(74, 226, 'LAB MARKER FLAGS', 12, teal),
    pdfText(324, 226, 'RECOMMENDATIONS', 12, teal)
  )
  if (result.warnings.length) {
    result.warnings.slice(0, 5).forEach((item, index) => {
      page.push(pdfWrappedText(74, 206 - index * 28, `${item.label}: ${item.value} ${item.unit} is ${item.status}. Range ${item.range}.`, 9, '0 0 0', 36))
    })
  } else {
    page.push(pdfWrappedText(74, 206, 'No submitted markers are outside the screening ranges.', 9, '0 0 0', 36))
  }
  result.recommendations.slice(0, 5).forEach((item, index) => {
    page.push(pdfWrappedText(324, 206 - index * 28, item, 9, '0 0 0', 38))
  })

  page.push(
    pdfRect(42, 50, 528, 1, '0.76 0.81 0.78'),
    pdfWrappedText(42, 32, 'Care note: This report supports screening conversations and does not replace clinician diagnosis or treatment advice.', 8, muted, 92)
  )

  const pages = [page.join('\n')]
  return createPdfBlob(pages)
}

function createPdfBlob(pages: string[]) {
  const objects = Array<string>(3 + pages.length * 2)
  const pageObjectNumbers = pages.map((_, index) => 4 + index * 2)
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map(number => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  pages.forEach((content, index) => {
    const pageObjectIndex = 3 + index * 2
    const contentObjectIndex = pageObjectIndex + 1
    const contentObjectNumber = contentObjectIndex + 1
    objects[pageObjectIndex] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    objects[contentObjectIndex] = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function downloadPredictionPdf(result: PredictionResult) {
  const blob = buildPredictionPdf(result)
  const now = new Date()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `nephrocare-ckd-risk-${now.toISOString().slice(0, 10)}.pdf`
  link.click()
  URL.revokeObjectURL(link.href)
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [page, setPage] = useState<'home' | 'ckd-prediction' | 'food-tools'>('home')
  const [form, setForm] = useState<PredictionForm>(initialPredictionForm)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [predictionStep, setPredictionStep] = useState<'calculator' | 'result'>('calculator')
  const [uploadStatus, setUploadStatus] = useState('')
  const [extractedFields, setExtractedFields] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [foodTab, setFoodTab] = useState<'scan' | 'check' | 'recommend' | 'plan'>('scan')
  const [foodName, setFoodName] = useState('')
  const [foodStage, setFoodStage] = useState<'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5'>('G3a')
  const [foodHypertension, setFoodHypertension] = useState<'yes' | 'no'>('no')
  const [foodDiabetes, setFoodDiabetes] = useState<'yes' | 'no'>('no')
  const [foodLoading, setFoodLoading] = useState(false)
  const [foodError, setFoodError] = useState('')
  const [foodScan, setFoodScan] = useState<FoodScanResponse | null>(null)
  const [foodCheck, setFoodCheck] = useState<FoodAnalysis | null>(null)
  const [foodRecommendations, setFoodRecommendations] = useState<FoodAnalysis[]>([])
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null)

  const scrollTo = (id: string) => {
    setPage('home')
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 0)
    setMobileOpen(false)
    setFeaturesOpen(false)
  }

  const showPage = (nextPage: 'home' | 'ckd-prediction' | 'food-tools') => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMobileOpen(false)
    setFeaturesOpen(false)
  }

  const submitPrediction = async (event: FormEvent) => {
    event.preventDefault()
    if (numericPredictionKeys.some(key => form[key] === '') || !form.sex || !form.hypertension || !form.diabetes_mellitus) {
      setError('Fill all values before calculating CKD risk.')
      return
    }
    setLoading(true)
    setError('')
    const predictionPayload = {
      ...form,
      ...Object.fromEntries(numericPredictionKeys.map(key => [key, Number(form[key])])),
    }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictionPayload),
      })
      if (!response.ok) throw new Error('Prediction service is unavailable.')
      setResult(await response.json())
      setPredictionStep('result')
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
    } catch {
      setError('The risk check is unavailable right now. Please make sure the NephroCare service is running, then try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReportUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadStatus(`Reading ${file.name}...`)
    setExtractedFields([])
    try {
      const payload = new FormData()
      payload.append('report', file)
      const response = await fetch('http://127.0.0.1:8000/api/extract-report', { method: 'POST', body: payload })
      if (!response.ok) throw new Error('Report extraction failed.')
      const data: { values?: Partial<PredictionForm>; matched_fields?: string[]; warning?: string | null } = await response.json()
      const values = data.values ?? {}
      setForm(current => ({ ...current, ...values }))
      setExtractedFields(data.matched_fields ?? [])
      setUploadStatus(data.warning ? data.warning : `${data.matched_fields?.length ?? 0} values autofilled from the report.`)
    } catch {
      setUploadStatus('Could not read this report. Make sure the API is running, or enter values manually.')
    } finally {
      event.target.value = ''
    }
  }

  const handleFoodCamera = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFoodLoading(true)
    setFoodError('')
    setFoodScan(null)
    try {
      const payload = new FormData()
      payload.append('image', file)
      const response = await fetch('http://127.0.0.1:8000/api/scan-food-image', { method: 'POST', body: payload })
      const data: FoodScanResponse & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not scan the image.')
      setFoodScan(data)
      setFoodTab('scan')
    } catch (err) {
      setFoodError(err instanceof Error ? err.message : 'Could not scan the image.')
    } finally {
      event.target.value = ''
      setFoodLoading(false)
    }
  }

  const checkFood = async () => {
    if (!foodName.trim()) {
      setFoodError('Enter a food name.')
      return
    }
    setFoodLoading(true)
    setFoodError('')
    try {
      const response = await fetch('http://127.0.0.1:8000/api/food-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_name: foodName }),
      })
      const data: FoodAnalysis & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Food not found.')
      setFoodCheck(data)
      setFoodTab('check')
    } catch (err) {
      setFoodError(err instanceof Error ? err.message : 'Food not found.')
    } finally {
      setFoodLoading(false)
    }
  }

  const loadRecommendations = async () => {
    setFoodLoading(true)
    setFoodError('')
    try {
      const response = await fetch('http://127.0.0.1:8000/api/food-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: result ? result.kidney_function.egfr_category : foodStage,
          hypertension: foodHypertension,
          diabetes_mellitus: foodDiabetes,
          limit: 6,
        }),
      })
      const data: FoodPlanResponse & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load recommendations.')
      setFoodRecommendations(data.recommendations)
      setFoodTab('recommend')
    } catch (err) {
      setFoodError(err instanceof Error ? err.message : 'Could not load recommendations.')
    } finally {
      setFoodLoading(false)
    }
  }

  const loadMealPlan = async () => {
    setFoodLoading(true)
    setFoodError('')
    try {
      const response = await fetch('http://127.0.0.1:8000/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: result ? result.kidney_function.egfr_category : foodStage,
          hypertension: foodHypertension,
          diabetes_mellitus: foodDiabetes,
        }),
      })
      const data: MealPlanResponse & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load meal plan.')
      setMealPlan(data)
      setFoodTab('plan')
    } catch (err) {
      setFoodError(err instanceof Error ? err.message : 'Could not load meal plan.')
    } finally {
      setFoodLoading(false)
    }
  }

  const updateNumber = (key: keyof PredictionForm, value: string) => {
    setForm({ ...form, [key]: value === '' ? '' : Number(value) })
  }

  const updateChoice = (key: keyof PredictionForm, value: string) => {
    setForm({ ...form, [key]: value })
  }

  const closeMenus = () => {
    setMobileOpen(false)
    setFeaturesOpen(false)
  }

  const activeReport = result ? reportData(result) : null

  return <div className="site-shell">
    <header className="header">
      <a className="brand" href="#top" aria-label="NephroCare home" onClick={event => { event.preventDefault(); showPage('home') }}>
        <img className="brand-photo-logo" src="/logo.png" alt="" />
        <span className="brand-text">NephroCare<small>CKD PREDICTION SYSTEM</small></span>
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        <button className="nav-link feature-trigger" onClick={() => setFeaturesOpen(!featuresOpen)} aria-expanded={featuresOpen}>Features <span className={featuresOpen ? 'chevron up' : 'chevron'}>⌄</span></button>
        <button className="nav-link" onClick={() => scrollTo('about')}>About</button>
        <button className="nav-link" onClick={() => scrollTo('resources')}>Resources</button>
      </nav>
      <div className="header-actions">
        <button className="login-button">Login</button>
        <button className="signup-button">Sign up</button>
      </div>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu"><Icon name={mobileOpen ? 'x' : 'menu'} /></button>

      {featuresOpen && <div className="mega-menu">
        <div className="mega-links">{features.map(feature => <button type="button" key={feature.title} onClick={feature.title === 'CKD Risk Prediction' ? () => showPage('ckd-prediction') : feature.title === 'Food Safety Checker' || feature.title === 'Food Recommendation' || feature.title === 'AI Meal Planner' ? () => showPage('food-tools') : closeMenus}><span><Icon name={feature.icon} size={18} /></span>{feature.title}</button>)}</div>
      </div>}

      {mobileOpen && <div className="mobile-panel">
        <button type="button" onClick={() => showPage('ckd-prediction')}>Features</button><button onClick={() => scrollTo('about')}>About</button><button onClick={() => showPage('food-tools')}>Food tools</button><button onClick={() => scrollTo('resources')}>Resources</button>
      </div>}
    </header>

    {page === 'home' ? <main id="top">
      <section className="hero hero-openmrs">
        <span className="hero-shape hero-shape-left" aria-hidden="true" />
        <span className="hero-shape hero-shape-right" aria-hidden="true" />
        <div className="hero-copy">
          <h1>NephroCare<br />for <strong>CKD</strong><br />prediction and <em>everyday care</em></h1>
          <p className="hero-text">An AI-powered CKD care companion for early detection, stage screening, lab report support, kidney-friendly nutrition, meal planning, reminders, symptom tracking, monitoring alerts, and doctor-ready summaries.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => showPage('ckd-prediction')}>Check CKD risk <Icon name="arrow" size={18} /></button></div>
        </div>
        <div className="hero-media" aria-hidden="true">
          <div className="hero-image-card">
            <video src="/vid.mp4" autoPlay muted loop playsInline />
          </div>
        </div>
      </section>

      <section className="ckd-about-section" id="about">
        <div className="ckd-about-image" aria-hidden="true">
          <img src="/image1.jpg" alt="" />
        </div>
        <div className="ckd-about-heading">
          <span className="eyebrow">Kidney health basics</span>
          <h2>About chronic kidney disease (CKD)</h2>
          <p>Your kidneys perform many important functions that help keep your body balanced and healthy. They help with:</p>
          <ul>
            <li>Removing waste products and extra water from your body</li>
            <li>Supporting the production of red blood cells</li>
            <li>Balancing important minerals in your blood</li>
            <li>Helping control your blood pressure</li>
            <li>Keeping your bones healthy</li>
          </ul>
          <p>Chronic kidney disease (CKD) happens when the kidneys have been damaged for at least 3 months and can no longer do their jobs as well as they should.</p>
          <p>CKD can also increase the risk of other health problems, including heart disease and stroke. It usually develops slowly and may cause very few symptoms in the early stages. CKD is divided into 5 stages to help guide care and treatment decisions.</p>
        </div>
      </section>

      <section className="about-section causes-section">
        <div className="causes-heading">
          <span className="eyebrow">Kidney info</span>
          <h2>Common causes of CKD</h2>
        </div>
        <div className="causes-copy">
          <p>The two leading causes of chronic kidney disease are diabetes and high blood pressure. CKD can also be connected to inherited conditions, immune disorders, kidney stones, infections, and other kidney or urinary tract problems.</p>
          <p>Early screening helps because CKD often develops slowly and may have few symptoms at first.</p>
        </div>
        <div className="causes-chart" aria-label="CKD cause percentages">
          <div className="ckd-ring"><span><b>CKD</b></span></div>
        </div>
        <div className="cause-list">
          <div><span className="cause-dot diabetes" /><strong>Diabetes</strong><b>45%</b></div>
          <div><span className="cause-dot pressure" /><strong>Hypertension</strong><b>25%</b></div>
          <div><span className="cause-dot immune" /><strong>Immune / inherited</strong><b>15%</b></div>
          <div><span className="cause-dot other" /><strong>Other causes</strong><b>15%</b></div>
        </div>
      </section>

      <section className="video-section" aria-label="Kidney education videos">
        <span className="eyebrow">Video gallery</span>
        <h2>Learn kidney basics visually.</h2>
        <div className="video-grid">
          <article>
            <iframe title="Chronic kidney disease overview video" src="https://www.youtube.com/embed/FN3MFhYPWWo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            <h3>CKD overview</h3>
            <p>Understand what CKD means and why early screening matters.</p>
          </article>
          <article>
            <iframe title="eGFR and uACR kidney number video" src="https://www.youtube.com/embed/OSNXwuvP910" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            <h3>Kidney numbers</h3>
            <p>Learn how eGFR and urine albumin help describe kidney health.</p>
          </article>
          <article>
            <iframe title="CKD nutrition and kidney diet video" src="https://www.youtube.com/embed/ZC3FMcNLtqg" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            <h3>Food and daily care</h3>
            <p>Explore kidney-friendly nutrition and everyday support habits.</p>
          </article>
        </div>
      </section>
    </main> : page === 'food-tools' ? <main className="food-page" id="top">
      <section className="food-hero">
        <button className="back-button" onClick={() => showPage('home')}><Icon name="arrow" size={16} /> Back</button>
        <span className="eyebrow">Food safety checker</span>
        <h1>Food care tools</h1>
        <p>Use the camera to scan food, check a single item, get kidney-friendly recommendations, or build a meal plan.</p>
      </section>
      <section className="nutrition-section nutrition-section-page">
        <div className="nutrition-tabs" role="tablist" aria-label="Food tools">
          {[
            ['scan', 'Camera check'],
            ['check', 'Food check'],
            ['recommend', 'Recommendations'],
            ['plan', 'Meal plan'],
          ].map(([key, label]) => <button key={key} type="button" className={foodTab === key ? 'active' : ''} onClick={() => setFoodTab(key as typeof foodTab)}>{label}</button>)}
        </div>
        <div className="nutrition-grid">
          <div className="nutrition-panel">
            {foodError && <p className="nutrition-error">{foodError}</p>}
            {foodLoading && <p className="nutrition-status">Working...</p>}
            {foodTab === 'scan' && <>
              <h3>Scan a food photo</h3>
              <p>Open your camera or upload a photo. The scanner will identify visible foods and show the kidney rating for each one.</p>
              <label className="camera-button">
                <Icon name="camera" size={18} /> Open camera or upload image
                <input type="file" accept="image/*" capture="environment" onChange={handleFoodCamera} />
              </label>
              {foodScan && <>
                <div className="nutrition-list">
                  <b>Detected foods</b>
                  <p>{foodScan.detected_foods.join(', ')}</p>
                </div>
                {foodScan.analyses.map(item => <div className="nutrition-item" key={item.food_name}><span>{item.food_name}</span><small>{item.status} · {item.kidney_score}/100</small></div>)}
              </>}
            </>}

            {foodTab === 'check' && <>
              <h3>Check one food</h3>
              <p>Type a food name to see whether it is safe, moderate, or risky for CKD.</p>
              <div className="nutrition-inline">
                <input value={foodName} onChange={event => setFoodName(event.target.value)} placeholder="Example: banana" />
                <button type="button" onClick={checkFood} disabled={foodLoading}>Check</button>
              </div>
              {foodCheck && <div className="nutrition-summary">
                <strong>{foodCheck.food_name}</strong>
                <p>{foodCheck.status} · Kidney score {foodCheck.kidney_score}/100</p>
                <small>Potassium {foodCheck.potassium_mg} mg · Phosphorus {foodCheck.phosphorus_mg} mg · Sodium {foodCheck.sodium_mg} mg</small>
              </div>}
            </>}

            {foodTab === 'recommend' && <>
              <h3>Food recommendations</h3>
              <p>Choose a CKD stage and risk flags to get better food suggestions.</p>
              <div className="nutrition-inline">
                <select value={foodStage} onChange={event => setFoodStage(event.target.value as typeof foodStage)}>
                  <option value="G1">G1</option><option value="G2">G2</option><option value="G3a">G3a</option><option value="G3b">G3b</option><option value="G4">G4</option><option value="G5">G5</option>
                </select>
                <select value={foodHypertension} onChange={event => setFoodHypertension(event.target.value as 'yes' | 'no')}>
                  <option value="no">No BP issue</option>
                  <option value="yes">High BP</option>
                </select>
                <select value={foodDiabetes} onChange={event => setFoodDiabetes(event.target.value as 'yes' | 'no')}>
                  <option value="no">No diabetes</option>
                  <option value="yes">Diabetes</option>
                </select>
                <button type="button" onClick={loadRecommendations} disabled={foodLoading}>Show</button>
              </div>
              {foodRecommendations.length > 0 && <div className="nutrition-list">
                {foodRecommendations.map(item => <div className="nutrition-item" key={item.food_name}><span>{item.food_name}</span><small>{item.category} · {item.status}</small></div>)}
              </div>}
            </>}

            {foodTab === 'plan' && <>
              <h3>AI meal planner</h3>
              <p>Build a simple day plan from the same kidney-friendly food data.</p>
              <div className="nutrition-inline">
                <select value={foodStage} onChange={event => setFoodStage(event.target.value as typeof foodStage)}>
                  <option value="G1">G1</option><option value="G2">G2</option><option value="G3a">G3a</option><option value="G3b">G3b</option><option value="G4">G4</option><option value="G5">G5</option>
                </select>
                <select value={foodHypertension} onChange={event => setFoodHypertension(event.target.value as 'yes' | 'no')}>
                  <option value="no">No BP issue</option>
                  <option value="yes">High BP</option>
                </select>
                <select value={foodDiabetes} onChange={event => setFoodDiabetes(event.target.value as 'yes' | 'no')}>
                  <option value="no">No diabetes</option>
                  <option value="yes">Diabetes</option>
                </select>
                <button type="button" onClick={loadMealPlan} disabled={foodLoading}>Build plan</button>
              </div>
              {mealPlan && <div className="meal-plan">
                {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map(slot => <div key={slot}>
                  <b>{slot}</b>
                  <p>{mealPlan[slot].map(item => item.food_name).join(', ')}</p>
                </div>)}
                <ul>{mealPlan.notes.map(note => <li key={note}>{note}</li>)}</ul>
              </div>}
            </>}
          </div>
        </div>
      </section>
    </main> : <main className={predictionStep === 'result' && result ? 'prediction-page result-page kfre-page' : 'prediction-page calculator-page'} id="top">
      {predictionStep === 'result' && result && activeReport ? <>
        <section className="result-hero">
          <button className="back-button" onClick={() => setPredictionStep('calculator')}><Icon name="arrow" size={16} /> Back</button>
          <div className="result-actions">
            <button type="button" onClick={() => downloadPredictionPdf(result)}><Icon name="report" size={17} /> Download PDF</button>
            <button type="button" onClick={() => showPage('home')}>Back home</button>
          </div>
        </section>
        <section className="kfre-report">
          <h1>Your results</h1>
          <div className="kfre-vitals" aria-label="Submitted prediction values">
            <div><Icon name="lab" size={25} /><strong>{formatValue(result.input.urine_albumin)}</strong><small>mg/g</small><span>Urine albumin</span></div>
            <div><Icon name="user" size={25} /><strong>{activeReport.sexShort}</strong><span>Sex</span></div>
            <div><Icon name="activity" size={25} /><strong>{formatValue(result.input.age)}</strong><span>Age</span></div>
            <div><Icon name="heart" size={25} /><strong>{formatValue(result.kidney_function.egfr_2021)}</strong><small>mL/min/1.73 m2</small><span>eGFR</span></div>
          </div>
          <div className="kfre-divider"><span>Assessment</span></div>
          <div className="kfre-stage-heading">
            <h2>Stage {activeReport.stageNumber}</h2>
            <p>{activeReport.stageSeverity}</p>
          </div>
          <div className="kfre-assessment-grid">
            <div className="kfre-kidney-scale">
              <h3>CKD stages</h3>
              <div className="kidney-scale-body">
                <div className="kidney-list">
                  {stageOrder.map(stage => <div key={stage} className={stage === activeReport.stageKey ? 'active' : ''}><span>{stageNumber(stage)}</span><small>{stage === 'G1' ? 'No or slight' : stage === 'G2' ? 'Mild' : stage === 'G3a' || stage === 'G3b' ? 'Moderate' : stage === 'G4' ? 'Severe' : 'Failure range'}</small></div>)}
                </div>
                <div className="gfr-list">
                  <h3>Glomerular filtration rate</h3>
                  {stageOrder.map(stage => <div key={stage} className={stage === activeReport.stageKey ? 'active' : ''}><span>{stageGfrBand(stage)}</span></div>)}
                </div>
              </div>
            </div>
            <div className="kfre-risk-summary">
              <p>{modelSourceSummary(result)}</p>
              <div className="risk-years">
                <div><span>Estimated CKD risk</span><strong>{formatPercent(activeReport.riskPercent)}</strong></div>
              </div>
              <h3>What this means</h3>
              <ul>
                <li>This is a screening estimate based on the values you entered.</li>
                <li>Please discuss this result with your doctor for diagnosis and next steps.</li>
              </ul>
            </div>
          </div>
          <div className="kfre-detail-grid">
            <div><h3>Lab marker flags</h3>{result.warnings.length ? result.warnings.map(item => <p key={item.key}><b>{item.label}</b> is {item.status} at {item.value} {item.unit}. Range: {item.range}</p>) : <p>No submitted markers are outside the screening ranges.</p>}</div>
            <div><h3>Recommendations</h3>{result.recommendations.map(item => <p key={item}>{item}</p>)}</div>
          </div>
        </section>
      </> : <>
        <section className="calculator-hero">
          <span className="eyebrow">CKD</span>
          <h1>Risk calculation</h1>
          <p>If you do not have the information required below talk to your doctor.</p>
        </section>
        <section className="calculator-shell">
          <div className="calculator-panel">
            <form className="calculator-form" onSubmit={submitPrediction}>
              <div className="report-upload">
                <div><span className="eyebrow">Optional report autofill</span><p>Upload a PDF, image, text, or CSV report to prefill matching values.</p></div>
                <label><Icon name="report" size={20} /> Choose report<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv" onChange={handleReportUpload} /></label>
              </div>
              {uploadStatus && <p className="upload-status">{uploadStatus}{extractedFields.length ? ` Fields: ${extractedFields.map(field => labInputLabels[field as keyof PredictionForm] ?? field).join(', ')}.` : ''}</p>}
              <div className="calculator-grid">
                {[
                  ['age','Age','Yrs'], ['sex','Sex',''], ['urine_albumin','Urine albumin : creatinine ratio','mg/g'], ['blood_pressure','Blood pressure','mmHg'],
                  ['blood_glucose_random','Blood glucose random','mg/dL'], ['blood_urea','Blood urea','mg/dL'], ['serum_creatinine','Serum creatinine','mg/dL'], ['sodium','Sodium','mmol/L'],
                  ['potassium','Potassium','mmol/L'], ['hemoglobin','Hemoglobin','g/dL'], ['hypertension','Hypertension',''], ['diabetes_mellitus','Diabetes mellitus',''],
                ].map(([key, label, unit]) => key === 'sex' || key === 'hypertension' || key === 'diabetes_mellitus'
                  ? <label key={key}><span>{label}</span><select required value={form[key as keyof PredictionForm]} onChange={event => updateChoice(key as keyof PredictionForm, event.target.value)}><option value="" disabled>Select</option>{key === 'sex' ? <><option value="female">Female</option><option value="male">Male</option></> : <><option value="no">No</option><option value="yes">Yes</option></>}</select></label>
                  : <label key={key}><span>{label}</span><div><input type="number" step="any" value={form[key as keyof PredictionForm]} onChange={event => updateNumber(key as keyof PredictionForm, event.target.value)} required /><small>{unit}</small></div></label>)}
              </div>
              <div className="calculator-actions">
                <button type="button" onClick={() => { setForm(blankPredictionForm); setResult(null); setUploadStatus(''); setExtractedFields([]); setError('') }}>Reset</button>
                <button className="prediction-submit" disabled={loading}>{loading ? 'Calculating...' : 'Calculate risk'}</button>
              </div>
              {error && <p className="prediction-error">{error}</p>}
            </form>
            <section className="calculator-note">
              <h2>About this calculator</h2>
              <p>NephroCare estimates CKD screening risk, eGFR category, lab marker flags, and stage information from the current clinical values. The result supports screening conversations and does not replace clinician diagnosis.</p>
            </section>
          </div>
        </section>
      </>}
    </main>}

    <footer id="resources">
      <div className="footer-main">
        <div className="footer-intro">
          <a className="brand footer-brand" href="#top" onClick={event => { event.preventDefault(); showPage('home') }}>
            <img className="footer-logo" src="/logo.png" alt="" />
            <span className="brand-text">NephroCare<small>CKD PREDICTION SYSTEM</small></span>
          </a>
          <p>Kidney health screening support for patients and care conversations.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <button type="button" onClick={() => showPage('home')}>Home</button>
          <button type="button" onClick={() => scrollTo('about')}>About CKD</button>
          <button type="button" onClick={() => showPage('ckd-prediction')}>Check CKD risk</button>
        </nav>
        <p className="footer-care-note">Screening results are not a diagnosis. Please discuss health concerns and next steps with a qualified clinician.</p>
      </div>
      <div className="footer-bottom">
        <span>© 2026 NephroCare</span>
        <span>Privacy · Terms · Medical disclaimer</span>
      </div>
    </footer>
  </div>
}

export default App
