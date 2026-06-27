export type Page = 'home' | 'ckd-prediction' | 'food-tools' | 'login' | 'signup' | 'dashboard' | 'ultrasound' | 'doctor-summary' | 'alerts' | 'lab-report' | 'wearable' | 'chatbot'

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
  image_url?: string
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

export type TelemetryData = {
  timestamp: string;
  heart_rate: number;
  hrv: number;
  spo2: number;
  skin_temp: number;
  sweat_conductivity: number;
  bioimpedance: number;
  ecg_anomaly: boolean;
  kidney_stress_index: number;
  electrolyte_risk: 'Low' | 'Moderate' | 'High';
  hydration_status: 'Hydrated' | 'Mild Dehydration' | 'Severe Dehydration';
  fluid_retention: 'Normal' | 'Mild Retention' | 'Severe Retention';
  hyperkalemia_pattern: boolean;
  t_wave_amplitude?: number;
  qrs_amplitude?: number;
}

export type WearableResponse = {
  current: TelemetryData;
  history: TelemetryData[];
  scenario: string;
}

