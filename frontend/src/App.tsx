import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Datasets } from './pages/Datasets';
import { EdaStudio } from './pages/EdaStudio';
import { FeatureSelectionStudio } from './pages/FeatureSelectionStudio';
import { RegressionLab } from './pages/RegressionLab';
import { ClassificationLab } from './pages/ClassificationLab';
import { SinglePrediction } from './pages/SinglePrediction';
import { BatchPrediction } from './pages/BatchPrediction';
import { ModelRegistry } from './pages/ModelRegistry';
import { PredictionHistory } from './pages/PredictionHistory';
import { StudentPortal } from './pages/StudentPortal';
import { Documentation } from './pages/Documentation';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/eda" element={<EdaStudio />} />
            <Route path="/features" element={<FeatureSelectionStudio />} />
            <Route path="/regression" element={<RegressionLab />} />
            <Route path="/classification" element={<ClassificationLab />} />
            <Route path="/predict-single" element={<SinglePrediction />} />
            <Route path="/predict-batch" element={<BatchPrediction />} />
            <Route path="/models" element={<ModelRegistry />} />
            <Route path="/history" element={<PredictionHistory />} />
            <Route path="/student-portal" element={<StudentPortal />} />
            <Route path="/docs" element={<Documentation />} />
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
