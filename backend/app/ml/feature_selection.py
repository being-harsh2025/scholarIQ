from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.feature_selection import (
    SelectKBest,
    f_regression,
    f_classif,
    mutual_info_regression,
    mutual_info_classif
)
from sklearn.preprocessing import LabelEncoder
from app.ml.preprocessing import identify_column_types

def run_feature_selection(
    df: pd.DataFrame,
    target_column: str,
    method: str = "select_k_best",
    k: int = 5
) -> Dict[str, Any]:
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' does not exist in dataset.")

    # Exclude identifiers and the target itself to prevent leakage
    numeric_cols, categorical_cols, identifier_cols = identify_column_types(df)
    
    # Candidate features are all columns except identifiers and the target
    candidate_features = [
        c for c in df.columns 
        if c != target_column and c not in identifier_cols
    ]

    if not candidate_features:
        raise ValueError("No eligible feature columns available after excluding identifiers and target.")

    # Target series
    y_raw = df[target_column].dropna()
    valid_idx = y_raw.index
    df_clean = df.loc[valid_idx].copy()
    y = df_clean[target_column]

    is_target_numeric = pd.api.types.is_numeric_dtype(y)

    scores_list = []
    interpretation = ""
    caution_note = "Feature scores represent statistical association within this dataset, not proven causation. High scoring indicators do not guarantee that artificially intervening on that feature alone will alter academic outcomes."

    if method == "correlation":
        interpretation = "Pearson correlation coefficients measure the strength and direction of linear relationships with the target (-1.0 to +1.0)."
        for col in candidate_features:
            if pd.api.types.is_numeric_dtype(df_clean[col]):
                corr = float(df_clean[col].corr(y))
                abs_corr = abs(corr) if not np.isnan(corr) else 0.0
                scores_list.append({
                    "feature": col,
                    "score": round(abs_corr, 4),
                    "interpretation": f"Correlation with target: {round(corr, 3)} (linear association)"
                })
            else:
                # For non-numeric in correlation mode, compute label encoded association
                encoded = LabelEncoder().fit_transform(df_clean[col].astype(str))
                corr = float(pd.Series(encoded).corr(y))
                abs_corr = abs(corr) if not np.isnan(corr) else 0.0
                scores_list.append({
                    "feature": col,
                    "score": round(abs_corr, 4),
                    "interpretation": f"Encoded category correlation: {round(corr, 3)}"
                })

    elif method == "mutual_info":
        interpretation = "Mutual information quantifies the amount of information obtained about the target by observing each feature (capturing both linear and non-linear dependencies)."
        # Prepare numeric matrix for mutual info
        X_encoded = pd.DataFrame(index=df_clean.index)
        for col in candidate_features:
            if pd.api.types.is_numeric_dtype(df_clean[col]):
                X_encoded[col] = df_clean[col].fillna(df_clean[col].median())
            else:
                X_encoded[col] = LabelEncoder().fit_transform(df_clean[col].astype(str))

        if is_target_numeric:
            mi_scores = mutual_info_regression(X_encoded, y, random_state=42)
        else:
            y_enc = LabelEncoder().fit_transform(y.astype(str))
            mi_scores = mutual_info_classif(X_encoded, y_enc, random_state=42)

        for col, score in zip(candidate_features, mi_scores):
            scores_list.append({
                "feature": col,
                "score": round(float(score), 4),
                "interpretation": f"Mutual information score: {round(float(score), 3)} nats"
            })

    else:  # select_k_best default
        interpretation = "SelectKBest evaluates individual features using univariate ANOVA F-tests against the target."
        X_encoded = pd.DataFrame(index=df_clean.index)
        for col in candidate_features:
            if pd.api.types.is_numeric_dtype(df_clean[col]):
                X_encoded[col] = df_clean[col].fillna(df_clean[col].median())
            else:
                X_encoded[col] = LabelEncoder().fit_transform(df_clean[col].astype(str))

        if is_target_numeric:
            selector = SelectKBest(score_func=f_regression, k='all')
            selector.fit(X_encoded, y)
        else:
            y_enc = LabelEncoder().fit_transform(y.astype(str))
            selector = SelectKBest(score_func=f_classif, k='all')
            selector.fit(X_encoded, y_enc)

        for col, score in zip(candidate_features, selector.scores_):
            val = float(score) if not np.isnan(score) else 0.0
            scores_list.append({
                "feature": col,
                "score": round(val, 4),
                "interpretation": f"F-statistic score: {round(val, 2)}"
            })

    # Sort descending by score
    scores_list.sort(key=lambda x: x["score"], reverse=True)

    # Assign ranks and selection flags
    ranked_results = []
    for rank, item in enumerate(scores_list, start=1):
        ranked_results.append({
            "feature": item["feature"],
            "score": item["score"],
            "rank": rank,
            "is_selected": rank <= k,
            "interpretation": item["interpretation"]
        })

    return {
        "target_column": target_column,
        "method": method,
        "interpretation": interpretation,
        "caution_note": caution_note,
        "scores": ranked_results
    }
