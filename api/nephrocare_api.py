#!/usr/bin/env python3
"""Tiny local API for NephroCare lab-driven CKD risk predictions.

The API loads the notebook-trained artifacts from ./models:
  - ckd_risk_prediction_model.joblib
  - uci_scaler.joblib
  - uci_feature_names.joblib
  - uci_encoders.joblib
"""

from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
import tempfile
import os
from difflib import get_close_matches
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
FOOD_DATA = ROOT / "data" / "processed" / "ifct2017_ckd_foods.csv"

try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except Exception:
    pass

FEATURES = [
    "age",
    "sex",
    "urine_albumin",
    "blood_pressure",
    "blood_glucose_random",
    "blood_urea",
    "serum_creatinine",
    "sodium",
    "potassium",
    "hemoglobin",
    "hypertension",
    "diabetes_mellitus",
]

DEFAULT_LAB = {
    "age": 48,
    "sex": "female",
    "urine_albumin": 30,
    "blood_pressure": 80,
    "blood_glucose_random": 121,
    "blood_urea": 36,
    "serum_creatinine": 1.2,
    "sodium": 138,
    "potassium": 4.4,
    "hemoglobin": 15.4,
    "hypertension": "yes",
    "diabetes_mellitus": "yes",
}

REFERENCE = {
    "urine_albumin": {"unit": "mg/g", "low": 0, "high": 30},
    "serum_creatinine": {"unit": "mg/dL", "low": 0.6, "high": 1.3},
    "blood_urea": {"unit": "mg/dL", "low": 7, "high": 40},
    "sodium": {"unit": "mmol/L", "low": 135, "high": 145},
    "potassium": {"unit": "mmol/L", "low": 3.5, "high": 5.1},
    "hemoglobin": {"unit": "g/dL", "low": 12, "high": 17.5},
    "blood_glucose_random": {"unit": "mg/dL", "low": 70, "high": 180},
    "blood_pressure": {"unit": "mmHg diastolic", "low": 60, "high": 90},
}

MODEL_CACHE: dict[str, Any] | None = None
FOOD_CACHE: Any | None = None

FOOD_ALIASES = {
    "rice": "Rice",
    "milk": "Milk",
    "banana": "Banana",
    "cilantro": "Coriander",
    "coriander": "Coriander",
    "curd": "Curd",
    "yogurt": "Curd",
    "roti": "Wheat",
    "chapati": "Wheat",
    "dal": "Lentil",
    "tea": "Tea",
    "coffee": "Coffee",
}


FIELD_PATTERNS: dict[str, list[str]] = {
    "age": [r"\bage\s*(?:\(yrs?\)|years?)?\s*[:=\-]?\s*(\d{1,3})"],
    "urine_albumin": [
        r"\b(?:urine\s*)?(?:acr|uacr|albumin[\s:/-]*creatinine\s*ratio)\s*[:=\-]?\s*(\d+(?:\.\d+)?)",
        r"\burine\s+albumin\s*[:=\-]?\s*(\d+(?:\.\d+)?)",
    ],
    "blood_pressure": [
        r"\bblood\s+pressure\s*[:=\-]?\s*\d{2,3}\s*/\s*(\d{2,3})",
        r"\bdiastolic\s*(?:bp|blood\s+pressure)?\s*[:=\-]?\s*(\d{2,3})",
    ],
    "blood_glucose_random": [r"\b(?:random\s*)?(?:blood\s*)?glucose\s*[:=\-]?\s*(\d+(?:\.\d+)?)"],
    "blood_urea": [r"\b(?:blood\s+urea|urea|bun)\s*[:=\-]?\s*(\d+(?:\.\d+)?)"],
    "serum_creatinine": [r"\b(?:serum\s*)?creatinine\s*[:=\-]?\s*(\d+(?:\.\d+)?)"],
    "sodium": [r"\bsodium\s*[:=\-]?\s*(\d+(?:\.\d+)?)"],
    "potassium": [r"\bpotassium\s*[:=\-]?\s*(\d+(?:\.\d+)?)"],
    "hemoglobin": [r"\b(?:ha?emoglobin|hgb|hb)\s*[:=\-]?\s*(\d+(?:\.\d+)?)"],
}


def load_model() -> dict[str, Any]:
    global MODEL_CACHE
    if MODEL_CACHE is not None:
        return MODEL_CACHE

    import joblib

    MODEL_CACHE = {
        "available": True,
        "model": joblib.load(MODEL_DIR / "ckd_risk_prediction_model.joblib"),
        "scaler": joblib.load(MODEL_DIR / "uci_scaler.joblib"),
        "features": joblib.load(MODEL_DIR / "uci_feature_names.joblib"),
        "encoders": joblib.load(MODEL_DIR / "uci_encoders.joblib"),
        "error": None,
    }
    return MODEL_CACHE


def load_food_data():
    global FOOD_CACHE
    if FOOD_CACHE is not None:
        return FOOD_CACHE
    import pandas as pd

    FOOD_CACHE = pd.read_csv(FOOD_DATA)
    return FOOD_CACHE


def kidney_score(row: Any) -> float:
    score = 100.0
    score -= float(row["potassium_mg"]) * 0.04
    score -= float(row["phosphorus_mg"]) * 0.035
    score -= float(row["sodium_mg"]) * 0.015
    return round(max(0.0, score), 2)


def food_status(row: Any) -> str:
    potassium = float(row["potassium_mg"])
    phosphorus = float(row["phosphorus_mg"])
    sodium = float(row["sodium_mg"])
    if potassium > 300 or phosphorus > 300 or sodium > 200:
        return "AVOID"
    if potassium > 150 or phosphorus > 150 or sodium > 100:
        return "MODERATE"
    return "SAFE"


def classify_food(row: Any) -> dict[str, Any]:
    return {
        "food_name": str(row["food_name"]),
        "category": str(row.get("category", "")),
        "protein_g": round(float(row["protein_g"]), 2),
        "energy_kcal": round(float(row["energy_kcal"]), 2),
        "potassium_mg": round(float(row["potassium_mg"]), 2),
        "phosphorus_mg": round(float(row["phosphorus_mg"]), 2),
        "sodium_mg": round(float(row["sodium_mg"]), 2),
        "status": food_status(row),
        "kidney_score": kidney_score(row),
    }


def search_food(food_name: str):
    import pandas as pd

    food_df = load_food_data()
    food_name = food_name.lower().strip()
    if not food_name:
        return None

    alias = FOOD_ALIASES.get(food_name)
    if alias:
        result = food_df[food_df["food_name"].str.contains(alias, case=False, na=False)]
        if len(result) > 0:
            return result.head(1)

    direct_match = food_df[food_df["food_name"].str.contains(food_name, case=False, na=False)]
    if len(direct_match) > 0:
        return direct_match.head(1)

    foods = food_df["food_name"].astype(str).tolist()
    match = get_close_matches(food_name, foods, n=1, cutoff=0.75)
    if not match:
        return None
    return food_df[food_df["food_name"] == match[0]].head(1)


def food_adjustment(stage: str, hypertension: bool, diabetes: bool) -> dict[str, int]:
    stage = stage.upper()
    potassium_limit = 150
    phosphorus_limit = 150
    sodium_limit = 100
    if stage in {"G1", "G2"}:
        potassium_limit = 175
        phosphorus_limit = 175
        sodium_limit = 120
    elif stage == "G3A":
        potassium_limit = 155
        phosphorus_limit = 155
        sodium_limit = 110
    elif stage == "G3B":
        potassium_limit = 135
        phosphorus_limit = 135
        sodium_limit = 95
    elif stage == "G4":
        potassium_limit = 120
        phosphorus_limit = 120
        sodium_limit = 90
    elif stage == "G5":
        potassium_limit = 100
        phosphorus_limit = 100
        sodium_limit = 80
    if hypertension:
        sodium_limit = max(70, sodium_limit - 15)
    if diabetes:
        potassium_limit = max(90, potassium_limit - 10)
    return {
        "potassium_mg": potassium_limit,
        "phosphorus_mg": phosphorus_limit,
        "sodium_mg": sodium_limit,
    }


def food_recommendations(stage: str, hypertension: bool, diabetes: bool, limit: int = 6) -> list[dict[str, Any]]:
    import pandas as pd

    food_df = load_food_data().copy()
    limits = food_adjustment(stage, hypertension, diabetes)
    food_df["score"] = (
        100
        - food_df["potassium_mg"] * 0.04
        - food_df["phosphorus_mg"] * 0.035
        - food_df["sodium_mg"] * 0.015
    )
    safe = food_df[
        (food_df["potassium_mg"] <= limits["potassium_mg"]) &
        (food_df["phosphorus_mg"] <= limits["phosphorus_mg"]) &
        (food_df["sodium_mg"] <= limits["sodium_mg"])
    ].sort_values(["score", "protein_g"], ascending=[False, False])
    if len(safe) < limit:
        extra = food_df.sort_values(["score", "protein_g"], ascending=[False, False])
        safe = pd.concat([safe, extra]).drop_duplicates(subset=["food_name"])
    return [classify_food(row) for _, row in safe.head(limit).iterrows()]


def meal_plan(stage: str, hypertension: bool, diabetes: bool) -> dict[str, Any]:
    food_df = load_food_data().copy()
    limits = food_adjustment(stage, hypertension, diabetes)
    food_df["status"] = food_df.apply(food_status, axis=1)
    food_df["score"] = (
        100
        - food_df["potassium_mg"] * 0.04
        - food_df["phosphorus_mg"] * 0.035
        - food_df["sodium_mg"] * 0.015
    )
    filtered = food_df[
        (food_df["status"] == "SAFE")
        & (food_df["potassium_mg"] <= limits["potassium_mg"])
        & (food_df["phosphorus_mg"] <= limits["phosphorus_mg"])
        & (food_df["sodium_mg"] <= limits["sodium_mg"])
    ].sort_values("score", ascending=False)

    if len(filtered) < 4:
        filtered = food_df.sort_values("score", ascending=False)

    picks = [classify_food(row) for _, row in filtered.head(8).iterrows()]
    breakfast = picks[:2]
    lunch = picks[2:4]
    snack = picks[4:6] if len(picks) > 4 else picks[:1]
    dinner = picks[6:8] if len(picks) > 6 else picks[-2:]

    notes = [
        "Keep sodium lower when blood pressure is high.",
        "Choose smaller portions if potassium or phosphorus needs to stay low.",
        "Drink fluids only as advised by your clinician.",
    ]
    if diabetes:
        notes.append("Spread carbohydrates through the day to avoid large sugar spikes.")

    return {
        "breakfast": breakfast,
        "lunch": lunch,
        "snack": snack,
        "dinner": dinner,
        "notes": notes,
    }


def manual_food_analysis(food_name: str) -> dict[str, Any] | None:
    result = search_food(food_name)
    if result is None or len(result) == 0:
        return None
    row = result.iloc[0]
    payload = classify_food(row)
    payload["matched_food"] = payload["food_name"]
    return payload


def scan_food_image_bytes(filename: str, content_type: str, data: bytes) -> tuple[list[str], str | None]:
    try:
        from PIL import Image
    except Exception:
        return [], "Pillow is not available on this machine."

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return [], "GEMINI_API_KEY is not set."

    try:
        from google import genai
    except Exception:
        return [], "google-genai is not installed."

    with tempfile.TemporaryDirectory() as tmpdir:
        image_path = Path(tmpdir) / (Path(filename).name or "food.jpg")
        image_path.write_bytes(data)
        image = Image.open(image_path)
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                image,
                """Identify all visible food items and beverages.
Return food names only.
One food per line.
No numbering.
No explanations.
No markdown.
Use common food names.
Ignore plates, bowls, spoons and containers.""",
            ],
        )
        foods = [line.strip() for line in str(response.text or "").splitlines() if line.strip()]
        return foods, None


def read_multipart_upload(handler: BaseHTTPRequestHandler, field_name: str) -> dict[str, Any] | None:
    length = int(handler.headers.get("Content-Length", "0"))
    content_type = handler.headers.get("Content-Type", "")
    if length <= 0 or "multipart/form-data" not in content_type:
        return None

    body = handler.rfile.read(length)
    message = BytesParser(policy=default).parsebytes(
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8") + body
    )
    for part in message.iter_parts():
        if part.get_content_disposition() != "form-data":
            continue
        if part.get_param("name", header="content-disposition") != field_name:
            continue
        return {
            "filename": part.get_filename() or field_name,
            "content_type": part.get_content_type(),
            "data": part.get_payload(decode=True) or b"",
        }
    return None


def number(value: Any) -> float:
    try:
        if value is None or value == "":
            raise ValueError("empty value")
        parsed = float(value)
        if not math.isfinite(parsed):
            raise ValueError("non-finite value")
        return parsed
    except (TypeError, ValueError):
        raise ValueError(f"Expected a numeric value, got {value!r}") from None


def normalize(payload: dict[str, Any]) -> dict[str, Any]:
    missing = [key for key in FEATURES if payload.get(key) in {None, ""}]
    if missing:
        raise ValueError(f"Missing required prediction fields: {', '.join(missing)}")

    cleaned = {}
    for key in FEATURES:
        if key in {"hypertension", "diabetes_mellitus"}:
            raw = str(payload.get(key)).strip().lower()
            cleaned[key] = "yes" if raw in {"yes", "true", "1", "y"} else "no"
        elif key == "sex":
            raw = str(payload.get(key)).strip().lower()
            cleaned[key] = "male" if raw in {"male", "m", "man"} else "female"
        else:
            cleaned[key] = number(payload.get(key))
    return cleaned


def extract_lab_values(text: str) -> dict[str, Any]:
    normalized_text = re.sub(r"[ \t]+", " ", text.replace("\r", "\n"))
    extracted: dict[str, Any] = {}
    for key, patterns in FIELD_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, normalized_text, re.IGNORECASE)
            if match:
                extracted[key] = number(match.group(1))
                break

    sex_match = re.search(r"\bsex\s*[:=\-]?\s*(male|female|m|f)\b", normalized_text, re.IGNORECASE)
    if sex_match:
        extracted["sex"] = "male" if sex_match.group(1).lower().startswith("m") else "female"
    if re.search(r"\b(?:diabetes|diabetes\s+mellitus)\b.{0,20}\b(?:yes|positive|present|true)\b", normalized_text, re.IGNORECASE):
        extracted["diabetes_mellitus"] = "yes"
    elif re.search(r"\b(?:diabetes|diabetes\s+mellitus)\b.{0,20}\b(?:no|negative|absent|false)\b", normalized_text, re.IGNORECASE):
        extracted["diabetes_mellitus"] = "no"
    if re.search(r"\b(?:hypertension|high\s+blood\s+pressure)\b.{0,20}\b(?:yes|positive|present|true)\b", normalized_text, re.IGNORECASE):
        extracted["hypertension"] = "yes"
    elif re.search(r"\b(?:hypertension|high\s+blood\s+pressure)\b.{0,20}\b(?:no|negative|absent|false)\b", normalized_text, re.IGNORECASE):
        extracted["hypertension"] = "no"
    return extracted


def text_from_uploaded_file(filename: str, content_type: str, data: bytes) -> tuple[str, str | None]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf" or "pdf" in content_type:
        if shutil.which("pdftotext") is None:
            return "", "PDF text extraction needs pdftotext installed."
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = Path(tmpdir) / "report.pdf"
            txt_path = Path(tmpdir) / "report.txt"
            pdf_path.write_bytes(data)
            subprocess.run(["pdftotext", "-layout", str(pdf_path), str(txt_path)], check=False, timeout=15)
            return txt_path.read_text(errors="ignore") if txt_path.exists() else "", None
    if content_type.startswith("image/") or suffix in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}:
        if shutil.which("tesseract") is None:
            return "", "Image OCR needs Tesseract installed on this machine. PDFs and text reports can be autofilled now."
        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / f"report{suffix or '.png'}"
            image_path.write_bytes(data)
            completed = subprocess.run(["tesseract", str(image_path), "stdout"], capture_output=True, text=True, check=False, timeout=20)
            return completed.stdout, None
    return data.decode("utf-8", errors="ignore"), None


def egfr_2021_creatinine(creatinine: float, age: float, female: bool = False) -> float | None:
    if creatinine <= 0 or age < 18:
        return None
    kappa = 0.7 if female else 0.9
    alpha = -0.241 if female else -0.302
    sex_factor = 1.012 if female else 1.0
    ratio = creatinine / kappa
    return 142 * min(ratio, 1) ** alpha * max(ratio, 1) ** -1.200 * 0.9938 ** age * sex_factor


def stage_from_egfr(egfr: float | None) -> str:
    if egfr is None:
        return "Unknown"
    if egfr >= 90:
        return "G1"
    if egfr >= 60:
        return "G2"
    if egfr >= 45:
        return "G3a"
    if egfr >= 30:
        return "G3b"
    if egfr >= 15:
        return "G4"
    return "G5"


def predict(lab: dict[str, Any]) -> dict[str, Any]:
    state = load_model()
    import pandas as pd

    row = lab.copy()
    for col in ("hypertension", "diabetes_mellitus"):
        encoder = state["encoders"].get(col)
        if encoder is not None:
            row[col] = int(encoder.transform([row[col]])[0])
        else:
            row[col] = 1 if row[col] == "yes" else 0

    frame = pd.DataFrame([[row[col] for col in state["features"]]], columns=state["features"])
    scaled = state["scaler"].transform(frame)
    probability = float(state["model"].predict_proba(scaled)[0][1])
    model_source = "xgboost_notebook_model"

    egfr = egfr_2021_creatinine(lab["serum_creatinine"], lab["age"], lab.get("sex") == "female")
    abnormal = []
    for key, ref in REFERENCE.items():
        value = lab[key]
        status = "normal"
        if value < ref["low"]:
            status = "low"
        elif value > ref["high"]:
            status = "high"
        abnormal.append({
            "key": key,
            "label": key.replace("_", " ").title(),
            "value": round(value, 2),
            "unit": ref["unit"],
            "status": status,
            "range": f"{ref['low']}-{ref['high']}",
        })

    risk_label = "Low"
    if probability >= 0.7:
        risk_label = "High"
    elif probability >= 0.35:
        risk_label = "Moderate"

    warnings = [item for item in abnormal if item["status"] != "normal"]
    recommendations = []
    if lab["serum_creatinine"] > 1.3 or (egfr is not None and egfr < 60):
        recommendations.append("Kidney function markers need clinician review and repeat testing.")
    if lab["potassium"] > 5.1:
        recommendations.append("Potassium is high: review high-potassium foods and medications.")
    if lab["sodium"] < 135 or lab["sodium"] > 145:
        recommendations.append("Sodium is outside range: assess hydration, salt intake, and clinical context.")
    if lab["hemoglobin"] < 12:
        recommendations.append("Hemoglobin is low: consider anemia evaluation common in CKD.")
    if not recommendations:
        recommendations.append("Current submitted lab values are mostly within screening ranges.")

    return {
        "input": lab,
        "model": {
            "source": model_source,
            "trained_model_available": bool(state["available"]),
            "model_error": state.get("error"),
        },
        "risk": {
            "probability": round(probability, 4),
            "percent": round(probability * 100),
            "label": risk_label,
        },
        "kidney_function": {
            "egfr_2021": round(egfr, 1) if egfr is not None else None,
            "egfr_category": stage_from_egfr(egfr),
        },
        "lab_markers": abnormal,
        "warnings": warnings,
        "recommendations": recommendations,
    }


class Handler(BaseHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def respond(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.respond(204, {})

    def do_GET(self) -> None:
        if self.path == "/api/health":
            try:
                model_state = load_model() | {"model": None, "scaler": None, "encoders": {}}
                self.respond(200, {"ok": True, "model": model_state})
            except Exception as exc:
                self.respond(503, {
                    "ok": False,
                    "error": "Notebook ML model could not be loaded.",
                    "detail": f"{type(exc).__name__}: {exc}",
                })
        elif self.path == "/api/lab-defaults":
            self.respond(200, {"features": FEATURES, "defaults": DEFAULT_LAB, "reference": REFERENCE})
        elif self.path == "/api/food-defaults":
            self.respond(200, {
                "stages": ["G1", "G2", "G3a", "G3b", "G4", "G5"],
                "status_labels": ["SAFE", "MODERATE", "AVOID"],
            })
        else:
            self.respond(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path == "/api/food-analyze":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                self.respond(400, {"error": "Invalid JSON"})
                return
            food_name = str(payload.get("food_name", "")).strip()
            if not food_name:
                self.respond(400, {"error": "Enter a food name."})
                return
            result = manual_food_analysis(food_name)
            if result is None:
                self.respond(404, {"error": "Food not found in the dataset."})
                return
            self.respond(200, result)
            return

        if self.path == "/api/food-recommendations":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                self.respond(400, {"error": "Invalid JSON"})
                return
            stage = str(payload.get("stage", "G3a")).strip() or "G3a"
            hypertension = str(payload.get("hypertension", "no")).lower() in {"yes", "true", "1", "y"}
            diabetes = str(payload.get("diabetes_mellitus", "no")).lower() in {"yes", "true", "1", "y"}
            limit = int(payload.get("limit", 6))
            self.respond(200, {
                "stage": stage,
                "recommendations": food_recommendations(stage, hypertension, diabetes, limit=max(3, min(limit, 12))),
            })
            return

        if self.path == "/api/meal-plan":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                self.respond(400, {"error": "Invalid JSON"})
                return
            stage = str(payload.get("stage", "G3a")).strip() or "G3a"
            hypertension = str(payload.get("hypertension", "no")).lower() in {"yes", "true", "1", "y"}
            diabetes = str(payload.get("diabetes_mellitus", "no")).lower() in {"yes", "true", "1", "y"}
            self.respond(200, meal_plan(stage, hypertension, diabetes))
            return

        if self.path == "/api/scan-food-image":
            uploaded = read_multipart_upload(self, "image")
            if uploaded is None or not uploaded["data"]:
                self.respond(400, {"error": "Upload an image."})
                return
            foods, warning = scan_food_image_bytes(
                uploaded["filename"],
                uploaded["content_type"],
                uploaded["data"],
            )
            if not foods:
                self.respond(503, {"error": warning or "Could not detect foods from the image."})
                return
            analyses = []
            for item in foods:
                result = manual_food_analysis(item)
                if result is not None:
                    analyses.append(result)
            self.respond(200, {
                "detected_foods": foods,
                "analyses": analyses,
                "warning": warning,
            })
            return

        if self.path == "/api/extract-report":
            uploaded = read_multipart_upload(self, "report")
            if uploaded is None or not uploaded["data"]:
                self.respond(400, {"error": "Upload a report file."})
                return
            text, warning = text_from_uploaded_file(
                uploaded["filename"],
                uploaded["content_type"],
                uploaded["data"],
            )
            extracted = extract_lab_values(text)
            self.respond(200, {
                "values": extracted,
                "matched_fields": sorted(extracted.keys()),
                "text_preview": text[:1200],
                "warning": warning,
            })
            return

        if self.path != "/api/predict":
            self.respond(404, {"error": "Not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            self.respond(400, {"error": "Invalid JSON"})
            return
        try:
            lab = normalize(payload)
        except ValueError as exc:
            self.respond(400, {"error": str(exc)})
            return
        try:
            self.respond(200, predict(lab))
        except Exception as exc:
            self.respond(503, {
                "error": "Notebook ML prediction failed. No fallback prediction was used.",
                "detail": f"{type(exc).__name__}: {exc}",
            })


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8000), Handler)
    print("NephroCare API running at http://127.0.0.1:8000", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
