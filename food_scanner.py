from google import genai
from PIL import Image
from rapidfuzz import process
from dotenv import load_dotenv
import pandas as pd
import os

# Load API key
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# Initialize Gemini
client = genai.Client(
    api_key=API_KEY
)

print("Gemini client initialized successfully")

# Load CKD food dataset
food_df = pd.read_csv(
    r"C:\Users\DELL\nephrocare\data\processed\ifct2017_ckd_foods.csv"
)

print(f"Loaded {len(food_df)} foods")


# Common food aliases
food_aliases = {
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
    "coffee": "Coffee"
}


# Detect foods from image
def scan_food_image(image_path):

    image = Image.open(image_path)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            image,
            """
            Identify all visible food items and beverages.

            Rules:
            - Return food names only
            - One food per line
            - No numbering
            - No explanations
            - No markdown
            - Use common food names
            - Ignore plates, bowls, spoons and containers

            Example:

            rice
            milk
            banana
            chapati
            dal
            """
        ]
    )

    return response.text


# Find matching food in dataset
def find_food(food_name):

    food_name = food_name.lower().strip()

    # Alias lookup
    if food_name in food_aliases:

        alias = food_aliases[food_name]

        result = food_df[
            food_df["food_name"].str.contains(
                alias,
                case=False,
                na=False
            )
        ]

        if len(result) > 0:
            return result.head(1)

    # Direct lookup
    direct_match = food_df[
        food_df["food_name"].str.contains(
            food_name,
            case=False,
            na=False
        )
    ]

    if len(direct_match) > 0:
        return direct_match.head(1)

    # Fuzzy lookup
    all_foods = food_df["food_name"].astype(str).tolist()

    best_match = process.extractOne(
        food_name,
        all_foods
    )

    if best_match is None:
        return None

    matched_food = best_match[0]
    similarity = best_match[1]

    if similarity < 85:
        return None

    result = food_df[
        food_df["food_name"] == matched_food
    ]

    return result


# Calculate kidney score
def kidney_score(row):

    score = 100

    score -= row["potassium_mg"] * 0.04
    score -= row["phosphorus_mg"] * 0.035
    score -= row["sodium_mg"] * 0.015

    score = max(0, score)

    return round(score, 2)


# CKD safety classification
def food_status(row):

    potassium = row["potassium_mg"]
    phosphorus = row["phosphorus_mg"]
    sodium = row["sodium_mg"]

    if (
        potassium > 300
        or phosphorus > 300
        or sodium > 200
    ):
        return "AVOID"

    elif (
        potassium > 150
        or phosphorus > 150
        or sodium > 100
    ):
        return "MODERATE"

    else:
        return "SAFE"


# Display analysis
def analyze_food(food_name):

    result = find_food(food_name)

    if result is None or len(result) == 0:

        print("\n" + "=" * 60)
        print("Detected Food :", food_name)
        print("Status        : NOT FOUND IN DATASET")

        return

    row = result.iloc[0]

    print("\n" + "=" * 60)

    print("Detected Food :", food_name)
    print("Matched Food  :", row["food_name"])

    if "category" in row.index:
        print("Category      :", row["category"])

    print("Calories      :", round(row["energy_kcal"], 2))
    print("Protein (g)   :", round(row["protein_g"], 2))
    print("Potassium (mg):", round(row["potassium_mg"], 2))
    print("Phosphorus(mg):", round(row["phosphorus_mg"], 2))
    print("Sodium (mg)   :", round(row["sodium_mg"], 2))

    print("Status        :", food_status(row))
    print("Kidney Score  :", kidney_score(row), "/100")


# Main execution
if __name__ == "__main__":

    image_path = "food.png"

    try:

        detected_foods = scan_food_image(
            image_path
        )

        print("\nDetected Foods")
        print("-" * 60)
        print(detected_foods)

        foods = [
            food.strip()
            for food in detected_foods.split("\n")
            if food.strip()
        ]

        print("\nCKD ANALYSIS")

        for food in foods:
            analyze_food(food)

    except Exception as e:

        print("\nError:")
        print(e)