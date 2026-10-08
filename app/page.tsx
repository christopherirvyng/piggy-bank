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
  Receipt,
  PiggyBank as PiggyBankIcon,
  Plus,
  CheckCircle2,
  Settings,
  Clock,
  ListTodo,
  PieChart as PieChartIcon,
  CheckSquare,
  Newspaper,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import BudgetSection from '@/components/budgetsection';
import GoalsSection from '@/components/goalssection';
import CalendarWidget from '@/components/calendarwidget';
import InvestmentsSection from '@/components/investmentssection';

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

interface FinancialTask {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  dueDate: string;
}

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
}

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  is_auto_track: boolean;
  monthly_contribution?: number;
  image_url?: string | null;
}

const INITIAL_TASKS: FinancialTask[] = [
  { id: '1', title: 'Set up Emergency Fund (3x Monthly Expenses)', category: 'Savings', completed: false, dueDate: 'End of Month' },
  { id: '2', title: 'Review and Pay Monthly Internet & Utility Bills', category: 'Bills', completed: true, dueDate: '15th Monthly' },
  { id: '3', title: 'Rebalance Investment Portfolio / Mutual Funds', category: 'Investments', completed: false, dueDate: 'Quarterly' },
  { id: '4', title: 'Check Active Health Insurance Policies & Limits', category: 'Protection', completed: false, dueDate: 'Annual' },
  { id: '5', title: 'Review Expense Tracker vs Monthly Budget Caps', category: 'Budgeting', completed: true, dueDate: 'Weekly' },
];

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'weekly' | 'monthly'>('monthly');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'investments' | 'tasks' | 'budgets' | 'goals' | 'news'>('dashboard');

  const [investmentMarketValue, setInvestmentMarketValue] = useState<number>(0);
  const [assetFilter, setAssetFilter] = useState<'expense' | 'all' | 'income'>('expense');
  const [currentTime, setCurrentTime] = useState('');

  // Task Checklist State
  const [tasks, setTasks] = useState<FinancialTask[]>(INITIAL_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Savings');

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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
    fetchBudgets();
    fetchGoals();
  };

  const fetchTransactions = async (userId?: string) => {
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (!error && data) setTransactions(data as Transaction[]);
  };

  const fetchBudgets = async () => {
    const { data } = await supabase.from('budgets').select('*');
    if (data) setBudgets(data);
  };

  const fetchGoals = async () => {
    const { data } = await supabase.from('financial_goals').select('*').order('created_at', { ascending: false });
    if (data) setGoals(data);
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

  // Task Handlers (Checklist)
  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: FinancialTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      category: newTaskCategory,
      completed: false,
      dueDate: 'Flexible',
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    showToast('Task added successfully!');
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

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

  const handleOpenAdjust = (accountType: 'cash' | 'bank' | 'investment') => {
    const currentBal = calculateAccountBalance(accountType);
    setAdjustModal({ open: true, account: accountType, currentBal });
  };

  const fetchInvestmentHoldings = async () => {
    const { data } = await supabase.from('investment_holdings').select('*');
    if (data) {
      const USD_TO_IDR = 15500; // Rate Konversi USD ke IDR

      const totalVal = data.reduce((acc, h) => {
        const isStock = h.type === 'stock';
        const shares = isStock ? (Number(h.lots || 0) * 100) : Number(h.shares || 0);
        const currentPrice = Number(h.current_price || 0);
        
        const rawValue = shares * currentPrice;
        // Konversi Crypto ($) ke Rupiah
        const valueInIDR = h.type === 'crypto' ? rawValue * USD_TO_IDR : rawValue;
        
        return acc + valueInIDR;
      }, 0);

      setInvestmentMarketValue(totalVal);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'investments') {
      fetchInvestmentHoldings();
    }
  }, [activeTab]);

  const investmentBalance = investmentMarketValue > 0 
    ? investmentMarketValue 
    : calculateAccountBalance('investment');

  const totalNetWorth = cashBalance + bankBalance + investmentBalance;


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
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + Number(b.monthly_limit), 0);
  const remainingBudgetTotal = totalBudgetLimit - totalExpenseMonth;

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

      {/* Main Container Box (570px Height) */}
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
                onClick={() => setActiveTab('investments')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'investments' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <TrendingUp size={14} /> Investment
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

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar space-y-3.5 pr-1">
          
          <header className="flex justify-between items-center pt-0.5">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 cursor-default">
                {activeTab === 'dashboard' && 'Financial Management'}
                {activeTab === 'expenses' && 'Expense Tracker'}
                {activeTab === 'tasks' && 'Financial Task Checklist'}
                {activeTab === 'budgets' && 'Monthly Budget Control'}
                {activeTab === 'goals' && 'Financial Goals'}
                {activeTab === 'investments' && 'Investment Management'}
                {activeTab === 'news' && 'Global Market News'}
              </h1>
              <p className="text-xs text-slate-400 font-normal leading-normal max-w-sm cursor-default">
                Welcome back, <span className="font-semibold text-slate-600">{username.toLowerCase()}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportCSV}
                className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
              >
                <Download size={13} className="shrink-0" />
                <span>Export CSV</span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button onClick={handleLogout} title="Logout" className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer">
                  <LogOut size={16} />
                </button>

                <div className="flex items-center gap-2 bg-slate-100/90 p-1 pl-2.5 rounded-xl text-xs font-medium text-slate-800 cursor-default">
                  <span className="font-medium text-slate-700">{username.toLowerCase()}</span>
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                    {username.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-4 gap-3 cursor-default">
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-sm"><Wallet size={13} /></div>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Total Portfolio</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {totalNetWorth.toLocaleString('id-ID')}</h3>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-sm"><Banknote size={13} /></div>
                    <button onClick={() => handleOpenAdjust('cash')} className="text-slate-400 hover:text-slate-800 transition cursor-pointer"><Sliders size={12} /></button>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Cash Balance</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {cashBalance.toLocaleString('id-ID')}</h3>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-cyan-500 text-white shadow-sm"><Building2 size={13} /></div>
                    <button onClick={() => handleOpenAdjust('bank')} className="text-slate-400 hover:text-slate-800 transition cursor-pointer"><Sliders size={12} /></button>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Bank Balance</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {bankBalance.toLocaleString('id-ID')}</h3>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="p-1.5 rounded-xl bg-rose-500 text-white shadow-sm"><TrendingUp size={13} /></div>
                    <button onClick={() => handleOpenAdjust('investment')} className="text-slate-400 hover:text-slate-800 transition cursor-pointer"><Sliders size={12} /></button>
                  </div>
                  <p className="text-xs font-medium text-slate-400">Investment</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Rp {investmentBalance.toLocaleString('id-ID')}</h3>
                </div>
              </div>

              {/* FINANCIAL HEALTH & CASHFLOW BAR */}
              <div className="grid grid-cols-3 gap-3 cursor-default">
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <ShieldCheck size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-tight">Financial Health</p>
                      <p className={`text-xs font-bold ${health.color}`}>{health.label} ({health.score}/100)</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-white text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                    {savingsRate}%
                  </span>
                </div>

                <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <ArrowUpRight size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tight">Monthly Income</p>
                    <p className="text-xs font-bold text-emerald-900">Rp {totalIncomeMonth.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-2xl flex items-center gap-2.5">
                  <div className="p-2 bg-rose-600 text-white rounded-xl">
                    <ArrowDownRight size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-tight">Monthly Expenses</p>
                    <p className="text-xs font-bold text-rose-900">Rp {totalExpenseMonth.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>

              {/* AI PARSER BAR */}
              <div className="bg-[#111318] text-white p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Sparkles size={15} className="text-indigo-400 shrink-0 ml-1" />
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder='Type e.g. "KFC 45k" or "Set cash 500k"...'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-zinc-800/80 text-white px-3 py-1.5 rounded-xl text-xs font-normal focus:outline-none placeholder:text-zinc-500 cursor-text"
                  />
                  <label className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5">
                    <Upload size={13} />
                    <span>{selectedFile ? 'Receipt' : 'Image'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                    {loading ? <Loader2 className="animate-spin" size={13} /> : <Send size={13} />} Send
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-12 gap-3.5">
                <div className="col-span-7 space-y-3.5">
                  <BudgetSection transactions={transactions} />
                  <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />
                </div>

                <div className="col-span-5 space-y-3.5">
                  {/* ASSET ALLOCATION (PIE CHART) */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                    <div className="flex justify-between items-center cursor-default pb-1 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-900 text-xs">Asset Allocation</h3>
                      <select 
                        value={assetFilter}
                        onChange={(e: any) => setAssetFilter(e.target.value)}
                        className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="expense">Expenses</option>
                        <option value="income">Incomes</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    
                    {categoryChartData.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4 cursor-default">No data available for {assetFilter}.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-24 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={26}
                                outerRadius={40}
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
                            <div key={item.name} className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                <span className="text-slate-600 font-medium truncate max-w-[90px]">{item.name}</span>
                              </div>
                              <span className="font-semibold text-slate-900">Rp {item.value.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GOALS SECTION WIDGET */}
                  <GoalsSection transactions={transactions} onRefresh={fetchGoals} />
                </div>
              </div>
            </div>
          )}

          {/* TAB BUDGETS */}
          {activeTab === 'budgets' && (
            <div className="space-y-3.5 cursor-default">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-400">Total Monthly Budget</p>
                  <h3 className="text-base font-bold text-slate-900">Rp {totalBudgetLimit.toLocaleString('id-ID')}</h3>
                  <p className="text-[10px] text-slate-400">{budgets.length} Category Caps Set</p>
                </div>

                <div className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-400">Total Spent This Month</p>
                  <h3 className="text-base font-bold text-slate-900">Rp {totalExpenseMonth.toLocaleString('id-ID')}</h3>
                  <p className="text-[10px] text-slate-400">
                    {totalBudgetLimit > 0 ? `${Math.round((totalExpenseMonth / totalBudgetLimit) * 100)}% of Limit` : '0%'}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-400">Remaining Budget Buffer</p>
                  <h3 className={`text-base font-bold ${remainingBudgetTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Rp {remainingBudgetTotal.toLocaleString('id-ID')}
                  </h3>
                  <p className="text-[10px] text-slate-400">{remainingBudgetTotal >= 0 ? 'Safe Financial Zone' : 'Budget Deficit Warning'}</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3.5">
                <div className="col-span-7">
                  <BudgetSection transactions={transactions} />
                </div>

                <div className="col-span-5 space-y-3.5">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
                    <h3 className="font-bold text-xs text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <PieChartIcon size={14} className="text-indigo-600" /> Spending Insights
                    </h3>

                    {budgets.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Add budgets to unlock category insights.</p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {budgets.map((b) => {
                          const spent = transactions
                            .filter(t => t.type === 'expense' && t.category?.toLowerCase() === b.category.toLowerCase())
                            .reduce((sum, t) => sum + Number(t.amount), 0);
                          const pct = Math.min(Math.round((spent / b.monthly_limit) * 100), 100);

                          return (
                            <div key={b.id} className="space-y-1 border-b border-slate-100 pb-1.5">
                              <div className="flex justify-between font-medium">
                                <span className="text-slate-700">{b.category}</span>
                                <span className={pct >= 90 ? 'text-rose-600 font-bold' : 'text-slate-800'}>{pct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-indigo-600'}`} 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB GOALS */}
          {activeTab === 'goals' && (
            <div className="space-y-3.5 font-sans cursor-default">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-400">Total Goals Target</p>
                  <h3 className="text-base font-bold text-slate-900">
                    Rp {goals.reduce((acc, g) => acc + Number(g.target_amount), 0).toLocaleString('id-ID')}
                  </h3>
                  <p className="text-[10px] text-slate-400">{goals.length} Financial Targets Active</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-400">Total Progress Saved</p>
                  <h3 className="text-base font-bold text-purple-600">
                    Rp {goals.reduce((acc, g) => acc + (g.is_auto_track ? totalNetWorth : Number(g.current_amount)), 0).toLocaleString('id-ID')}
                  </h3>
                  <p className="text-[10px] text-slate-400">Combined Goal Savings</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-400">Remaining Gap</p>
                  <h3 className="text-base font-bold text-amber-600">
                    Rp {Math.max(0, goals.reduce((acc, g) => acc + Number(g.target_amount), 0) - goals.reduce((acc, g) => acc + (g.is_auto_track ? totalNetWorth : Number(g.current_amount)), 0)).toLocaleString('id-ID')}
                  </h3>
                  <p className="text-[10px] text-slate-400">Target Deficiency</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3.5">
                <div className="col-span-7">
                  <GoalsSection transactions={transactions} onRefresh={fetchGoals} />
                </div>

                <div className="col-span-5 space-y-3.5">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
                    <h3 className="font-bold text-xs text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <Target size={14} className="text-purple-600" /> Goal Completion Projections
                    </h3>

                    {goals.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Add a goal to view time projections.</p>
                    ) : (
                      <div className="space-y-2.5 text-xs">
                        {goals.map((g) => {
                          const currentVal = g.is_auto_track ? totalNetWorth : Number(g.current_amount);
                          const remaining = Math.max(0, g.target_amount - currentVal);
                          const monthlyAlloc = Number(g.monthly_contribution) || 500000;
                          const monthsLeft = monthlyAlloc > 0 ? Math.ceil(remaining / monthlyAlloc) : 'N/A';

                          return (
                            <div key={g.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                              <div className="flex justify-between items-center font-bold text-slate-800">
                                <span>{g.title}</span>
                                <span className="text-purple-600 text-[11px]">{monthsLeft} Mos Est.</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Saving <strong className="text-slate-700">Rp {monthlyAlloc.toLocaleString('id-ID')}/mo</strong> to reach full target.
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB TASKS / CHECKLIST */}
          {activeTab === 'tasks' && (
            <div className="space-y-3.5 font-sans">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ListTodo size={18} className="text-indigo-600" />
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
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
                  >
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
                      <button onClick={() => toggleTask(task.id)} className={`w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer ${task.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-slate-50 hover:border-indigo-500'}`}>
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
                    <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-3.5">
              <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 cursor-default">
                  <h3 className="font-bold text-xs text-slate-900">Transaction History</h3>
                  <button onClick={() => setShowManualAdd(!showManualAdd)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer">
                    <Plus size={13} /> Add Manual
                  </button>
                </div>

                {showManualAdd && (
                  <form onSubmit={handleManualAddSubmit} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl" required />
                      <input type="number" placeholder="Amount (Rp)" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl" required />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button type="button" onClick={() => setShowManualAdd(false)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer">Cancel</button>
                      <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer">Save Transaction</button>
                    </div>
                  </form>
                )}

                <div className="space-y-1.5">
                  {transactions.map((t) => (
                    <div key={t.id} className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{t.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{t.category || 'General'} • {t.account || 'bank'} • {t.date}</p>
                      </div>
                      <span className={`font-bold text-xs ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {t.type === 'income' ? '+' : '-'}Rp {Number(t.amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'investments' && (
            <InvestmentsSection />
          )}

          {/* TAB NEWS */}
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
    </div>
  );
}