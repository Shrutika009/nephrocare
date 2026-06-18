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
import cgi
import os
from difflib import get_close_matches
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
FOOD_DATA = ROOT / "data" / "processed" / "indian_ckd_foods.csv"
USDA_FOOD_DATA = ROOT / "data" / "raw" / "food_data_csv" / "food.csv"
USDA_NUTRIENT_DATA = ROOT / "data" / "raw" / "food_data_csv" / "food_nutrient.csv"
USDA_CATEGORY_DATA = ROOT / "data" / "raw" / "food_data_csv" / "wweia_food_category.csv"
USDA_NUTRIENT_IDS = {
    "protein_g": "203",
    "energy_kcal": "208",
    "phosphorus_mg": "305",
    "potassium_mg": "306",
    "sodium_mg": "307",
}

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
FOOD_ALIAS_CACHE: dict[str, str] | None = None

FOOD_ALIASES = {
    "rice": "Rice, raw, milled",
    "milk": "Milk",
    "banana": "Banana",
    "apple": "Apple",
    "guava": "Guava",
    "papaya": "Papaya",
    "poha": "Rice flakes (poha)",
    "upma": "Wheat, semolina",
    "rava": "Wheat, semolina",
    "sooji": "Wheat, semolina",
    "suji": "Wheat, semolina",
    "bajra": "Bajra",
    "jowar": "Jowar",
    "ragi": "Ragi",
    "dal": "Dal",
    "lentil": "Lentil",
    "cilantro": "Coriander",
    "coriander": "Coriander",
    "curd": "Curd",
    "yogurt": "Curd",
    "roti": "Wheat flour, atta",
    "chapati": "Wheat flour, atta",
    "dal": "Lentil",
    "tea": "Tea",
    "coffee": "Coffee",
    "idli": "Rice, raw, milled",
    "dosa": "Rice, raw, milled",
    "uttapam": "Rice, raw, milled",
    "biryani": "Rice, raw, milled",
    "khichdi": "Rice, raw, milled",
    "pulao": "Rice, raw, milled",
    "paratha": "Wheat flour, atta",
    "naan": "Wheat flour, atta",
    "puri": "Wheat flour, refined",
    "samosa": "Wheat flour, refined",
    "pakora": "Bengal gram, dal",
    "chole": "Bengal gram",
    "chana": "Bengal gram",
    "rajma": "Rajmah",
    "moong": "Green gram",
    "urad": "Black gram",
    "toor": "Red gram",
    "arhar": "Red gram",
    "paneer": "Paneer",
    "palak": "Spinach",
    "aloo": "Potato",
    "potato": "Potato",
    "bhindi": "Ladies finger",
    "okra": "Ladies finger",
    "brinjal": "Brinjal",
    "eggplant": "Brinjal",
    "cauliflower": "Cauliflower",
    "gobi": "Cauliflower",
    "methi": "Fenugreek",
    "lassi": "Curd",
    "burger": "Hamburger, NFS",
    "hamburger": "Hamburger, NFS",
    "cheeseburger": "Cheeseburger",
}

FOOD_DISPLAY_OVERRIDES = {
    "Milk, human": "Milk",
    "Milk, whole, Buffalo": "Milk",
    "Milk, whole": "Milk",
    "Milk, reduced fat": "Milk",
    "Coconut oil": "Coconut oil",
    "Wheat germ oil": "Wheat oil",
    "Soft drink, ginger ale": "Ginger ale",
    "Soft drink, ginger ale, diet": "Diet ginger ale",
    "Whiskey and ginger ale": "Ginger ale",
    "Pizza, cheese, from frozen, thin crust": "Pizza",
    "Chicken, poultry, leg, skinless": "Chicken",
    "Chicken, broilers or fryers, breast, skinless": "Chicken",
    "Hamburger, NFS": "Burger",
    "Cheeseburger": "Cheeseburger",
    "Coriander leaves (Coriandrum sativum)": "Coriander leaves",
    "Rice, raw, milled (Oryza sativa)": "Rice",
    "Tinda, tender (Praecitrullus fistulosus)": "Tinda",
    "Snake gourd, short (Trichosanthes anguina)": "Snake gourd",
    "Snake gourd, long, pale green (Trichosanthes anguina)": "Snake gourd",
    "Bamboo shoots, cooked": "Bamboo shoots",
}

INDIAN_FOOD_PATTERNS = [
    r"\brice\b",
    r"\bpoha\b",
    r"\bupma\b",
    r"\broti\b",
    r"\bchapati\b",
    r"\bwheat\b",
    r"\bbajra\b",
    r"\bjowar\b",
    r"\bragi\b",
    r"\bdal\b",
    r"\blentil\b",
    r"\bgram\b",
    r"\bcurd\b",
    r"\byogurt\b",
    r"\bmilk\b",
    r"\bbanana\b",
    r"\bapple\b",
    r"\bguava\b",
    r"\bpapaya\b",
    r"\bdrumstick\b",
    r"\btinda\b",
    r"\bcucumber\b",
    r"\btomato\b",
    r"\bonion\b",
    r"\bcarrot\b",
    r"\bginger\b",
    r"\bturmeric\b",
    r"\bcoconut\b",
]

MEAL_SLOT_KEYWORDS = {
    "breakfast": ["poha", "upma", "ragi", "bajra", "roti", "chapati", "banana", "curd", "milk"],
    "lunch": ["rice", "roti", "dal", "curd", "tinda", "cucumber", "carrot", "tomato", "papaya"],
    "snack": ["banana", "guava", "papaya", "apple", "curd", "milk"],
    "dinner": ["roti", "dal", "rice", "tinda", "curd", "cucumber", "carrot", "milk"],
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

    food_frames = [pd.read_csv(FOOD_DATA)]

    if USDA_FOOD_DATA.exists() and USDA_NUTRIENT_DATA.exists():
        foods = pd.read_csv(
            USDA_FOOD_DATA,
            dtype={"fdc_id": str, "food_category_id": str},
            usecols=["fdc_id", "description", "food_category_id"],
        )
        nutrients = pd.read_csv(
            USDA_NUTRIENT_DATA,
            dtype={"fdc_id": str, "nutrient_id": str},
            usecols=["fdc_id", "nutrient_id", "amount"],
        )
        nutrients = nutrients[nutrients["nutrient_id"].isin(USDA_NUTRIENT_IDS.values())]
        nutrient_table = nutrients.pivot_table(
            index="fdc_id",
            columns="nutrient_id",
            values="amount",
            aggfunc="first",
        )
        nutrient_table.columns = nutrient_table.columns.astype(str)
        nutrient_table = nutrient_table.rename(columns={nutrient_id: name for name, nutrient_id in USDA_NUTRIENT_IDS.items()})
        usda_foods = foods.join(nutrient_table, on="fdc_id")

        if USDA_CATEGORY_DATA.exists():
            categories = pd.read_csv(
                USDA_CATEGORY_DATA,
                dtype={"wweia_food_category": str},
            ).rename(
                columns={
                    "wweia_food_category": "food_category_id",
                    "wweia_food_category_description": "category",
                }
            )
            usda_foods = usda_foods.merge(categories, on="food_category_id", how="left")
        else:
            usda_foods["category"] = "USDA/FNDDS foods"

        usda_foods = usda_foods.rename(columns={"description": "food_name"})
        for column in USDA_NUTRIENT_IDS:
            usda_foods[column] = pd.to_numeric(usda_foods[column], errors="coerce").fillna(0)
        usda_foods["category"] = usda_foods["category"].fillna("USDA/FNDDS foods")
        usda_foods["diet_type"] = ""
        usda_foods["source"] = "USDA/FNDDS"
        usda_foods = usda_foods[
            ["food_name", "category", "protein_g", "energy_kcal", "potassium_mg", "phosphorus_mg", "sodium_mg", "diet_type", "source"]
        ]
        food_frames.append(usda_foods)

    FOOD_CACHE = pd.concat(food_frames, ignore_index=True).drop_duplicates(subset=["food_name"], keep="first")
    return FOOD_CACHE


def normalize_food_term(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def food_alias_terms(food_name: str) -> set[str]:
    base = str(food_name or "")
    without_scientific = re.sub(r"\([^)]*\)", " ", base)
    pieces = {base, without_scientific}
    for separator in [",", "/", ";", "-"]:
        for piece in without_scientific.split(separator):
            pieces.add(piece)
    terms = {normalize_food_term(piece) for piece in pieces}
    stop_terms = {
        "",
        "raw",
        "dry",
        "fresh",
        "local",
        "whole",
        "milled",
        "tender",
        "sweet",
        "brown",
        "white",
        "black",
        "green",
        "red",
        "yellow",
        "seed",
        "flour",
    }
    return {term for term in terms if term not in stop_terms and len(term) >= 3}


def load_food_aliases() -> dict[str, str]:
    global FOOD_ALIAS_CACHE
    if FOOD_ALIAS_CACHE is not None:
        return FOOD_ALIAS_CACHE

    food_df = load_food_data()
    aliases: dict[str, str] = {}
    for alias, target in FOOD_ALIASES.items():
        aliases[normalize_food_term(alias)] = target
    for _, row in food_df.iterrows():
        food_name = str(row["food_name"])
        for term in food_alias_terms(food_name):
            aliases.setdefault(term, food_name)
    FOOD_ALIAS_CACHE = aliases
    return aliases


def food_rows_for_target(food_df: Any, target: str):
    normalized_target = normalize_food_term(target)
    normalized_names = food_df["food_name"].astype(str).map(normalize_food_term)
    exact = food_df[normalized_names == normalized_target]
    if len(exact) > 0:
        return exact
    starts = food_df[normalized_names.str.startswith(normalized_target, na=False)]
    if len(starts) > 0:
        return starts
    return food_df[food_df["food_name"].str.contains(target, case=False, na=False, regex=False)]


def kidney_score(row: Any) -> float:
    score = 100.0
    score -= float(row["potassium_mg"]) * 0.04
    score -= float(row["phosphorus_mg"]) * 0.035
    score -= float(row["sodium_mg"]) * 0.015
    return round(max(0.0, score), 2)


def food_status(row: Any) -> str:
    dataset_safety = str(row.get("safety", "")).strip().upper()
    if dataset_safety in {"SAFE", "MODERATE", "AVOID"}:
        return dataset_safety

    potassium = float(row["potassium_mg"])
    phosphorus = float(row["phosphorus_mg"])
    sodium = float(row["sodium_mg"])
    if potassium > 300 or phosphorus > 300 or sodium > 200:
        return "AVOID"
    if potassium > 150 or phosphorus > 150 or sodium > 100:
        return "MODERATE"
    return "SAFE"


def indian_food_priority(row: Any) -> int:
    text = food_search_text(row)
    return 1 if any(re.search(pattern, text) for pattern in INDIAN_FOOD_PATTERNS) else 0


def food_search_text(row: Any) -> str:
    return " ".join(
        [
            str(row.get("food_name", "")),
            str(row.get("category", "")),
        ]
    ).lower()


def keyword_rank(row: Any, keywords: list[str]) -> int:
    text = food_search_text(row)
    for index, keyword in enumerate(keywords):
        if re.search(rf"\b{re.escape(keyword)}\b", text):
            return index
    return len(keywords)


def classify_food(row: Any) -> dict[str, Any]:
    return {
        "food_name": str(row["food_name"]),
        "display_name": display_food_name(row),
        "category": str(row.get("category", "")),
        "protein_g": round(float(row["protein_g"]), 2),
        "energy_kcal": round(float(row["energy_kcal"]), 2),
        "potassium_mg": round(float(row["potassium_mg"]), 2),
        "phosphorus_mg": round(float(row["phosphorus_mg"]), 2),
        "sodium_mg": round(float(row["sodium_mg"]), 2),
        "status": food_status(row),
        "kidney_score": kidney_score(row),
    }


def display_food_name(row: Any) -> str:
    raw_name = str(row.get("food_name", "")).strip()
    if raw_name in FOOD_DISPLAY_OVERRIDES:
        return FOOD_DISPLAY_OVERRIDES[raw_name]
    simple = re.sub(r"\([^)]*\)", " ", raw_name)
    simple = re.sub(r"\b(human|buffalo|whole|reduced fat|low fat|skinless|boneless|fried|roasted|from frozen|thin crust|from fast food|NFS)\b", " ", simple, flags=re.I)
    simple = re.sub(r"[,/;]+", " ", simple)
    simple = re.sub(r"\s+", " ", simple).strip(" ,")
    if not simple:
        return raw_name
    parts = [part.strip() for part in simple.split() if part.strip()]
    if len(parts) > 3:
        simple = " ".join(parts[:3])
    return simple


def search_food(food_name: str):
    import pandas as pd

    food_df = load_food_data()
    query = normalize_food_term(food_name)
    if not query:
        return None

    aliases = load_food_aliases()
    alias = aliases.get(query)
    if alias:
        result = food_rows_for_target(food_df, alias)
        if len(result) > 0:
            return result.head(1)

    direct_match = food_df[
        food_df["food_name"].astype(str).map(normalize_food_term).str.contains(query, na=False, regex=False)
    ]
    if len(direct_match) > 0:
        return direct_match.head(1)

    for token in query.split():
        token_alias = aliases.get(token)
        if token_alias:
            token_result = food_rows_for_target(food_df, token_alias)
            if len(token_result) > 0:
                return token_result.head(1)

    alias_keys = list(aliases.keys())
    cutoff = 0.88 if len(query) <= 5 else 0.76
    match = get_close_matches(query, alias_keys, n=1, cutoff=cutoff)
    if match:
        alias_result = food_rows_for_target(food_df, aliases[match[0]])
        if len(alias_result) > 0:
            return alias_result.head(1)

    normalized_foods = {normalize_food_term(name): name for name in food_df["food_name"].astype(str).tolist()}
    food_match = get_close_matches(query, list(normalized_foods.keys()), n=1, cutoff=cutoff)
    if not food_match:
        return None
    return food_df[food_df["food_name"] == normalized_foods[food_match[0]]].head(1)


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


def recommendation_penalty(row: Any, hypertension: bool, diabetes: bool) -> float:
    text = food_search_text(row)
    category = str(row.get("category", "")).lower()
    penalty = 0.0

    if re.search(r"\b(oil|drink|soda|soft drink|beer|wine|liquor|spirits|cocktail)\b", text) or re.search(
        r"\b(oil|drink|soda|soft drink|beverage|alcohol|liquor)\b", category
    ):
        penalty += 28.0
        if hypertension:
            penalty += 8.0
        if diabetes:
            penalty += 12.0

    if diabetes and re.search(r"\b(sugar|sweet|dessert|ice cream|cake|malt|syrup)\b", text):
        penalty += 20.0

    if hypertension and float(row.get("sodium_mg", 0) or 0) > 120:
        penalty += min(18.0, float(row["sodium_mg"]) * 0.06)

    if float(row.get("protein_g", 0) or 0) == 0 and float(row.get("energy_kcal", 0) or 0) > 25:
        penalty += 6.0

    return penalty


def risk_sensitive_food_pool(food_df: Any, hypertension: bool, diabetes: bool):
    import pandas as pd

    text = food_df.apply(food_search_text, axis=1)
    category = food_df["category"].astype(str).str.lower()
    blacklisted = text.str.contains(r"\b(?:human|baby|toddler|stage\s*[123]|oil|soft drink|soda|beer|wine|liquor|cocktail|whiskey|juice|paste|filling|jam|jelly|syrup|topping)\b", regex=True, na=False) | category.str.contains(
        r"\b(?:baby|toddler|oil|soft drink|soda|beverage|liquor|alcohol|juice|jam|jelly|syrup|topping)\b",
        regex=True,
        na=False,
    )
    if diabetes:
        blacklisted = blacklisted | text.str.contains(
            r"\b(?:apple|fruit|nectar|dessert|pie|sweet|sugar|milk|dairy|paste|filling|jam|jelly|syrup|topping)\b",
            regex=True,
            na=False,
        ) | category.str.contains(
            r"\b(?:apple|fruit|dessert|milk|dairy|jam|jelly|syrup|topping)\b",
            regex=True,
            na=False,
        )
    pool = food_df[~blacklisted].copy()
    if len(pool) >= 20:
        return pool
    return pd.concat([pool, food_df[blacklisted]]).drop_duplicates(subset=["food_name"])


def meal_priority(row: Any, hypertension: bool, diabetes: bool) -> int:
    category = str(row.get("category", "")).lower()
    text = food_search_text(row)
    if re.search(r"\b(oil|soft drink|soda|beer|wine|liquor|cocktail|whiskey|juice|nectar|human milk)\b", text):
        return 5
    if re.search(r"\b(oil|soft drink|soda|beverage|liquor|alcohol|juice|nectar|tea)\b", category):
        return 5
    if re.search(r"\b(cereals and millets|grain legumes|vegetables|other vegetables|leafy vegetables|pulses|root vegetables|condiments and spices|nuts and oilseeds)\b", category):
        return 0
    if re.search(r"\b(milk and milk products|dairy)\b", category):
        return 3 if diabetes else 1
    if re.search(r"\b(fruits|apples)\b", category):
        return 4 if diabetes else 1
    if re.search(r"\b(tea|coffee)\b", text):
        return 4
    return 1


def blood_pressure_priority(row: Any, hypertension: bool) -> float:
    if not hypertension:
        return 0.0
    return float(row.get("sodium_mg", 0) or 0)


def diabetes_priority(row: Any, diabetes: bool) -> float:
    if not diabetes:
        return 0.0
    text = food_search_text(row)
    category = str(row.get("category", "")).lower()
    penalty = 0.0
    if re.search(r"\b(apple|fruit|fruits|juice|nectar|sweet|sugar|dessert|pie|soft drink)\b", text + " " + category):
        penalty += 30.0
    if re.search(r"\b(milk|dairy)\b", text + " " + category):
        penalty += 12.0
    return penalty


def recommendation_group(row: Any) -> str:
    category = str(row.get("category", "")).lower()
    text = food_search_text(row)
    if re.search(r"\b(cereals and millets|pasta|noodles|cooked grains)\b", category):
        return "staple"
    if re.search(r"\b(grain legumes|pulses|legume)\b", category):
        return "pulse"
    if re.search(r"\b(vegetables|leafy|root vegetables)\b", category):
        return "vegetable"
    if re.search(r"\b(fruits|apples)\b", category):
        return "fruit"
    if re.search(r"\b(milk and milk products|dairy)\b", category):
        return "dairy"
    if re.search(r"\b(rice|wheat|ragi|jowar|bajra|samai|varagu|roti)\b", text):
        return "staple"
    return "other"


def recommendation_group_order(hypertension: bool, diabetes: bool) -> list[str]:
    if diabetes and hypertension:
        return ["staple", "vegetable", "pulse", "vegetable", "staple", "other"]
    if diabetes:
        return ["vegetable", "staple", "pulse", "vegetable", "staple", "other"]
    if hypertension:
        return ["staple", "vegetable", "pulse", "vegetable", "fruit", "dairy"]
    return ["staple", "vegetable", "pulse", "fruit", "dairy", "vegetable"]


def food_recommendations(stage: str, hypertension: bool, diabetes: bool, limit: int = 6) -> list[dict[str, Any]]:
    import pandas as pd

    food_df = load_food_data().copy()
    limits = food_adjustment(stage, hypertension, diabetes)
    food_df = risk_sensitive_food_pool(food_df, hypertension, diabetes)
    food_df["indian_priority"] = food_df.apply(indian_food_priority, axis=1)
    food_df["meal_priority"] = food_df.apply(lambda row: meal_priority(row, hypertension, diabetes), axis=1)
    food_df["bp_priority"] = food_df.apply(lambda row: blood_pressure_priority(row, hypertension), axis=1)
    food_df["diabetes_priority"] = food_df.apply(lambda row: diabetes_priority(row, diabetes), axis=1)
    food_df["recommendation_group"] = food_df.apply(recommendation_group, axis=1)
    food_df["base_score"] = (
        100
        - food_df["potassium_mg"] * 0.04
        - food_df["phosphorus_mg"] * 0.035
        - food_df["sodium_mg"] * 0.015
    )
    food_df["risk_penalty"] = food_df.apply(lambda row: recommendation_penalty(row, hypertension, diabetes), axis=1)
    food_df["score"] = food_df["base_score"] - food_df["risk_penalty"]
    safe = food_df[
        (food_df["potassium_mg"] <= limits["potassium_mg"]) &
        (food_df["phosphorus_mg"] <= limits["phosphorus_mg"]) &
        (food_df["sodium_mg"] <= limits["sodium_mg"])
    ].sort_values(["meal_priority", "diabetes_priority", "indian_priority", "bp_priority", "score", "protein_g"], ascending=[True, True, False, True, False, False])
    if len(safe) < limit:
        extra = food_df.sort_values(["meal_priority", "diabetes_priority", "indian_priority", "bp_priority", "score", "protein_g"], ascending=[True, True, False, True, False, False])
        safe = pd.concat([safe, extra]).drop_duplicates(subset=["food_name"])
    recommendations = []
    seen_names: set[str] = set()

    def add_from_rows(rows: Any, max_items: int = 1) -> None:
        added = 0
        for _, row in rows.iterrows():
            item = classify_food(row)
            key = normalize_food_term(item["display_name"])
            if key in seen_names:
                continue
            recommendations.append(item)
            seen_names.add(key)
            added += 1
            if len(recommendations) >= limit or added >= max_items:
                break

    for group in recommendation_group_order(hypertension, diabetes):
        if len(recommendations) >= limit:
            break
        add_from_rows(safe[safe["recommendation_group"] == group])

    if len(recommendations) < limit:
        add_from_rows(safe, max_items=limit - len(recommendations))
    return recommendations


def meal_plan(stage: str, hypertension: bool, diabetes: bool) -> dict[str, Any]:
    food_df = load_food_data().copy()
    limits = food_adjustment(stage, hypertension, diabetes)
    food_df["indian_priority"] = food_df.apply(indian_food_priority, axis=1)
    food_df["status"] = food_df.apply(food_status, axis=1)
    food_df["status_priority"] = food_df["status"].map({"SAFE": 0, "MODERATE": 1, "AVOID": 2}).fillna(1)
    food_df["score"] = (
        100
        - food_df["potassium_mg"] * 0.04
        - food_df["phosphorus_mg"] * 0.035
        - food_df["sodium_mg"] * 0.015
    )
    filtered = food_df[
        food_df["status"] != "AVOID"
    ].sort_values(["status_priority", "indian_priority", "score", "protein_g"], ascending=[True, False, False, False])

    if len(filtered) < 4:
        filtered = food_df.sort_values(
            ["status_priority", "indian_priority", "score", "protein_g"],
            ascending=[True, False, False, False],
        )

    indian_pool = filtered[filtered["indian_priority"] == 1]
    if len(indian_pool) >= 4:
        pool = indian_pool
    else:
        pool = filtered

    used_foods: set[str] = set()

    def pick_for_slot(slot: str, count: int) -> list[dict[str, Any]]:
        slot_keywords = MEAL_SLOT_KEYWORDS[slot]
        ranked = pool.copy()
        ranked["slot_priority"] = ranked.apply(lambda row: keyword_rank(row, slot_keywords), axis=1)
        ranked = ranked.sort_values(
            ["slot_priority", "status_priority", "indian_priority", "score", "protein_g"],
            ascending=[True, True, False, False, False],
        )
        chosen = []
        for _, row in ranked.iterrows():
            food_name = str(row["food_name"])
            if food_name in used_foods:
                continue
            chosen.append(classify_food(row))
            used_foods.add(food_name)
            if len(chosen) >= count:
                break
        return chosen

    breakfast = pick_for_slot("breakfast", 2)
    lunch = pick_for_slot("lunch", 2)
    snack = pick_for_slot("snack", 2)
    dinner = pick_for_slot("dinner", 2)

    notes = [
        "Keep sodium lower when blood pressure is high.",
        "Choose smaller portions if potassium or phosphorus needs to stay low.",
        "Drink fluids only as advised by your clinician.",
        "This plan uses the Indian CKD foods dataset.",
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
    payload["matched_food"] = payload["display_name"]
    return payload


def infer_foods_from_filename(filename: str) -> list[str]:
    text = normalize_food_term(Path(filename).stem)
    matches = []
    aliases = load_food_aliases()
    for alias, target in aliases.items():
        if re.search(rf"\b{re.escape(alias)}\b", text):
            matches.append(target)
    if not matches:
        close = get_close_matches(text, list(aliases.keys()), n=3, cutoff=0.72)
        matches.extend(aliases[item] for item in close)
    deduped = []
    for item in matches:
        if item not in deduped:
            deduped.append(item)
    return deduped[:8]


def normalize_detected_foods(foods: list[str]) -> list[str]:
    matched = []
    for item in foods:
        result = manual_food_analysis(item)
        if result is not None:
            matched.append(str(result["matched_food"]))
        else:
            matched.append(item)
    deduped = []
    for item in matched:
        if item not in deduped:
            deduped.append(item)
    return deduped


def scan_food_image_bytes(filename: str, content_type: str, data: bytes) -> tuple[list[str], str | None]:
    try:
        from PIL import Image
    except Exception:
        return [], "Pillow is not available on this machine."

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        inferred = infer_foods_from_filename(filename)
        return inferred, "GEMINI_API_KEY is not set, so image AI is unavailable. Use a food name or filename such as banana.jpg for local fallback."

    try:
        from google import genai
        from google.genai import types
    except Exception:
        return [], "google-genai is not installed."

    with tempfile.TemporaryDirectory() as tmpdir:
        image_path = Path(tmpdir) / (Path(filename).name or "food.jpg")
        image_path.write_bytes(data)
        image = Image.open(image_path)
        if image.mode not in {"RGB", "L"}:
            image = image.convert("RGB")
        normalized_path = Path(tmpdir) / "food-scan.jpg"
        image.save(normalized_path, format="JPEG", quality=90)
        image_bytes = normalized_path.read_bytes()
        client = genai.Client(api_key=api_key)
        prompt = """Identify all visible Indian foods, ingredients, drinks, fruits, vegetables, cereals, pulses, dairy items, and cooked dishes.
Return the common Indian food names only.
One food per line.
No numbering.
No explanations.
No markdown.
Use short names like rice, roti, dal, curd, paneer, poha, upma, idli, dosa, rajma, chole, bhindi, brinjal, potato, banana, milk.
Ignore plates, bowls, spoons and containers."""
        last_error: Exception | None = None
        for model_name in ("gemini-3.5-flash", "gemini-2.5-flash"):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        prompt,
                    ],
                )
                foods = [line.strip() for line in str(response.text or "").splitlines() if line.strip()]
                return normalize_detected_foods(foods), None
            except Exception as exc:
                last_error = exc
                continue

        inferred = infer_foods_from_filename(filename)
        error_name = type(last_error).__name__ if last_error else "UnknownError"
        return inferred, f"Gemini image AI failed: {error_name}. Check the key, quota, or try again in a minute."


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
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            })
            uploaded = form["image"] if "image" in form else None
            if uploaded is None or not getattr(uploaded, "file", None):
                self.respond(400, {"error": "Upload an image."})
                return
            data = uploaded.file.read()
            foods, warning = scan_food_image_bytes(
                getattr(uploaded, "filename", "food.jpg"),
                getattr(uploaded, "type", "") or self.headers.get("Content-Type", ""),
                data,
            )
            if not foods:
                self.respond(200, {
                    "detected_foods": [],
                    "analyses": [],
                    "warning": warning or "Could not detect foods from the image.",
                })
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
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            })
            uploaded = form["report"] if "report" in form else None
            if uploaded is None or not getattr(uploaded, "file", None):
                self.respond(400, {"error": "Upload a report file."})
                return
            data = uploaded.file.read()
            text, warning = text_from_uploaded_file(
                getattr(uploaded, "filename", "report"),
                getattr(uploaded, "type", "") or self.headers.get("Content-Type", ""),
                data,
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
