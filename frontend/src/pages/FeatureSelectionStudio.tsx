import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { datasetsApi, featuresApi } from '../services/api';
import { Dataset, FeatureSelectionResponse, FeatureScore } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';

export const FeatureSelectionStudio: React.FC = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  
  // Selection Parameters
  const [targetColumn, setTargetColumn] = useState<string>('final_score');
  const [method, setMethod] = useState<string>('select_k_best');
  const [topK, setTopK] = useState<number>(6);

  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<FeatureSelectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setLoading(true);
        const data = await datasetsApi.list();
        setDatasets(data);
        if (data.length > 0) {
          setSelectedDatasetId(data[0].id);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch datasets.');
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      const fetchCols = async () => {
        try {
          const detail = await datasetsApi.get(selectedDatasetId);
          const colNames = detail.columns?.map(c => c.name) || [];
          setColumns(colNames);
          if (colNames.includes('final_score')) {
            setTargetColumn('final_score');
          } else if (colNames.includes('performance_category')) {
            setTargetColumn('performance_category');
          } else if (colNames.length > 0) {
            setTargetColumn(colNames[colNames.length - 1]);
          }
        } catch (e) {
          // ignore
        }
      };
      fetchCols();
    }
  }, [selectedDatasetId]);

  const handleRunFeatureSelection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDatasetId || !targetColumn) return;

    try {
      setComputing(true);
      setError(null);
      const res = await featuresApi.select({
        dataset_id: selectedDatasetId,
        target_column: targetColumn,
        method: method,
        k: topK
      });
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute feature selection.');
    } finally {
      setComputing(false);
    }
  };

  // Run automatically on first valid load
  useEffect(() => {
    if (selectedDatasetId && targetColumn && columns.length > 0) {
      handleRunFeatureSelection();
    }
  }, [selectedDatasetId, targetColumn, method, topK, columns]);

  const sendToTraining = (taskType: 'regression' | 'classification') => {
    if (!result) return;
    const selectedFeatures = result.scores.filter(s => s.is_selected).map(s => s.feature);
    const state = {
      datasetId: selectedDatasetId,
      targetColumn: result.target_column,
      selectedFeatures: selectedFeatures
    };
    if (taskType === 'regression') {
      navigate('/regression', { state });
    } else {
      navigate('/classification', { state });
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading feature studio..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Feature Selection Studio</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify highest-ranking academic indicators, quantify statistical associations, and prevent target leakage.
          </p>
        </div>
      </div>

      {error && <Alert type="error" title="Notice">{error}</Alert>}

      {/* Configuration Controls Bar */}
      <Card title="Feature Selection Configuration" subtitle="Select target column and statistical scoring method">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          {/* Dataset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Cohort</label>
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

          {/* Target Column */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prediction Target (y)</label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
            >
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Scoring Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Scoring Algorithm</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
            >
              <option value="select_k_best">SelectKBest (ANOVA F-statistic)</option>
              <option value="mutual_info">Mutual Information (Non-linear)</option>
              <option value="correlation">Pearson Linear Correlation</option>
            </select>
          </div>

          {/* Top K */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Top Features (k): <span className="text-brand-600 font-bold">{topK}</span>
            </label>
            <input
              type="range"
              min={2}
              max={Math.max(columns.length - 2, 3)}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {computing ? (
        <LoadingSpinner text="Computing feature statistical ranks..." />
      ) : result ? (
        <div className="space-y-6">
          {/* Causation Warning Alert */}
          <Alert type="warning" title="Methodological Safeguard & Causality Warning">
            {result.caution_note}
          </Alert>

          {/* Importance Chart & Quick Train Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Importance Bar Chart */}
            <Card
              className="lg:col-span-2"
              title={`Feature Ranking Scores (${result.method})`}
              subtitle={result.interpretation}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={result.scores}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="feature" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} name="Score">
                      {result.scores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.is_selected ? '#4f46e5' : '#cbd5e1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Quick Transition to Training */}
            <Card
              title="Pipeline Integration"
              subtitle="Feed selected features directly into model training labs"
            >
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="font-semibold text-slate-700 mb-1">Selected Indicators ({topK}):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.scores.filter(s => s.is_selected).map(s => (
                      <Badge key={s.feature} variant="brand">{s.feature}</Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => sendToTraining('regression')}
                  variant="primary"
                  size="md"
                  className="w-full"
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                >
                  Configure Regression Lab
                </Button>

                <Button
                  onClick={() => sendToTraining('classification')}
                  variant="outline"
                  size="md"
                  className="w-full"
                  icon={<Layers className="w-3.5 h-3.5" />}
                >
                  Configure Classification Lab
                </Button>
              </div>
            </Card>
          </div>

          {/* Feature Rankings Table */}
          <Card
            title="Feature Ranking & Evaluation Table"
            subtitle="Excluded identifiers and regression target are strictly prevented from causing data leakage"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Rank</th>
                    <th className="px-3 py-2 font-semibold">Candidate Feature</th>
                    <th className="px-3 py-2 font-semibold">Calculated Score</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Statistical Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.scores.map((s) => (
                    <tr key={s.feature} className={s.is_selected ? 'bg-brand-50/20' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2 font-bold text-slate-700">#{s.rank}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900 font-mono text-[11px]">{s.feature}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{s.score}</td>
                      <td className="px-3 py-2">
                        {s.is_selected ? (
                          <Badge variant="brand">Selected (Top {topK})</Badge>
                        ) : (
                          <Badge variant="neutral">Excluded</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[11px]">{s.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
