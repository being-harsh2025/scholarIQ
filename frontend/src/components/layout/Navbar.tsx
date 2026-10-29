import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  GraduationCap, 
  LogOut, 
  UserCheck, 
  ShieldAlert, 
  BookOpen, 
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { user, role, logout, switchRoleQuick } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const getRoleBadge = (r?: UserRole | null) => {
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3 h-3" /> Admin
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <BookOpen className="w-3 h-3" /> Faculty
          </span>
        );
      case 'student':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <GraduationCap className="w-3 h-3" /> Student
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
            EduPredict <span className="text-brand-600 font-semibold">AI</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">Academic Performance Prediction System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Role Switcher for Demo */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-200"
            title="Switch demo persona for testing permissions"
          >
            <span>Persona:</span>
            {getRoleBadge(role)}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-xs"
              onClick={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-1 text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                Switch Demo Persona
              </div>
              <button
                onClick={() => switchRoleQuick('admin')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">Administrator</div>
                  <div className="text-[10px] text-slate-500">System oversight & management</div>
                </div>
                {role === 'admin' && <UserCheck className="w-4 h-4 text-brand-600" />}
              </button>
              <button
                onClick={() => switchRoleQuick('teacher')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">Faculty / Teacher</div>
                  <div className="text-[10px] text-slate-500">Datasets, ML training & batch inference</div>
                </div>
                {role === 'teacher' && <UserCheck className="w-4 h-4 text-brand-600" />}
              </button>
              <button
                onClick={() => switchRoleQuick('student')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">Student (STU-10001)</div>
                  <div className="text-[10px] text-slate-500">Strictly personal academic indicators</div>
                </div>
                {role === 'student' && <UserCheck className="w-4 h-4 text-brand-600" />}
              </button>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.full_name || 'Academic User'}
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
