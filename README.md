# NephroCare

**NephroCare - an AI-powered CKD care companion for early detection, personalized nutrition, and continuous monitoring.**

## Problem Statement

Chronic Kidney Disease (CKD) is a silent and progressive disease that often goes undetected until significant kidney damage has occurred. Patients face delayed diagnosis, limited access to nephrologists, difficulty understanding medical reports, lack of personalized nutrition guidance, and inadequate long-term monitoring. This can lead to worsening health outcomes and higher healthcare costs.

## Solution

NephroCare brings CKD risk prediction, CKD stage screening, lab report support, nutrition guidance, and monitoring into one patient-focused platform.

## Core Features

- **CKD Risk Prediction:** predicts CKD / No CKD from clinical values such as creatinine, hemoglobin, potassium, blood pressure, albumin, diabetes, and hypertension.
- **CKD Stage Screening:** estimates kidney function stage using eGFR and urine albumin-creatinine ratio.
- **Lab Report Analysis:** helps explain kidney-related values such as creatinine, eGFR, blood urea, sodium, potassium, and hemoglobin.
- **Food Recommendation:** suggests kidney-friendly foods based on CKD stage and health conditions.
- **Food Safety Checker:** evaluates whether a food item is Safe, Moderate, or Risky for CKD patients by analyzing nutritional content.
- **AI Meal Planner:** generates personalized daily meal plans including breakfast, lunch, dinner, and snacks tailored to kidney health needs.
- **WhatsApp Health Assistant:** sends reminders for medications, appointments, lab tests, water intake, and dietary adherence through WhatsApp.
- **Symptom Tracker:** monitors symptoms such as fatigue, swelling, nausea, appetite loss, and changes in urination.
- **Monitoring Dashboard:** tracks kidney health metrics such as eGFR, creatinine, blood pressure, symptoms, and progress over time.
- **Early Warning Alerts:** notifies users about worsening kidney function, abnormal lab values, missed checkups, or high-risk symptom patterns.
- **Doctor Summary Report:** generates a concise health summary with CKD stage, lab results, symptom history, and key trends for doctor consultations.

## Datasets Used

### 1. UCI Chronic Kidney Disease Dataset

- Source: UCI Machine Learning Repository
- Processed file: `data/processed/uci_ckd.csv`
- Records: **400 patients**
- Use: **CKD risk prediction model**

### 2. NHANES 2017-March 2020 Dataset

- Source: CDC NHANES public dataset
- Processed file: `data/processed/nhanes_ckd.csv`
- Records: **9,693 adults**
- Use: **CKD stage screening model**
- Generated labels use eGFR and urine ACR:
  - No CKD screen: 6,644
  - CKD screen positive: 1,521
  - Insufficient kidney data: 1,528

### 3. Indian CKD Foods Dataset

- Processed file: `data/processed/indian_ckd_foods.csv`
- Records: **527 foods**
- Use: **food safety checks, food recommendations, and meal planning**
- Includes Indian food names/categories with protein, energy, potassium, phosphorus, sodium, and CKD safety labels.

## Run Dataset Extraction

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/extract_datasets.py
```

## Note

The NHANES stage labels are screening labels, not confirmed medical diagnoses. CKD diagnosis requires clinical confirmation and persistence over time.
