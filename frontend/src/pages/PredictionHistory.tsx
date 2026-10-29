import React, { useEffect, useState } from 'react';
import { predictionsApi } from '../services/api';
import { PredictionRecord } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  History,
  Search,
  Download,
  Filter,
  Eye,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export const PredictionHistory: React.FC = () => {
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);
  
  // Filters
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [taskFilter, setTaskFilter] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await predictionsApi.history({
        student_id: searchStudent || undefined,
        task_type: taskFilter || undefined,
        limit: 100
      });
      setHistory(data);
      if (data.length > 0 && !selectedRecord) {
        setSelectedRecord(data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch prediction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [taskFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  if (loading && history.length === 0) {
    return <LoadingSpinner text="Fetching prediction audit trail..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Prediction Audit Trail & History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional log of every generated prediction, mapped to its exact model version and input features.
          </p>
        </div>
        <div>
          <a href={predictionsApi.exportCsvUrl()} download>
            <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />}>
              Export History to CSV
            </Button>
          </a>
        </div>
      </div>

      {error && <Alert type="error" title="Notice">{error}</Alert>}

      {/* Filter Bar */}
      <Card>
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Search by student identifier (e.g. STU-10001)..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
            >
              <option value="">All Tasks</option>
              <option value="regression">Regression (Scores)</option>
              <option value="classification">Classification (Tiers)</option>
            </select>

            <Button type="submit" variant="primary" size="md">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* History Table & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2"
          title="Recorded Predictions"
          subtitle={`Displaying latest ${history.length} evaluated records`}
        >
          {history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching prediction records found.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Student ID</th>
                    <th className="px-3 py-2 font-semibold">Forecast Output</th>
                    <th className="px-3 py-2 font-semibold">Model Used</th>
                    <th className="px-3 py-2 font-semibold">Task</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((rec) => (
                    <tr
                      key={rec.id}
                      className={selectedRecord?.id === rec.id ? 'bg-brand-50/30' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-2 font-bold text-slate-900">{rec.student_identifier}</td>
                      <td className="px-3 py-2">
                        <span className="font-bold font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                          {rec.predicted_value}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{rec.model_name}</td>
                      <td className="px-3 py-2">
                        <Badge variant={rec.task_type === 'regression' ? 'brand' : 'neutral'}>
                          {rec.task_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 uppercase text-[10px] text-slate-500 font-semibold">
                        {rec.prediction_type}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="p-1 text-slate-500 hover:text-brand-600 rounded"
                          title="View Feature Breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Selected Record Detail */}
        <Card
          title="Prediction Feature Snapshot"
          subtitle="Exact inputs provided during evaluation"
        >
          {selectedRecord ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Student Identifier:</span>
                  <span className="font-bold text-slate-900">{selectedRecord.student_identifier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Model:</span>
                  <span className="font-semibold text-slate-800">{selectedRecord.model_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Evaluated Output:</span>
                  <span className="font-bold font-mono text-brand-700">{selectedRecord.predicted_value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Timestamp:</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    {new Date(selectedRecord.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Input Feature Values */}
              <div>
                <div className="text-xs font-bold text-slate-800 mb-2">Evaluated Input Values:</div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {Object.entries(selectedRecord.input_data || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs p-1.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-mono font-bold text-slate-800">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select a record to inspect feature details.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
