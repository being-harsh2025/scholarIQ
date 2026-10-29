import os
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from fastapi import HTTPException
from app.models.entities import Dataset
from app.ml.preprocessing import identify_column_types

def compute_eda_analysis(dataset: Dataset) -> Dict[str, Any]:
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found on disk.")

    df = pd.read_csv(dataset.file_path)
    numeric_cols, categorical_cols, identifier_cols = identify_column_types(df)

    # 1. Missing summary
    missing_summary = {col: int(df[col].isna().sum()) for col in df.columns}

    # 2. Distributions for numeric columns (histogram bins)
    distributions = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if not series.empty:
            counts, bin_edges = np.histogram(series, bins=10)
            bins_data = []
            for i in range(len(counts)):
                bins_data.append({
                    "range": f"{round(float(bin_edges[i]), 1)} - {round(float(bin_edges[i+1]), 1)}",
                    "count": int(counts[i]),
                    "min": round(float(bin_edges[i]), 1),
                    "max": round(float(bin_edges[i+1]), 1)
                })
            distributions[col] = {
                "min": round(float(series.min()), 2),
                "max": round(float(series.max()), 2),
                "mean": round(float(series.mean()), 2),
                "median": round(float(series.median()), 2),
                "std": round(float(series.std()), 2) if len(series) > 1 else 0.0,
                "bins": bins_data
            }

    # 3. Correlation Matrix across numeric columns
    corr_matrix_list = []
    if len(numeric_cols) >= 2:
        num_df = df[numeric_cols].dropna()
        if not num_df.empty:
            corr_df = num_df.corr().round(3)
            for c1 in numeric_cols:
                for c2 in numeric_cols:
                    val = float(corr_df.loc[c1, c2])
                    corr_matrix_list.append({
                        "col1": c1,
                        "col2": c2,
                        "value": 0.0 if np.isnan(val) else val
                    })

    # 4. Scatter Plot: Attendance vs Score (if available)
    scatter_attendance = []
    score_col = next((c for c in ["final_score", "score", "grade", "gpa"] if c in df.columns), None)
    if not score_col and numeric_cols:
        score_col = numeric_cols[-1]
    
    attendance_col = next((c for c in ["attendance_percentage", "attendance"] if c in df.columns), None)
    cat_col = next((c for c in ["performance_category", "grade_level", "gender"] if c in df.columns), None)
    id_col = identifier_cols[0] if identifier_cols else None

    sample_size = min(len(df), 300)
    sampled_indices = np.random.choice(len(df), size=sample_size, replace=False) if len(df) > sample_size else np.arange(len(df))
    sampled_df = df.iloc[sampled_indices]

    if attendance_col and score_col:
        for _, row in sampled_df.iterrows():
            if pd.notna(row[attendance_col]) and pd.notna(row[score_col]):
                scatter_attendance.append({
                    "attendance": round(float(row[attendance_col]), 1),
                    "score": round(float(row[score_col]), 1),
                    "category": str(row[cat_col]) if cat_col and pd.notna(row[cat_col]) else "Student",
                    "student_id": str(row[id_col]) if id_col and pd.notna(row[id_col]) else f"ID_{_}"
                })

    # 5. Scatter Plot: Study Hours vs Score (if available)
    scatter_study = []
    study_col = next((c for c in ["study_hours_per_week", "study_hours"] if c in df.columns), None)
    if study_col and score_col:
        for _, row in sampled_df.iterrows():
            if pd.notna(row[study_col]) and pd.notna(row[score_col]):
                scatter_study.append({
                    "study_hours": round(float(row[study_col]), 1),
                    "score": round(float(row[score_col]), 1),
                    "category": str(row[cat_col]) if cat_col and pd.notna(row[cat_col]) else "Student",
                    "student_id": str(row[id_col]) if id_col and pd.notna(row[id_col]) else f"ID_{_}"
                })

    # 6. Performance Category Distribution
    category_distribution = []
    if cat_col and cat_col in df.columns:
        counts = df[cat_col].value_counts(dropna=False)
        total = len(df)
        for cat_name, cnt in counts.items():
            category_distribution.append({
                "category": str(cat_name) if pd.notna(cat_name) else "Missing",
                "count": int(cnt),
                "percentage": round(float(cnt / total * 100), 1)
            })

    # 7. Group Analyses (by categorical demographic columns)
    group_analyses = {}
    for g_col in categorical_cols:
        if df[g_col].nunique() <= 10:  # Sensible grouping columns
            groups_data = []
            grouped = df.groupby(g_col, observed=True)
            for g_name, g_df in grouped:
                avg_score = float(g_df[score_col].mean()) if score_col and pd.api.types.is_numeric_dtype(g_df[score_col]) else None
                avg_att = float(g_df[attendance_col].mean()) if attendance_col and pd.api.types.is_numeric_dtype(g_df[attendance_col]) else None
                groups_data.append({
                    "group": str(g_name),
                    "count": len(g_df),
                    "avg_score": round(avg_score, 2) if avg_score is not None else None,
                    "avg_attendance": round(avg_att, 2) if avg_att is not None else None
                })
            group_analyses[g_col] = groups_data

    return {
        "dataset_id": dataset.id,
        "row_count": len(df),
        "column_count": len(df.columns),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "missing_summary": missing_summary,
        "distributions": distributions,
        "correlation_matrix": corr_matrix_list,
        "scatter_attendance_score": scatter_attendance,
        "scatter_study_score": scatter_study,
        "category_distribution": category_distribution,
        "group_analyses": group_analyses
    }
