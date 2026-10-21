'use client';

import { useState, useRef, useEffect } from 'react';
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
  AlertCircle,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import BudgetSection from '@/components/desktop/dbudgetsection';
import GoalsSection from '@/components/desktop/dgoalsection';
import CalendarWidget from '@/components/desktop/dcalendarwidget';
import InvestmentsSection from '@/components/desktop/dinvestmentsection';
import PiggyLottie from '@/components/PiggyLottie';

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
  recurringList?: any[];
  fetchTransactions: () => void;
  fetchRecurringTransactions?: () => void;
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
    recurringList: initialRecurringList = [],
    fetchTransactions,
    fetchRecurringTransactions: propFetchRecurringTransactions,
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

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // State List Transaction Tab & Recurring
  const [historyTab, setHistoryTab] = useState<'history' | 'recurring'>('history');
  const [localRecurringList, setLocalRecurringList] = useState<any[]>(initialRecurringList);

  // Search Filter State untuk Expense / Transaction History
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLocalRecurringList(initialRecurringList);
  }, [initialRecurringList]);

  // Form State Adjust Balance Modal
  const [newTargetBalance, setNewTargetBalance] = useState('');
  const [recordTransaction, setRecordTransaction] = useState(true);

  // Form Manual Add & Recurring State
  const [manualCategory, setManualCategory] = useState('Food & Drinks');
  const [manualAccount, setManualAccount] = useState<'bank' | 'cash' | 'investment'>('bank');
  const [manualToAccount, setManualToAccount] = useState<'bank' | 'cash' | 'investment'>('cash');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualType, setManualType] = useState<'expense' | 'income' | 'transfer'>('expense');

  // Recurring Inputs
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'interval_days' | 'monthly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [intervalDays, setIntervalDays] = useState<number>(10);

  // Modal Edit State (Biasa)
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Food & Drinks');
  const [editDate, setEditDate] = useState('');
  const [editAccount, setEditAccount] = useState<'bank' | 'cash' | 'investment'>('bank');
  const [editToAccount, setEditToAccount] = useState<'bank' | 'cash' | 'investment'>('cash');
  const [editType, setEditType] = useState<'expense' | 'income' | 'transfer'>('expense');

  // Modal Edit State (Rutin)
  const [editingRecurring, setEditingRecurring] = useState<any>(null);
  const [editRecTitle, setEditRecTitle] = useState('');
  const [editRecAmount, setEditRecAmount] = useState('');
  const [editRecCategory, setEditRecCategory] = useState('Food & Drinks');
  const [editRecAccount, setEditRecAccount] = useState<'bank' | 'cash' | 'investment'>('bank');
  const [editRecToAccount, setEditRecToAccount] = useState<'bank' | 'cash' | 'investment'>('cash');
  const [editRecType, setEditRecType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [editRecFrequency, setEditRecFrequency] = useState<'weekly' | 'interval_days' | 'monthly' | 'yearly'>('monthly');
  const [editRecDayOfMonth, setEditRecDayOfMonth] = useState<number>(1);
  const [editRecIntervalDays, setEditRecIntervalDays] = useState<number>(10);

  // Modal Delete State Transaksi
  const [deletingTransaction, setDeletingTransaction] = useState<any>(null);

  const netCashflow = totalIncomeMonth - totalExpenseMonth;

  const filteredChartData = categoryChartData.filter((item) => {
    const itemType = (item.type || 'expense').toLowerCase();
    if (assetFilter === 'expense') return itemType === 'expense';
    if (assetFilter === 'income') return itemType === 'income';
    return true;
  });

  const totalCategoryAmount = filteredChartData.reduce((acc, item) => acc + item.value, 0);

  // Filter Search Hasil Transaksi & Jadwal Rutin
  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.account && t.account.toLowerCase().includes(q)) ||
      (t.amount && t.amount.toString().includes(q)) ||
      (t.date && t.date.includes(q))
    );
  });

  const filteredRecurringList = localRecurringList.filter((rec) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (rec.title && rec.title.toLowerCase().includes(q)) ||
      (rec.category && rec.category.toLowerCase().includes(q)) ||
      (rec.account && rec.account.toLowerCase().includes(q)) ||
      (rec.amount && rec.amount.toString().includes(q))
    );
  });

  const fetchRecurringTransactions = async () => {
    if (propFetchRecurringTransactions) {
      propFetchRecurringTransactions();
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLocalRecurringList(data);
      }
    } catch (err) {
      console.error('Failed to fetch recurring list:', err);
    }
  };

  useEffect(() => {
    fetchRecurringTransactions();
  }, []);

  const handleRefreshAll = async () => {
    await fetchTransactions();
    await fetchRecurringTransactions();
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (!error) {
        showToast('Transaksi rutin berhasil dihapus', 'success');
        await handleRefreshAll();
      } else {
        showToast('Gagal menghapus transaksi rutin', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) {
        showToast('Gagal menghapus transaksi', 'error');
        return;
      }

      showToast('Transaksi berhasil dihapus', 'success');
      setDeletingTransaction(null);
      await handleRefreshAll();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

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

    await supabase.from('transactions').insert([
      {
        title: recordTransaction ? `Balance Adjustment (${adjustModal.account})` : `Balance Adjustment (Direct)`,
        amount: Math.abs(diff),
        type: diff > 0 ? 'income' : 'expense',
        category: 'Others',
        account: adjustModal.account,
        date: new Date().toISOString().split('T')[0],
        user_id: session.user.id,
      },
    ]);

    showToast('Saldo berhasil disesuaikan', 'success');
    setNewTargetBalance('');
    setAdjustModal({ ...adjustModal, open: false });
    await handleRefreshAll();
  };

  const handleCustomManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let titleToSave = manualTitle;
    let categoryToSave = manualCategory;

    if (manualType === 'transfer') {
      categoryToSave = 'Transfer';
      if (!manualTitle.trim()) {
        titleToSave = `Transfer: ${manualAccount.toUpperCase()} ➔ ${manualToAccount.toUpperCase()}`;
      }
    } else {
      if (!manualTitle.trim()) {
        titleToSave = manualCategory;
      }
    }

    if (isRecurring) {
      const { error } = await supabase.from('recurring_transactions').insert([
        {
          title: titleToSave,
          amount: Number(manualAmount),
          type: manualType,
          category: categoryToSave,
          account: manualAccount,
          to_account: manualType === 'transfer' ? manualToAccount : null,
          frequency: frequency,
          day_of_month: frequency === 'monthly' ? Number(dayOfMonth) : null,
          interval_days: frequency === 'interval_days' ? Number(intervalDays) : null,
          user_id: session.user.id,
        },
      ]);

      if (!error) {
        showToast('Jadwal transaksi rutin berhasil ditambahkan!', 'success');
        await handleRefreshAll();
      } else {
        showToast('Gagal menambahkan transaksi rutin', 'error');
      }
    } else {
      const { error } = await supabase.from('transactions').insert([
        {
          title: titleToSave,
          amount: Number(manualAmount),
          category: categoryToSave,
          account: manualAccount,
          to_account: manualType === 'transfer' ? manualToAccount : null,
          date: manualDate,
          type: manualType,
          user_id: session.user.id,
        },
      ]);

      if (!error) {
        showToast('Transaksi berhasil ditambahkan!', 'success');
        await handleRefreshAll();
      } else {
        showToast('Gagal menambahkan transaksi', 'error');
      }
    }

    setManualTitle('');
    setManualAmount('');
    setIsRecurring(false);
    setShowManualAdd(false);
  };

  // State Advisor AI
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [advisorMessages, setAdvisorMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string }>>([]);
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const fetchSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/advisory', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setAdvisorLoading(true);
      setActiveSessionId(sessionId);
      setIsHistoryDrawerOpen(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/advisory?session_id=${sessionId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        setAdvisorMessages(data.messages);
      } else {
        setAdvisorMessages([
          {
            id: '1',
            sender: 'ai',
            text: `Halo ${username}! Mau lanjutin obrolan di topik ini? 🐷✨`,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load session messages:', err);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setIsHistoryDrawerOpen(false);
    setAdvisorMessages([
      {
        id: '1',
        sender: 'ai',
        text: `Halo ${username}! Aku Piggy, AI Financial Advisor kamu 🐷✨. Ada yang mau ditanyakan tentang keuanganmu hari ini?`,
      },
    ]);
  };

  useEffect(() => {
    if (isAdvisorOpen) {
      fetchSessions();
      if (!activeSessionId) {
        handleNewChat();
      }
    }
  }, [isAdvisorOpen]);

  useEffect(() => {
    if (isAdvisorOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [advisorMessages, advisorLoading, isAdvisorOpen]);

  const handleSendAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorInput.trim() || advisorLoading) return;

    const currentInput = advisorInput;
    const userMsg = { id: Date.now().toString(), sender: 'user' as const, text: currentInput };
    const updatedMessages = [...advisorMessages, userMsg];

    setAdvisorMessages(updatedMessages);
    setAdvisorInput('');
    setAdvisorLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const historyToSend = updatedMessages.filter((m) => m.id !== '1');

      const res = await fetch('/api/advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          prompt: currentInput,
          messages: historyToSend,
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
      if (res.ok && data.reply) {
        if (data.sessionId && !activeSessionId) {
          setActiveSessionId(data.sessionId);
          fetchSessions();
        }
        setAdvisorMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), sender: 'ai', text: data.reply },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const confirmDeleteSession = async () => {
    if (!deletingSessionId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/advisory?session_id=${deletingSessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        if (activeSessionId === deletingSessionId) {
          handleNewChat();
        }
        setDeletingSessionId(null);
        await fetchSessions();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const lottieRef = useRef<any>(null);
  const [isPiggyHovered, setIsPiggyHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsPiggyHovered(true);
    lottieRef.current?.play();
  };

  const handleMouseLeave = () => {
    setIsPiggyHovered(false);
    lottieRef.current?.stop();
  };

  return (
    <div
      className="hidden md:flex h-screen w-screen overflow-hidden font-sans antialiased text-slate-800 bg-cover bg-center bg-fixed relative items-center justify-center select-none cursor-default"
      style={{ backgroundImage: `url('/dashboard-bg.webp')` }}
      suppressHydrationWarning
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-none" />

      {/* CUSTOM TOAST NOTIFICATION POPUP */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold text-white transition-all transform animate-in slide-in-from-top-3 ${
          toast.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
        }`}>
          <div className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{toast.message}</span>
        </div>
      )}

      {toastMessage && !toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-top-3">
          {toastMessage.toLowerCase().includes('tidak') || toastMessage.toLowerCase().includes('gagal') ? (
            <AlertCircle size={16} className="text-amber-400" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400" />
          )}
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
            </nav>
          </div>

          <div className="bg-[#1a1d24] p-3 rounded-2xl border border-zinc-800 text-zinc-300 space-y-1.5 cursor-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Clock size={13} className="text-indigo-400" />
                <span>{currentTime || '00:00'}</span>
              </div>
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
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-sm w-fit">
                      <Wallet size={13} />
                    </div>
                    <button onClick={() => toggleHideBalance('portfolio')} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                      {hiddenBalances.portfolio ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Total Balance</p>
                  <h3 className="text-base font-bold text-slate-900">{formatAmount(totalNetWorth, 'portfolio')}</h3>
                </div>

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

              <div className="bg-[#111318] text-white p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Sparkles size={15} className="text-indigo-400 shrink-0 ml-1" />
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder='Type e.g. "KFC 45k" or "Transfer cash ke bank 100k"...'
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

              <div className="grid grid-cols-12 gap-3.5">
                <div className="col-span-7 flex flex-col gap-3.5">
                  <div className="h-[195px]">
                    <BudgetSection transactions={transactions} />
                  </div>
                  <CalendarWidget 
                    transactions={transactions} 
                    recurringList={localRecurringList} 
                    onRefresh={handleRefreshAll} 
                  />
                </div>

                <div className="col-span-5 flex flex-col gap-3.5">
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
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                    placeholder='Type e.g. "KFC 45k" or "Transfer cash ke bank 100k"...'
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

              <CalendarWidget 
                transactions={transactions} 
                recurringList={localRecurringList} 
                onRefresh={handleRefreshAll} 
              />

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryTab('history')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                        historyTab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Transaction History
                    </button>
                    <button
                      onClick={() => setHistoryTab('recurring')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        historyTab === 'recurring' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span>Jadwal Rutin</span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                        {localRecurringList.length}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* SEARCH INPUT FITUR UNTUK TRANSACTION HISTORY & JADWAL RUTIN */}
                    <div className="relative flex items-center">
                      <Search size={12} className="absolute left-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search transaction..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 pr-6 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-700 w-36 focus:w-48 transition-all"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setShowManualAdd(!showManualAdd)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 transition cursor-pointer shrink-0"
                    >
                      <Plus size={11} /> Add Transaction
                    </button>
                  </div>
                </div>

                {showManualAdd && (
                  <form onSubmit={handleCustomManualSubmit} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in fade-in">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 text-[11px]">Type</label>
                        <select
                          value={manualType}
                          onChange={(e) => setManualType(e.target.value as 'expense' | 'income' | 'transfer')}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="transfer">Transfer</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 text-[11px]">Title / Note</label>
                        <input
                          type="text"
                          placeholder={manualType === 'transfer' ? 'Opt. (e.g. Topup Gopay)' : 'Title / Note'}
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
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
                      {manualType !== 'transfer' ? (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 text-[11px]">Category</label>
                          <select
                            value={manualCategory}
                            onChange={(e) => setManualCategory(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                          >
                            <option value="Food & Drinks">Food & Drinks</option>
                            <option value="Transportation">Transportation</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Investment">Investment</option>
                            <option value="Salary">Salary</option>
                            <option value="Bonus">Bonus</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 text-[11px]">From Account</label>
                          <select
                            value={manualAccount}
                            onChange={(e) => setManualAccount(e.target.value as 'bank' | 'cash' | 'investment')}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer uppercase"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="investment">Investment</option>
                          </select>
                        </div>
                      )}

                      {manualType !== 'transfer' ? (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 text-[11px]">Account</label>
                          <select
                            value={manualAccount}
                            onChange={(e) => setManualAccount(e.target.value as 'bank' | 'cash' | 'investment')}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer uppercase"
                          >
                            <option value="bank">Bank</option>
                            <option value="cash">Cash</option>
                            <option value="investment">Investment</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 text-[11px]">To Account</label>
                          <select
                            value={manualToAccount}
                            onChange={(e) => setManualToAccount(e.target.value as 'bank' | 'cash' | 'investment')}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer uppercase"
                          >
                            <option value="bank">Bank</option>
                            <option value="cash">Cash</option>
                            <option value="investment">Investment</option>
                          </select>
                        </div>
                      )}

                      {!isRecurring && (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 text-[11px]">Date</label>
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 pt-1 border-t border-slate-200/60">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                        />
                        <span className="text-slate-700 font-semibold text-[11px]">
                          Ulangi otomatis (Transaksi Rutin)
                        </span>
                      </label>

                      {isRecurring && (
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100 animate-in fade-in">
                          <div className="space-y-1">
                            <label className="font-semibold text-indigo-900 text-[11px]">Frekuensi Rutin</label>
                            <select
                              value={frequency}
                              onChange={(e: any) => setFrequency(e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium cursor-pointer"
                            >
                              <option value="monthly">Tiap Bulan (Tanggal Spesifik)</option>
                              <option value="weekly">Tiap Minggu (7 Hari)</option>
                              <option value="interval_days">Tiap X Hari (misal: 10 Hari)</option>
                              <option value="yearly">Tiap Tahun</option>
                            </select>
                          </div>

                          {frequency === 'monthly' && (
                            <div className="space-y-1">
                              <label className="font-semibold text-indigo-900 text-[11px]">Setiap Tanggal (1-31)</label>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                value={dayOfMonth}
                                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-white border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold"
                              />
                            </div>
                          )}

                          {frequency === 'interval_days' && (
                            <div className="space-y-1">
                              <label className="font-semibold text-indigo-900 text-[11px]">Berapa Hari Sekali?</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="10"
                                value={intervalDays}
                                onChange={(e) => setIntervalDays(Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-white border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition cursor-pointer">
                        {isRecurring ? 'Save Recurring Schedule' : 'Save Transaction'}
                      </button>
                    </div>
                  </form>
                )}

                {/* CONTENT PER TAB (HISTORY VS RECURRING) */}
                {historyTab === 'history' ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {filteredTransactions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        {searchTerm ? 'Tidak ada transaksi yang cocok dengan pencarian.' : 'No transactions recorded.'}
                      </p>
                    ) : (
                      filteredTransactions.map((t) => {
                        const isAuto = t.title?.startsWith('[Otomatis]');
                        return (
                          <div key={t.id} className="p-2 px-3 bg-slate-50/80 border border-slate-200/60 rounded-xl flex justify-between items-center text-xs hover:bg-slate-100/80 transition group">
                            <div className="flex items-center gap-2 truncate pr-2">
                              {t.type === 'transfer' && <ArrowRightLeft size={13} className="text-indigo-500 shrink-0" />}
                              
                              <span className="font-bold text-slate-800 text-xs truncate max-w-[180px]">{t.title}</span>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                                {t.category || 'Others'}
                              </span>

                              {isAuto && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                  Rutin
                                </span>
                              )}

                              <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-1">
                                • {t.account?.toUpperCase() || 'BANK'} • {t.date}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`font-bold text-xs ${
                                t.type === 'income' ? 'text-emerald-600' : t.type === 'transfer' ? 'text-indigo-600' : 'text-slate-900'
                              }`}>
                                {t.type === 'income' ? '+' : t.type === 'transfer' ? '↔ ' : '-'}
                                {formatAmount(Number(t.amount))}
                              </span>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingTransaction(t);
                                    setEditTitle(t.title || '');
                                    setEditAmount(String(t.amount || ''));
                                    setEditCategory(t.category || 'Others');
                                    setEditDate(t.date || new Date().toISOString().split('T')[0]);
                                    setEditType(t.type === 'income' ? 'income' : t.type === 'transfer' ? 'transfer' : 'expense');
                                    
                                    const acc = t.account?.toLowerCase();
                                    if (acc === 'cash') setEditAccount('cash');
                                    else if (acc === 'investment') setEditAccount('investment');
                                    else setEditAccount('bank');
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => setDeletingTransaction(t)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {filteredRecurringList.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        {searchTerm ? 'Tidak ada jadwal rutin yang cocok dengan pencarian.' : 'Belum ada jadwal transaksi rutin terdaftar.'}
                      </p>
                    ) : (
                      filteredRecurringList.map((rec) => {
                        const getFreqText = () => {
                          if (rec.frequency === 'weekly') return 'Setiap minggu';
                          if (rec.frequency === 'interval_days') return `Setiap ${rec.interval_days} hari`;
                          if (rec.frequency === 'yearly') return 'Setiap Tahun';
                          return `Setiap tanggal ${rec.day_of_month}`;
                        };

                        return (
                          <div
                            key={rec.id}
                            className="p-2 px-3 bg-slate-100/70 border border-dashed border-slate-300 rounded-xl flex justify-between items-center text-xs hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="font-bold text-slate-800 text-xs truncate max-w-[180px]">{rec.title}</span>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                                {rec.category || 'Others'}
                              </span>

                              <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                ⏳ {getFreqText()}
                              </span>

                              <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-1">
                                • {rec.account?.toUpperCase()} • Terakhir: {rec.last_executed_date || 'Belum Pernah'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-slate-700 text-xs">
                                {formatAmount(Number(rec.amount))}
                              </span>
                              
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingRecurring(rec);
                                    setEditRecTitle(rec.title || '');
                                    setEditRecAmount(String(rec.amount || ''));
                                    setEditRecCategory(rec.category || 'Others');
                                    setEditRecType(rec.type === 'income' ? 'income' : rec.type === 'transfer' ? 'transfer' : 'expense');
                                    setEditRecAccount(rec.account || 'bank');
                                    setEditRecToAccount(rec.to_account || 'cash');
                                    setEditRecFrequency(rec.frequency || 'monthly');
                                    setEditRecDayOfMonth(rec.day_of_month || 1);
                                    setEditRecIntervalDays(rec.interval_days || 10);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                                  title="Edit Jadwal Rutin"
                                >
                                  <Edit2 size={12} />
                                </button>

                                <button
                                  onClick={() => handleDeleteRecurring(rec.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="Hapus Jadwal Rutin"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* MODAL EDIT TRANSAKSI BIASA */}
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
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Type</label>
                          <select
                            value={editType}
                            onChange={(e) => {
                              const newType = e.target.value as 'expense' | 'income' | 'transfer';
                              setEditType(newType);
                              if (newType === 'transfer') {
                                setEditCategory('Transfer');
                              }
                            }}
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 cursor-pointer"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                            <option value="transfer">Transfer</option>
                          </select>
                        </div>

                        {editType !== 'transfer' ? (
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600">Category</label>
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 cursor-pointer"
                            >
                              <option value="Food & Drinks">Food & Drinks</option>
                              <option value="Transportation">Transportation</option>
                              <option value="Utilities">Utilities</option>
                              <option value="Entertainment">Entertainment</option>
                              <option value="Healthcare">Healthcare</option>
                              <option value="Investment">Investment</option>
                              <option value="Salary">Salary</option>
                              <option value="Bonus">Bonus</option>
                              <option value="Others">Others</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600">From Account</label>
                            <select
                              value={editAccount}
                              onChange={(e) => setEditAccount(e.target.value as 'bank' | 'cash' | 'investment')}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 uppercase cursor-pointer"
                            >
                              <option value="cash">Cash</option>
                              <option value="bank">Bank</option>
                              <option value="investment">Investment</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Title / Note</label>
                        <input
                          type="text"
                          value={editTitle}
                          placeholder={editType === 'transfer' ? 'Opt. (e.g. Topup Gopay)' : 'Title'}
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
                        {editType !== 'transfer' ? (
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600">Payment Account</label>
                            <select
                              value={editAccount}
                              onChange={(e) => setEditAccount(e.target.value as 'bank' | 'cash' | 'investment')}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 uppercase cursor-pointer"
                            >
                              <option value="bank">Bank</option>
                              <option value="cash">Cash</option>
                              <option value="investment">Investment</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600">To Account</label>
                            <select
                              value={editToAccount}
                              onChange={(e) => setEditToAccount(e.target.value as 'bank' | 'cash' | 'investment')}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 uppercase cursor-pointer"
                            >
                              <option value="bank">Bank</option>
                              <option value="cash">Cash</option>
                              <option value="investment">Investment</option>
                            </select>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Date</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingTransaction(null)} className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer">
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (editAmount) {
                            let updatedTitle = editTitle;
                            let updatedCategory = editCategory;

                            if (editType === 'transfer') {
                              updatedCategory = 'Transfer';
                              if (!editTitle.trim()) {
                                updatedTitle = `Transfer: ${editAccount.toUpperCase()} ➔ ${editToAccount.toUpperCase()}`;
                              }
                            } else {
                              if (!editTitle.trim()) {
                                updatedTitle = editCategory;
                              }
                            }

                            await supabase
                              .from('transactions')
                              .update({
                                title: updatedTitle,
                                amount: Number(editAmount),
                                category: updatedCategory,
                                date: editDate,
                                account: editAccount,
                                type: editType,
                              })
                              .eq('id', editingTransaction.id);

                            showToast('Perubahan transaksi disimpan', 'success');
                            setEditingTransaction(null);
                            await handleRefreshAll();
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

              {/* MODAL EDIT TRANSAKSI RUTIN */}
              {editingRecurring && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-indigo-600" />
                        <h3 className="font-bold text-sm text-slate-900">Edit Jadwal Rutin</h3>
                      </div>
                      <button onClick={() => setEditingRecurring(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Type</label>
                          <select
                            value={editRecType}
                            onChange={(e) => setEditRecType(e.target.value as any)}
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 cursor-pointer"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                            <option value="transfer">Transfer</option>
                          </select>
                        </div>

                        {editRecType !== 'transfer' ? (
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600">Category</label>
                            <select
                              value={editRecCategory}
                              onChange={(e) => setEditRecCategory(e.target.value)}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 cursor-pointer"
                            >
                              <option value="Food & Drinks">Food & Drinks</option>
                              <option value="Transportation">Transportation</option>
                              <option value="Utilities">Utilities</option>
                              <option value="Entertainment">Entertainment</option>
                              <option value="Healthcare">Healthcare</option>
                              <option value="Investment">Investment</option>
                              <option value="Salary">Salary</option>
                              <option value="Bonus">Bonus</option>
                              <option value="Others">Others</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600">From Account</label>
                            <select
                              value={editRecAccount}
                              onChange={(e) => setEditRecAccount(e.target.value as any)}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800 uppercase cursor-pointer"
                            >
                              <option value="cash">Cash</option>
                              <option value="bank">Bank</option>
                              <option value="investment">Investment</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Title / Note</label>
                        <input
                          type="text"
                          value={editRecTitle}
                          onChange={(e) => setEditRecTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Amount (Rp)</label>
                        <input
                          type="number"
                          value={editRecAmount}
                          onChange={(e) => setEditRecAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100">
                        <div className="space-y-1">
                          <label className="font-semibold text-indigo-900 text-[11px]">Frekuensi Rutin</label>
                          <select
                            value={editRecFrequency}
                            onChange={(e: any) => setEditRecFrequency(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium cursor-pointer"
                          >
                            <option value="monthly">Tiap Bulan (Tanggal)</option>
                            <option value="weekly">Tiap Minggu (7 Hari)</option>
                            <option value="interval_days">Tiap X Hari</option>
                            <option value="yearly">Tiap Tahun</option>
                          </select>
                        </div>

                        {editRecFrequency === 'monthly' && (
                          <div className="space-y-1">
                            <label className="font-semibold text-indigo-900 text-[11px]">Tanggal (1-31)</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={editRecDayOfMonth}
                              onChange={(e) => setEditRecDayOfMonth(Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-white border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold"
                            />
                          </div>
                        )}

                        {editRecFrequency === 'interval_days' && (
                          <div className="space-y-1">
                            <label className="font-semibold text-indigo-900 text-[11px]">Berapa Hari Sekali?</label>
                            <input
                              type="number"
                              min="1"
                              value={editRecIntervalDays}
                              onChange={(e) => setEditRecIntervalDays(Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-white border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingRecurring(null)} className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer">
                        Batal
                      </button>
                      <button
                        onClick={async () => {
                          if (editRecAmount) {
                            let updatedTitle = editRecTitle;
                            let updatedCategory = editRecCategory;

                            if (editRecType === 'transfer') {
                              updatedCategory = 'Transfer';
                              if (!editRecTitle.trim()) {
                                updatedTitle = `Transfer: ${editRecAccount.toUpperCase()} ➔ ${editRecToAccount.toUpperCase()}`;
                              }
                            }

                            await supabase
                              .from('recurring_transactions')
                              .update({
                                title: updatedTitle,
                                amount: Number(editRecAmount),
                                category: updatedCategory,
                                account: editRecAccount,
                                to_account: editRecType === 'transfer' ? editRecToAccount : null,
                                type: editRecType,
                                frequency: editRecFrequency,
                                day_of_month: editRecFrequency === 'monthly' ? Number(editRecDayOfMonth) : null,
                                interval_days: editRecFrequency === 'interval_days' ? Number(editRecIntervalDays) : null,
                              })
                              .eq('id', editingRecurring.id);

                            showToast('Jadwal rutin berhasil diperbarui', 'success');
                            setEditingRecurring(null);
                            await handleRefreshAll();
                          }
                        }}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL CONFIRM DELETE TRANSACTION */}
              {deletingTransaction && (
                <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-[#111318] text-white rounded-2xl p-5 w-full max-w-xs border border-zinc-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-sans">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                        <Trash2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Hapus Transaksi?</h3>
                        <p className="text-[11px] text-zinc-400">"{deletingTransaction.title}" akan dihapus secara permanen.</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDeletingTransaction(null)}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(deletingTransaction.id)}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-lg shadow-rose-600/20"
                      >
                        Hapus
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

        </main>
      </div>

      {/* FLOATING CUTE AI HELPER MASCOT & ADVISORY PANEL */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isAdvisorOpen && (
          <div className="w-[350px] h-[450px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden mb-3 mr-14 animate-in fade-in slide-in-from-bottom-5 font-sans relative">
            <div className="bg-[#111318] text-white p-3 flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
                  className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Chat History"
                >
                  <Clock size={15} />
                </button>
                <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-sm shadow-inner">
                  🐷
                </div>
                <div>
                  <h3 className="font-bold text-xs tracking-tight text-white flex items-center gap-1">
                    Piggy AI Advisor <Sparkles size={11} className="text-amber-400 fill-amber-400" />
                  </h3>
                  <p className="text-[9px] text-zinc-400">Financial Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewChat}
                  className="p-1.5 hover:bg-zinc-800 text-indigo-400 hover:text-indigo-300 rounded-xl transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="New Chat"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => setIsAdvisorOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {isHistoryDrawerOpen && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-30 p-3.5 flex flex-col text-white animate-in fade-in slide-in-from-left duration-200">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2 shrink-0">
                  <h4 className="font-bold text-xs flex items-center gap-1.5">
                    <Clock size={13} className="text-indigo-400" /> Chat History
                  </h4>
                  <button
                    onClick={() => setIsHistoryDrawerOpen(false)}
                    className="p-1 hover:text-zinc-400 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <button
                  onClick={handleNewChat}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 mb-3 transition cursor-pointer shrink-0"
                >
                  <Plus size={13} /> New Conversation
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {sessions.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 text-center py-4">Belum ada riwayat obrolan.</p>
                  ) : (
                    sessions.map((s) => (
                      <div
                        key={s.id}
                        className={`w-full p-2.5 rounded-xl border text-xs flex justify-between items-center transition cursor-pointer ${
                          activeSessionId === s.id
                            ? 'bg-indigo-950/80 border-indigo-500 text-white font-semibold'
                            : 'bg-zinc-800/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div
                          onClick={() => loadSessionMessages(s.id)}
                          className="flex-1 truncate pr-2 text-[11px] h-full flex items-center"
                        >
                          {s.title}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSessionId(s.id);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition cursor-pointer shrink-0"
                          title="Delete Chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="bg-indigo-50/80 px-3 py-1.5 border-b border-indigo-100/80 flex justify-between items-center text-[10px]">
              <span className="text-indigo-900 font-semibold">Net Worth: Rp {totalNetWorth.toLocaleString('id-ID')}</span>
              <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Cashflow: +Rp {netCashflow.toLocaleString('id-ID')}
              </span>
            </div>

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

              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendAdvisor} className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5">
              <input
                type="text"
                placeholder="Tanya saran alokasi, budget, atau tabungan..."
                value={advisorInput}
                onChange={(e) => setAdvisorInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-medium text-slate-800 placeholder:text-slate-400"
              />
            </form>
          </div>
        )}

        <div
          onClick={(e) => {
            if (isAdvisorOpen) {
              handleSendAdvisor(e as any);
            } else {
              setIsAdvisorOpen(true);
            }
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="fixed bottom-1 right-1 z-50 flex flex-col items-center justify-center cursor-pointer group transition-transform duration-300 hover:scale-105 active:scale-95 select-none"
        >
          <div
            className={`absolute top-3 bg-slate-900/90 text-white text-[10px] font-semibold px-2.5 py-1 rounded-xl shadow-lg border border-slate-700 transition-all duration-200 pointer-events-none whitespace-nowrap z-10 ${
              isPiggyHovered ? 'opacity-100 -translate-y-1' : 'opacity-0 translate-y-1'
            }`}
          >
            {isAdvisorOpen ? 'Kirim pesan 🐷' : 'Butuh saran keuangan?'}
          </div>

          <div className="w-45 h-45 flex items-center justify-center drop-shadow-xl overflow-hidden">
            <PiggyLottie
              lottieRef={lottieRef}
              src="https://lottie.host/3887dc40-5124-460c-afcb-8a6ffb763a2a/TgBStkObJw.lottie"
            />
          </div>

          <span className="absolute bottom-6 right-6 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-md animate-pulse z-10" />
        </div>
      </div>

      {/* MODAL ADJUST BALANCE */}
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

      {/* MODAL CUSTOM DELETE CHAT SESSION */}
      {deletingSessionId && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111318] text-white rounded-2xl p-5 w-full max-w-xs border border-zinc-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-sans">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Hapus Obrolan?</h3>
                <p className="text-[11px] text-zinc-400">Riwayat percakapan ini akan dihapus permanen.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingSessionId(null)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteSession}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}