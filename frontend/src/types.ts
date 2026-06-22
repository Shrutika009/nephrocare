export type Page = 'home' | 'ckd-prediction' | 'food-tools' | 'login' | 'signup' | 'dashboard' | 'ultrasound' | 'doctor-summary' | 'alerts'

export type PredictionForm = {
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

export type PredictionResult = {
  input: PredictionForm
  model: { source: string; trained_model_available: boolean; model_error?: string | null }
  risk: { probability: number; percent: number; label: string }
  kidney_function: { egfr_2021: number | null; egfr_category: string }
  lab_markers: { key: string; label: string; value: number; unit: string; status: string; range: string }[]
  warnings: { key: string; label: string; value: number; unit: string; status: string; range: string }[]
  recommendations: string[]
}

export type FoodAnalysis = {
  food_name: string
  display_name?: string
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

export type FoodScanResponse = {
  detected_foods: string[]
  analyses: FoodAnalysis[]
  warning?: string | null
}

export type FoodPlanResponse = {
  stage: string
  recommendations: FoodAnalysis[]
}

export type MealPlanResponse = {
  breakfast: FoodAnalysis[]
  lunch: FoodAnalysis[]
  snack: FoodAnalysis[]
  dinner: FoodAnalysis[]
  notes: string[]
}

export type UltrasoundScanResult = {
  image_quality: string
  observations: string[]
  severity: string
  recommendation: string
  error?: string
}

export type ToastType = 'danger' | 'warning' | 'info' | 'success' | 'whatsapp';

export type Toast = {
  id: string
  type: ToastType
  title: string
  message: string
  action?: { label: string; url: string }
}

export type WhatsAppLog = {
  timestamp: string;
  title: string;
  message: string;
  status: 'Sent' | 'Simulated' | 'Failed';
}
