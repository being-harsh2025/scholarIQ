import React, { useEffect, useState } from 'react';
import { modelsApi, predictionsApi } from '../services/api';
import { ModelRun, SinglePredictionResponse } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  Calculator,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Cpu,
  BarChart2
} from 'lucide-react';

export const SinglePrediction: React.FC = () => {
  const [models, setModels] = useState<ModelRun[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelRun | null>(null);

  // Form Inputs
  const [studentId, setStudentId] = useState<string>('STU-10045');
  const [featureInputs, setFeatureInputs] = useState<Record<string, any>>({});

  const [predicting, setPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<SinglePredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all trained models
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
        setError(err.response?.data?.detail || 'Failed to fetch available models.');
      }
    };
    fetchModels();
  }, []);

  // When model selection changes, initialize input fields
  useEffect(() => {
    if (selectedModelId) {
      const found = models.find(m => m.id === selectedModelId);
      if (found) {
        setSelectedModel(found);
        
        // Populate default sensible initial values for features
        const initialVals: Record<string, any> = {};
        found.features?.forEach(f => {
          const nameLower = f.feature_name.toLowerCase();
          if (nameLower.includes('attendance')) initialVals[f.feature_name] = 85.0;
          else if (nameLower.includes('study_hours')) initialVals[f.feature_name] = 14.0;
          else if (nameLower.includes('previous_score') || nameLower.includes('internal')) initialVals[f.feature_name] = 72.0;
          else if (nameLower.includes('assignment')) initialVals[f.feature_name] = 78.0;
          else if (nameLower.includes('sleep')) initialVals[f.feature_name] = 7.0;
          else if (nameLower.includes('gender')) initialVals[f.feature_name] = 'Female';
          else if (nameLower.includes('education')) initialVals[f.feature_name] = "Bachelor's";
          else if (nameLower.includes('internet') || nameLower.includes('tutoring') || nameLower.includes('extracurricular')) initialVals[f.feature_name] = 'Yes';
          else initialVals[f.feature_name] = 50.0;
        });
        setFeatureInputs(initialVals);
        setPredictionResult(null);
      }
    }
  }, [selectedModelId, models]);

  const handleInputChange = (field: string, value: any) => {
    setFeatureInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId) return;

    try {
      setPredicting(true);
      setError(null);

      const res = await predictionsApi.single({
        model_run_id: selectedModelId,
        student_identifier: studentId,
        input_features: featureInputs
      });

      setPredictionResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Prediction failed. Check input values.');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Single Student Academic Inference</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute real-time model inference using persisted Scikit-Learn pipelines and generate personalized intervention recommendations.
        </p>
      </div>

      {error && <Alert type="error" title="Prediction Notice">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Configuration & Dynamic Form */}
        <Card 
          className="lg:col-span-2"
          title="Student Profile & Required Model Features"
          subtitle="Form automatically builds dynamically based strictly on features required by the active model"
        >
          {models.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No trained models available. Train a model in Regression or Classification Lab first.
            </div>
          ) : (
            <form onSubmit={handlePredict} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                {/* Active Model Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Trained Model</label>
                  <select
                    value={selectedModelId || ''}
                    onChange={(e) => setSelectedModelId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.task_type.toUpperCase()}] {m.name} ({m.algorithm})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student Identifier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Identifier</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g., STU-10045"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
                  />
                </div>
              </div>

              {/* Dynamic Feature Inputs */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Required Input Features ({selectedModel?.features?.length || 0}):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  {selectedModel?.features?.map((f) => {
                    const isBinary = ['internet_access', 'tutoring', 'extracurricular_activities'].includes(f.feature_name);
                    const isGender = f.feature_name === 'gender';
                    const isEdu = f.feature_name === 'parent_education';
                    const isCat = f.feature_type === 'categorical' || isBinary || isGender || isEdu;

                    return (
                      <div key={f.feature_name} className="p-2 bg-white rounded border border-slate-200">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {f.feature_name.replace(/_/g, ' ')}
                        </label>
                        {isBinary ? (
                          <select
                            value={featureInputs[f.feature_name] ?? 'Yes'}
                            onChange={(e) => handleInputChange(f.feature_name, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : isGender ? (
                          <select
                            value={featureInputs[f.feature_name] ?? 'Female'}
                            onChange={(e) => handleInputChange(f.feature_name, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Non-Binary">Non-Binary</option>
                          </select>
                        ) : isEdu ? (
                          <select
                            value={featureInputs[f.feature_name] ?? "Bachelor's"}
                            onChange={(e) => handleInputChange(f.feature_name, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            <option value="High School">High School</option>
                            <option value="Associate Degree">Associate Degree</option>
                            <option value="Bachelor's">Bachelor's</option>
                            <option value="Master's">Master's</option>
                            <option value="Doctorate">Doctorate</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={featureInputs[f.feature_name] ?? ''}
                            onChange={(e) => handleInputChange(f.feature_name, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={predicting}
                icon={<Sparkles className="w-4 h-4" />}
                className="w-full"
              >
                Compute Real Academic Forecast
              </Button>
            </form>
          )}
        </Card>

        {/* Prediction Output & Recommendations Panel */}
        <Card
          title="Inference Results & Actionable Interventions"
          subtitle="Model prediction with contextual academic recommendations"
        >
          {predictionResult ? (
            <div className="space-y-4">
              {/* Output Result Banner */}
              <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 block">
                  Forecasted {predictionResult.task_type === 'regression' ? 'Final Numeric Score' : 'Performance Category'}
                </span>
                <div className="text-3xl font-extrabold text-brand-900 mt-1">
                  {predictionResult.predicted_value}
                  {predictionResult.task_type === 'regression' && <span className="text-sm font-normal text-slate-500"> / 100</span>}
                </div>
                <div className="text-xs text-brand-700 font-medium mt-1">
                  Student: <span className="font-bold">{predictionResult.student_identifier}</span>
                </div>
              </div>

              {/* Classification Class Probabilities if present */}
              {predictionResult.probabilities && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-slate-700 mb-2">Class Probability Distribution:</div>
                  <div className="space-y-1.5">
                    {Object.entries(predictionResult.probabilities).map(([cls, prob]) => (
                      <div key={cls} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">{cls}</span>
                          <span className="text-slate-800 font-mono font-bold">{(prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-brand-600 h-full rounded-full transition-all"
                            style={{ width: `${prob * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Targeted Academic Interventions:
                </div>
                <div className="space-y-2">
                  {predictionResult.recommendations.map((rec, i) => (
                    <div key={i} className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Fill student attributes and click "Compute Real Academic Forecast" to view prediction outputs.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
