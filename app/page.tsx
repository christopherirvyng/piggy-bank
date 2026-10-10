'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DesktopView from '@/components/desktop/DesktopView';
import MobileView from '@/components/mobile/MobileView';

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
  { id: '1', title: 'Set up Emergency Fund', category: 'Savings', completed: false, dueDate: 'End of Month' },
  { id: '2', title: 'Review Internet & Utility Bills', category: 'Bills', completed: true, dueDate: '15th Monthly' },
];

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6'];

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'investments' | 'tasks' | 'budgets' | 'goals' | 'news'>('dashboard');
  
  const [hiddenBalances, setHiddenBalances] = useState<{ [key: string]: boolean }>({
    portfolio: false,
    cash: false,
    bank: false,
    investment: false,
  });

  const [investmentMarketValue, setInvestmentMarketValue] = useState<number>(0);
  const [assetFilter, setAssetFilter] = useState<'expense' | 'all' | 'income'>('expense');
  const [currentTime, setCurrentTime] = useState('');

  const [tasks, setTasks] = useState<FinancialTask[]>(INITIAL_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Savings');

  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  const [adjustModal, setAdjustModal] = useState<{
    open: boolean;
    account: 'cash' | 'bank' | 'investment';
    currentBal: number;
  }>({
    open: false,
    account: 'bank',
    currentBal: 0,
  });

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
    setTimeout(() => setToastMessage(null), 3500);
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

  const formatAmount = (val: number, key?: string) => {
    if (key && hiddenBalances[key]) return 'Rp ••••••••';
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const toggleHideBalance = (key: string) => {
    setHiddenBalances((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateAccountBalance = (accountType: 'cash' | 'bank' | 'investment') => {
    return transactions
      .filter((t) => (t.account || 'bank') === accountType)
      .reduce((acc, curr) => (curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount)), 0);
  };

  const cashBalance = calculateAccountBalance('cash');
  const bankBalance = calculateAccountBalance('bank');

  const fetchInvestmentHoldings = async () => {
    const { data } = await supabase.from('investment_holdings').select('*');
    if (data) {
      const USD_TO_IDR = 15500;
      const totalVal = data.reduce((acc, h) => {
        const isStock = h.type === 'stock';
        const shares = isStock ? Number(h.lots || 0) * 100 : Number(h.shares || 0);
        const currentPrice = Number(h.current_price || 0);
        const rawValue = shares * currentPrice;
        return acc + (h.type === 'crypto' ? rawValue * USD_TO_IDR : rawValue);
      }, 0);
      setInvestmentMarketValue(totalVal);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'investments') {
      fetchInvestmentHoldings();
    }
  }, [activeTab]);

  const investmentBalance = investmentMarketValue > 0 ? investmentMarketValue : calculateAccountBalance('investment');
  const totalNetWorth = cashBalance + bankBalance + investmentBalance;

  const totalIncomeMonth = transactions
    .filter((t) => t.type === 'income' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExpenseMonth = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const savingsRate = totalIncomeMonth > 0 ? Math.max(0, Math.round(((totalIncomeMonth - totalExpenseMonth) / totalIncomeMonth) * 100)) : 0;

  const getHealthScore = () => {
    if (savingsRate >= 30) return { score: 92, label: 'Excellent', color: 'text-emerald-600' };
    if (savingsRate >= 15) return { score: 78, label: 'Healthy', color: 'text-indigo-600' };
    return { score: 60, label: 'Fair', color: 'text-amber-600' };
  };

  const health = getHealthScore();

  // FUNGSI HANDLE SUBMIT REAL
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (res.ok) {
        setInput('');
        setSelectedFile(null);
        fetchTransactions(session.user.id);
        showToast('Transaction added via AI!');
      } else {
        alert('Failed to process AI transaction.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      setToastMessage("Tidak ada transaksi untuk diexport.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const headers = ['ID', 'Title', 'Amount', 'Type', 'Category', 'Account', 'Date'];
    const csvRows = [headers.join(',')];

    transactions.forEach((t) => {
      const row = [
        `"${t.id}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        t.amount,
        t.type,
        `"${t.category || 'General'}"`,
        `"${t.account || 'bank'}"`,
        `"${t.date}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transactions exported to CSV!');
    setToastMessage("Berhasil mendownload laporan CSV!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdjust = (account: 'cash' | 'bank' | 'investment') => {
    let currentBal = cashBalance;
    if (account === 'bank') currentBal = bankBalance;
    if (account === 'investment') currentBal = investmentBalance;

    setAdjustModal({
      open: true,
      account,
      currentBal,
    });
  };

  const categoryChartData = Object.values(
    transactions.reduce((acc: { [key: string]: { name: string; value: number; type: 'income' | 'expense' } }, curr) => {
      const rawType = (curr.type || '').toLowerCase();
      const type: 'income' | 'expense' = rawType === 'income' ? 'income' : 'expense';

      const categoryName = curr.category || (type === 'income' ? 'Salary / Income' : 'General');
      const key = `${categoryName.toLowerCase()}_${type}`;

      if (!acc[key]) {
        acc[key] = {
          name: categoryName,
          value: 0,
          type: type,
        };
      }
      acc[key].value += Number(curr.amount || 0);
      return acc;
    }, {})
  );

  const username = userEmail?.split('@')[0] || 'christopherirvyng';
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + Number(b.monthly_limit), 0);
  const remainingBudgetTotal = totalBudgetLimit - totalExpenseMonth;

  return (
    <>
      <MobileView
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        username={username}
        onLogout={handleLogout}
        hideBalance={false}
        setHideBalance={() => {}}
        totalNetWorth={totalNetWorth}
        cashBalance={cashBalance}
        bankBalance={bankBalance}
        investmentBalance={investmentBalance}
        formatAmount={formatAmount}
        transactions={transactions}
        fetchTransactions={() => fetchTransactions()}
        fetchGoals={() => fetchGoals()}
        fetchInvestmentHoldings={() => fetchInvestmentHoldings()}
        input={input}
        setInput={setInput}
        loading={loading}
        handleSubmit={handleSubmit}
        showManualAdd={showManualAdd}
        setShowManualAdd={setShowManualAdd}
        manualTitle={manualTitle}
        setManualTitle={setManualTitle}
        manualAmount={manualAmount}
        setManualAmount={setManualAmount}
        manualAccount="bank"
        setManualAccount={() => {}}
        handleManualAddSubmit={() => {}}
      />

      <DesktopView
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        username={username}
        currentTime={currentTime}
        toastMessage={toastMessage}
        handleExportCSV={handleExportCSV}
        handleLogout={handleLogout}
        totalNetWorth={totalNetWorth}
        cashBalance={cashBalance}
        bankBalance={bankBalance}
        investmentBalance={investmentBalance}
        formatAmount={formatAmount}
        hiddenBalances={hiddenBalances}
        toggleHideBalance={toggleHideBalance}
        handleOpenAdjust={handleOpenAdjust}
        health={health}
        savingsRate={savingsRate}
        totalIncomeMonth={totalIncomeMonth}
        totalExpenseMonth={totalExpenseMonth}
        input={input}
        setInput={setInput}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        loading={loading}
        handleSubmit={handleSubmit}
        transactions={transactions}
        fetchTransactions={() => fetchTransactions()}
        fetchGoals={() => fetchGoals()}
        fetchInvestmentHoldings={() => fetchInvestmentHoldings()}
        assetFilter={assetFilter}
        setAssetFilter={setAssetFilter}
        categoryChartData={categoryChartData}
        COLORS={COLORS}
        budgets={budgets}
        remainingBudgetTotal={remainingBudgetTotal}
        totalBudgetLimit={totalBudgetLimit}
        goals={goals}
        tasks={tasks}
        completedTasksCount={tasks.filter((t) => t.completed).length}
        taskProgress={tasks.length > 0 ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100) : 0}
        addTask={() => {}}
        newTaskTitle={newTaskTitle}
        setNewTaskTitle={setNewTaskTitle}
        newTaskCategory={newTaskCategory}
        setNewTaskCategory={setNewTaskCategory}
        toggleTask={(id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))}
        deleteTask={(id) => setTasks(tasks.filter((t) => t.id !== id))}
        showManualAdd={showManualAdd}
        setShowManualAdd={setShowManualAdd}
        manualTitle={manualTitle}
        setManualTitle={setManualTitle}
        manualAmount={manualAmount}
        setManualAmount={setManualAmount}
        handleManualAddSubmit={() => {}}
        adjustModal={adjustModal}
        setAdjustModal={setAdjustModal}
      />
    </>
  );
}