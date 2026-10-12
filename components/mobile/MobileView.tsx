'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Banknote,
  Building2,
  TrendingUp,
  SlidersHorizontal,
  Eye,
  EyeOff,
  PiggyBank,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Calendar,
  Trash2,
  X,
  CreditCard,
  Tag,
  Wallet,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import MobileBottomNav from './mbotnav';
import MobileCalendarWidget from './mcalendarwidget';

interface MobileViewProps {
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  username?: string;
  totalNetWorth?: number;
  cashBalance?: number;
  bankBalance?: number;
  investmentBalance?: number;
  formatAmount?: (val: number, key?: string) => string;
  hiddenBalances?: { [key: string]: boolean };
  toggleHideBalance?: (key: string) => void;
  handleOpenAdjust?: (acc: 'cash' | 'bank' | 'investment') => void;
  totalIncomeMonth?: number;
  totalExpenseMonth?: number;
  transactions?: any[];
  recurringList?: any[];
  categoryChartData?: any[];
  COLORS?: string[];
  budgets?: any[];
  goals?: any[];
  fetchGoals?: () => void;
  fetchInvestmentHoldings?: () => void;
  fetchTransactions?: () => void;
  adjustModal?: any;
  setAdjustModal?: (val: any) => void;
}

const LANDSCAPE =
  'https://api.builder.io/api/v1/image/assets/TEMP/8bf677f0fa7b004d7026e056705c5ed04c3862fe?width=880';

const card =
  'rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(26,26,46,0.07)]';

// Standardized Categories (Aligned with DesktopView & Database)
const EXPENSE_CATEGORIES = [
  'Food & Drinks',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Investment',
  'Others',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Bonus',
  'Investment',
  'Others',
];

function SectionHeading({ title, action, onAction }: { title: string; action: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[19px] font-bold text-[#12112A]">{title}</h2>
      <button
        suppressHydrationWarning
        onClick={onAction}
        className="flex items-center gap-1 text-xs font-bold text-[#6366F1] cursor-pointer hover:underline"
      >
        {action}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default function MobileView(props: MobileViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Transaction Modal State
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [txCategory, setTxCategory] = useState('Food & Drinks');
  const [txAccount, setTxAccount] = useState<'cash' | 'bank' | 'investment'>('bank');
  const [txToAccount, setTxToAccount] = useState<'cash' | 'bank' | 'investment'>('cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync Default Category when Transaction Type Changes
  useEffect(() => {
    if (txType === 'expense') setTxCategory('Food & Drinks');
    else if (txType === 'income') setTxCategory('Salary');
    else setTxCategory('Transfer');
  }, [txType]);

  const {
    activeTab = 'dashboard',
    setActiveTab = () => {},
    username = '',
    totalNetWorth = 0,
    cashBalance = 0,
    bankBalance = 0,
    investmentBalance = 0,
    formatAmount = (val: number) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`,
    hiddenBalances = {},
    toggleHideBalance = () => {},
    handleOpenAdjust = () => {},
    totalIncomeMonth = 0,
    totalExpenseMonth = 0,
    transactions = [],
    recurringList = [],
    categoryChartData = [],
    COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#06B6D4'],
    budgets = [],
    goals = [],
    fetchGoals = () => {},
    fetchTransactions = () => {},
  } = props || {};

  const netCashflow = totalIncomeMonth - totalExpenseMonth;
  const currentMonthName = mounted
    ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const currentMonthShort = mounted
    ? new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  const filteredChartData = categoryChartData.filter(
    (item) => (item.type || 'expense').toLowerCase() === 'expense'
  );
  const totalCategoryAmount = filteredChartData.reduce((acc, item) => acc + item.value, 0);

  const processedTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesMonth = t.date ? t.date.startsWith(selectedMonth) : true;

    return matchesSearch && matchesType && matchesMonth;
  });

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount) return;
    setIsSubmittingTx(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const todayStr = new Date().toISOString().split('T')[0];

      let titleToSave = txTitle.trim();
      let categoryToSave = txCategory;

      if (txType === 'transfer') {
        categoryToSave = 'Transfer';
        if (!titleToSave) {
          titleToSave = `Transfer: ${txAccount.toUpperCase()} ➔ ${txToAccount.toUpperCase()}`;
        }
      } else {
        if (!titleToSave) {
          titleToSave = txCategory;
        }
      }

      const { error } = await supabase.from('transactions').insert([
        {
          user_id: session.user.id,
          title: titleToSave,
          amount: Number(txAmount),
          type: txType,
          category: categoryToSave,
          account: txAccount,
          to_account: txType === 'transfer' ? txToAccount : null,
          date: todayStr,
        },
      ]);

      if (!error) {
        setTxTitle('');
        setTxAmount('');
        setShowAddTxModal(false);
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) fetchTransactions();
  };

  return (
    <div className="min-h-full bg-[#FFFCF9] sm:py-6 md:hidden font-sans select-none cursor-default antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col overflow-hidden bg-[#FFFCF9] sm:min-h-0 sm:rounded-[40px] sm:shadow-xl">

        {/* HERO LANDSCAPE HEADER */}
        <div className="relative h-[220px] shrink-0">
          <img src={LANDSCAPE} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-black/50 via-black/30 to-transparent" />
          <div className="relative flex flex-col gap-4 px-6 pt-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[7px] text-[15px] font-bold text-white">
                <PiggyBank size={21} strokeWidth={1.5} />
                Piggy Bank
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border border-white/25 bg-[#2D1F6E] text-[17px] font-bold text-white uppercase">
                {username ? username.charAt(0) : 'C'}
              </div>
            </div>
            <div className="flex flex-col gap-[3px] bg-gradient-to-b from-transparent to-black/70 pt-2 text-white">
              <span className="text-[12px] font-medium">Welcome back, {username ? username.toLowerCase() : 'user'}</span>
              <h1 className="text-[24px] font-bold leading-[1.15]">
                {activeTab === 'dashboard' && 'Your money, at a glance.'}
                {activeTab === 'expenses' && 'Transactions & Cashflow'}
                {activeTab === 'investments' && 'Investment Portfolio'}
              </h1>
            </div>
          </div>
        </div>

        {/* MAIN DASHBOARD CONTENT */}
        <main className="relative -mt-8 flex flex-col gap-6 rounded-t-[36px] bg-white p-5 pb-28">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {/* BALANCES */}
              <section className="flex flex-col gap-3">
                <div className={`${card} flex flex-col gap-[13px] p-5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#6B7280]">Total balance</span>
                    <button
                      suppressHydrationWarning
                      onClick={() => toggleHideBalance('portfolio')}
                      className="text-[#6B7280] hover:text-slate-900 transition cursor-pointer"
                    >
                      {hiddenBalances?.portfolio ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <span className="text-4xl font-bold text-[#12112A]">
                    {formatAmount(totalNetWorth, 'portfolio')}
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <span className="size-[5px] rounded-full bg-[#6B7280]" />
                    Cash, bank & investments in one place
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className={`${card} flex min-w-0 flex-1 flex-col gap-2.5 !rounded-[18px] p-3.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex size-[30px] items-center justify-center rounded-[10px] bg-[#EEF2FF] text-[#CA8A04]">
                        <Banknote size={16} strokeWidth={1.5} />
                      </div>
                      <div className="flex gap-1.5 text-[#888899]">
                        <button
                          suppressHydrationWarning
                          onClick={() => handleOpenAdjust('cash')}
                          className="flex size-[26px] items-center justify-center rounded-lg bg-[#F4F4F8] hover:bg-slate-200 cursor-pointer"
                        >
                          <SlidersHorizontal size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          suppressHydrationWarning
                          onClick={() => toggleHideBalance('cash')}
                          className="flex size-[26px] items-center justify-center rounded-lg bg-[#F4F4F8] hover:bg-slate-200 cursor-pointer"
                        >
                          {hiddenBalances?.cash ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      <span className="text-[11px] text-[#6B7280]">Total cash</span>
                      <span className="text-sm font-bold text-[#12112A]">{formatAmount(cashBalance, 'cash')}</span>
                    </div>
                  </div>

                  <div className={`${card} flex min-w-0 flex-1 flex-col gap-2.5 !rounded-[18px] p-3.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex size-[30px] items-center justify-center rounded-[10px] bg-[#E8F7EF] text-[#16A34A]">
                        <Building2 size={16} strokeWidth={1.5} />
                      </div>
                      <div className="flex gap-1.5 text-[#888899]">
                        <button
                          suppressHydrationWarning
                          onClick={() => handleOpenAdjust('bank')}
                          className="flex size-[26px] items-center justify-center rounded-lg bg-[#F4F4F8] hover:bg-slate-200 cursor-pointer"
                        >
                          <SlidersHorizontal size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          suppressHydrationWarning
                          onClick={() => toggleHideBalance('bank')}
                          className="flex size-[26px] items-center justify-center rounded-lg bg-[#F4F4F8] hover:bg-slate-200 cursor-pointer"
                        >
                          {hiddenBalances?.bank ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      <span className="text-[11px] text-[#6B7280]">Total bank</span>
                      <span className="text-sm font-bold text-[#12112A]">{formatAmount(bankBalance, 'bank')}</span>
                    </div>
                  </div>

                  <div className={`${card} flex min-w-0 flex-1 flex-col gap-2.5 !rounded-[18px] p-3.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex size-[30px] items-center justify-center rounded-[10px] bg-[#EEF2FF] text-[#6366F1]">
                        <TrendingUp size={16} strokeWidth={1.5} />
                      </div>
                      <div className="flex gap-1.5 text-[#888899]">
                        <button
                          suppressHydrationWarning
                          onClick={() => handleOpenAdjust('investment')}
                          className="flex size-[26px] items-center justify-center rounded-lg bg-[#F4F4F8] hover:bg-slate-200 cursor-pointer"
                        >
                          <SlidersHorizontal size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          suppressHydrationWarning
                          onClick={() => toggleHideBalance('investment')}
                          className="flex size-[26px] items-center justify-center rounded-lg bg-[#F4F4F8] hover:bg-slate-200 cursor-pointer"
                        >
                          {hiddenBalances?.investment ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      <span className="text-[11px] text-[#6B7280]">Total investment</span>
                      <span className="text-sm font-bold text-[#12112A]">{formatAmount(investmentBalance, 'investment')}</span>
                    </div>
                  </div>
                </div>

                <div className={`${card} flex flex-col gap-3.5 p-[18px]`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#6B7280]">{currentMonthShort} cashflow</span>
                    <span className={`text-base font-bold ${netCashflow >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {netCashflow >= 0 ? '+' : ''}{formatAmount(netCashflow)}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-1 items-center gap-2">
                      <ArrowDownLeft size={17} strokeWidth={1.5} className="text-[#16A34A]" />
                      <div className="flex flex-col gap-[3px]">
                        <span className="text-[10px] text-[#6B7280]">Income</span>
                        <span className="text-[13px] font-bold text-[#12112A]">{formatAmount(totalIncomeMonth)}</span>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <ArrowUpRight size={17} strokeWidth={1.5} className="text-[#DC2626]" />
                      <div className="flex flex-col gap-[3px]">
                        <span className="text-[10px] text-[#6B7280]">Expenses</span>
                        <span className="text-[13px] font-bold text-[#12112A]">{formatAmount(totalExpenseMonth)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* EXPENSE BREAKDOWN */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[19px] font-bold text-[#12112A]">Expense breakdown</h2>
                  <span className="text-xs font-medium text-[#888899]">{currentMonthName}</span>
                </div>

                <div className={`${card} flex flex-col gap-4 p-[18px]`}>
                  <div className="flex items-center gap-4">
                    <div className="relative size-[130px] shrink-0 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredChartData.length > 0 ? filteredChartData : [{ name: 'Empty', value: 1 }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {filteredChartData.map((_, i) => (
                              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`, 'Total']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[9px] text-[#6B7280] font-medium">Total</span>
                        <span className="text-[11px] font-bold text-[#111827]">
                          Rp {(totalCategoryAmount / 1_000_000).toFixed(2)}M
                        </span>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-[7px] max-h-[130px] overflow-y-auto custom-scrollbar pr-1">
                      {filteredChartData.length === 0 ? (
                        <p className="text-xs text-slate-400">No expenses recorded</p>
                      ) : (
                        filteredChartData.map((item, i) => {
                          const pct = totalCategoryAmount > 0 ? Math.round((item.value / totalCategoryAmount) * 100) : 0;
                          const color = COLORS[i % COLORS.length];

                          return (
                            <div key={item.name} className="flex items-center gap-2">
                              <span className="size-2 shrink-0 rounded-[2px]" style={{ background: color }} />
                              <div className="flex flex-1 justify-between gap-2 text-[11px]">
                                <span className="text-[#444457] truncate">{item.name}</span>
                                <span className="font-bold shrink-0" style={{ color }}>{pct}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-[#E5E7EB]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">Total expenses this month</span>
                    <span className="text-[13px] font-bold text-[#DC2626]">
                      Rp {totalExpenseMonth.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </section>

              {/* MONTHLY BUDGET & FINANCIAL GOALS REDIRECTS */}
              <section className="flex flex-col gap-3">
                <SectionHeading title="Monthly budget" action="Manage" onAction={() => router.push('/budgets')} />
                <div className={`${card} p-4 flex justify-between items-center cursor-pointer`} onClick={() => router.push('/budgets')}>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center">
                      <PiggyBank size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#12112A]">Budget Allocations</h4>
                      <p className="text-xs text-[#6B7280] font-medium">{budgets.length} active categories</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#9CA3AF]" />
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <SectionHeading title="Savings goals" action="Manage" onAction={() => router.push('/goals')} />
                <div className={`${card} p-4 flex justify-between items-center cursor-pointer`} onClick={() => router.push('/goals')}>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-[#F3E8FF] text-[#8B5CF6] flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#12112A]">Savings & Financial Goals</h4>
                      <p className="text-xs text-[#6B7280] font-medium">{goals.length} registered goals</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#9CA3AF]" />
                </div>
              </section>

              {/* RECENT TRANSACTIONS SHORTCUT */}
              <section className="flex flex-col gap-3">
                <SectionHeading title="Transaction History" action="View All" onAction={() => setActiveTab('expenses')} />
                <div className={`${card} flex flex-col gap-3 p-4`}>
                  {transactions.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF] text-center py-2">No transactions recorded.</p>
                  ) : (
                    transactions.slice(0, 5).map((t: any) => (
                      <div key={t.id || t.title} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                            t.type === 'income' ? 'bg-[#E8F7EF] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}>
                            {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#12112A] truncate">{t.title}</p>
                            <p className="text-[10px] text-[#6B7280] font-medium mt-0.5">
                              {t.category || 'Others'} • {t.date}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold shrink-0 ${t.type === 'income' ? 'text-[#16A34A]' : 'text-[#12112A]'}`}>
                          {t.type === 'income' ? '+' : '-'}Rp {Number(t.amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

          {/* TAB 2: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-4 pt-1">

              {/* TOP ACTION & CALENDAR WIDGET */}
              <div className="flex justify-between items-center px-1">
                <h2 className="text-lg font-bold text-[#12112A]">Activity & Transactions</h2>
                <button
                  onClick={() => setShowAddTxModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#6366F1] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add</span>
                </button>
              </div>

              {/* MOBILE CALENDAR WIDGET */}
              <MobileCalendarWidget
                transactions={transactions}
                recurringList={recurringList}
                onRefresh={fetchTransactions}
              />

              {/* SEARCH & FILTER BAR */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-3 text-[#9CA3AF]" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-2xl text-xs font-semibold text-[#12112A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-2xl border border-[#E5E7EB]">
                    <Calendar size={14} className="text-[#6366F1]" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="text-xs font-bold text-[#12112A] bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'expense', label: 'Expenses' },
                    { id: 'income', label: 'Incomes' },
                    { id: 'transfer', label: 'Transfer' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        filterType === f.id
                          ? 'bg-[#12112A] text-white'
                          : 'bg-white text-[#6B7280] border border-[#E5E7EB]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FULL TRANSACTION LIST */}
              <div className={`${card} p-4 space-y-3`}>
                <div className="flex justify-between items-center border-b border-[#F3F4F6] pb-2">
                  <h3 className="text-xs font-bold text-[#12112A] uppercase tracking-wider">
                    Transaction List ({processedTransactions.length})
                  </h3>
                  <span className="text-[11px] font-bold text-[#6B7280]">
                    {selectedMonth}
                  </span>
                </div>

                <div className="space-y-3">
                  {processedTransactions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#9CA3AF] space-y-1">
                      <p className="font-semibold">No transactions found.</p>
                      <p className="text-[11px]">Try changing filters or record a new transaction.</p>
                    </div>
                  ) : (
                    processedTransactions.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-xs pb-2.5 border-b border-[#F9FAFB] last:border-0 last:pb-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                            t.type === 'income' ? 'bg-[#E8F7EF] text-[#16A34A]' : t.type === 'expense' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#EEF2FF] text-[#6366F1]'
                          }`}>
                            {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#12112A] truncate">{t.title}</p>
                            <p className="text-[10px] text-[#6B7280] font-medium mt-0.5">
                              {t.category || 'Others'} • {t.account?.toUpperCase() || 'BANK'} • {t.date}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-bold text-xs ${t.type === 'income' ? 'text-[#16A34A]' : 'text-[#12112A]'}`}>
                            {t.type === 'income' ? '+' : '-'}Rp {Number(t.amount).toLocaleString('id-ID')}
                          </span>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-[#9CA3AF] hover:text-[#DC2626] p-1 rounded-lg transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MODAL RECORD TRANSACTION WITH PILL SELECTION CUSTOM */}
              {showAddTxModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                  <div className="bg-white rounded-[26px] max-w-sm w-full p-4 space-y-3.5 border border-[#E5E7EB] shadow-2xl">
                    <div className="flex justify-between items-center border-b border-[#F3F4F6] pb-2.5">
                      <h3 className="font-bold text-[#12112A] text-sm flex items-center gap-1.5">
                        <CreditCard size={16} className="text-[#6366F1]" /> Record Transaction
                      </h3>
                      <button onClick={() => setShowAddTxModal(false)} className="text-[#9CA3AF] hover:text-[#374151]">
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateTransaction} className="space-y-3 text-xs">
                      {/* TYPE SELECTOR PILLS */}
                      <div className="flex gap-1 bg-[#F3F4F6] p-1 rounded-2xl">
                        {(['expense', 'income', 'transfer'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setTxType(type)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-xl capitalize transition cursor-pointer ${
                              txType === type ? 'bg-white text-[#12112A] shadow-xs' : 'text-[#6B7280]'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">Title / Note</label>
                        <input
                          type="text"
                          placeholder={txType === 'transfer' ? 'Opt. (e.g. Topup Gopay)' : 'e.g. Lunch, Salary'}
                          value={txTitle}
                          onChange={(e) => setTxTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">Amount (Rp)</label>
                        <input
                          type="number"
                          placeholder="50000"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl font-bold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                          required
                        />
                      </div>

                      {/* PILL CATEGORY PICKER */}
                      {txType !== 'transfer' && (
                        <div>
                          <label className="text-[11px] font-semibold text-[#4B5563] mb-1.5 flex items-center gap-1">
                            <Tag size={12} className="text-[#6366F1]" /> Category
                          </label>
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] custom-scrollbar">
                            {(txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setTxCategory(cat)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                                  txCategory === cat
                                    ? 'bg-[#6366F1] text-white shadow-xs'
                                    : 'bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6]'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ACCOUNT SELECTOR PILLS */}
                      <div>
                        <label className="text-[11px] font-semibold text-[#4B5563] mb-1 flex items-center gap-1">
                          <Wallet size={12} className="text-[#6366F1]" /> {txType === 'transfer' ? 'From Account' : 'Account'}
                        </label>
                        <div className="flex gap-1.5 bg-[#F9FAFB] p-1 rounded-xl border border-[#E5E7EB]">
                          {(['bank', 'cash', 'investment'] as const).map((acc) => (
                            <button
                              key={acc}
                              type="button"
                              onClick={() => setTxAccount(acc)}
                              className={`flex-1 py-1 text-[11px] font-bold rounded-lg uppercase transition cursor-pointer ${
                                txAccount === acc
                                  ? 'bg-[#12112A] text-white'
                                  : 'text-[#6B7280] hover:text-[#12112A]'
                              }`}
                            >
                              {acc}
                            </button>
                          ))}
                        </div>
                      </div>

                      {txType === 'transfer' && (
                        <div>
                          <label className="text-[11px] font-semibold text-[#4B5563] mb-1 block">To Account</label>
                          <div className="flex gap-1.5 bg-[#F9FAFB] p-1 rounded-xl border border-[#E5E7EB]">
                            {(['cash', 'bank', 'investment'] as const).map((acc) => (
                              <button
                                key={acc}
                                type="button"
                                onClick={() => setTxToAccount(acc)}
                                className={`flex-1 py-1 text-[11px] font-bold rounded-lg uppercase transition cursor-pointer ${
                                  txToAccount === acc
                                    ? 'bg-[#6366F1] text-white'
                                    : 'text-[#6B7280] hover:text-[#12112A]'
                                }`}
                              >
                                {acc}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-[#F3F4F6]">
                        <button
                          type="button"
                          onClick={() => setShowAddTxModal(false)}
                          className="px-3.5 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-xl font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingTx}
                          className="px-4 py-1.5 bg-[#6366F1] text-white rounded-xl font-bold cursor-pointer shadow-xs active:scale-95"
                        >
                          {isSubmittingTx ? 'Saving...' : 'Save Transaction'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVESTMENTS */}
          {activeTab === 'investments' && (
            <div className="pt-2 text-center text-xs text-[#6B7280]">
              <div className={`${card} p-6 space-y-2`}>
                <TrendingUp size={28} className="mx-auto text-[#6366F1]" />
                <h3 className="font-bold text-[#12112A] text-sm">Investment Portfolio</h3>
                <p>Stock, mutual fund & crypto portfolio summaries are currently syncing.</p>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM NAVIGATION */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          username={username}
          totalNetWorth={totalNetWorth}
          cashBalance={cashBalance}
          bankBalance={bankBalance}
          investmentBalance={investmentBalance}
          totalIncomeMonth={totalIncomeMonth}
          totalExpenseMonth={totalExpenseMonth}
        />
      </div>
    </div>
  );
}