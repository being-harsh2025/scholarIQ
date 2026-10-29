import React, { useEffect, useState } from 'react';
import { datasetsApi } from '../services/api';
import { Dataset, EdaSummary } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  ScatterChart as ScatterIcon,
  Table as TableIcon,
  Users,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const EdaStudio: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [eda, setEda] = useState<EdaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [edaLoading, setEdaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active distribution column in view
  const [selectedDistCol, setSelectedDistCol] = useState<string>('final_score');

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
        setError(err.response?.data?.detail || 'Failed to fetch datasets list.');
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      const fetchEda = async () => {
        try {
          setEdaLoading(true);
          setError(null);
          const res = await datasetsApi.getEda(selectedDatasetId);
          setEda(res);
          // Set default distribution column
          if (res.numeric_columns.length > 0) {
            const defaultCol = res.numeric_columns.includes('final_score')
              ? 'final_score'
              : res.numeric_columns[0];
            setSelectedDistCol(defaultCol);
          }
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Failed to compute EDA for dataset.');
        } finally {
          setEdaLoading(false);
        }
      };
      fetchEda();
    }
  }, [selectedDatasetId]);

  if (loading) {
    return <LoadingSpinner text="Loading datasets..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Exploratory Data Analysis (EDA)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical distributions, multi-variable scatter correlations, and demographic cohort insights.
          </p>
        </div>

        {/* Dataset dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Active Dataset:</label>
          <select
            value={selectedDatasetId || ''}
            onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus-ring bg-white text-slate-800"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.row_count} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Alert type="error" title="Analysis Notice">{error}</Alert>}

      {edaLoading ? (
        <LoadingSpinner text="Computing real statistical distributions and correlation matrices..." />
      ) : !eda ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Select or upload a dataset to view exploratory data analysis.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500">Total Samples</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{eda.row_count} rows</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500">Numeric Features</div>
              <div className="text-lg font-bold text-brand-600 mt-0.5">{eda.numeric_columns.length} columns</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500">Categorical Features</div>
              <div className="text-lg font-bold text-indigo-600 mt-0.5">{eda.categorical_columns.length} columns</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500">Total Missing Values</div>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">
                {Object.values(eda.missing_summary).reduce((a, b) => a + b, 0)} cells
              </div>
            </div>
          </div>

          {/* Section 1: Distribution Histogram & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Numeric Feature Distribution Histogram */}
            <Card
              title={`Distribution Histogram: ${selectedDistCol}`}
              subtitle="Calculated bin counts and spread for selected continuous column"
              action={
                <select
                  value={selectedDistCol}
                  onChange={(e) => setSelectedDistCol(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                >
                  {eda.numeric_columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              }
            >
              {eda.distributions[selectedDistCol] ? (
                <div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span>Mean: <strong className="text-slate-800">{eda.distributions[selectedDistCol].mean}</strong></span>
                    <span>Median: <strong className="text-slate-800">{eda.distributions[selectedDistCol].median}</strong></span>
                    <span>Std Dev: <strong className="text-slate-800">{eda.distributions[selectedDistCol].std}</strong></span>
                    <span>Range: <strong className="text-slate-800">{eda.distributions[selectedDistCol].min} – {eda.distributions[selectedDistCol].max}</strong></span>
                  </div>

                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eda.distributions[selectedDistCol].bins} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Students in Bin" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No distribution computed for {selectedDistCol}.
                </div>
              )}
            </Card>

            {/* Performance Category Distribution */}
            <Card
              title="Academic Category Distribution"
              subtitle="Actual distribution of students across evaluated academic achievement tiers"
            >
              {eda.category_distribution?.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="h-60 w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={eda.category_distribution}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={3}
                        >
                          {eda.category_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full sm:w-1/2 space-y-2">
                    {eda.category_distribution.map((c, i) => (
                      <div key={c.category} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                          <span className="font-semibold text-slate-800">{c.category}</span>
                        </div>
                        <div className="text-slate-600 font-mono">
                          {c.count} ({c.percentage}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No performance categories defined in this cohort.
                </div>
              )}
            </Card>
          </div>

          {/* Section 2: Scatter Plots (Attendance & Study Hours vs Final Score) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance vs Score Scatter */}
            <Card
              title="Attendance Rate vs. Final Score"
              subtitle="Scatter of student attendance percentage plotted against final academic marks"
            >
              {eda.scatter_attendance_score?.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="attendance" name="Attendance %" domain={[40, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="score" name="Final Score" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <ZAxis range={[25, 25]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        formatter={(val, name) => [val, name]}
                      />
                      <Scatter name="Students" data={eda.scatter_attendance_score} fill="#4f46e5" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Attendance or Score columns not detected for scatter analysis.
                </div>
              )}
            </Card>

            {/* Study Hours vs Score Scatter */}
            <Card
              title="Study Hours / Week vs. Final Score"
              subtitle="Weekly independent study duration mapped to evaluated score"
            >
              {eda.scatter_study_score?.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="study_hours" name="Study Hours" domain={[0, 40]} tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="score" name="Final Score" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <ZAxis range={[25, 25]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        formatter={(val, name) => [val, name]}
                      />
                      <Scatter name="Students" data={eda.scatter_study_score} fill="#06b6d4" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Study Hours or Score columns not detected for scatter analysis.
                </div>
              )}
            </Card>
          </div>

          {/* Section 3: Pearson Correlation Heatmap */}
          <Card
            title="Pearson Correlation Heatmap Matrix"
            subtitle="Pairwise linear correlation coefficients between all continuous numeric indicators (-1.0 to +1.0)"
          >
            {eda.correlation_matrix?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 border border-slate-200 text-left font-bold">Feature</th>
                      {eda.numeric_columns.map((col) => (
                        <th key={col} className="p-2 border border-slate-200 font-semibold whitespace-nowrap text-[11px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eda.numeric_columns.map((rCol) => (
                      <tr key={rCol}>
                        <td className="p-2 border border-slate-200 text-left font-semibold text-slate-800 bg-slate-50 text-[11px] whitespace-nowrap">
                          {rCol}
                        </td>
                        {eda.numeric_columns.map((cCol) => {
                          const item = eda.correlation_matrix.find(
                            (x) => x.col1 === rCol && x.col2 === cCol
                          );
                          const val = item ? item.value : 0;
                          
                          // Color mapping based on correlation
                          let bgClass = "bg-white text-slate-600";
                          if (val > 0.6) bgClass = "bg-brand-600 text-white font-bold";
                          else if (val > 0.3) bgClass = "bg-brand-100 text-brand-900 font-semibold";
                          else if (val > 0.05) bgClass = "bg-brand-50 text-brand-800";
                          else if (val < -0.3) bgClass = "bg-rose-200 text-rose-900 font-semibold";
                          else if (val < -0.05) bgClass = "bg-rose-50 text-rose-800";

                          return (
                            <td key={cCol} className={`p-2 border border-slate-200 font-mono text-[11px] ${bgClass}`}>
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Insufficient numeric features to compute correlation matrix.
              </div>
            )}
          </Card>

          {/* Section 4: Demographic Group Comparisons */}
          {Object.keys(eda.group_analyses).length > 0 && (
            <Card
              title="Demographic Group Breakdown & Average Academic Performance"
              subtitle="Aggregated scores and attendance categorized by student demographic cohorts"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(eda.group_analyses).map(([colName, groups]) => (
                  <div key={colName} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs font-bold text-slate-800 capitalize mb-2 border-b border-slate-200 pb-1">
                      By {colName.replace(/_/g, ' ')}
                    </div>
                    <div className="space-y-1.5">
                      {groups.map((g: any) => (
                        <div key={g.group} className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700">{g.group} ({g.count})</span>
                          <span className="font-mono text-slate-900 font-semibold">
                            {g.avg_score !== null ? `Avg: ${g.avg_score}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
