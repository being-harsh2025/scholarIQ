import numpy as np
import pandas as pd
from pathlib import Path

def generate_student_dataset(num_records=1000, random_seed=42):
    np.random.seed(random_seed)
    
    # 1. Identifiers & Demographics
    student_ids = [f"STU-{10000 + i}" for i in range(num_records)]
    genders = np.random.choice(["Female", "Male", "Non-Binary"], size=num_records, p=[0.49, 0.48, 0.03])
    grade_levels = np.random.choice(["Grade 10", "Grade 11", "Grade 12"], size=num_records, p=[0.34, 0.33, 0.33])
    parent_education = np.random.choice(
        ["High School", "Associate Degree", "Bachelor's", "Master's", "Doctorate"],
        size=num_records,
        p=[0.25, 0.25, 0.30, 0.15, 0.05]
    )
    internet_access = np.random.choice(["Yes", "No"], size=num_records, p=[0.88, 0.12])
    tutoring = np.random.choice(["Yes", "No"], size=num_records, p=[0.35, 0.65])
    extracurricular = np.random.choice(["Yes", "No"], size=num_records, p=[0.55, 0.45])

    # 2. Academic Behavior & Prior Performance
    # Attendance percentage between 40% and 100%
    attendance_percentage = np.clip(np.random.normal(loc=82.0, scale=12.0, size=num_records), 40.0, 100.0)
    attendance_percentage = np.round(attendance_percentage, 1)

    # Study hours per week between 2 and 35 hours
    study_hours = np.clip(np.random.normal(loc=14.0, scale=6.5, size=num_records), 2.0, 35.0)
    study_hours = np.round(study_hours, 1)

    # Sleep hours per day
    sleep_hours = np.clip(np.random.normal(loc=7.0, scale=1.1, size=num_records), 4.0, 10.0)
    sleep_hours = np.round(sleep_hours, 1)

    # Previous Academic Score (0 - 100)
    previous_score = np.clip(np.random.normal(loc=70.0, scale=14.0, size=num_records), 30.0, 99.0)
    previous_score = np.round(previous_score, 1)

    # Assignment score (0 - 100)
    assignment_score = np.clip(
        0.5 * previous_score + 0.3 * (attendance_percentage * 0.9) + np.random.normal(0, 7.0, size=num_records),
        30.0,
        100.0
    )
    assignment_score = np.round(assignment_score, 1)

    # Internal exam marks (0 - 100)
    internal_exam_score = np.clip(
        0.55 * previous_score + 0.25 * (study_hours * 2.2) + np.random.normal(0, 8.0, size=num_records),
        25.0,
        100.0
    )
    internal_exam_score = np.round(internal_exam_score, 1)

    # 3. Final Academic Score (Realistic Weighted Latent Formula with Noise)
    # Weights reflecting academic realities: previous score (35%), internal exam (25%), attendance (15%), study hours (10%), assignments (10%), plus subtle boost from tutoring/parent education
    edu_weights = {"High School": 0, "Associate Degree": 1.5, "Bachelor's": 3.0, "Master's": 4.5, "Doctorate": 5.5}
    edu_boost = np.array([edu_weights[p] for p in parent_education])
    tutor_boost = np.where(tutoring == "Yes", 2.5, 0.0)
    internet_boost = np.where(internet_access == "Yes", 1.5, -2.0)

    latent_final = (
        0.32 * previous_score +
        0.26 * internal_exam_score +
        0.16 * attendance_percentage +
        0.12 * (study_hours * 2.5) +
        0.10 * assignment_score +
        edu_boost +
        tutor_boost +
        internet_boost +
        np.random.normal(0, 4.5, size=num_records) - 8.0
    )
    
    final_score = np.clip(latent_final, 18.0, 100.0)
    final_score = np.round(final_score, 1)

    # 4. Performance Category
    def assign_category(score):
        if score < 40.0:
            return "At Risk"
        elif score < 60.0:
            return "Needs Improvement"
        elif score < 75.0:
            return "Average"
        elif score < 85.0:
            return "Good"
        else:
            return "Excellent"

    performance_categories = [assign_category(s) for s in final_score]

    df = pd.DataFrame({
        "student_id": student_ids,
        "gender": genders,
        "grade_level": grade_levels,
        "parent_education": parent_education,
        "internet_access": internet_access,
        "tutoring": tutoring,
        "extracurricular_activities": extracurricular,
        "attendance_percentage": attendance_percentage,
        "study_hours_per_week": study_hours,
        "sleep_hours_per_day": sleep_hours,
        "previous_score": previous_score,
        "assignment_score": assignment_score,
        "internal_exam_score": internal_exam_score,
        "final_score": final_score,
        "performance_category": performance_categories
    })

    return df

if __name__ == "__main__":
    output_dir = Path(__file__).resolve().parent
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "student_performance.csv"
    
    df = generate_student_dataset(num_records=1000, random_seed=42)
    df.to_csv(csv_path, index=False)
    print(f"Synthetic student performance dataset successfully generated at {csv_path} with {len(df)} records.")
    print("Class distribution:")
    print(df["performance_category"].value_counts())
    print("Numeric summary:")
    print(df[["attendance_percentage", "study_hours_per_week", "previous_score", "final_score"]].describe())
