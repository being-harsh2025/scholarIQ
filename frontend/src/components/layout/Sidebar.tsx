import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Sliders,
  TrendingUp,
  Layers,
  Calculator,
  FileSpreadsheet,
  Cpu,
  History,
  GraduationCap,
  BookOpen
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
  { name: 'Dataset Management', to: '/datasets', icon: Database, roles: ['admin', 'teacher'] },
  { name: 'EDA Studio', to: '/eda', icon: BarChart3, roles: ['admin', 'teacher'] },
  { name: 'Feature Studio', to: '/features', icon: Sliders, roles: ['admin', 'teacher'] },
  { name: 'Regression Lab', to: '/regression', icon: TrendingUp, roles: ['admin', 'teacher'] },
  { name: 'Classification Lab', to: '/classification', icon: Layers, roles: ['admin', 'teacher'] },
  { name: 'Single Prediction', to: '/predict-single', icon: Calculator, roles: ['admin', 'teacher'] },
  { name: 'Batch Prediction', to: '/predict-batch', icon: FileSpreadsheet, roles: ['admin', 'teacher'] },
  { name: 'Model Registry', to: '/models', icon: Cpu, roles: ['admin', 'teacher'] },
  { name: 'Prediction History', to: '/history', icon: History, roles: ['admin', 'teacher', 'student'] },
  { name: 'Student Portal', to: '/student-portal', icon: GraduationCap, roles: ['student', 'admin', 'teacher'] },
  { name: 'Methodology & Ethics', to: '/docs', icon: BookOpen, roles: ['admin', 'teacher', 'student'] },
];

export const Sidebar: React.FC = () => {
  const { role } = useAuth();

  const filteredItems = navItems.filter(item => 
    !role || item.roles.includes(role)
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-4 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {role === 'student' ? 'Student Workspace' : 'Machine Learning Core'}
          </div>
          <nav className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-[11px] text-slate-500 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">EduPredict AI</span>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">v1.0 Ready</span>
          </div>
          <p className="text-[10px] text-slate-400">Scikit-Learn ML Backend</p>
        </div>
      </div>
    </aside>
  );
};
