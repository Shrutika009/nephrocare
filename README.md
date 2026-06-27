# NephroCare

**An AI-powered CKD care companion for early detection, personalized nutrition, and continuous monitoring.**

## Problem Statement

Chronic Kidney Disease (CKD) is a silent, progressive condition that often goes undetected until significant kidney damage has occurred. Patients face delayed diagnosis, limited access to nephrologists, difficulty interpreting lab reports, lack of personalized nutrition guidance, and inadequate long-term monitoring — all of which worsen health outcomes and drive up healthcare costs.

## Solution

NephroCare brings CKD risk prediction, stage screening, lab report support, nutrition guidance, and continuous monitoring into one patient-focused platform.

## Core Features

| Feature | Description |
|---|---|
| **CKD Risk Prediction** | Predicts CKD / No CKD from clinical values (creatinine, hemoglobin, potassium, blood pressure, albumin, diabetes, hypertension) |
| **CKD Stage Screening** | Estimates kidney function stage using eGFR and urine albumin-creatinine ratio |
| **Lab Report Analysis** | Explains kidney-related values such as creatinine, eGFR, blood urea, sodium, potassium, and hemoglobin |
| **Food Recommendation** | Suggests kidney-friendly foods based on CKD stage and health conditions |
| **Food Safety Checker** | Evaluates whether a food item is Safe, Moderate, or Risky for CKD patients based on nutritional content |
| **AI Meal Planner** | Generates personalized daily meal plans (breakfast, lunch, dinner, snacks) tailored to kidney health needs |
| **WhatsApp Health Assistant** | Sends reminders for medications, appointments, lab tests, water intake, and dietary adherence |
| **Symptom Tracker** | Monitors symptoms such as fatigue, swelling, nausea, appetite loss, and changes in urination |
| **Monitoring Dashboard** | Tracks eGFR, creatinine, blood pressure, symptoms, and progress over time |
| **Early Warning Alerts** | Flags worsening kidney function, abnormal lab values, missed checkups, or high-risk symptom patterns |
| **Doctor Summary Report** | Generates a concise summary with CKD stage, lab results, symptom history, and key trends for consultations |

## Datasets Used

### 1. UCI Chronic Kidney Disease Dataset
- **Source:** UCI Machine Learning Repository
- **Processed file:** `data/processed/uci_ckd.csv`
- **Records:** 400 patients
- **Use:** CKD risk prediction model

### 2. NHANES 2017–March 2020 Dataset
- **Source:** CDC NHANES public dataset
- **Processed file:** `data/processed/nhanes_ckd.csv`
- **Records:** 9,693 adults
- **Use:** CKD stage screening model
- **Generated labels** (from eGFR and urine ACR):
  - No CKD screen: 6,644
  - CKD screen positive: 1,521
  - Insufficient kidney data: 1,528

### 3. Indian CKD Foods Dataset
- **Processed file:** `data/processed/indian_ckd_foods.csv`
- **Records:** 527 foods
- **Use:** Food safety checks, food recommendations, and meal planning
- Includes Indian food names/categories with protein, energy, potassium, phosphorus, and sodium content, plus CKD safety labels.

## Getting Started

### Prerequisites
- Python 3.x
- pip / venv

### Run Dataset Extraction

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/extract_datasets.py
```

This will populate `data/processed/` with the cleaned CSVs used by the prediction and recommendation models.

##Disclaimer

NHANES stage labels are **screening labels, not confirmed medical diagnoses**. CKD diagnosis requires clinical confirmation and persistence over time. NephroCare is intended to support — not replace — professional medical advice.