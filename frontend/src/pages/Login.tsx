import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Alert } from '../components/ui';
import { GraduationCap, Eye, EyeOff, ShieldCheck, User, BookOpen } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('teacher@edupredict.ai');
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
      setError(err.response?.data?.detail || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: UserRole) => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@edupredict.ai');
      setPassword('AdminPass123!');
    } else if (role === 'teacher') {
      setEmail('teacher@edupredict.ai');
      setPassword('TeacherPass123!');
    } else {
      setEmail('student@edupredict.ai');
      setPassword('StudentPass123!');
    }
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
            EduPredict <span className="text-brand-600">AI</span>
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
              Sign In to EduPredict
            </Button>
          </form>

          {/* Quick Demo Personas */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick One-Click Demo Credentials
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="p-2 border border-slate-200 hover:border-brand-500 hover:bg-brand-50 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-rose-700 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin
                </div>
                <div className="text-[10px] text-slate-500 truncate">Dean Vance</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('teacher')}
                className="p-2 border border-slate-200 hover:border-brand-500 hover:bg-brand-50 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-brand-700 font-semibold text-[11px]">
                  <BookOpen className="w-3.5 h-3.5" /> Faculty
                </div>
                <div className="text-[10px] text-slate-500 truncate">Prof. Thorne</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('student')}
                className="p-2 border border-slate-200 hover:border-brand-500 hover:bg-brand-50 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <User className="w-3.5 h-3.5" /> Student
                </div>
                <div className="text-[10px] text-slate-500 truncate">STU-10001</div>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
