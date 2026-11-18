from pathlib import Path
import json
import hashlib

import joblib
from fastapi import FastAPI

ML_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = ML_ROOT / "models" / "labourlinkai_final_model.joblib"
METADATA_PATH = ML_ROOT / "models" / "labourlinkai_model_metadata.json"

model = joblib.load(MODEL_PATH)
MODEL_SHA256 = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()

with open(METADATA_PATH, "r", encoding="utf-8") as file:
    metadata = json.load(file)

app = FastAPI(
    title="LabourLink AI - ML Prediction API",
    description="Prediction service using the original LabourLink AI Logistic Regression model",
    version="1.0.0"
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": "LabourLinkAI",
        "model": metadata["model"],
        "features_count": len(metadata["features"]),
        "model_loaded": True
    }

from typing import Any

import pandas as pd
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field


class PredictionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    worker_category: str
    worker_location: str
    worker_state: str
    worker_district: str
    experience_years: int
    worker_rating: float | None
    worker_review_count: int
    allocated_this_month: str
    jobs_allocated_this_month: int
    expected_daily_wage: float
    job_category: str
    job_location: str
    job_state: str
    job_district: str
    offered_daily_wage: float
    job_duration_days: int


class PredictionBatch(BaseModel):
    items: list[PredictionInput] = Field(min_length=1, max_length=256)


@app.post("/predict-batch")
def predict_batch(data: PredictionBatch) -> list[dict[str, Any]]:
    try:
        frame = pd.DataFrame([item.model_dump() for item in data.items])[metadata["features"]]
        labels = model.predict(frame)
        positive_index = list(model.classes_).index(1)
        probabilities = model.predict_proba(frame)[:, positive_index]
        return [{"prediction": int(label), "match_probability": round(float(probability), 4),
                 "match_percentage": round(float(probability) * 100, 2), "model": metadata["model"]}
                for label, probability in zip(labels, probabilities)]
    except Exception as error:
        raise HTTPException(status_code=500, detail="Batch prediction failed") from error


@app.get("/feature-contract")
def feature_contract():
    preprocessor = model.named_steps["preprocessor"]
    columns = next(fields for name, _, fields in preprocessor.transformers_ if name == "categorical")
    encoder = preprocessor.named_transformers_["categorical"].named_steps["encoder"]
    return {
        "features": metadata["features"],
        "model": metadata["model"],
        "model_sha256": MODEL_SHA256,
        "categories": {name: values.tolist() for name, values in zip(columns, encoder.categories_)},
        "nullable_worker_rating": True,
    }


@app.post("/predict")
def predict_match(data: PredictionInput) -> dict[str, Any]:
    try:
        input_data = data.model_dump()
        features = metadata["features"]

        dataframe = pd.DataFrame(
            [{feature: input_data[feature] for feature in features}]
        )

        prediction = int(model.predict(dataframe)[0])
        probabilities = model.predict_proba(dataframe)[0]

        positive_index = list(model.classes_).index(1)
        match_probability = float(probabilities[positive_index])

        return {
            "prediction": prediction,
            "match_probability": round(match_probability, 4),
            "match_percentage": round(match_probability * 100, 2),
            "model": "Logistic Regression"
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Prediction failed"
        ) from error
