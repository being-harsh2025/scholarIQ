from typing import List, Any
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyRegressor, DummyClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from app.ml.preprocessing import create_preprocessor

def build_regression_pipeline(
    algorithm: str,
    numeric_features: List[str],
    categorical_features: List[str],
    random_seed: int = 42
) -> Pipeline:
    preprocessor = create_preprocessor(numeric_features, categorical_features)

    if algorithm == "DummyRegressor":
        estimator = DummyRegressor(strategy="mean")
    elif algorithm == "LinearRegression":
        estimator = LinearRegression()
    elif algorithm == "GradientBoostingRegressor":
        estimator = GradientBoostingRegressor(random_state=random_seed, n_estimators=100, max_depth=4)
    elif algorithm == "RandomForestRegressor":
        estimator = RandomForestRegressor(random_state=random_seed, n_estimators=100, max_depth=12, n_jobs=-1)
    else:
        # Default to RandomForestRegressor
        estimator = RandomForestRegressor(random_state=random_seed, n_estimators=100, max_depth=12, n_jobs=-1)

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", estimator)
    ])
    return pipeline

def build_classification_pipeline(
    algorithm: str,
    numeric_features: List[str],
    categorical_features: List[str],
    random_seed: int = 42
) -> Pipeline:
    preprocessor = create_preprocessor(numeric_features, categorical_features)

    if algorithm == "DummyClassifier":
        estimator = DummyClassifier(strategy="stratified", random_state=random_seed)
    elif algorithm == "LogisticRegression":
        estimator = LogisticRegression(random_state=random_seed, max_iter=1000)
    elif algorithm == "DecisionTreeClassifier":
        estimator = DecisionTreeClassifier(random_state=random_seed, max_depth=6)
    elif algorithm == "RandomForestClassifier":
        estimator = RandomForestClassifier(random_state=random_seed, n_estimators=100, max_depth=12, n_jobs=-1)
    else:
        estimator = RandomForestClassifier(random_state=random_seed, n_estimators=100, max_depth=12, n_jobs=-1)

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", estimator)
    ])
    return pipeline
