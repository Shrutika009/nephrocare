from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

app = FastAPI()

model = joblib.load("models/ckd_risk_prediction_model.joblib")
scaler = joblib.load("models/uci_scaler.joblib")
feature_names = joblib.load("models/uci_feature_names.joblib")


class PatientData(BaseModel):
    age: float
    blood_pressure: float
    blood_glucose_random: float
    blood_urea: float
    serum_creatinine: float
    sodium: float
    potassium: float
    hemoglobin: float
    hypertension: int
    diabetes_mellitus: int


@app.get("/")
def home():
    return {"message": "NephroCare API Running"}


@app.post("/predict")
def predict(data: PatientData):

    values = [[
        data.age,
        data.blood_pressure,
        data.blood_glucose_random,
        data.blood_urea,
        data.serum_creatinine,
        data.sodium,
        data.potassium,
        data.hemoglobin,
        data.hypertension,
        data.diabetes_mellitus
    ]]

    df = pd.DataFrame(values, columns=feature_names)

    scaled = scaler.transform(df)

    prediction = model.predict(scaled)[0]

    probability = float(model.predict_proba(scaled)[0][1])

    return {
        "ckd_prediction": int(prediction),
        "risk_probability": probability
    }