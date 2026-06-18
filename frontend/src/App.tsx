import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { API_BASE_URL, blankPredictionForm, initialPredictionForm, numericPredictionKeys } from './constants'
import { FoodToolsPage, type FoodStage, type FoodTab, type YesNo } from './pages/FoodToolsPage'
import { HomePage } from './pages/HomePage'
import { PredictionPage, type PredictionStep } from './pages/PredictionPage'
import type { FoodAnalysis, FoodPlanResponse, FoodScanResponse, MealPlanResponse, Page, PredictionForm, PredictionResult } from './types'
import { reportData } from './utils/format'

function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [page, setPage] = useState<Page>('home')
  const [form, setForm] = useState<PredictionForm>(initialPredictionForm)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [predictionStep, setPredictionStep] = useState<PredictionStep>('calculator')
  const [uploadStatus, setUploadStatus] = useState('')
  const [extractedFields, setExtractedFields] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [foodTab, setFoodTab] = useState<FoodTab>('scan')
  const [foodName, setFoodName] = useState('')
  const [foodStage, setFoodStage] = useState<FoodStage>('G3a')
  const [foodHypertension, setFoodHypertension] = useState<YesNo>('no')
  const [foodDiabetes, setFoodDiabetes] = useState<YesNo>('no')
  const [foodLoading, setFoodLoading] = useState(false)
  const [foodError, setFoodError] = useState('')
  const [foodScan, setFoodScan] = useState<FoodScanResponse | null>(null)
  const [foodCheck, setFoodCheck] = useState<FoodAnalysis | null>(null)
  const [foodRecommendations, setFoodRecommendations] = useState<FoodAnalysis[]>([])
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null)
  const [foodImagePreview, setFoodImagePreview] = useState('')

  const closeMenus = () => {
    setMobileOpen(false)
    setFeaturesOpen(false)
  }

  const scrollTo = (id: string) => {
    setPage('home')
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 0)
    closeMenus()
  }

  const showPage = (nextPage: Page) => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    closeMenus()
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
      const response = await fetch(`${API_BASE_URL}/api/predict`, {
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
      const response = await fetch(`${API_BASE_URL}/api/extract-report`, { method: 'POST', body: payload })
      if (!response.ok) throw new Error('Report extraction failed.')
      const data: { values?: Partial<PredictionForm>; matched_fields?: string[]; warning?: string | null } = await response.json()
      setForm(current => ({ ...current, ...(data.values ?? {}) }))
      setExtractedFields(data.matched_fields ?? [])
      setUploadStatus(data.warning ? data.warning : `${data.matched_fields?.length ?? 0} values autofilled from the report.`)
    } catch {
      setUploadStatus('Could not read this report. Make sure the API is running, or enter values manually.')
    } finally {
      event.target.value = ''
    }
  }

  const scanFoodImage = async (image: Blob, filename: string) => {
    setFoodLoading(true)
    setFoodError('')
    setFoodScan(null)
    setFoodImagePreview(current => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(image)
    })
    try {
      const payload = new FormData()
      payload.append('image', image, filename)
      const response = await fetch(`${API_BASE_URL}/api/scan-food-image`, { method: 'POST', body: payload })
      const data: FoodScanResponse & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not scan the image.')
      setFoodScan(data)
      setFoodTab('scan')
    } catch (err) {
      setFoodError(err instanceof Error ? err.message : 'Could not scan the image.')
    } finally {
      setFoodLoading(false)
    }
  }

  const scanLiveFoodFrame = (image: Blob) => scanFoodImage(image, 'live-food-frame.jpg')

  const checkFood = async (foodNameOverride?: string) => {
    const selectedFood = (foodNameOverride ?? foodName).trim()
    if (!selectedFood) {
      setFoodError('Enter a food name.')
      return
    }
    setFoodName(selectedFood)
    setFoodLoading(true)
    setFoodError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/food-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_name: selectedFood }),
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
      const response = await fetch(`${API_BASE_URL}/api/food-recommendations`, {
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
      const response = await fetch(`${API_BASE_URL}/api/meal-plan`, {
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

  const resetPrediction = () => {
    setForm(blankPredictionForm)
    setResult(null)
    setUploadStatus('')
    setExtractedFields([])
    setError('')
  }

  const activeReport = result ? reportData(result) : null

  return <div className="site-shell">
    <Header
      mobileOpen={mobileOpen}
      featuresOpen={featuresOpen}
      setMobileOpen={setMobileOpen}
      setFeaturesOpen={setFeaturesOpen}
      showPage={showPage}
      scrollTo={scrollTo}
      closeMenus={closeMenus}
    />

    {page === 'home' && <HomePage showPage={showPage} />}
    {page === 'food-tools' && <FoodToolsPage
      foodTab={foodTab}
      setFoodTab={setFoodTab}
      foodName={foodName}
      setFoodName={setFoodName}
      foodStage={foodStage}
      setFoodStage={setFoodStage}
      foodHypertension={foodHypertension}
      setFoodHypertension={setFoodHypertension}
      foodDiabetes={foodDiabetes}
      setFoodDiabetes={setFoodDiabetes}
      foodLoading={foodLoading}
      foodError={foodError}
      foodScan={foodScan}
      foodCheck={foodCheck}
      foodRecommendations={foodRecommendations}
      mealPlan={mealPlan}
      foodImagePreview={foodImagePreview}
      showPage={showPage}
      scanFoodImage={scanFoodImage}
      scanLiveFoodFrame={scanLiveFoodFrame}
      checkFood={checkFood}
      loadRecommendations={loadRecommendations}
      loadMealPlan={loadMealPlan}
    />}
    {page === 'ckd-prediction' && <PredictionPage
      predictionStep={predictionStep}
      setPredictionStep={setPredictionStep}
      form={form}
      result={result}
      activeReport={activeReport}
      uploadStatus={uploadStatus}
      extractedFields={extractedFields}
      loading={loading}
      error={error}
      showPage={showPage}
      submitPrediction={submitPrediction}
      handleReportUpload={handleReportUpload}
      updateNumber={updateNumber}
      updateChoice={updateChoice}
      resetPrediction={resetPrediction}
    />}

    <Footer showPage={showPage} scrollTo={scrollTo} />
  </div>
}

export default App
