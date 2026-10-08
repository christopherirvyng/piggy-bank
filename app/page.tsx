'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Send,
  Upload,
  Wallet,
  Sparkles,
  Loader2,
  Trash2,
  Edit3,
  X,
  Banknote,
  Building2,
  TrendingUp,
  Sliders,
  LogOut,
  LayoutDashboard,
  Target,
  Share2,
  Download,
  Copy,
  Check,
  CheckSquare,
  Newspaper,
  Receipt,
  PiggyBank as PiggyBankIcon,
  Plus,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Settings,
  Clock,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import BudgetSection from '@/components/budgetsection';
import GoalsSection from '@/components/goalssection';
import CalendarWidget from '@/components/calendarwidget';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  account?: 'cash' | 'bank' | 'investment';
  date: string;
  created_at?: string;
  user_id?: string;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'weekly' | 'monthly'>('monthly');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'investments' | 'tasks' | 'budgets' | 'goals' | 'news'>('dashboard');
  
  const [assetFilter, setAssetFilter] = useState<'expense' | 'all' | 'income'>('expense');
  const [currentTime, setCurrentTime] = useState('');

  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Expense Add States
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<'expense' | 'income'>('expense');
  const [manualCategory, setManualCategory] = useState('Food & Beverage');
  const [manualAccount, setManualAccount] = useState<'cash' | 'bank' | 'investment'>('bank');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; account: 'cash' | 'bank' | 'investment'; currentBal: number }>({ open: false, account: 'bank', currentBal: 0 });
  const [targetAmountInput, setTargetAmountInput] = useState<string>('');
  const [rawTargetAmount, setRawTargetAmount] = useState<number>(0);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkUserAndFetch();

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const checkUserAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUserEmail(session.user.email || 'christopherirvyng');
    fetchTransactions(session.user.id);
  };

  const fetchTransactions = async (userId?: string) => {
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (!error && data) setTransactions(data as Transaction[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const filteredTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date);
    const now = new Date();

    if (timeframe === 'today') {
      return (
        transactionDate.getDate() === now.getDate() &&
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear()
      );
    }
    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return transactionDate >= oneWeekAgo && transactionDate <= now;
    }
    if (timeframe === 'monthly') {
      return (
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  const calculateAccountBalance = (accountType: 'cash' | 'bank' | 'investment') => {
    return transactions
      .filter((t) => (t.account || 'bank') === accountType)
      .reduce((acc, curr) => curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);
  };

  const cashBalance = calculateAccountBalance('cash');
  const bankBalance = calculateAccountBalance('bank');
  const investmentBalance = calculateAccountBalance('investment');
  const totalNetWorth = cashBalance + bankBalance + investmentBalance;

  const isExcluded = (item: Transaction) => 
    item.category?.toLowerCase().includes('adjustment') || item.category?.toLowerCase().includes('transfer');

  const totalIncomeMonth = transactions
    .filter(t => t.type === 'income' && !isExcluded(t) && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExpenseMonth = transactions
    .filter(t => t.type === 'expense' && !isExcluded(t) && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const savingsRate = totalIncomeMonth > 0 ? Math.max(0, Math.round(((totalIncomeMonth - totalExpenseMonth) / totalIncomeMonth) * 100)) : 0;
  
  const getHealthScore = () => {
    if (totalIncomeMonth === 0 && totalExpenseMonth === 0) return { score: 85, label: 'Good', color: 'text-emerald-600' };
    if (savingsRate >= 30) return { score: 92, label: 'Excellent', color: 'text-emerald-600' };
    if (savingsRate >= 15) return { score: 78, label: 'Healthy', color: 'text-indigo-600' };
    if (savingsRate >= 0) return { score: 60, label: 'Fair', color: 'text-amber-600' };
    return { score: 40, label: 'Warning', color: 'text-rose-600' };
  };

  const health = getHealthScore();

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('No transactions available to export.');
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Type', 'Account', 'Amount'];
    const csvRows = [
      headers.join(','),
      ...transactions.map((t) =>
        [
          `"${t.date}"`,
          `"${t.title.replace(/"/g, '""')}"`,
          `"${t.category || ''}"`,
          `"${t.type}"`,
          `"${t.account || 'bank'}"`,
          t.amount,
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PiggyBank_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getShareSummaryText = () => {
    return `📊 Piggy Bank Summary (${username.toLowerCase()})
-----------------------------------
💰 Total Net Worth: Rp ${totalNetWorth.toLocaleString('id-ID')}
💵 Cash Balance: Rp ${cashBalance.toLocaleString('id-ID')}
🏦 Bank Balance: Rp ${bankBalance.toLocaleString('id-ID')}
📈 Investment: Rp ${investmentBalance.toLocaleString('id-ID')}
-----------------------------------
Tracked live on Piggy Bank AI.`;
  };

  const handleCopyInsights = () => {
    navigator.clipboard.writeText(getShareSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeResetAccount = async (accountType: 'cash' | 'bank' | 'investment', targetAmount: number = 0) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const currentBal = calculateAccountBalance(accountType);
    const diff = targetAmount - currentBal;
    if (diff === 0) {
      setAdjustModal({ open: false, account: 'bank', currentBal: 0 });
      return;
    }

    const type = diff > 0 ? 'income' : 'expense';
    const amount = Math.abs(diff);

    const { error } = await supabase.from('transactions').insert([
      {
        title: `Balance Adjustment (${accountType.toUpperCase()})`,
        amount: amount,
        type: type,
        category: 'Adjustment/Transfer',
        account: accountType,
        date: new Date().toISOString().split('T')[0],
        user_id: session.user.id,
      },
    ]);

    if (!error) {
      fetchTransactions(session.user.id);
      setAdjustModal({ open: false, account: 'bank', currentBal: 0 });
      showToast('Balance updated successfully!');
    }
  };

  const handleAdjustInputChange = (val: string) => {
    const cleanNum = val.replace(/\D/g, '');
    if (!cleanNum) {
      setTargetAmountInput('');
      setRawTargetAmount(0);
      return;
    }
    const numeric = parseInt(cleanNum, 10);
    setTargetAmountInput(new Intl.NumberFormat('id-ID').format(numeric));
    setRawTargetAmount(numeric);
  };

  const handleOpenAdjust = (accountType: 'cash' | 'bank' | 'investment') => {
    const currentBal = calculateAccountBalance(accountType);
    setAdjustModal({ open: true, account: accountType, currentBal });
    if (currentBal === 0) {
      setTargetAmountInput('');
      setRawTargetAmount(0);
    } else {
      setTargetAmountInput(new Intl.NumberFormat('id-ID').format(currentBal));
      setRawTargetAmount(currentBal);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('transactions').delete().eq('id', deleteTargetId);
    if (!error) {
      setDeleteTargetId(null);
      if (session) fetchTransactions(session.user.id);
      showToast('Transaction deleted successfully!');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from('transactions')
      .update({
        title: editingTransaction.title,
        amount: editingTransaction.amount,
        type: editingTransaction.type,
        category: editingTransaction.category,
        account: editingTransaction.account || 'bank',
        date: editingTransaction.date,
      })
      .eq('id', editingTransaction.id);

    if (!error) {
      setEditingTransaction(null);
      if (session) fetchTransactions(session.user.id);
      showToast('Transaction updated successfully!');
    }
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualAmount) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('transactions').insert([
      {
        title: manualTitle,
        amount: Number(manualAmount),
        type: manualType,
        category: manualCategory,
        account: manualAccount,
        date: manualDate,
        user_id: session.user.id,
      },
    ]);

    if (!error) {
      setManualTitle('');
      setManualAmount('');
      setShowManualAdd(false);
      fetchTransactions(session.user.id);
      showToast('Transaction added manually!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input && !selectedFile) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(true);
    let imageBase64: string | null = null;

    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          imageBase64 = reader.result as string;
          resolve();
        };
      });
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: input, imageBase64 }),
      });

      if (!res.ok) {
        alert('Failed to process AI transaction.');
        return;
      }

      const result = await res.json();
      if (result.success && result.data) {
        if (result.data.isReset) {
          const { account, targetAmount } = result.data;
          await executeResetAccount(account || 'bank', targetAmount || 0);
        } else {
          fetchTransactions(session.user.id);
        }
        setInput('');
        setSelectedFile(null);
        showToast('AI Transaction processed successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categoryChartData = Object.entries(
    filteredTransactions
      .filter((t) => {
        if (isExcluded(t)) return false;
        if (assetFilter === 'all') return true;
        return t.type === assetFilter;
      })
      .reduce((acc: { [key: string]: number }, curr) => {
        const cat = curr.category || 'Other';
        acc[cat] = (acc[cat] || 0) + Number(curr.amount);
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  const username = userEmail?.split('@')[0] || 'christopherirvyng';

  return (
    <div 
      className="h-screen w-screen overflow-hidden font-sans antialiased text-slate-800 bg-cover bg-center bg-fixed relative flex items-center justify-center select-none cursor-default"
      style={{ backgroundImage: `url('/dashboard-bg.webp')` }}
      suppressHydrationWarning
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-none" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Main Container */}
      <div className="relative z-10 w-[1000px] h-[600px] bg-white/95 backdrop-blur-xl rounded-[20px] border border-white/60 shadow-2xl overflow-hidden flex p-5 gap-5">
        
        {/* 1. SIDEBAR KIRI */}
        <aside className="w-[195px] h-full bg-[#111318] text-white p-4.5 rounded-[16px] flex flex-col justify-between shrink-0 shadow-lg">
          <div className="space-y-5">
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
                  activeTab === 'dashboard' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <LayoutDashboard size={14} /> Dashboard
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'expenses' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <Receipt size={14} /> Expense Tracker
              </button>

              <button
                onClick={() => setActiveTab('investments')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'investments' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <TrendingUp size={14} /> Investment Tracker
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'tasks' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <CheckSquare size={14} /> Task Checklist
              </button>

              <button
                onClick={() => setActiveTab('budgets')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'budgets' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <PiggyBankIcon size={14} /> Budgets
              </button>

              <button
                onClick={() => setActiveTab('goals')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'goals' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <Target size={14} /> Goals
              </button>

              <button
                onClick={() => setActiveTab('news')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'news' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <Newspaper size={14} /> Market News
              </button>
            </nav>
          </div>

          <div className="bg-[#1a1d24] p-3 rounded-2xl border border-zinc-800 text-zinc-300 space-y-2 cursor-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Clock size={13} className="text-indigo-400" />
                <span>{currentTime || '00:00'}</span>
              </div>
              <button 
                onClick={() => alert('Settings menu opened.')} 
                className="p-1 hover:text-white text-zinc-400 transition cursor-pointer"
                title="Settings"
              >
                <Settings size={13} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">Live Command Center active.</p>
          </div>
        </aside>

        {/* 2. KONTEN UTAMA */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar space-y-3.5 pr-1">
          
          <header className="flex justify-between items-start pt-0.5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 cursor-default">
                {activeTab === 'dashboard' && 'Financial Management'}
                {activeTab === 'expenses' && 'Expense Tracker'}
                {activeTab === 'investments' && 'Investment Portfolio'}
                {activeTab === 'tasks' && 'Financial Task Checklist'}
                {activeTab === 'budgets' && 'Monthly Budgets'}
                {activeTab === 'goals' && 'Financial Goals'}
                {activeTab === 'news' && 'Global Market News'}
              </h1>
              <p className="text-[11px] text-slate-400 font-normal leading-normal max-w-sm cursor-default">
                Welcome back, <span className="font-medium text-slate-600">{username.toLowerCase()}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={handleExportCSV}
                  className="h-8 px-3 bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Download size={13} className="shrink-0" />
                  <span>Export CSV</span>
                </button>
                <button 
                  onClick={() => setShareModalOpen(true)}
                  className="h-8 px-3 bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Share2 size={13} className="shrink-0" />
                  <span>Share Insights</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
                <button 
                  onClick={handleLogout} 
                  title="Logout" 
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  <LogOut size={15} />
                </button>

                <div className="flex items-center gap-2 bg-slate-100/80 p-1 pl-2.5 rounded-xl text-xs font-medium text-slate-800 cursor-default">
                  <span className="font-normal text-slate-700">{username.toLowerCase()}</span>
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-[11px] font-bold shadow-sm">
                    {username.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* HALAMAN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-4 gap-3 cursor-default">
                <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-sm">
                      <Wallet size={12} />
                    </div>
                    <span className="text-[9px] font-medium text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">12.4% ↗</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">Total Portfolio Value</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {totalNetWorth.toLocaleString('id-ID')}</h3>
                </div>

                <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-sm">
                      <Banknote size={12} />
                    </div>
                    <button onClick={() => handleOpenAdjust('cash')} className="text-slate-400 hover:text-slate-800 transition cursor-pointer">
                      <Sliders size={11} />
                    </button>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">Cash Balance</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {cashBalance.toLocaleString('id-ID')}</h3>
                </div>

                <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-cyan-500 text-white shadow-sm">
                      <Building2 size={12} />
                    </div>
                    <button onClick={() => handleOpenAdjust('bank')} className="text-slate-400 hover:text-slate-800 transition cursor-pointer">
                      <Sliders size={11} />
                    </button>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">Bank Balance</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {bankBalance.toLocaleString('id-ID')}</h3>
                </div>

                <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-rose-500 text-white shadow-sm">
                      <TrendingUp size={12} />
                    </div>
                    <button onClick={() => handleOpenAdjust('investment')} className="text-slate-400 hover:text-slate-800 transition cursor-pointer">
                      <Sliders size={11} />
                    </button>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">Investment</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {investmentBalance.toLocaleString('id-ID')}</h3>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 cursor-default">
                <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-xl">
                      <ShieldCheck size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-indigo-400 uppercase tracking-tight">Financial Health</p>
                      <p className={`text-xs font-bold ${health.color}`}>{health.label} ({health.score}/100)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium bg-white text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100">
                    Savings: {savingsRate}%
                  </span>
                </div>

                <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-xl">
                    <ArrowUpRight size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-tight">Monthly Income</p>
                    <p className="text-xs font-bold text-emerald-800">Rp {totalIncomeMonth.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center gap-2">
                  <div className="p-1.5 bg-rose-600 text-white rounded-xl">
                    <ArrowDownRight size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-rose-600 uppercase tracking-tight">Monthly Expenses</p>
                    <p className="text-xs font-bold text-rose-800">Rp {totalExpenseMonth.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111318] text-white p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Sparkles size={14} className="text-indigo-400 shrink-0 ml-1" />
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder='Type e.g. "KFC 45k" or "Set cash 500k"...'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-zinc-800/80 text-white px-3 py-1.5 rounded-xl text-xs font-normal focus:outline-none placeholder:text-zinc-500 cursor-text"
                  />
                  <label className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5">
                    <Upload size={12} />
                    <span>{selectedFile ? 'Receipt' : 'Image'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                    {loading ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />} Send
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <BudgetSection transactions={transactions} />
                  <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="flex justify-between items-center cursor-default">
                      <h3 className="font-semibold text-slate-900 text-xs">Asset Allocation</h3>
                      <select 
                        value={assetFilter}
                        onChange={(e: any) => setAssetFilter(e.target.value)}
                        className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="expense">Expenses</option>
                        <option value="income">Incomes</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    
                    {categoryChartData.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4 cursor-default">No data available for {assetFilter}.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-28 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={46}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {categoryChartData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`, 'Total']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="space-y-1 text-xs cursor-default">
                          {categoryChartData.slice(0, 3).map((item, idx) => (
                            <div key={item.name} className="flex justify-between items-center border-b border-slate-100 pb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                <span className="text-slate-600 font-medium truncate max-w-[80px]">{item.name}</span>
                              </div>
                              <span className="font-semibold text-slate-900">Rp {item.value.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <GoalsSection transactions={transactions} />
                </div>
              </div>
            </>
          )}

          {/* HALAMAN EXPENSE TRACKER */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="bg-[#111318] text-white p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Sparkles size={14} className="text-indigo-400 shrink-0 ml-1" />
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder='Type e.g. "Lunch 45k" or "Salary +5M"...'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-zinc-800/80 text-white px-3 py-1.5 rounded-xl text-xs font-normal focus:outline-none placeholder:text-zinc-500 cursor-text"
                  />
                  <label className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5">
                    <Upload size={12} />
                    <span>{selectedFile ? 'Receipt' : 'Image'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                    {loading ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />} Send
                  </button>
                </form>
              </div>

              <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 cursor-default">
                  <h3 className="font-bold text-xs text-slate-900">Transaction History</h3>
                  <button
                    onClick={() => setShowManualAdd(!showManualAdd)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={13} /> Add Manual
                  </button>
                </div>

                {showManualAdd && (
                  <form onSubmit={handleManualAddSubmit} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Title (e.g. Groceries)"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border rounded-xl cursor-text"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Amount (Rp)"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border rounded-xl cursor-text"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select value={manualType} onChange={(e: any) => setManualType(e.target.value)} className="px-2 py-1.5 bg-white border rounded-xl cursor-pointer">
                        <option value="expense">Expense (Decreases Balance)</option>
                        <option value="income">Income (Increases Balance)</option>
                      </select>
                      <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} className="px-2 py-1.5 bg-white border rounded-xl cursor-pointer">
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Adjustment/Transfer">Transfer / Non-Cashflow</option>
                        <option value="Other">Other</option>
                      </select>
                      <select value={manualAccount} onChange={(e: any) => setManualAccount(e.target.value)} className="px-2 py-1.5 bg-white border rounded-xl cursor-pointer">
                        <option value="bank">Bank</option>
                        <option value="cash">Cash</option>
                        <option value="investment">Investment</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button type="button" onClick={() => setShowManualAdd(false)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-semibold cursor-pointer">Cancel</button>
                      <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[10px] font-semibold cursor-pointer">Save Transaction</button>
                    </div>
                  </form>
                )}

                <div className="space-y-1.5">
                  {transactions.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-4 cursor-default">No transactions recorded yet.</p>
                  ) : (
                    transactions.map((t) => (
                      <div key={t.id} className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">{t.title}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{t.category || 'General'} • {t.account || 'bank'} • {t.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {t.type === 'income' ? '+' : '-'}Rp {Number(t.amount).toLocaleString('id-ID')}
                          </span>
                          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                            <button onClick={() => setEditingTransaction(t)} className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer" title="Edit">
                              <Edit3 size={13} />
                            </button>
                            <button onClick={() => setDeleteTargetId(t.id)} className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-center space-y-3 text-xs cursor-default">
              <Newspaper size={32} className="mx-auto text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">Global Market News API</h2>
              <p className="text-slate-400 max-w-sm mx-auto">
                Integrasi API berita pasar finansial global akan dihubungkan di sini untuk pemantauan saham & aset real-time.
              </p>
            </div>
          )}

        </main>

      </div>

      {/* Modals & Edit Transaction */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4.5 shadow-2xl space-y-3 border border-slate-100 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Edit3 size={14} className="text-indigo-600" /> Edit Transaction
              </h3>
              <button onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">Title</label>
                <input 
                  type="text" 
                  value={editingTransaction.title} 
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, title: e.target.value })} 
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none cursor-text" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Amount (Rp)</label>
                  <input 
                    type="number" 
                    value={editingTransaction.amount} 
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: Number(e.target.value) })} 
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none cursor-text" 
                    required 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Type</label>
                  <select 
                    value={editingTransaction.type} 
                    onChange={(e: any) => setEditingTransaction({ ...editingTransaction, type: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Category / Flow</label>
                  <select 
                    value={editingTransaction.category || 'Food & Beverage'} 
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Adjustment/Transfer">Transfer / Non-Cashflow</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Account</label>
                  <select 
                    value={editingTransaction.account || 'bank'} 
                    onChange={(e: any) => setEditingTransaction({ ...editingTransaction, account: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="investment">Investment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">Date</label>
                <input 
                  type="date" 
                  value={editingTransaction.date} 
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })} 
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none cursor-pointer" 
                  required 
                />
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEditingTransaction(null)} 
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}