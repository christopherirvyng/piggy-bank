'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  category?: string;
  account?: string;
  date: string;
}

export default function CalendarWidget({ 
  transactions = [], 
  onRefresh 
}: { 
  transactions?: Transaction[];
  onRefresh?: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<{ day: number; dateStr: string; items: Transaction[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDayData = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTransactions = transactions.filter((t) => t.date === dateStr);

    const income = dayTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = dayTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { income, expense, dayTransactions, dateStr };
  };

  const handleDayClick = (day: number) => {
    const { dayTransactions, dateStr } = getDayData(day);
    if (dayTransactions.length > 0) {
      setSelectedDayTransactions({ day, dateStr, items: dayTransactions });
    }
  };

  const handleDeleteFromCalendar = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      if (selectedDayTransactions) {
        const updated = selectedDayTransactions.items.filter(item => item.id !== id);
        if (updated.length === 0) {
          setSelectedDayTransactions(null);
        } else {
          setSelectedDayTransactions({ ...selectedDayTransactions, items: updated });
        }
      }
      if (onRefresh) onRefresh();
    }
  };

  const formatShortAmount = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return `${val}`;
  };

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 font-sans select-none cursor-default">
      <div className="flex justify-between items-center pb-1 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
          <CalendarIcon size={14} className="text-indigo-600 shrink-0" /> Calendar & Activity
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-slate-800 min-w-[80px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const { income, expense, dayTransactions } = getDayData(day);
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          const hasData = dayTransactions.length > 0;

          return (
            <div
              key={`day-${day}`}
              onClick={() => handleDayClick(day)}
              className={`h-7 rounded-lg p-0.5 flex flex-col justify-between items-center transition relative ${                 hasData ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400/50' : 'cursor-default'               } ${
                isToday
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="text-[10px] leading-none mt-0.5">{day}</span>

              <div className="flex flex-col items-center leading-none text-[8px] font-medium w-full truncate px-0.5 mb-0.5">
                {income > 0 && (
                  <span className={isToday ? 'text-emerald-200' : 'text-emerald-600 font-semibold'}>
                    +{formatShortAmount(income)}
                  </span>
                )}
                {expense > 0 && (
                  <span className={isToday ? 'text-rose-200' : 'text-rose-500 font-semibold'}>
                    -{formatShortAmount(expense)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Activity per Hari */}
      {selectedDayTransactions && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-xl space-y-3 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-semibold text-slate-900 text-xs">
                Activity ({selectedDayTransactions.dateStr})
              </h3>
              <button onClick={() => setSelectedDayTransactions(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedDayTransactions.items.map((item) => (
                <div key={item.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{item.category || 'General'} • {item.account || 'bank'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-xs ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.type === 'income' ? '+' : '-'}Rp {Number(item.amount).toLocaleString('id-ID')}
                    </span>
                    <button 
                      onClick={() => handleDeleteFromCalendar(item.id)} 
                      className="text-slate-400 hover:text-rose-600 transition p-0.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}