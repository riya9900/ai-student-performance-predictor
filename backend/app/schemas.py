from typing import Literal, Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    student_name: Optional[str] = Field(None, max_length=60, description="Optional label for history")
    course: Literal["math", "portuguese"] = "math"
    age: int = Field(17, ge=15, le=22)

    # --- Used by the ML model (mapped to real dataset columns) ---
    daily_study_hours: float = Field(..., ge=0, le=16, description="Average study hours per day")
    attendance_percent: float = Field(..., ge=0, le=100)
    first_term_marks: float = Field(..., ge=0, le=100, description="Earlier exam/term marks (%)")
    previous_marks: float = Field(..., ge=0, le=100, description="Most recent exam/term marks (%)")
    past_failures: int = Field(0, ge=0, le=3, description="Past class failures (0-3; 3 means 3 or more)")
    higher_education: bool = True
    internet_access: bool = True
    going_out: int = Field(3, ge=1, le=5)
    free_time: int = Field(3, ge=1, le=5)
    health: int = Field(3, ge=1, le=5)

    # --- Collected for personalised advice ONLY (not in the dataset, not used by the model) ---
    assignment_completion: float = Field(..., ge=0, le=100)
    sleep_hours: float = Field(..., ge=0, le=16)
    class_participation: int = Field(..., ge=1, le=5)
    study_consistency: int = Field(..., ge=1, le=5)
    number_of_subjects: int = Field(5, ge=1, le=15)


class Recommendation(BaseModel):
    title: str
    detail: str
    priority: Literal["high", "medium", "low"]
    basis: Literal["model", "self-reported", "general"]


class PredictResponse(BaseModel):
    id: int
    created_at: str
    predicted_score: float  # percentage 0-100
    predicted_grade_20: float  # raw G3 on 0-20 scale
    interval_low: float
    interval_high: float
    category: str
    risk_level: Literal["Low", "Medium", "High"]
    recommendations: list[Recommendation]
    what_if: list[dict]
    inputs: dict
    mapped_features: dict
    disclaimer: str
