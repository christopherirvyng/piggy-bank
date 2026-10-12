'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, PiggyBank, Sparkles, AlertCircle, Edit2, Trash2, Check, X } from 'lucide-react';

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

export default function BudgetSection({ transactions = [] }: { transactions?: Transaction[] }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [category, setCategory] = useState('Food & Beverage');
  const [displayMonthlyInput, setDisplayMonthlyInput] = useState('');
  const [rawMonthlyInput, setRawMonthlyInput] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // State Edit Budget
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editLimitInput, setEditLimitInput] = useState('');
  const [rawEditLimit, setRawEditLimit] = useState<number>(0);

  useEffect(() => {
    fetchBudgets();
  }, []);

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
    const formattedValue = new Intl.NumberFormat('id-ID').format(numericValue);

    return { formatted: formattedValue, numeric: numericValue };
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
      if (!session) {
        alert('Sesi login telah berakhir, silakan login kembali.');
        setLoading(false);
        return;
      }

      const existing = budgets.find(b => b.category.toLowerCase() === category.toLowerCase());

      if (existing) {
        const { error } = await supabase
          .from('budgets')
          .update({ monthly_limit: rawMonthlyInput })
          .eq('id', existing.id);

        if (error) alert(`Gagal mengupdate budget: ${error.message}`);
      } else {
        const { error } = await supabase.from('budgets').insert([
          { 
            category, 
            monthly_limit: rawMonthlyInput, 
            user_id: session.user.id 
          }
        ]);

        if (error) alert(`Gagal menambah budget: ${error.message}`);
      }

      setDisplayMonthlyInput('');
      setRawMonthlyInput(0);
      fetchBudgets();
    } catch (err) {
      console.error('Error adding budget:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (rawEditLimit <= 0) return;
    const { error } = await supabase
      .from('budgets')
      .update({ monthly_limit: rawEditLimit })
      .eq('id', id);

    if (!error) {
      setEditingBudget(null);
      fetchBudgets();
    } else {
      alert(`Gagal menyimpan perubahan: ${error.message}`);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) {
      fetchBudgets();
    } else {
      alert(`Gagal menghapus budget: ${error.message}`);
    }
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

    return {
      daysInCurrentMonth,
      dailyAllowance,
      todaySpent,
      monthlySpent,
      cumulativeBonus,
    };
  };

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 h-full flex flex-col justify-between font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',sans-serif] select-none cursor-default antialiased overflow-hidden">
      <div>
        {/* COMPACT HEADER */}
        <div className="flex justify-between items-center pb-1 border-b border-slate-100 mb-2">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 tracking-tight">
            <PiggyBank size={14} className="text-indigo-600 shrink-0" /> Monthly Budget
          </h3>
        </div>

        {/* COMPACT FORM INPUT */}
        <form onSubmit={handleAddOrUpdateBudget} className="flex gap-1.5 text-xs mb-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
          >
            <option value="Food & Beverage">Food & Beverage</option>
            <option value="Transportation">Transportation</option>
            <option value="Utilities">Utilities</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Shopping">Shopping</option>
            <option value="Other">Other</option>
          </select>
          
          <div className="relative flex-1">
            <span className="absolute left-2 top-1 text-slate-400 font-medium text-xs">Rp</span>
            <input
              type="text"
              placeholder="1.500.000"
              value={displayMonthlyInput}
              onChange={handleInputChange}
              className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-text"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50 transition text-xs shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={12} /> Add
          </button>
        </form>

        {/* BUDGET CARDS LIST */}
        <div className="space-y-1.5 overflow-y-auto custom-scrollbar max-h-[125px] pr-0.5">
          {budgets.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2 font-normal">No monthly budget set yet.</p>
          ) : (
            budgets.map((b) => {
              const { daysInCurrentMonth, dailyAllowance, todaySpent, monthlySpent, cumulativeBonus } = calculateRollover(b);
              const monthlyPercent = b.monthly_limit > 0 ? Math.min(Math.round((monthlySpent / b.monthly_limit) * 100), 100) : 0;
              const isEditing = editingBudget?.id === b.id;

              return (
                <div key={b.id} className="p-2.5 border border-slate-200/60 rounded-xl bg-slate-50/50 space-y-1.5 text-xs">
                  {/* HEADER ROW: TITLE + ICONS & SPENT / LIMIT */}
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-800">
                        <span className="font-bold text-xs tracking-tight">{b.category}</span>
                        
                        <div className="flex items-center gap-0.5 ml-0.5">
                          <button
                            onClick={() => {
                              setEditingBudget(b);
                              const { formatted, numeric } = formatNumber(String(b.monthly_limit));
                              setEditLimitInput(formatted);
                              setRawEditLimit(numeric);
                            }}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer rounded hover:bg-slate-200/60"
                            title="Edit Budget"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(b.id)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 transition cursor-pointer rounded hover:bg-slate-200/60"
                            title="Delete Budget"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 font-normal">
                        Daily ({daysInCurrentMonth}d): <strong className="text-slate-700 font-semibold">Rp {Math.round(dailyAllowance).toLocaleString('id-ID')}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={editLimitInput}
                            onChange={handleEditInputChange}
                            className="w-16 px-1 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 cursor-text"
                          />
                          <button onClick={() => handleSaveEdit(b.id)} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setEditingBudget(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded cursor-pointer">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-slate-900 tracking-tight">
                            Rp {monthlySpent.toLocaleString('id-ID')} <span className="text-slate-400 font-normal">/ Rp {Number(b.monthly_limit).toLocaleString('id-ID')}</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium">Usage ({monthlyPercent}%)</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ULTRA-COMPACT STATUS BAR */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="px-2 py-1 bg-white rounded-md border border-slate-200/60 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">TODAY</span>
                      <span className="text-[11px] font-bold text-slate-900 tracking-tight">
                        Rp {todaySpent.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className={`px-2 py-1 rounded-md border flex items-center justify-between ${cumulativeBonus >= 0 ? 'bg-emerald-50/80 border-emerald-100' : 'bg-rose-50/80 border-rose-100'}`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 text-slate-500">
                        {cumulativeBonus >= 0 ? <Sparkles size={9} className="text-emerald-600" /> : <AlertCircle size={9} className="text-rose-600" />}
                        {cumulativeBonus >= 0 ? 'SAVINGS' : 'DEFICIT'}
                      </span>
                      <span className={`text-[11px] font-bold tracking-tight ${cumulativeBonus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {cumulativeBonus >= 0 ? '+' : ''}Rp {Math.round(cumulativeBonus).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="w-full h-1 bg-slate-200/80 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${monthlyPercent >= 100 ? 'bg-rose-500' : (monthlyPercent >= 75 ? 'bg-amber-500' : 'bg-indigo-600')}`} 
                      style={{ width: `${monthlyPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}