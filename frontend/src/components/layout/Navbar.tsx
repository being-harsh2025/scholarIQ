import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
            Scholar<span className="text-brand-600 font-semibold">IQ</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">Student Academic Performance Prediction & Decision Support</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Unified Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Unified Portal</span>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.full_name || 'Academic Evaluator'}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
