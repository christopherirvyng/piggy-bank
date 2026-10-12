'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, X, Clock } from 'lucide-react';
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

interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  category?: string;
  account?: string;
  frequency: 'weekly' | 'interval_days' | 'monthly' | 'yearly';
  day_of_month?: number;
  interval_days?: number;
  last_executed_date?: string;
  created_at?: string;
}

export default function MobileCalendarWidget({
  transactions = [],
  recurringList = [],
  onRefresh,
}: {
  transactions?: Transaction[];
  recurringList?: RecurringTransaction[];
  onRefresh?: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState<{
    day: number;
    dateStr: string;
    items: Transaction[];
    recurringItems: RecurringTransaction[];
  } | null>(null);

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
    const targetDate = new Date(year, month, day);

    // 1. Transaksi Riil
    const dayTransactions = transactions.filter((t) => t.date === dateStr);

    // 2. Proyeksi Transaksi Rutin
    const dayRecurring = recurringList.filter((rec) => {
      if (rec.frequency === 'monthly' && rec.day_of_month === day) {
        return true;
      }

      if (rec.frequency === 'interval_days' && rec.interval_days) {
        const startDateStr = rec.last_executed_date || rec.created_at;
        if (!startDateStr) return false;

        const startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);

        const checkDate = new Date(targetDate);
        checkDate.setHours(0, 0, 0, 0);

        const diffTime = checkDate.getTime() - startDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays >= 0 && diffDays % rec.interval_days === 0) {
          return true;
        }
      }

      return false;
    });

    const income = dayTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = dayTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { income, expense, dayTransactions, dayRecurring, dateStr };
  };

  const handleDayClick = (day: number) => {
    const { dayTransactions, dayRecurring, dateStr } = getDayData(day);
    if (dayTransactions.length > 0 || dayRecurring.length > 0) {
      setSelectedDayData({
        day,
        dateStr,
        items: dayTransactions,
        recurringItems: dayRecurring,
      });
    }
  };

  const handleDeleteFromCalendar = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      if (selectedDayData) {
        const updatedItems = selectedDayData.items.filter((item) => item.id !== id);
        if (updatedItems.length === 0 && selectedDayData.recurringItems.length === 0) {
          setSelectedDayData(null);
        } else {
          setSelectedDayData({ ...selectedDayData, items: updatedItems });
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
    <div className="bg-white p-3.5 rounded-[22px] border border-[#E5E7EB] shadow-[0_4px_16px_rgba(26,26,46,0.05)] space-y-2.5 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',sans-serif] select-none text-[#12112A]">
      {/* HEADER KALENDER */}
      <div className="flex justify-between items-center pb-2 border-b border-[#F3F4F6]">
        <h3 className="font-bold text-[#12112A] text-xs flex items-center gap-1.5">
          <CalendarIcon size={15} className="text-[#6366F1] shrink-0" /> Calendar & Activity
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 text-[#9CA3AF] hover:text-[#12112A] transition cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-[#12112A] min-w-[85px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 text-[#9CA3AF] hover:text-[#12112A] transition cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* HEADER HARI */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#9CA3AF] uppercase">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>

      {/* GRID TANGGAL */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const { income, expense, dayTransactions, dayRecurring } = getDayData(day);
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          const hasData = dayTransactions.length > 0 || dayRecurring.length > 0;
          const hasPending = dayRecurring.length > 0;

          return (
            <div
              key={`day-${day}`}
              onClick={() => handleDayClick(day)}
              className={`h-9 rounded-xl p-0.5 flex flex-col justify-between items-center transition relative ${
                hasData ? 'cursor-pointer active:scale-95' : 'cursor-default'
              } ${
                isToday
                  ? 'bg-[#6366F1] text-white font-bold shadow-xs'
                  : 'bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#374151]'
              }`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="text-[10px] font-bold leading-none mt-0.5">{day}</span>
                {hasPending && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Transaksi Rutin" />
                )}
              </div>

              <div className="flex flex-col items-center leading-none text-[8px] font-bold w-full truncate px-0.5 mb-0.5">
                {income > 0 && (
                  <span className={isToday ? 'text-emerald-200' : 'text-[#16A34A]'}>
                    +{formatShortAmount(income)}
                  </span>
                )}
                {expense > 0 && (
                  <span className={isToday ? 'text-rose-200' : 'text-[#DC2626]'}>
                    -{formatShortAmount(expense)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DETIL AKTIVITAS TANGGAL */}
      {selectedDayData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[22px] max-w-xs w-full p-4 shadow-2xl space-y-3 border border-[#E5E7EB]">
            <div className="flex justify-between items-center border-b border-[#F3F4F6] pb-2">
              <h3 className="font-bold text-[#12112A] text-xs">
                Aktivitas ({selectedDayData.dateStr})
              </h3>
              <button onClick={() => setSelectedDayData(null)} className="text-[#9CA3AF] hover:text-[#12112A] cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {/* Jadwal Rutin */}
              {selectedDayData.recurringItems.map((rec) => (
                <div key={`rec-${rec.id}`} className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-amber-600" />
                      <p className="font-bold text-[#12112A]">{rec.title}</p>
                    </div>
                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                      ⏳ Transaksi Rutin ({rec.category || 'General'})
                    </p>
                  </div>
                  <span className="font-bold text-xs text-amber-800">
                    Rp {Number(rec.amount).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}

              {/* Transaksi Riil */}
              {selectedDayData.items.map((item) => (
                <div key={item.id} className="p-2.5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-[#12112A]">{item.title}</p>
                    <p className="text-[10px] text-[#6B7280] font-medium mt-0.5">
                      {item.category || 'General'} • {item.account?.toUpperCase() || 'BANK'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-xs ${item.type === 'income' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {item.type === 'income' ? '+' : '-'}Rp {Number(item.amount).toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => handleDeleteFromCalendar(item.id)}
                      className="text-[#9CA3AF] hover:text-[#DC2626] transition p-1 cursor-pointer"
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