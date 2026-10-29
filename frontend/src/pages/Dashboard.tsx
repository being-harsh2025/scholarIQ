import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { systemApi, datasetsApi } from '../services/api';
import { DashboardStats, EdaSummary } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  Database,
  Users,
  Cpu,
  TrendingUp,
  BarChart3,
  Sliders,
  Calculator,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sampleEda, setSampleEda] = useState<EdaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await systemApi.getStats();
        setStats(data);

        // Fetch sample EDA if available for distribution visualization
        if (data.total_datasets > 0 && data.recent_datasets.length > 0) {
          try {
            const eda = await datasetsApi.getEda(data.recent_datasets[0].id);
            setSampleEda(eda);
          } catch (e) {
            // Non-blocking
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard metrics from backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Connecting to backend database and ML models..." />;
  }

  if (error || !stats) {
    return (
      <Alert type="error" title="Dashboard Error">
        {error || 'Unable to retrieve dashboard state.'}
      </Alert>
    );
  }

  const statCards = [
    {
      label: 'Accessible Datasets',
      value: stats.total_datasets,
      icon: Database,
      desc: 'Active student cohorts on file',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      label: 'Student Records',
      value: stats.total_records.toLocaleString(),
      icon: Users,
      desc: 'Individual academic records profiled',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      label: 'Trained ML Models',
      value: stats.total_models,
      icon: Cpu,
      desc: 'Regression & classification estimators',
      color: 'text-brand-600 bg-brand-50 border-brand-200'
    },
    {
      label: 'Predictions Generated',
      value: stats.total_predictions,
      icon: TrendingUp,
      desc: 'Single & batch student forecasts',
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Academic Analytics Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time machine learning oversight and student performance trajectory monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/datasets">
            <Button size="sm" variant="secondary" icon={<Database className="w-3.5 h-3.5" />}>
              Datasets
            </Button>
          </Link>
          <Link to="/predict-single">
            <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
              New Prediction
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">{card.label}</span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{card.desc}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Latest Model Run & Quick Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Model Run Highlight */}
        <Card 
          className="lg:col-span-2"
          title="Latest Model Training Run"
          subtitle="Real evaluated metrics on held-out test data from the Scikit-learn backend"
          action={
            <Link to="/models">
              <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Registry
              </Button>
            </Link>
          }
        >
          {stats.latest_model ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-sm font-bold text-slate-900">{stats.latest_model.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Algorithm: <span className="font-semibold text-slate-700">{stats.latest_model.algorithm}</span> • Task: <span className="uppercase text-[11px] font-semibold text-brand-600">{stats.latest_model.task_type}</span>
                  </div>
                </div>
                <Badge variant="brand">Active Run #{stats.latest_model.id}</Badge>
              </div>

              {/* Dynamic metrics based on task type */}
              <div className="grid grid-cols-3 gap-3">
                {stats.latest_model.task_type === 'regression' ? (
                  <>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Mean Absolute Error (MAE)</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">
                        {stats.latest_model.metrics?.mae ?? '—'}
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Root Mean Squared (RMSE)</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">
                        {stats.latest_model.metrics?.rmse ?? '—'}
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500 font-medium">R² Determination Score</div>
                      <div className="text-lg font-bold text-brand-600 mt-0.5">
                        {stats.latest_model.metrics?.r2 ?? '—'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Test Accuracy</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">
                        {stats.latest_model.metrics?.accuracy ? `${(stats.latest_model.metrics.accuracy * 100).toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Macro F1 Score</div>
                      <div className="text-lg font-bold text-brand-600 mt-0.5">
                        {stats.latest_model.metrics?.f1_macro ?? '—'}
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Weighted F1 Score</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">
                        {stats.latest_model.metrics?.f1_weighted ?? '—'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No ML models trained yet. Go to Regression or Classification Lab to train your first model.
            </div>
          )}
        </Card>

        {/* Quick Actions Hub */}
        <Card title="Quick Action Center" subtitle="Common workflows and pipelines">
          <div className="space-y-2">
            <Link
              to="/datasets"
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-semibold text-slate-800">Upload Academic Cohort</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              to="/eda"
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800">Exploratory Data Analysis</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              to="/features"
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">Feature Selection Studio</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              to="/predict-single"
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-800">Single Student Evaluation</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Distribution Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Category Distribution */}
        <Card
          title="Performance Category Distribution"
          subtitle="Proportion of students in each academic tier from active cohort"
        >
          {sampleEda && sampleEda.category_distribution?.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleEda.category_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Student Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No dataset categorized yet.
            </div>
          )}
        </Card>

        {/* Recent Prediction Activity */}
        <Card
          title="Recent Prediction Activity"
          subtitle="Real inference logs with student identifiers"
          action={
            <Link to="/history">
              <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All
              </Button>
            </Link>
          }
        >
          {stats.recent_predictions?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recent_predictions.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">{p.student_identifier}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.model_name} • <span className="uppercase text-[10px]">{p.prediction_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {p.predicted_value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              No predictions recorded yet. Run single or batch predictions to generate activity.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
