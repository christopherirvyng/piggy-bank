'use client';

import { useRef, useState, useEffect } from 'react';
import { Home, Receipt, BarChart3, Sparkles, X, Loader2 } from 'lucide-react';
import PiggyLottie from '@/components/PiggyLottie';
import { supabase } from '@/lib/supabase';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'expenses' | 'investments') => void;
  username: string;
  totalNetWorth: number;
  cashBalance: number;
  bankBalance: number;
  investmentBalance: number;
  totalIncomeMonth: number;
  totalExpenseMonth: number;
  savingsRate?: number;
}

const PIGGY_LOTTIE_URL =
  'https://lottie.host/3887dc40-5124-460c-afcb-8a6ffb763a2a/TgBStkObJw.lottie';

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  username,
  totalNetWorth,
  cashBalance,
  bankBalance,
  investmentBalance,
  totalIncomeMonth,
  totalExpenseMonth,
  savingsRate = 0,
}: MobileBottomNavProps) {
  const lottieRef = useRef<any>(null);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Advisor AI Chat State
  const [advisorMessages, setAdvisorMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string }>>([
    {
      id: '1',
      sender: 'ai',
      text: `Halo ${username}! Aku Piggy 🐷✨. Ada yang mau kamu diskusikan tentang keuanganmu hari ini?`,
    },
  ]);
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const netCashflow = totalIncomeMonth - totalExpenseMonth;

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

      const res = await fetch('/api/advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: currentInput,
          messages: updatedMessages.filter((m) => m.id !== '1'),
          financialContext: {
            username,
            totalNetWorth,
            cashBalance,
            bankBalance,
            investmentBalance,
            totalIncomeMonth,
            totalExpenseMonth,
            netCashflow,
            savingsRate,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setAdvisorMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: data.reply }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'expenses', label: 'Expense', icon: Receipt },
    { id: 'investments', label: 'Investment', icon: BarChart3 },
  ];

  return (
    <>
      {/* ADVISOR CHAT MODAL */}
      {isAdvisorOpen && (
        <div className="fixed inset-x-3 bottom-20 z-50 max-w-[420px] mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[70vh] font-sans animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-[#12112A] text-white p-3.5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
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
            <button 
              suppressHydrationWarning
              onClick={() => setIsAdvisorOpen(false)} 
              className="p-1 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="bg-indigo-50/80 px-3.5 py-1.5 border-b border-indigo-100 flex justify-between items-center text-[10px]">
            <span className="text-indigo-900 font-semibold">Net Worth: Rp {totalNetWorth.toLocaleString('id-ID')}</span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
              Cashflow: +Rp {netCashflow.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2 text-xs bg-slate-50/50">
            {advisorMessages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#6366F1] text-white rounded-br-none font-medium'
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
                  <span>Piggy sedang menganalisis...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendAdvisor} className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5 shrink-0">
            <input
              type="text"
              placeholder="Tanya saran alokasi atau budget..."
              value={advisorInput}
              onChange={(e) => setAdvisorInput(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-medium text-slate-800 placeholder:text-slate-400"
            />
          </form>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR - MENEMPEL DI BAWAH LAYAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-[440px] mx-auto">
        {/* ANIMATED MASCOT */}
        <div className="pointer-events-none absolute bottom-full right-0 h-[130px] w-[110px] overflow-hidden">
          <div
            onClick={() => setIsAdvisorOpen(!isAdvisorOpen)}
            className="pointer-events-auto absolute -right-2 -top-2 w-[120px] h-[130px] cursor-pointer"
          >
            <PiggyLottie lottieRef={lottieRef} src={PIGGY_LOTTIE_URL} />
          </div>
        </div>

        {/* BOTTOM NAV CONTAINER */}
        <div className="flex flex-col gap-[17px] rounded-t-[26px] border-t border-[#F0E7FF] bg-white px-5 pb-3 pt-3.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex gap-3">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  suppressHydrationWarning
                  onClick={() => setActiveTab(t.id as any)}
                  className="flex flex-1 flex-col items-center gap-[5px] cursor-pointer"
                >
                  <span
                    className={`flex h-[30px] w-[52px] items-center justify-center rounded-full transition-all ${
                      isActive ? 'bg-[#EAE6FF] text-[#6366F1]' : 'text-[#A0A0BC]'
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                  </span>
                  <span
                    className={`text-[11px] ${
                      isActive ? 'font-bold text-[#6366F1]' : 'font-medium text-[#A0A0BC]'
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* HOME BAR INDICATOR */}
          <div className="flex justify-center">
            <div className="h-[5px] w-[140px] rounded-full bg-[#7C6CFF]" />
          </div>
        </div>
      </nav>
    </>
  );
}