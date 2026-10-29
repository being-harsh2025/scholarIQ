import React, { useEffect, useState } from 'react';
import { modelsApi } from '../services/api';
import { ModelRun } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Layers,
  Sparkles,
  Eye
} from 'lucide-react';

export const ModelRegistry: React.FC = () => {
  const [models, setModels] = useState<ModelRun[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await modelsApi.list();
      setModels(data);
      if (data.length > 0 && !selectedModel) {
        setSelectedModel(data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch model registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleToggleActive = async (id: number) => {
    try {
      const updated = await modelsApi.toggleActive(id);
      setModels(models.map(m => m.id === id ? updated : m));
      if (selectedModel?.id === id) {
        setSelectedModel(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle model active status.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Querying model registry & artifact metadata..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Model Registry & Training History</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Inspect fitted Scikit-Learn pipelines, review held-out test evaluation benchmarks, and manage deployment status.
        </p>
      </div>

      {error && <Alert type="error" title="Notice">{error}</Alert>}

      {models.length === 0 ? (
        <Card className="py-12 text-center text-xs text-slate-400">
          <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          No trained models in registry. Train a model in Regression or Classification Lab first.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Registry Table */}
          <Card title="Registered Model Artifacts" subtitle="Persisted in internal controlled storage with verified schema fingerprints">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Run ID</th>
                    <th className="px-3 py-2 font-semibold">Model Name</th>
                    <th className="px-3 py-2 font-semibold">Task</th>
                    <th className="px-3 py-2 font-semibold">Algorithm</th>
                    <th className="px-3 py-2 font-semibold">Target (y)</th>
                    <th className="px-3 py-2 font-semibold">Features</th>
                    <th className="px-3 py-2 font-semibold">Primary Test Metric</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {models.map((m) => (
                    <tr key={m.id} className={selectedModel?.id === m.id ? 'bg-brand-50/20' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2 font-mono font-bold text-slate-500">#{m.id}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{m.name}</td>
                      <td className="px-3 py-2">
                        <Badge variant={m.task_type === 'regression' ? 'brand' : 'neutral'}>
                          {m.task_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 text-[11px]">{m.algorithm}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 text-[11px]">{m.target_column}</td>
                      <td className="px-3 py-2 font-mono">{m.features?.length || '—'} feats</td>
                      <td className="px-3 py-2 font-mono font-bold text-brand-600">
                        {m.task_type === 'regression'
                          ? `R²: ${m.metrics.r2 ?? '—'}`
                          : `F1: ${m.metrics.f1_macro ?? '—'}`}
                      </td>
                      <td className="px-3 py-2">
                        {m.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Archived</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedModel(m)}
                            className="p-1 text-slate-600 hover:text-brand-600 rounded"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(m.id)}
                            className={`p-1 rounded ${m.is_active ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                            title={m.is_active ? 'Deactivate model' : 'Activate model'}
                          >
                            {m.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Model Detail Drawer / Card */}
          {selectedModel && (
            <Card
              title={`Model Run #${selectedModel.id} Detail: ${selectedModel.name}`}
              subtitle="Comprehensive feature schema, test evaluation metrics, and hyperparameter configuration"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hyperparameters & Config */}
                <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                    Training Configuration
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Algorithm:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedModel.algorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Task Type:</span>
                    <span className="font-semibold text-slate-800 uppercase">{selectedModel.task_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Test Split:</span>
                    <span className="font-mono font-semibold text-slate-800">{(selectedModel.test_size * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Random Seed:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedModel.random_seed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Training Duration:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedModel.duration_seconds}s</span>
                  </div>
                </div>

                {/* Test Set Evaluation Metrics */}
                <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                    Held-Out Test Metrics
                  </div>
                  {selectedModel.task_type === 'regression' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mean Absolute Error (MAE):</span>
                        <span className="font-mono font-bold text-slate-800">{selectedModel.metrics.mae ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Root Mean Squared (RMSE):</span>
                        <span className="font-mono font-bold text-slate-800">{selectedModel.metrics.rmse ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">R² Determination:</span>
                        <span className={`font-mono font-bold ${(selectedModel.metrics.r2 ?? 0) < 0 ? 'text-rose-600' : 'text-brand-600'}`}>
                          {selectedModel.metrics.r2 ?? '—'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Accuracy:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {selectedModel.metrics.accuracy ? `${(selectedModel.metrics.accuracy * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Macro Precision:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedModel.metrics.precision_macro ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Macro Recall:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedModel.metrics.recall_macro ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Macro F1 Score:</span>
                        <span className="font-mono font-bold text-brand-600">{selectedModel.metrics.f1_macro ?? '—'}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Test Samples:</span>
                    <span className="font-mono text-slate-700">{selectedModel.metrics.test_sample_count ?? '—'}</span>
                  </div>
                </div>

                {/* Features Required */}
                <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                    Required Features ({selectedModel.features?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {selectedModel.features?.map(f => (
                      <Badge key={f.feature_name} variant="brand">{f.feature_name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
