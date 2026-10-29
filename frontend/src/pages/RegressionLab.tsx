import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { datasetsApi, modelsApi } from '../services/api';
import { Dataset, ModelRun } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  TrendingUp,
  Cpu,
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Line
} from 'recharts';

export const RegressionLab: React.FC = () => {
  const location = useLocation();
  const passedState = location.state as { datasetId?: number; targetColumn?: string; selectedFeatures?: string[] } | undefined;

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(passedState?.datasetId || null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // Training Configuration
  const [modelName, setModelName] = useState<string>('Academic Final Score Predictor');
  const [targetColumn, setTargetColumn] = useState<string>(passedState?.targetColumn || 'final_score');
  const [algorithm, setAlgorithm] = useState<string>('RandomForestRegressor');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(passedState?.selectedFeatures || []);
  const [testSplit, setTestSplit] = useState<number>(0.2);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  // Training Execution State
  const [training, setTraining] = useState<boolean>(false);
  const [trainedModel, setTrainedModel] = useState<ModelRun | null>(null);
  const [pastModels, setPastModels] = useState<ModelRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch initial datasets
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const data = await datasetsApi.list();
        setDatasets(data);
        if (!selectedDatasetId && data.length > 0) {
          setSelectedDatasetId(data[0].id);
        }

        const models = await modelsApi.list('regression');
        setPastModels(models);
        if (models.length > 0) {
          setTrainedModel(models[0]);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to initialize Regression Lab.');
      }
    };
    fetchInitial();
  }, []);

  // Update available columns when dataset changes
  useEffect(() => {
    if (selectedDatasetId) {
      const fetchCols = async () => {
        try {
          const detail = await datasetsApi.get(selectedDatasetId);
          const cols = detail.columns?.map(c => c.name) || [];
          setAvailableColumns(cols);

          if (!passedState?.selectedFeatures) {
            // Default select top numeric features, excluding identifiers and target
            const nonTarget = cols.filter(c => c !== targetColumn && !c.toLowerCase().includes('id'));
            setSelectedFeatures(nonTarget.slice(0, 6));
          }
        } catch (e) {
          // ignore
        }
      };
      fetchCols();
    }
  }, [selectedDatasetId, targetColumn]);

  const toggleFeature = (col: string) => {
    if (col === targetColumn) return;
    if (selectedFeatures.includes(col)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== col));
    } else {
      setSelectedFeatures([...selectedFeatures, col]);
    }
  };

  const selectAllFeatures = () => {
    const eligible = availableColumns.filter(c => c !== targetColumn && !c.toLowerCase().includes('id'));
    setSelectedFeatures(eligible);
  };

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;

    if (selectedFeatures.length === 0) {
      setError('Please select at least one input feature.');
      return;
    }

    if (selectedFeatures.includes(targetColumn)) {
      setError('Target leakage alert: Target column cannot be included in input features!');
      return;
    }

    try {
      setTraining(true);
      setError(null);
      setSuccessMsg(null);

      const res = await modelsApi.trainRegression({
        dataset_id: selectedDatasetId,
        name: modelName,
        algorithm: algorithm,
        target_column: targetColumn,
        selected_features: selectedFeatures,
        test_size: testSplit,
        random_seed: randomSeed
      });

      setTrainedModel(res);
      setSuccessMsg(`Model "${res.name}" successfully trained in ${res.duration_seconds}s and persisted with Joblib!`);
      
      // Refresh comparison table
      const updatedList = await modelsApi.list('regression');
      setPastModels(updatedList);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Training failed. Check parameters and dataset completeness.');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Regression Lab — Final Score Predictor</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Train and evaluate continuous performance models with actual Scikit-learn pipelines and leakage guardrails.
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

      {error && <Alert type="error" title="Regression Error">{error}</Alert>}
      {successMsg && <Alert type="success" title="Training Complete">{successMsg}</Alert>}

      {/* Main Training Configuration Form */}
      <Card title="Training Configuration & Leakage Safeguards" subtitle="Preprocessing (Median imputation & standard scaling) is strictly fitted on training splits only">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Numeric Target (y)</label>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              >
                <option value="DummyRegressor">DummyRegressor (Baseline Mean)</option>
                <option value="LinearRegression">LinearRegression (OLS)</option>
                <option value="RandomForestRegressor">RandomForestRegressor (Ensemble Trees)</option>
                <option value="GradientBoostingRegressor">GradientBoostingRegressor (Boosting)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Held-out Test Split: <span className="text-brand-600 font-bold">{(testSplit * 100).toFixed(0)}%</span>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Random Seed (Reproducibility)</label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              />
            </div>
          </div>

          {/* Feature Selector Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Eligible Input Features ({selectedFeatures.length} selected):
              </label>
              <button
                type="button"
                onClick={selectAllFeatures}
                className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold"
              >
                Select All Eligible
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {availableColumns
                .filter(col => !col.toLowerCase().includes('id') && col !== targetColumn)
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
            Train Regression Model on Backend
          </Button>
        </form>
      </Card>

      {/* Evaluation Results on Held-out Test Split */}
      {trainedModel && (
        <div className="space-y-6">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">Mean Absolute Error (MAE)</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {trainedModel.metrics.mae ?? '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Average absolute score error</div>
            </Card>

            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">Root Mean Squared (RMSE)</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {trainedModel.metrics.rmse ?? '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Penalizes large outlier misses</div>
            </Card>

            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">R² Coefficient of Determination</div>
              <div className={`text-2xl font-bold mt-1 ${(trainedModel.metrics.r2 ?? 0) < 0 ? 'text-rose-600' : 'text-brand-600'}`}>
                {trainedModel.metrics.r2 ?? '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Variance explained on test split</div>
            </Card>

            <Card className="p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500">Test Evaluation Samples</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {trainedModel.metrics.test_sample_count ?? '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {(trainedModel.test_size * 100).toFixed(0)}% unseen held-out records
              </div>
            </Card>
          </div>

          {/* Negative R² Warning if present */}
          {trainedModel.metrics.r2_warning && (
            <Alert type="warning" title="Negative R² Detected on Held-Out Test Set">
              {trainedModel.metrics.r2_warning}
            </Alert>
          )}

          {/* Visual Evaluation Plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actual vs Predicted Scatter */}
            <Card
              title="Actual vs. Predicted Academic Scores"
              subtitle="Data points closer to the diagonal indicate accurate score predictions"
            >
              {trainedModel.metrics.actual_vs_predicted && trainedModel.metrics.actual_vs_predicted.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="actual" name="Actual Score" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="predicted" name="Predicted Score" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <ZAxis range={[30, 30]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Scatter name="Evaluated Test Points" data={trainedModel.metrics.actual_vs_predicted} fill="#4f46e5" fillOpacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">No scatter points available.</div>
              )}
            </Card>

            {/* Residuals vs Predicted Plot */}
            <Card
              title="Residual Analysis (Residuals vs. Predicted)"
              subtitle="Residual = Actual - Predicted. Symmetric distribution around 0 indicates unbiased predictions"
            >
              {trainedModel.metrics.residuals && trainedModel.metrics.residuals.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="predicted" name="Predicted Score" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="residual" name="Residual Error" tick={{ fontSize: 10 }} />
                      <ZAxis range={[30, 30]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Scatter name="Residuals" data={trainedModel.metrics.residuals} fill="#ef4444" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">No residuals available.</div>
              )}
            </Card>
          </div>

          {/* Model Comparison Table */}
          <Card
            title="Regression Algorithms Comparison Table"
            subtitle="Benchmark your models against the Dummy baseline and alternate regression estimators"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Model Name</th>
                    <th className="px-3 py-2 font-semibold">Algorithm</th>
                    <th className="px-3 py-2 font-semibold">MAE</th>
                    <th className="px-3 py-2 font-semibold">RMSE</th>
                    <th className="px-3 py-2 font-semibold">R² Score</th>
                    <th className="px-3 py-2 font-semibold">Duration</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastModels.map((m) => (
                    <tr key={m.id} className={trainedModel?.id === m.id ? 'bg-brand-50/30' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{m.name}</td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-[11px]">{m.algorithm}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{m.metrics.mae ?? '—'}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{m.metrics.rmse ?? '—'}</td>
                      <td className={`px-3 py-2 font-mono font-bold ${(m.metrics.r2 ?? 0) < 0 ? 'text-rose-600' : 'text-brand-600'}`}>
                        {m.metrics.r2 ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{m.duration_seconds}s</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTrainedModel(m)}
                        >
                          View Plots
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
