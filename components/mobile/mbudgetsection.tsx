'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, PiggyBank, Sparkles, AlertCircle, Edit2, Trash2, Check, X, Utensils } from 'lucide-react';

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
}

interface Transaction {
  amount: number;
  category: string;
  type: string;
  date: string;
}

const isCategoryMatch = (transCat: string, budgetCat: string) => {
  const t = (transCat || '').toLowerCase();
  const b = (budgetCat || '').toLowerCase();

  if (t === b) return true;

  const isFoodBudget = b.includes('makan') || b.includes('jajan') || b.includes('food') || b.includes('drink') || b.includes('beverage');
  const isFoodTrans = t.includes('makan') || t.includes('jajan') || t.includes('food') || t.includes('drink') || t.includes('beverage');

  return isFoodBudget && isFoodTrans;
};

export default function BudgetSectionMobile({
  transactions = [],
  budgets: initialBudgets = [],
}: {
  transactions?: Transaction[];
  budgets?: Budget[];
}) {
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [category, setCategory] = useState('Food & Beverage');
  const [displayMonthlyInput, setDisplayMonthlyInput] = useState('');
  const [rawMonthlyInput, setRawMonthlyInput] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editLimitInput, setEditLimitInput] = useState('');
  const [rawEditLimit, setRawEditLimit] = useState<number>(0);

  useEffect(() => {
    if (initialBudgets.length > 0) {
      setBudgets(initialBudgets);
    } else {
      fetchBudgets();
    }
  }, [initialBudgets]);

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase.from('budgets').select('*');
      if (!error && data) {
        setBudgets(data);
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
    }
  };

  const formatNumber = (val: string) => {
    const rawValue = val.replace(/\D/g, '');
    if (!rawValue) return { formatted: '', numeric: 0 };
    const numericValue = parseInt(rawValue, 10);
    return { formatted: new Intl.NumberFormat('id-ID').format(numericValue), numeric: numericValue };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { formatted, numeric } = formatNumber(e.target.value);
    setDisplayMonthlyInput(formatted);
    setRawMonthlyInput(numeric);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { formatted, numeric } = formatNumber(e.target.value);
    setEditLimitInput(formatted);
    setRawEditLimit(numeric);
  };

  const handleAddOrUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || rawMonthlyInput <= 0) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const existing = budgets.find((b) => b.category.toLowerCase() === category.toLowerCase());

      if (existing) {
        await supabase.from('budgets').update({ monthly_limit: rawMonthlyInput }).eq('id', existing.id);
      } else {
        await supabase.from('budgets').insert([
          { category, monthly_limit: rawMonthlyInput, user_id: session.user.id },
        ]);
      }

      setDisplayMonthlyInput('');
      setRawMonthlyInput(0);
      setShowAddForm(false);
      fetchBudgets();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (rawEditLimit <= 0) return;
    const { error } = await supabase.from('budgets').update({ monthly_limit: rawEditLimit }).eq('id', id);
    if (!error) {
      setEditingBudget(null);
      fetchBudgets();
    }
  };

  const handleDeleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) fetchBudgets();
  };

  const calculateRollover = (b: Budget) => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const dailyAllowance = b.monthly_limit / daysInCurrentMonth;
    const safeTransactions = transactions || [];

    const todaySpent = safeTransactions
      .filter((t) => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return (
          t.type === 'expense' &&
          isCategoryMatch(t.category, b.category) &&
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const monthlySpent = safeTransactions
      .filter((t) => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return (
          t.type === 'expense' &&
          isCategoryMatch(t.category, b.category) &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const accruedBudgetTillToday = dailyAllowance * currentDay;
    const cumulativeBonus = accruedBudgetTillToday - monthlySpent;

    return { daysInCurrentMonth, dailyAllowance, todaySpent, monthlySpent, cumulativeBonus };
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-[22px] border border-[#E5E7EB] shadow-[0_4px_16px_rgba(26,26,46,0.07)] space-y-4 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',sans-serif] select-none antialiased">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[34px] items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">
            <PiggyBank size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#12112A] tracking-tight">Monthly Budget</h3>
            <p className="text-[11px] font-medium text-[#6B7280]">Target pengeluaran bulanan</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 rounded-xl bg-[#EEF2FF] px-3 py-1.5 text-xs font-bold text-[#6366F1] active:scale-95 transition cursor-pointer"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          <span>{showAddForm ? 'Tutup' : 'Tambah'}</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddOrUpdateBudget} className="flex flex-col gap-2.5 p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#4B5563]">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-xl text-xs font-semibold text-[#111827]"
            >
              <option value="Food & Beverage">Food & Beverage (Makan / Jajan)</option>
              <option value="Transportation">Transportation</option>
              <option value="Utilities">Utilities</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Shopping">Shopping</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#4B5563]">Limit Bulanan (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#9CA3AF]">Rp</span>
              <input
                type="text"
                placeholder="1.500.000"
                value={displayMonthlyInput}
                onChange={handleInputChange}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#D1D5DB] rounded-xl text-xs font-bold text-[#111827]"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-1 py-2 bg-[#6366F1] text-white rounded-xl text-xs font-bold cursor-pointer">
            Save Budget
          </button>
        </form>
      )}

      <div className="space-y-3">
        {budgets.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#6B7280] font-medium border border-dashed border-[#E5E7EB] rounded-2xl">
            Belum ada budget terdaftar.
          </div>
        ) : (
          budgets.map((b) => {
            const { daysInCurrentMonth, dailyAllowance, todaySpent, monthlySpent, cumulativeBonus } = calculateRollover(b);
            const budgetLimit = Number(b.monthly_limit || 0);
            const budgetLeft = Math.max(0, budgetLimit - monthlySpent);
            const monthlyPercent = budgetLimit > 0 ? Math.min(Math.round((monthlySpent / budgetLimit) * 100), 100) : 0;
            const isEditing = editingBudget?.id === b.id;

            return (
              <div key={b.id} className="p-4 border border-[#E5E7EB] rounded-[18px] bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-[36px] items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] shrink-0">
                      <Utensils size={17} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#12112A]">{b.category}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingBudget(b); const { formatted, numeric } = formatNumber(String(b.monthly_limit)); setEditLimitInput(formatted); setRawEditLimit(numeric); }} className="p-1 text-[#9CA3AF] hover:text-[#6366F1]">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteBudget(b.id)} className="p-1 text-[#9CA3AF] hover:text-[#DC2626]">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-[#6B7280]">
                        Daily ({daysInCurrentMonth} hari): <strong className="text-[#374151]">Rp {Math.round(dailyAllowance).toLocaleString('id-ID')}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input type="text" value={editLimitInput} onChange={handleEditInputChange} className="w-20 px-1.5 py-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg text-xs font-bold" />
                        <button onClick={() => handleSaveEdit(b.id)} className="p-1 text-[#16A34A]"><Check size={14} /></button>
                        <button onClick={() => setEditingBudget(null)} className="p-1 text-[#6B7280]"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-[#6B7280]">Limit</span>
                        <span className="text-sm font-bold text-[#12112A]">Rp {budgetLimit.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[21px] font-bold text-[#12112A] tracking-tight">Rp {monthlySpent.toLocaleString('id-ID')}</span>
                  <span className="text-xs font-medium text-[#6B7280]">
                    Sisa: <strong className="text-[#16A34A] font-bold">Rp {budgetLeft.toLocaleString('id-ID')}</strong>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${monthlyPercent >= 100 ? 'bg-[#DC2626]' : 'bg-[#6366F1]'}`} style={{ width: `${monthlyPercent}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#6B7280]">
                    <span>Penggunaan</span>
                    <span className="font-bold text-[#12112A]">{monthlyPercent}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F3F4F6]">
                  <div className="rounded-xl bg-[#F9FAFB] p-2.5 border border-[#F3F4F6]">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase">HARI INI</span>
                    <p className="text-xs font-bold text-[#12112A]">Rp {todaySpent.toLocaleString('id-ID')}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 border ${cumulativeBonus >= 0 ? 'bg-[#E8F7EF]/60 border-[#16A34A]/20' : 'bg-[#FEE2E2]/60 border-[#DC2626]/20'}`}>
                    <span className={`text-[10px] font-bold uppercase ${cumulativeBonus >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {cumulativeBonus >= 0 ? 'SAVINGS' : 'DEFICIT'}
                    </span>
                    <p className={`text-xs font-bold ${cumulativeBonus >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {cumulativeBonus >= 0 ? '+' : '−'}Rp {Math.abs(Math.round(cumulativeBonus)).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}