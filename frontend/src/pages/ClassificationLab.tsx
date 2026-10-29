import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { datasetsApi, modelsApi } from '../services/api';
import { Dataset, ModelRun } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  Layers,
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Sliders
} from 'lucide-react';

export const ClassificationLab: React.FC = () => {
  const location = useLocation();
  const passedState = location.state as { datasetId?: number; targetColumn?: string; selectedFeatures?: string[] } | undefined;

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(passedState?.datasetId || null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  // Configuration
  const [modelName, setModelName] = useState<string>('Performance Tier Classifier');
  const [algorithm, setAlgorithm] = useState<string>('RandomForestClassifier');
  const [isDerivedTarget, setIsDerivedTarget] = useState<boolean>(false);
  const [sourceScoreColumn, setSourceScoreColumn] = useState<string>('final_score');
  const [targetColumn, setTargetColumn] = useState<string>(passedState?.targetColumn || 'performance_category');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(passedState?.selectedFeatures || []);
  const [testSplit, setTestSplit] = useState<number>(0.2);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  // Thresholds for derived target
  const [thresholdAtRisk, setThresholdAtRisk] = useState<number>(40.0);
  const [thresholdNeedsImprovement, setThresholdNeedsImprovement] = useState<number>(60.0);
  const [thresholdAverage, setThresholdAverage] = useState<number>(75.0);
  const [thresholdGood, setThresholdGood] = useState<number>(85.0);

  // Execution state
  const [training, setTraining] = useState<boolean>(false);
  const [trainedModel, setTrainedModel] = useState<ModelRun | null>(null);
  const [pastModels, setPastModels] = useState<ModelRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const data = await datasetsApi.list();
        setDatasets(data);
        if (!selectedDatasetId && data.length > 0) {
          setSelectedDatasetId(data[0].id);
        }

        const models = await modelsApi.list('classification');
        setPastModels(models);
        if (models.length > 0) {
          setTrainedModel(models[0]);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to initialize Classification Lab.');
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      const fetchCols = async () => {
        try {
          const detail = await datasetsApi.get(selectedDatasetId);
          const cols = detail.columns?.map(c => c.name) || [];
          setAvailableColumns(cols);

          if (!passedState?.selectedFeatures) {
            const nonTarget = cols.filter(c => 
              c !== targetColumn && 
              c !== sourceScoreColumn && 
              !c.toLowerCase().includes('id')
            );
            setSelectedFeatures(nonTarget.slice(0, 6));
          }
        } catch (e) {
          // ignore
        }
      };
      fetchCols();
    }
  }, [selectedDatasetId, targetColumn, isDerivedTarget, sourceScoreColumn]);

  const toggleFeature = (col: string) => {
    if (col === targetColumn || (isDerivedTarget && col === sourceScoreColumn)) return;
    if (selectedFeatures.includes(col)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== col));
    } else {
      setSelectedFeatures([...selectedFeatures, col]);
    }
  };

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;

    if (selectedFeatures.length === 0) {
      setError('Please select at least one input feature.');
      return;
    }

    if (isDerivedTarget && selectedFeatures.includes(sourceScoreColumn)) {
      setError(`Critical leakage violation: Cannot include source score column "${sourceScoreColumn}" when predicting categories derived from it!`);
      return;
    }

    try {
      setTraining(true);
      setError(null);
      setSuccessMsg(null);

      const derivedThresholds = isDerivedTarget ? {
        "At Risk": thresholdAtRisk,
        "Needs Improvement": thresholdNeedsImprovement,
        "Average": thresholdAverage,
        "Good": thresholdGood,
        "Excellent": 100.0
      } : undefined;

      const res = await modelsApi.trainClassification({
        dataset_id: selectedDatasetId,
        name: modelName,
        algorithm: algorithm,
        target_column: isDerivedTarget ? `${sourceScoreColumn}_category` : targetColumn,
        is_derived_target: isDerivedTarget,
        source_score_column: isDerivedTarget ? sourceScoreColumn : undefined,
        derived_thresholds: derivedThresholds,
        selected_features: selectedFeatures,
        test_size: testSplit,
        random_seed: randomSeed
      });

      setTrainedModel(res);
      setSuccessMsg(`Classification model "${res.name}" successfully trained on stratified test split!`);
      
      const updatedList = await modelsApi.list('classification');
      setPastModels(updatedList);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Training failed. Check category distributions and parameters.');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Classification Lab — Academic Tier Predictor</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Train multi-class classifiers with stratified splits, confusion matrix evaluations, and class imbalance alerts.
          </p>
        </div>
        {trainedModel && (
          <Link to="/predict-single">
            <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
              Test Single Prediction
            </Button>
          </Link>
        )}
      </div>

      {error && <Alert type="error" title="Classification Notice">{error}</Alert>}
      {successMsg && <Alert type="success" title="Success">{successMsg}</Alert>}

      {/* Configuration Form */}
      <Card title="Classification Configuration" subtitle="Configure native or dynamically derived category thresholds">
        <form onSubmit={handleTrain} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model Run Label</label>
              <input
                type="text"
                required
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Cohort Dataset</label>
              <select
                value={selectedDatasetId || ''}
                onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Classification Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              >
                <option value="DummyClassifier">DummyClassifier (Stratified Baseline)</option>
                <option value="LogisticRegression">LogisticRegression (Multi-class)</option>
                <option value="RandomForestClassifier">RandomForestClassifier (Ensemble)</option>
                <option value="DecisionTreeClassifier">DecisionTreeClassifier (Tree)</option>
              </select>
            </div>
          </div>

          {/* Target Definition: Native vs Derived */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="targetMode"
                  checked={!isDerivedTarget}
                  onChange={() => setIsDerivedTarget(false)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Use Native Categorical Column in Dataset
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="targetMode"
                  checked={isDerivedTarget}
                  onChange={() => setIsDerivedTarget(true)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Derive Categories Dynamically from Numeric Score
              </label>
            </div>

            {!isDerivedTarget ? (
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Categorical Target Column</label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
                >
                  {availableColumns.filter(c => !c.toLowerCase().includes('id')).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Source Score Column</label>
                  <select
                    value={sourceScoreColumn}
                    onChange={(e) => setSourceScoreColumn(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
                  >
                    {availableColumns.filter(c => !c.toLowerCase().includes('id')).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">At Risk (&lt; score)</label>
                    <input
                      type="number"
                      value={thresholdAtRisk}
                      onChange={(e) => setThresholdAtRisk(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Needs Impr. (&lt; score)</label>
                    <input
                      type="number"
                      value={thresholdNeedsImprovement}
                      onChange={(e) => setThresholdNeedsImprovement(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Average (&lt; score)</label>
                    <input
                      type="number"
                      value={thresholdAverage}
                      onChange={(e) => setThresholdAverage(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Good (&lt; score)</label>
                    <input
                      type="number"
                      value={thresholdGood}
                      onChange={(e) => setThresholdGood(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Split & Seed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stratified Test Split: <span className="text-brand-600 font-bold">{(testSplit * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min={0.1}
                max={0.4}
                step={0.05}
                value={testSplit}
                onChange={(e) => setTestSplit(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Random Seed</label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              />
            </div>
          </div>

          {/* Feature Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Input Features ({selectedFeatures.length} selected):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {availableColumns
                .filter(col => 
                  !col.toLowerCase().includes('id') && 
                  col !== targetColumn && 
                  (!isDerivedTarget || col !== sourceScoreColumn)
                )
                .map((col) => {
                  const isChecked = selectedFeatures.includes(col);
                  return (
                    <label
                      key={col}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-brand-50 text-brand-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFeature(col)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="truncate">{col}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={training}
            icon={<Play className="w-3.5 h-3.5" />}
          >
            Train Classification Model on Backend
          </Button>
        </form>
      </Card>

      {/* Model Evaluation & Confusion Matrix */}
      {trainedModel && (
        <div className="space-y-6">
          {/* Imbalance alert if flagged */}
          {trainedModel.metrics.imbalance_warning && (
            <Alert type="warning" title="Class Imbalance Notice">
              {trainedModel.metrics.imbalance_warning}
            </Alert>
          )}

          {/* Top Level Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">Test Accuracy</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {trainedModel.metrics.accuracy ? `${(trainedModel.metrics.accuracy * 100).toFixed(1)}%` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Overall correct predictions</div>
            </Card>

            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">Macro F1 Score</div>
              <div className="text-2xl font-bold text-brand-600 mt-1">
                {trainedModel.metrics.f1_macro ?? '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Unweighted mean across all classes</div>
            </Card>

            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">Weighted F1 Score</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">
                {trainedModel.metrics.f1_weighted ?? '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Support-weighted class average</div>
            </Card>

            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">Macro Precision / Recall</div>
              <div className="text-xl font-bold text-slate-800 mt-1">
                {trainedModel.metrics.precision_macro} / {trainedModel.metrics.recall_macro}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">P / R balance</div>
            </Card>
          </div>

          {/* Confusion Matrix & Per-Class Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix Visual */}
            <Card
              title="Confusion Matrix Heatmap"
              subtitle="Rows represent True Academic Classes; Columns represent Model Predictions"
            >
              {trainedModel.metrics.confusion_matrix && trainedModel.metrics.classes ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-2 border border-slate-200 text-left font-bold">True \ Pred</th>
                        {trainedModel.metrics.classes.map((cls) => (
                          <th key={cls} className="p-2 border border-slate-200 font-semibold text-[11px]">
                            {cls}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trainedModel.metrics.classes.map((rCls, rIdx) => (
                        <tr key={rCls}>
                          <td className="p-2 border border-slate-200 text-left font-semibold text-slate-800 bg-slate-50 text-[11px] whitespace-nowrap">
                            {rCls}
                          </td>
                          {trainedModel.metrics.classes.map((cCls, cIdx) => {
                            const count = trainedModel.metrics.confusion_matrix![rIdx][cIdx];
                            const isDiagonal = rIdx === cIdx;
                            let bgClass = "bg-white text-slate-500";
                            if (isDiagonal && count > 0) bgClass = "bg-emerald-100 text-emerald-900 font-bold";
                            else if (!isDiagonal && count > 0) bgClass = "bg-rose-50 text-rose-800 font-medium";

                            return (
                              <td key={cCls} className={`p-2 border border-slate-200 font-mono text-[11px] ${bgClass}`}>
                                {count}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">Confusion matrix not available.</div>
              )}
            </Card>

            {/* Per-Class Metrics Breakdown */}
            <Card
              title="Per-Class Performance Report"
              subtitle="Precision, recall, and harmonic F1 breakdown per student tier"
            >
              {trainedModel.metrics.per_class ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Class Tier</th>
                        <th className="px-3 py-2 font-semibold">Precision</th>
                        <th className="px-3 py-2 font-semibold">Recall</th>
                        <th className="px-3 py-2 font-semibold">F1-Score</th>
                        <th className="px-3 py-2 font-semibold">Test Support</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trainedModel.metrics.per_class.map((row) => (
                        <tr key={row.class_name} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-800">{row.class_name}</td>
                          <td className="px-3 py-2 font-mono font-medium">{row.precision}</td>
                          <td className="px-3 py-2 font-mono font-medium">{row.recall}</td>
                          <td className="px-3 py-2 font-mono font-bold text-brand-600">{row.f1_score}</td>
                          <td className="px-3 py-2 text-slate-500 font-mono">{row.support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">Per-class report not available.</div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
