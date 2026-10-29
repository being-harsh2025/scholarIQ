import React, { useEffect, useState, useRef } from 'react';
import { datasetsApi } from '../services/api';
import { Dataset, DatasetPreview, DatasetColumn } from '../types';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../components/ui';
import {
  Upload,
  Download,
  Trash2,
  Table,
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const Datasets: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<DatasetPreview | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Upload Form State
  const [datasetName, setDatasetName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await datasetsApi.list();
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch datasets.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (datasetId: number, page: number = 1) => {
    try {
      setPreviewLoading(true);
      const preview = await datasetsApi.preview(datasetId, page, 15);
      setPreviewData(preview);
      setPreviewPage(page);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview dataset.');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      fetchPreview(selectedDataset.id, 1);
    }
  }, [selectedDataset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        setError('Only .csv files are supported.');
        return;
      }
      setSelectedFile(file);
      if (!datasetName) {
        setDatasetName(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !datasetName) {
      setError('Please provide a dataset name and select a CSV file.');
      return;
    }

    try {
      setUploadLoading(true);
      setError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append('name', datasetName);
      formData.append('file', selectedFile);

      const newDataset = await datasetsApi.upload(formData);
      setUploadSuccess(`Successfully processed and profiled "${newDataset.name}" (${newDataset.row_count} rows, ${newDataset.column_count} columns).`);
      
      setDatasetName('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchDatasets();
      setSelectedDataset(newDataset);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload and validate CSV dataset.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this dataset? This will remove its stored file and records.')) {
      return;
    }
    try {
      await datasetsApi.delete(id);
      setSelectedDataset(null);
      setPreviewData(null);
      await fetchDatasets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete dataset.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload student cohort records, inspect inferred schemas, and detect missing values.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={datasetsApi.getSampleDownloadUrl()} download>
            <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />}>
              Download 1,000-Row Sample CSV
            </Button>
          </a>
        </div>
      </div>

      {error && <Alert type="error" title="Dataset Alert">{error}</Alert>}
      {uploadSuccess && <Alert type="success" title="Success">{uploadSuccess}</Alert>}

      {/* Upload and Dataset Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <Card title="Upload Student Cohort (CSV)" subtitle="Max file size 20MB with automated column profiling">
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dataset Name</label>
              <input
                type="text"
                required
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g., Fall 2026 Academic Cohort"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select CSV File</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <span className="text-xs font-medium text-slate-700 block">
                  {selectedFile ? selectedFile.name : 'Click to select CSV file'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'UTF-8 encoded CSV with column headers'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={uploadLoading}
              className="w-full"
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Upload & Validate Dataset
            </Button>
          </form>
        </Card>

        {/* Existing Datasets List */}
        <Card 
          className="lg:col-span-2"
          title="Available Datasets"
          subtitle="Select a dataset to inspect its structure and preview rows"
        >
          {loading ? (
            <LoadingSpinner text="Loading datasets..." />
          ) : datasets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No datasets available. Upload a dataset or download the sample synthetic CSV above.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {datasets.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDataset(d)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDataset?.id === d.id
                      ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 ${selectedDataset?.id === d.id ? 'text-brand-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        {d.name}
                        {d.is_sample && <Badge variant="brand">Synthetic Sample</Badge>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {d.row_count} rows • {d.column_count} columns • {(d.file_size_bytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dataset Preview & Schema Inspector */}
      {selectedDataset && (
        <Card
          title={`Dataset Preview: ${selectedDataset.name}`}
          subtitle={`Displaying sample rows and detected column schemas (${selectedDataset.row_count} total records)`}
        >
          {previewLoading ? (
            <LoadingSpinner text="Fetching paginated records from disk..." />
          ) : previewData ? (
            <div className="space-y-4">
              {/* Column Schema Badges */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Inferred Column Profiling
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewData.identifier_columns.map(col => (
                    <Badge key={col} variant="warning">ID: {col}</Badge>
                  ))}
                  {previewData.numeric_columns.map(col => (
                    <Badge key={col} variant="brand">Num: {col}</Badge>
                  ))}
                  {previewData.categorical_columns.map(col => (
                    <Badge key={col} variant="neutral">Cat: {col}</Badge>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                    <tr>
                      {previewData.columns.map((col) => (
                        <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        {previewData.columns.map((col) => (
                          <td key={col} className="px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <div>
                  Page <span className="font-semibold text-slate-800">{previewData.page}</span> of{' '}
                  <span className="font-semibold text-slate-800">
                    {Math.ceil(previewData.total_rows / previewData.page_size)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={previewData.page <= 1}
                    onClick={() => fetchPreview(selectedDataset.id, previewData.page - 1)}
                    icon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={previewData.page * previewData.page_size >= previewData.total_rows}
                    onClick={() => fetchPreview(selectedDataset.id, previewData.page + 1)}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No preview records available.
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
