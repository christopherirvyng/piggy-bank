'use client';

import { LayoutDashboard, Receipt, TrendingUp, Target, Newspaper } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export default function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expense', icon: Receipt },
    { id: 'investments', label: 'Invest', icon: TrendingUp },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'news', label: 'News', icon: Newspaper },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex justify-around items-center md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-0.5 transition active:scale-95 cursor-pointer ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Icon size={19} className={isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}