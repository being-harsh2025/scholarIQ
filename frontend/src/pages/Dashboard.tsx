import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { systemApi, datasetsApi, predictionsApi } from '../services/api';
import { DashboardStats, EdaSummary, PredictionRecord } from '../types';
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
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  BookOpen,
  Search,
  FileSpreadsheet,
  Award,
  Layers
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

type DashboardTab = 'all' | 'advisory' | 'models';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sampleEda, setSampleEda] = useState<EdaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state for the unified dashboard
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');

  // Integrated Student Advisory state
  const [studentIdInput, setStudentIdInput] = useState('STU-10001');
  const [activeStudentId, setActiveStudentId] = useState('STU-10001');
  const [studentPredictions, setStudentPredictions] = useState<PredictionRecord[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);

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

  // Fetch student records whenever activeStudentId changes
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!activeStudentId.trim()) return;
      try {
        setStudentLoading(true);
        const records = await predictionsApi.history({ student_id: activeStudentId.trim(), limit: 10 });
        setStudentPredictions(records);
      } catch (e) {
        // Non-blocking for student query
      } finally {
        setStudentLoading(false);
      }
    };

    fetchStudentData();
  }, [activeStudentId]);

  const handleSearchStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentIdInput.trim()) {
      setActiveStudentId(studentIdInput.trim());
    }
  };

  if (loading) {
    return <LoadingSpinner text="Connecting to unified backend database and ML models..." />;
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

  const latestStudentPred = studentPredictions.length > 0 ? studentPredictions[0] : null;

  return (
    <div className="space-y-6">
      {/* Unified Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 mb-1.5">
            <Sparkles className="w-3 h-3" /> Unified All-in-One Platform
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Academic & ML Intelligence Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete institutional forecasting, exploratory analysis, individual student advisory, and Scikit-Learn model operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/datasets">
            <Button size="sm" variant="secondary" icon={<Database className="w-3.5 h-3.5" />}>
              Datasets
            </Button>
          </Link>
          <Link to="/predict-single">
            <Button size="sm" variant="primary" icon={<Calculator className="w-3.5 h-3.5" />}>
              Single Prediction
            </Button>
          </Link>
          <Link to="/predict-batch">
            <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="w-3.5 h-3.5" />}>
              Batch Predict
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
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

      {/* Unified Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Complete System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('advisory')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'advisory'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Student Advisory & Interventions</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'models'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>ML Model Performance & Labs</span>
        </button>
      </div>

      {/* TAB 1: Complete System Overview (Default) */}
      {(activeTab === 'all' || activeTab === 'models') && (
        <div className="space-y-6">
          {/* Latest Model Run Highlight & Quick Action Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card 
              className="lg:col-span-2"
              title="Active Production Model Benchmark"
              subtitle="Scikit-Learn pipeline metrics evaluated on held-out test splits"
              action={
                <Link to="/models">
                  <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Model Registry
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
                    <Badge variant="brand">Active Pipeline #{stats.latest_model.id}</Badge>
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
            <Card title="Analytics Launchpad" subtitle="Instant access to all analytical studios">
              <div className="space-y-2">
                <Link
                  to="/datasets"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-semibold text-slate-800">Dataset Management & Upload</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  to="/eda"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-800">Exploratory Data Analysis (EDA)</span>
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
                  to="/regression"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-semibold text-slate-800">Continuous Regression Lab</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  to="/classification"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-slate-800">Tier Classification Lab</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </Card>
          </div>

          {/* Performance Distribution & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Category Distribution */}
            <Card
              title="Cohort Performance Distribution"
              subtitle="Proportion of students in each academic performance tier"
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
              title="Recent Student Predictions & Inferences"
              subtitle="Real inference logs with student roll numbers and outputs"
              action={
                <Link to="/history">
                  <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View All History
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
      )}

      {/* TAB 2 or ALWAYS PRESENT IN UNIFIED VIEW: Student Academic Advisory & Risk Interventions */}
      {(activeTab === 'all' || activeTab === 'advisory') && (
        <div className="space-y-6 pt-2">
          {/* Section Divider & Search Banner */}
          <div className="p-5 bg-linear-to-r from-slate-900 via-indigo-950 to-brand-900 rounded-2xl text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-brand-100 mb-2">
                <GraduationCap className="w-3.5 h-3.5" /> Student Advisory & Risk Prevention Center
              </div>
              <h3 className="text-lg font-bold tracking-tight">Individual Academic Trajectory & Interventions</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Search or select any student roll number to inspect personalized academic risk indicators and tailored study guidance.
              </p>
            </div>

            {/* Quick Student ID Lookup Form */}
            <form onSubmit={handleSearchStudent} className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <input
                  type="text"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="e.g. STU-10001"
                  className="w-full px-3 py-1.5 pl-8 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-hidden focus:bg-white/20"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Inspect
              </button>
            </form>
          </div>

          {/* Student Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Projected Performance Indicator */}
            <Card
              title={`Student Indicator: ${activeStudentId}`}
              subtitle={latestStudentPred ? `Model: ${latestStudentPred.model_name}` : 'Awaiting student evaluation'}
            >
              {studentLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading student records...</div>
              ) : latestStudentPred ? (
                <div className="space-y-4">
                  <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl text-center">
                    <span className="text-[11px] font-semibold uppercase text-brand-700 block">
                      {latestStudentPred.task_type === 'regression' ? 'Projected Final Score' : 'Forecasted Academic Tier'}
                    </span>
                    <div className="text-3xl font-extrabold text-brand-900 mt-1">
                      {latestStudentPred.predicted_value}
                      {latestStudentPred.task_type === 'regression' && (
                        <span className="text-sm font-normal text-slate-500"> / 100</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Evaluation Date:</span>
                      <span className="font-medium text-slate-800">
                        {new Date(latestStudentPred.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Evaluation Type:</span>
                      <span className="uppercase text-[10px] font-semibold text-brand-600">
                        {latestStudentPred.task_type}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Estimator Algorithm:</span>
                      <span className="font-mono text-slate-800">{latestStudentPred.algorithm}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No evaluations on record for student <strong>{activeStudentId}</strong> yet.
                  <div className="mt-2">
                    <Link to="/predict-single" className="text-brand-600 font-semibold hover:underline">
                      Run single prediction now →
                    </Link>
                  </div>
                </div>
              )}
            </Card>

            {/* Targeted Interventions & Study Habits Guidance */}
            <Card
              className="lg:col-span-2"
              title="Personalized Study & Intervention Guidance"
              subtitle="Evidence-based academic interventions calculated to improve student retention and performance"
            >
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                  <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Optimize Weekly Study Block Rhythm:</span>
                    Maintain consistent weekly study intervals. Breaking coursework into 45-minute focused blocks with 10-minute pauses improves exam retention significantly.
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Attendance Consistency Advisory:</span>
                    Attending lecture sessions is the highest-weighted predictive factor associated with top academic tier placement and risk reduction.
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 leading-relaxed flex items-start gap-2.5">
                  <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Tutorial Support & Peer Collaboration:</span>
                    Schedule review sessions with course teaching assistants or campus tutoring groups to reinforce problem sets ahead of midterms.
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Historical Evaluations for Student */}
          {studentPredictions.length > 0 && (
            <Card
              title={`Evaluation History for ${activeStudentId}`}
              subtitle="Complete historical trail of machine learning predictions for this student"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Evaluation Model</th>
                      <th className="px-3 py-2 font-semibold">Task Type</th>
                      <th className="px-3 py-2 font-semibold">Algorithm</th>
                      <th className="px-3 py-2 font-semibold">Forecast Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentPredictions.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{p.model_name}</td>
                        <td className="px-3 py-2 uppercase text-[10px] text-slate-600 font-semibold">{p.task_type}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{p.algorithm}</td>
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
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
