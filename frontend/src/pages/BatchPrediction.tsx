import React, { useEffect, useState, useRef } from 'react';
import { modelsApi, predictionsApi } from '../services/api';
import { ModelRun, BatchPredictionResponse } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles
} from 'lucide-react';

export const BatchPrediction: React.FC = () => {
  const [models, setModels] = useState<ModelRun[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelRun | null>(null);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [processing, setProcessing] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<BatchPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await modelsApi.list();
        setModels(data);
        if (data.length > 0) {
          setSelectedModelId(data[0].id);
          setSelectedModel(data[0]);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch trained models.');
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      const found = models.find(m => m.id === selectedModelId);
      if (found) setSelectedModel(found);
    }
  }, [selectedModelId, models]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.csv')) {
        setError('Only .csv files are supported for batch processing.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !file) {
      setError('Please select an active model and upload a CSV file.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const res = await predictionsApi.batch(selectedModelId, file);
      setBatchResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Batch prediction failed. Ensure CSV contains all required feature columns.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadResults = () => {
    if (!batchResult) return;
    const headers = ['Row Index', 'Student Identifier', 'Predicted Value'];
    const rows = batchResult.predictions.map(p => [
      p.row_index,
      `"${p.student_identifier}"`,
      `"${p.predicted_value}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `batch_predictions_${batchResult.model_name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Batch Cohort Prediction Engine</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Process entire institutional rosters at once. Preserves student identifiers, reports row-level errors, and exports predictions.
        </p>
      </div>

      {error && <Alert type="error" title="Batch Processing Alert">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Model Selection Card */}
        <Card title="Batch Job Setup" subtitle="Select target model and upload student cohort CSV">
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Model</label>
              <select
                value={selectedModelId || ''}
                onChange={(e) => setSelectedModelId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.task_type.toUpperCase()}] {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Required Features Checklist */}
            {selectedModel && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="font-semibold text-slate-700 mb-1">CSV must contain these columns:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedModel.features?.map(f => (
                    <Badge key={f.feature_name} variant="brand">{f.feature_name}</Badge>
                  ))}
                  <Badge variant="neutral">student_id (optional)</Badge>
                </div>
              </div>
            )}

            {/* CSV File Upload Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Cohort CSV</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <span className="text-xs font-medium text-slate-700 block">
                  {file ? file.name : 'Click to select batch CSV'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'CSV format matching model feature names'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={processing}
              disabled={!file || !selectedModelId}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Generate Batch Predictions
            </Button>
          </form>
        </Card>

        {/* Results Overview & Table */}
        <Card
          className="lg:col-span-2"
          title="Batch Prediction Results"
          subtitle="Row-by-row forecast outputs and error diagnostics"
          action={
            batchResult && batchResult.successful_count > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadResults}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Export CSV
              </Button>
            ) : null
          }
        >
          {processing ? (
            <LoadingSpinner text="Evaluating rows using loaded pipeline..." />
          ) : batchResult ? (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium">Total Rows</div>
                  <div className="text-lg font-bold text-slate-800">{batchResult.total_rows}</div>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[11px] text-emerald-700 font-medium">Successful</div>
                  <div className="text-lg font-bold text-emerald-800">{batchResult.successful_count}</div>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <div className="text-[11px] text-rose-700 font-medium">Failed</div>
                  <div className="text-lg font-bold text-rose-800">{batchResult.failed_count}</div>
                </div>
              </div>

              {/* Row-Level Errors if any */}
              {batchResult.errors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs">
                  <div className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Row-Level Diagnostics ({batchResult.errors.length} issues)
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-rose-800">
                    {batchResult.errors.map((err, i) => (
                      <div key={i} className="text-[11px]">
                        Row {err.row_index} ({err.student_identifier}): {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Row #</th>
                      <th className="px-3 py-2 font-semibold">Student Identifier</th>
                      <th className="px-3 py-2 font-semibold">Predicted Forecast</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchResult.predictions.map((p) => (
                      <tr key={p.row_index} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-500">{p.row_index}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{p.student_identifier}</td>
                        <td className="px-3 py-2">
                          <span className="font-bold font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                            {p.predicted_value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Upload a cohort CSV and click "Generate Batch Predictions" to evaluate multiple students.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
