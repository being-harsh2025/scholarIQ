import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Alert } from '../components/ui';
import { GraduationCap, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('teacher@scholariq.ai');
  const [password, setPassword] = useState('TeacherPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (!err.response || err.response.status >= 500) {
        setError('Cannot reach backend server at http://127.0.0.1:8000. Please ensure the Python FastAPI backend is running.');
      } else if (err.response.status === 401) {
        setError(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Incorrect email or password. Please verify your credentials.');
      } else {
        setError(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'An error occurred during authentication. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setError(null);
    setEmail('teacher@scholariq.ai');
    setPassword('TeacherPass123!');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-md mb-3">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Scholar<span className="text-brand-600">IQ</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Student Academic Performance Prediction & Decision Support System
          </p>
        </div>

        <Card className="shadow-md border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert type="error" title="Authentication Error">
                {error}
              </Alert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@university.edu"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus-ring bg-white pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-semibold"
            >
              Sign In to ScholarIQ
            </Button>
          </form>

          {/* Unified Demo Login */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <button
              type="button"
              onClick={fillDemo}
              className="w-full py-2.5 px-3 border border-brand-200 bg-brand-50/60 hover:bg-brand-50 hover:border-brand-400 rounded-lg text-center transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-brand-700"
            >
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>Fill Quick Demo Credentials (Unified Access)</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Provides full access to all academic analytics, student insights & ML models.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
