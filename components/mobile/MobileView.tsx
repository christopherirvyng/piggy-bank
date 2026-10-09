'use client';

import { ReactNode } from 'react';
import MobileBottomNav from './MobileBottomNav';
import { LogOut, Eye, EyeOff, Sparkles, Send, Loader2, Plus, Newspaper } from 'lucide-react';
import BudgetSection from '@/components/budgetsection';
import CalendarWidget from '@/components/calendarwidget';
import GoalsSection from '@/components/goalssection';
import InvestmentsSection from '@/components/investmentssection';

interface MobileViewProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  username: string;
  onLogout: () => void;
  hideBalance: boolean;
  setHideBalance: (hide: boolean) => void;
  totalNetWorth: number;
  cashBalance: number;
  bankBalance: number;
  investmentBalance: number;
  formatAmount: (val: number) => string;
  transactions: any[];
  fetchTransactions: () => void;
  fetchGoals: () => void;
  fetchInvestmentHoldings: () => void;
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  showManualAdd: boolean;
  setShowManualAdd: (show: boolean) => void;
  manualTitle: string;
  setManualTitle: (val: string) => void;
  manualAmount: string;
  setManualAmount: (val: string) => void;
  manualAccount: 'cash' | 'bank' | 'investment';
  setManualAccount: (val: any) => void;
  handleManualAddSubmit: (e: React.FormEvent) => void;
}

export default function MobileView({
  activeTab,
  setActiveTab,
  username,
  onLogout,
  hideBalance,
  setHideBalance,
  totalNetWorth,
  cashBalance,
  bankBalance,
  investmentBalance,
  formatAmount,
  transactions,
  fetchTransactions,
  fetchGoals,
  fetchInvestmentHoldings,
  input,
  setInput,
  loading,
  handleSubmit,
  showManualAdd,
  setShowManualAdd,
  manualTitle,
  setManualTitle,
  manualAmount,
  setManualAmount,
  manualAccount,
  setManualAccount,
  handleManualAddSubmit,
}: MobileViewProps) {
  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col md:hidden pb-20 font-sans select-none antialiased">
      {/* HEADER COMPACT */}
      <div 
        className="h-32 w-full bg-cover bg-center relative px-4 pt-3.5 pb-5 flex flex-col justify-between text-white shrink-0"
        style={{ backgroundImage: `url('/dashboard-bg.webp')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-slate-900/90" />

        <div className="relative z-10 flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-300">Welcome back,</p>
            <h2 className="text-xs font-bold capitalize tracking-tight text-white">{username}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setHideBalance(!hideBalance)} 
              className="p-1.5 bg-white/15 backdrop-blur-md rounded-full text-white transition active:scale-95 cursor-pointer flex items-center gap-1 px-2.5 text-[10px] font-medium"
            >
              {hideBalance ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{hideBalance ? 'Unhide' : 'Hide'}</span>
            </button>

            <button onClick={onLogout} className="p-1.5 bg-white/15 backdrop-blur-md rounded-full text-white transition active:scale-95 cursor-pointer">
              <LogOut size={13} />
            </button>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-base font-bold tracking-tight text-white capitalize">
            {activeTab}
          </h1>
        </div>
      </div>

      {/* WHITE SHEET CONTAINER */}
      <div className="-mt-3 relative z-20 bg-slate-50 rounded-t-[22px] flex-1 px-3.5 pt-3 shadow-xl space-y-3 border-t border-white/40">
        <div className="w-8 h-1 bg-slate-300 rounded-full mx-auto mb-1" />

        {activeTab === 'dashboard' && (
          <div className="space-y-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Portfolio Value</p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{formatAmount(totalNetWorth)}</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white border border-slate-200/80 rounded-xl shadow-sm space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">CASH</span>
                <span className="font-bold text-slate-800 text-xs block truncate">{formatAmount(cashBalance)}</span>
              </div>
              <div className="p-2 bg-white border border-slate-200/80 rounded-xl shadow-sm space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">BANK</span>
                <span className="font-bold text-slate-800 text-xs block truncate">{formatAmount(bankBalance)}</span>
              </div>
              <div className="p-2 bg-white border border-slate-200/80 rounded-xl shadow-sm space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">INVEST</span>
                <span className="font-bold text-slate-800 text-xs block truncate">{formatAmount(investmentBalance)}</span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-2 rounded-2xl shadow-sm flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400 shrink-0 ml-1.5" />
              <form onSubmit={handleSubmit} className="flex-1 flex gap-1.5">
                <input
                  type="text"
                  placeholder='AI Input e.g. "Makan 45k"...'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-xs focus:outline-none placeholder:text-slate-500"
                />
                <button type="submit" disabled={loading} className="bg-indigo-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0">
                  {loading ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
                </button>
              </form>
            </div>

            <BudgetSection transactions={transactions} />
            <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />
            <GoalsSection transactions={transactions} onRefresh={fetchGoals} />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-3">
            <CalendarWidget transactions={transactions} onRefresh={fetchTransactions} />
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-xs text-slate-900">Transaction History</h3>
                <button 
                  onClick={() => setShowManualAdd(!showManualAdd)} 
                  className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-xl flex items-center gap-1"
                >
                  <Plus size={11} /> Add
                </button>
              </div>

              {showManualAdd && (
                <form onSubmit={handleManualAddSubmit} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <input type="text" placeholder="Title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl" required />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Amount (Rp)" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl" required />
                    <select value={manualAccount} onChange={(e: any) => setManualAccount(e.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-medium">
                      <option value="bank">Bank</option>
                      <option value="cash">Cash</option>
                      <option value="investment">Investment</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-1.5 pt-0.5">
                    <button type="button" onClick={() => setShowManualAdd(false)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-xl font-semibold">Cancel</button>
                    <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded-xl font-semibold">Save</button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5">
                {transactions.map((t) => (
                  <div key={t.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{t.title}</p>
                      <p className="text-[9px] text-slate-400 capitalize">{t.category || 'General'} • {t.account || 'bank'} • {t.date}</p>
                    </div>
                    <span className={`font-bold text-xs ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatAmount(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'investments' && <InvestmentsSection onRefresh={fetchInvestmentHoldings} />}
        {activeTab === 'budgets' && <BudgetSection transactions={transactions} />}
        {activeTab === 'goals' && <GoalsSection transactions={transactions} onRefresh={fetchGoals} />}
        {activeTab === 'news' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-2 text-xs">
            <Newspaper size={28} className="mx-auto text-indigo-600" />
            <h2 className="font-bold text-xs text-slate-900">Global Market News API</h2>
            <p className="text-slate-400 text-[11px]">Real-time market feeds platform.</p>
          </div>
        )}
      </div>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}