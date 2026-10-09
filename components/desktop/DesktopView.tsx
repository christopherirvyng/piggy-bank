'use client';

import { useState } from 'react';
import {
  Wallet,
  Banknote,
  Building2,
  TrendingUp,
  Sliders,
  LogOut,
  LayoutDashboard,
  Target,
  Receipt,
  PiggyBank as PiggyBankIcon,
  Download,
  Settings,
  Clock,
  CheckSquare,
  Newspaper,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Upload,
  Loader2,
  Send,
  Plus,
  CheckCircle2,
  Scale,
  Trash2,
  Check,
  Edit2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import BudgetSection from '@/components/budgetsection';
import GoalsSection from '@/components/goalssection';
import CalendarWidget from '@/components/calendarwidget';
import InvestmentsSection from '@/components/investmentssection';

interface DesktopViewProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  username: string;
  currentTime: string;
  toastMessage: string | null;
  handleExportCSV: () => void;
  handleLogout: () => void;
  totalNetWorth: number;
  cashBalance: number;
  bankBalance: number;
  investmentBalance: number;
  formatAmount: (val: number, key?: string) => string;
  hiddenBalances: { [key: string]: boolean };
  toggleHideBalance: (key: string) => void;
  handleOpenAdjust: (acc: 'cash' | 'bank' | 'investment') => void;
  health: { score: number; label: string; color: string };
  savingsRate: number;
  totalIncomeMonth: number;
  totalExpenseMonth: number;
  input: string;
  setInput: (val: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  transactions: any[];
  fetchTransactions: () => void;
  fetchGoals: () => void;
  fetchInvestmentHoldings: () => void;
  assetFilter: 'expense' | 'all' | 'income';
  setAssetFilter: (filter: any) => void;
  categoryChartData: any[];
  COLORS: string[];
  budgets: any[];
  remainingBudgetTotal: number;
  totalBudgetLimit: number;
  goals: any[];
  tasks: any[];
  completedTasksCount: number;
  taskProgress: number;
  addTask: (e: React.FormEvent) => void;
  newTaskTitle: string;
  setNewTaskTitle: (val: string) => void;
  newTaskCategory: string;
  setNewTaskCategory: (val: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  showManualAdd: boolean;
  setShowManualAdd: (show: boolean) => void;
  manualTitle: string;
  setManualTitle: (val: string) => void;
  manualAmount: string;
  setManualAmount: (val: string) => void;
  handleManualAddSubmit: (e: React.FormEvent) => void;
  adjustModal: { open: boolean; account: 'cash' | 'bank' | 'investment'; currentBal: number };
  setAdjustModal: (val: any) => void;
}

export default function DesktopView(props: DesktopViewProps) {
  const {
    activeTab,
    setActiveTab,
    username,
    currentTime,
    toastMessage,
    handleExportCSV,
    handleLogout,
    totalNetWorth,
    cashBalance,
    bankBalance,
    investmentBalance,
    formatAmount,
    hiddenBalances,
    toggleHideBalance,
    handleOpenAdjust,
    totalIncomeMonth,
    totalExpenseMonth,
    input,
    setInput,
    selectedFile,
    setSelectedFile,
    loading,
    handleSubmit,
    transactions,
    fetchTransactions,
    fetchGoals,
    fetchInvestmentHoldings,
    assetFilter,
    setAssetFilter,
    categoryChartData = [],
    COLORS,
    tasks,
    completedTasksCount,
    taskProgress,
    addTask,
    newTaskTitle,
    setNewTaskTitle,
    newTaskCategory,
    setNewTaskCategory,
    toggleTask,
    deleteTask,
    showManualAdd,
    setShowManualAdd,
    manualTitle,
    setManualTitle,
    manualAmount,
    setManualAmount,
    adjustModal,
    setAdjustModal,
  } = props;

  // Form State Adjust Balance Modal
  const [newTargetBalance, setNewTargetBalance] = useState('');
  const [recordTransaction, setRecordTransaction] = useState(true);

  // Form Manual Add
  const [manualCategory, setManualCategory] = useState('Food & Drinks');
  const [manualAccount, setManualAccount] = useState<'bank' | 'cash'>('bank');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal Edit State
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAccount, setEditAccount] = useState<'bank' | 'cash'>('bank');

  // Modal Delete State
  const [deletingTransaction, setDeletingTransaction] = useState<any>(null);

  const netCashflow = totalIncomeMonth - totalExpenseMonth;

  const filteredChartData = categoryChartData.filter((item) => {
    const itemType = (item.type || 'expense').toLowerCase();
    if (assetFilter === 'expense') return itemType === 'expense';
    if (assetFilter === 'income') return itemType === 'income';
    return true;
  });

  const totalCategoryAmount = filteredChartData.reduce((acc, item) => acc + item.value, 0);

  // Handler Adjust Balance Submit
  const handleSaveAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = Number(newTargetBalance);
    if (isNaN(targetVal)) return;

    const currentBal = adjustModal.currentBal;
    const diff = targetVal - currentBal;

    if (diff === 0) {
      setAdjustModal({ ...adjustModal, open: false });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (recordTransaction) {
      // Rekam sebagai transaksi penyesuaian
      await supabase.from('transactions').insert([
        {
          title: `Balance Adjustment (${adjustModal.account})`,
          amount: Math.abs(diff),
          type: diff > 0 ? 'income' : 'expense',
          category: 'Adjustment/Transfer',
          account: adjustModal.account,
          date: new Date().toISOString().split('T')[0],
          user_id: session.user.id,
        },
      ]);
    } else {
      // Jika tidak mau dimasukkan ke history, buat dummy adjustment yang dikaitkan khusus
      await supabase.from('transactions').insert([
        {
          title: `Balance Adjustment (Direct)`,
          amount: Math.abs(diff),
          type: diff > 0 ? 'income' : 'expense',
          category: 'Adjustment/Transfer',
          account: adjustModal.account,
          date: new Date().toISOString().split('T')[0],
          user_id: session.user.id,
        },
      ]);
    }

    setNewTargetBalance('');
    setAdjustModal({ ...adjustModal, open: false });
    fetchTransactions();
  };

  const handleCustomManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualAmount) return;

    await supabase.from('transactions').insert([
      {
        title: manualTitle,
        amount: Number(manualAmount),
        category: manualCategory,
        account: manualAccount,
        date: manualDate,
        type: 'expense',
      },
    ]);

    setManualTitle('');
    setManualAmount('');
    setShowManualAdd(false);
    fetchTransactions();
  };

  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string }>>([
    {
      id: '1',
      sender: 'ai',
      text: `Halo ${username}! Aku Piggy, AI Financial Advisor kamu 🐷✨. Aku sudah menganalisis portofolio dan arus kasmu bulan ini. Ada yang mau ditanyakan atau minta rekomendasi keuangan?`,
    },
  ]);
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const handleSendAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorInput.trim() || advisorLoading) return;

    const userMsg = { id: Date.now().toString(), sender: 'user' as const, text: advisorInput };
    const updatedMessages = [...advisorMessages, userMsg];
    setAdvisorMessages(updatedMessages);
    setAdvisorInput('');
    setAdvisorLoading(true);

    try {
      const res = await fetch('/api/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          financialContext: {
            username,
            totalNetWorth,
            cashBalance,
            bankBalance,
            investmentBalance,
            totalIncomeMonth,
            totalExpenseMonth,
            netCashflow,
            savingsRate: props.savingsRate,
          },
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setAdvisorMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: data.reply }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdvisorLoading(false);
    }
  };

  return (
    <div
      className="hidden md:flex h-screen w-screen overflow-hidden font-sans antialiased text-slate-800 bg-cover bg-center bg-fixed relative items-center justify-center select-none cursor-default"
      style={{ backgroundImage: `url('/dashboard-bg.webp')` }}
      suppressHydrationWarning
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-none" />

      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative z-10 w-[1020px] h-[570px] max-h-[94vh] bg-white/95 backdrop-blur-xl rounded-[22px] border border-white/60 shadow-2xl overflow-hidden flex p-4 gap-4">
        {/* SIDEBAR */}
        <aside className="w-[190px] h-full bg-[#111318] text-white p-4 rounded-[16px] flex flex-col justify-between shrink-0 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm tracking-tight cursor-default">
              <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                <PiggyBankIcon size={14} />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">Piggy Bank</span>
            </div>

            <nav className="space-y-1 text-xs font-medium text-zinc-400">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-white text-slate-900 font-semibold' : 'hover:text-white'
                }`}
              >
                <LayoutDashboard size={14} /> Dashboard
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'expenses' ? 'bg-white text-slate-900 font-semibold' : 'hover:text-white'
                }`}
              >
                <Receipt size={14} /> Expense Tracker
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'tasks' ? 'bg-white text-slate-900 font-semibold' : 'hover:text-white'
                }`}
              >
                <CheckSquare size={14} /> Task Checklist
              </button>
              <button
                onClick={() => setActiveTab('budgets')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'budgets' ? 'bg-white text-slate-900 font-semibold' : 'hover:text-white'
                }`}
              >
                <PiggyBankIcon size={14} /> Budgets
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'goals' ? 'bg-white text-slate-900 font-semibold' : 'hover:text-white'
                }`}
              >
                <Target size={14} /> Goals
              </button>
              <button
                onClick={() => setActiveTab('investments')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'investments' ? 'bg-white text-slate-900 font-semibold' : 'hover:text-white'
                }`}
              >
                <TrendingUp size={14} /> Investment
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'news' ? 'bg-white text-slate-900 font-semibold' : 'hover:text-white'
                }`}
              >
                <Newspaper size={14} /> Market News
              </button>
            </nav>
          </div>

          <div className="bg-[#1a1d24] p-3 rounded-2xl border border-zinc-800 text-zinc-300 space-y-1.5 cursor-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Clock size={13} className="text-indigo-400" />
                <span>{currentTime || '00:00'}</span>
              </div>
              <button onClick={() => alert('Settings menu opened.')} className="p-1 hover:text-white text-zinc-400 transition cursor-pointer" title="Settings">
                <Settings size={13} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">Live Command Center active.</p>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar space-y-3.5 pr-1">
          <header className="flex justify-between items-center pt-0.5">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 capitalize">{activeTab}</h1>
              <p className="text-xs text-slate-400 font-normal">
                Welcome back, <span className="font-semibold text-slate-600">{username.toLowerCase()}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              >
                <Download size={13} /> <span>Export CSV</span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button onClick={handleLogout} title="Logout" className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer">
                  <LogOut size={16} />
                </button>
                <div className="flex items-center gap-2 bg-slate-100/90 p-1 pl-2.5 rounded-xl text-xs font-medium text-slate-800">
                  <span className="font-medium text-slate-700">{username.toLowerCase()}</span>
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* TAB DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-3.5">
              {/* TOP CARDS WITH INDIVIDUAL HIDE & ADJUST BUTTONS */}
              <div className="grid grid-cols-4 gap-3">
                {/* PORTFOLIO CARD */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-sm w-fit">
                      <Wallet size={13} />
                    </div>
                    <button onClick={() => toggleHideBalance('portfolio')} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                      {hiddenBalances.portfolio ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Total Portfolio</p>
                  <h3 className="text-base font-bold text-slate-900">{formatAmount(totalNetWorth, 'portfolio')}</h3>
                </div>

                {/* CASH CARD */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-sm">
                      <Banknote size={13} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleHideBalance('cash')} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                        {hiddenBalances.cash ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => handleOpenAdjust('cash')} className="text-slate-400 hover:text-slate-800 cursor-pointer" title="Adjust Balance">
                        <Sliders size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Cash Balance</p>
                  <h3 className="text-base font-bold text-slate-900">{formatAmount(cashBalance, 'cash')}</h3>
                </div>

                {/* BANK CARD */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-cyan-500 text-white shadow-sm">
                      <Building2 size={13} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleHideBalance('bank')} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                        {hiddenBalances.bank ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => handleOpenAdjust('bank')} className="text-slate-400 hover:text-slate-800 cursor-pointer" title="Adjust Balance">
                        <Sliders size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Bank Balance</p>
                  <h3 className="text-base font-bold text-slate-900">{formatAmount(bankBalance, 'bank')}</h3>
                </div>

                {/* INVESTMENT CARD */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-rose-500 text-white shadow-sm">
                      <TrendingUp size={13} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleHideBalance('investment')} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                        {hiddenBalances.investment ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => handleOpenAdjust('investment')} className="text-slate-400 hover:text-slate-800 cursor-pointer" title="Adjust Balance">
                        <Sliders size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Investment</p>
                  <h3 className="text-base font-bold text-slate-900">{formatAmount(investmentBalance, 'investment')}</h3>
                </div>
              </div>

              {/* CASHFLOW SUMMARY */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <Scale size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-indigo-500 uppercase">Net Cashflow</p>
                      <p className={`text-xs font-bold ${netCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {netCashflow >= 0 ? '+' : ''}
                        {formatAmount(netCashflow)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <ArrowUpRight size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase">Monthly Income</p>
                    <p className="text-xs font-bold text-emerald-900">{formatAmount(totalIncomeMonth)}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-2xl flex items-center gap-2.5">
                  <div className="p-2 bg-rose-600 text-white rounded-xl">
                    <ArrowDownRight size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-rose-600 uppercase">Monthly Expenses</p>
                    <p className="text-xs font-bold text-rose-900">{formatAmount(totalExpenseMonth)}</p>
                  </div>
                </div>
              </div>

              {/* AI BAR */}
              <div className="bg-[#111318] text-white p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Sparkles size={15} className="text-indigo-400 shrink-0 ml-1" />
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder='Type e.g. "KFC 45k" or "Set cash 500k"...'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-zinc-800/80 text-white px-3 py-1.5 rounded-xl text-xs focus:outline-none placeholder:text-zinc-500"
                  />
                  <label className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5 transition">
                    <Upload size={13} />
                    <span>{selectedFile ? 'Receipt' : 'Image'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
                    {loading ? <Loader2 className="animate-spin" size={13} /> : <Send size={13} />} Send
                  </button>
                </form>
              </div>

              {/* GRID MAIN CONTENT WITH MATCHED CARD HEIGHTS */}
              <div className="grid grid-cols-12 gap-3.5">
                {/* LEFT COLUMN */}
                <div className="col-span-7 flex flex-col gap-3.5">
                  <div className="h-[195px]">
                    <BudgetSection transactions={transactions} />
                  </div>
                  <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-span-5 flex flex-col gap-3.5">
                  {/* ASSET ALLOCATION PIE CHART */}
                  <div className="h-[195px] bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between overflow-hidden">
                    <div className="flex justify-between items-center pb-1 border-b border-slate-100 shrink-0">
                      <h3 className="font-semibold text-slate-900 text-xs">Asset Allocation</h3>
                      <select
                        value={assetFilter}
                        onChange={(e: any) => setAssetFilter(e.target.value)}
                        className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 font-medium cursor-pointer focus:outline-none"
                      >
                        <option value="expense">Expenses</option>
                        <option value="income">Incomes</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    {filteredChartData.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center my-auto py-3">No data available.</p>
                    ) : (
                      <div className="flex items-center gap-2 my-auto py-1">
                        <div className="h-24 w-24 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={filteredChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={20}
                                outerRadius={34}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {filteredChartData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`, 'Total']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex-1 space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                          {filteredChartData.map((item, index) => {
                            const percent = totalCategoryAmount > 0 ? Math.round((item.value / totalCategoryAmount) * 100) : 0;
                            return (
                              <div key={item.name} className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                  <span className="font-medium text-slate-700 truncate">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-900 shrink-0 ml-1">{percent}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <GoalsSection transactions={transactions} totalNetWorth={totalNetWorth} onRefresh={fetchGoals} />
                </div>
              </div>
            </div>
          )}

          {/* TAB EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-3.5">
              <div className="bg-[#111318] text-white p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Sparkles size={15} className="text-indigo-400 shrink-0 ml-1" />
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder='Type e.g. "KFC 45k" or "Taxi 50k pake cash"...'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-zinc-800/80 text-white px-3 py-1.5 rounded-xl text-xs focus:outline-none placeholder:text-zinc-500"
                  />
                  <label className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5 transition">
                    <Upload size={13} />
                    <span>{selectedFile ? 'Receipt' : 'Image'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
                    {loading ? <Loader2 className="animate-spin" size={13} /> : <Send size={13} />} Send
                  </button>
                </form>
              </div>

              <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-xs text-slate-900">Transaction History</h3>
                  <button
                    onClick={() => setShowManualAdd(!showManualAdd)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={11} /> Add Transaction
                  </button>
                </div>

                {showManualAdd && (
                  <form onSubmit={handleCustomManualSubmit} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 text-[11px]">Title</label>
                        <input
                          type="text"
                          placeholder="Title / Note"
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 text-[11px]">Amount (Rp)</label>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 text-[11px]">Category</label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                        >
                          <option value="Food & Drinks">Food & Drinks</option>
                          <option value="Transportation">Transportation</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Bills & Utilities">Bills & Utilities</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="General">General</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 text-[11px]">Payment Account</label>
                        <select
                          value={manualAccount}
                          onChange={(e) => setManualAccount(e.target.value as 'bank' | 'cash')}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                        >
                          <option value="bank">Bank</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 text-[11px]">Date</label>
                        <input
                          type="date"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition cursor-pointer">
                        Save Transaction
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {transactions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">No transactions recorded.</p>
                  ) : (
                    transactions.map((t) => (
                      <div key={t.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs hover:bg-slate-100/60 transition group">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{t.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 capitalize">
                            {t.category || 'General'} • {t.account || 'bank'} • {t.date}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {t.type === 'income' ? '+' : '-'}
                            {formatAmount(Number(t.amount))}
                          </span>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingTransaction(t);
                                setEditTitle(t.title);
                                setEditAmount(String(t.amount));
                                setEditDate(t.date || new Date().toISOString().split('T')[0]);
                                setEditAccount(t.account?.toLowerCase() === 'cash' ? 'cash' : 'bank');
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => setDeletingTransaction(t)} className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MODAL EDIT TRANSACTION */}
              {editingTransaction && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                      <h3 className="font-bold text-sm text-slate-900">Edit Transaction</h3>
                      <button onClick={() => setEditingTransaction(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Amount (Rp)</label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Date</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Payment Account</label>
                          <select
                            value={editAccount}
                            onChange={(e) => setEditAccount(e.target.value as 'bank' | 'cash')}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 capitalize cursor-pointer"
                          >
                            <option value="bank">Bank</option>
                            <option value="cash">Cash</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingTransaction(null)} className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer">
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (editTitle && editAmount) {
                            await supabase
                              .from('transactions')
                              .update({
                                title: editTitle,
                                amount: Number(editAmount),
                                date: editDate,
                                account: editAccount,
                              })
                              .eq('id', editingTransaction.id);

                            setEditingTransaction(null);
                            fetchTransactions();
                          }
                        }}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL DELETE CONFIRMATION */}
              {deletingTransaction && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-100 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                        <Trash2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Delete Transaction</h3>
                        <p className="text-xs text-slate-400">Are you sure you want to remove this record?</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <p className="font-bold text-slate-800">{deletingTransaction.title}</p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {deletingTransaction.category || 'General'} • {formatAmount(Number(deletingTransaction.amount))}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => setDeletingTransaction(null)} className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer">
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from('transactions').delete().eq('id', deletingTransaction.id);
                          setDeletingTransaction(null);
                          fetchTransactions();
                        }}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3.5 font-sans">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={18} className="text-indigo-600" />
                    <div>
                      <h2 className="font-bold text-sm text-slate-900">Financial Action Checklist</h2>
                      <p className="text-xs text-slate-400">Track important financial routines, bill payments, and planning goals.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                    {completedTasksCount} / {tasks.length} Completed ({taskProgress}%)
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${taskProgress}%` }} />
                </div>

                <form onSubmit={addTask} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a new financial task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none cursor-text"
                  />
                  <select value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none cursor-pointer">
                    <option value="Savings">Savings</option>
                    <option value="Bills">Bills</option>
                    <option value="Investments">Investments</option>
                    <option value="Protection">Protection</option>
                    <option value="Budgeting">Budgeting</option>
                  </select>
                  <button type="submit" className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer shrink-0">
                    <Plus size={14} /> Add Task
                  </button>
                </form>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className={`p-3 bg-white border rounded-2xl flex justify-between items-center transition shadow-sm ${task.completed ? 'border-slate-200/60 bg-slate-50/50' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer ${task.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-slate-50 hover:border-indigo-500'}`}
                      >
                        {task.completed && <Check size={12} />}
                      </button>
                      <div>
                        <p className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{task.category}</span>
                          <span className="text-[10px] text-slate-400">Due: {task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB INVESTMENTS */}
          {activeTab === 'investments' && <InvestmentsSection onRefresh={fetchInvestmentHoldings} />}

          {/* TAB BUDGETS */}
          {activeTab === 'budgets' && <BudgetSection transactions={transactions} />}

          {/* TAB GOALS */}
          {activeTab === 'goals' && <GoalsSection transactions={transactions} totalNetWorth={totalNetWorth} onRefresh={fetchGoals} />}

          {/* TAB NEWS */}
          {activeTab === 'news' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2 text-xs">
              <Newspaper size={32} className="mx-auto text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">Global Market News API</h2>
              <p className="text-slate-400 text-xs">Real-time market feeds platform active.</p>
            </div>
          )}
        </main>
      </div>
      
      {/* FLOATING CUTE AI HELPER MASCOT & ADVISORY PANEL */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* ADVISOR CHAT WINDOW */}
        {isAdvisorOpen && (
          <div className="w-[340px] h-[440px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 font-sans">
            {/* HEADER */}
            <div className="bg-[#111318] text-white p-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-indigo-600 flex items-center justify-center text-lg shadow-inner">
                  🐷
                </div>
                <div>
                  <h3 className="font-bold text-xs tracking-tight text-white flex items-center gap-1.5">
                    Piggy AI Advisor <Sparkles size={11} className="text-amber-400 fill-amber-400" />
                  </h3>
                  <p className="text-[10px] text-zinc-400">Financial Health Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdvisorOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* QUICK STATS PREVIEW IN CHAT */}
            <div className="bg-indigo-50/80 px-3 py-2 border-b border-indigo-100/80 flex justify-between items-center text-[10px]">
              <span className="text-indigo-900 font-semibold">Net Worth: Rp {totalNetWorth.toLocaleString('id-ID')}</span>
              <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Cashflow: +Rp {netCashflow.toLocaleString('id-ID')}
              </span>
            </div>

            {/* MESSAGES LIST */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2.5 text-xs bg-slate-50/50">
              {advisorMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-xs whitespace-pre-line'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {advisorLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-500 border border-slate-200 p-2.5 rounded-2xl rounded-bl-none text-xs flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-indigo-600" />
                    <span>Piggy sedang menganalisis keuanganku...</span>
                  </div>
                </div>
              )}
            </div>

            {/* INPUT FORM */}
            <form onSubmit={handleSendAdvisor} className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5">
              <input
                type="text"
                placeholder="Tanya saran alokasi, budget, atau tabungan..."
                value={advisorInput}
                onChange={(e) => setAdvisorInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-medium text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={advisorLoading || !advisorInput.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shrink-0"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}

        {/* FLOATING CUTE MASCOT BUTTON */}
        <button
          onClick={() => setIsAdvisorOpen(!isAdvisorOpen)}
          className="group relative flex items-center justify-center w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white cursor-pointer"
          title="Piggy AI Financial Advisor"
        >
          <span className="text-2xl transition-transform duration-200 group-hover:bounce">🐷</span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
        </button>
      </div>

      {/* MODAL ADJUST BALANCE DENGAN OPSI RECORD TRANSACTION */}
      {adjustModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveAdjustBalance} className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 capitalize">Adjust {adjustModal.account} Balance</h3>
              </div>
              <button type="button" onClick={() => setAdjustModal({ ...adjustModal, open: false })} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Current Balance:</span>
                <span className="font-bold text-slate-800">Rp {adjustModal.currentBal.toLocaleString('id-ID')}</span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px]">New Target Balance (Rp)</label>
                <input
                  type="number"
                  placeholder="Enter new balance amount..."
                  value={newTargetBalance}
                  onChange={(e) => setNewTargetBalance(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                  required
                />
              </div>

              {newTargetBalance && !isNaN(Number(newTargetBalance)) && (
                <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 flex justify-between items-center">
                  <span>Adjustment Difference:</span>
                  <span className="font-bold">
                    {Number(newTargetBalance) - adjustModal.currentBal >= 0 ? '+' : ''}
                    Rp {(Number(newTargetBalance) - adjustModal.currentBal).toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recordTransaction}
                  onChange={(e) => setRecordTransaction(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                />
                <span className="text-slate-600 font-medium text-[11px]">Record difference as transaction in history</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdjustModal({ ...adjustModal, open: false })} className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer">
                Update Balance
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}