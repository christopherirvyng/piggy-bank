'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Target } from 'lucide-react';
import GoalsSectionMobile from '@/components/mobile/mgoalsection';

export default function GoalsDetailPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalNetWorth, setTotalNetWorth] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: txData } = await supabase.from('transactions').select('*');
    if (txData) setTransactions(txData);

    // Hitung Net Worth
    const { data: holdings } = await supabase.from('investment_holdings').select('*');
    let totalInvest = 0;
    if (holdings) {
      totalInvest = holdings.reduce((acc, h) => {
        const isStock = h.type === 'stock';
        const shares = isStock ? Number(h.lots || 0) * 100 : Number(h.shares || 0);
        return acc + shares * Number(h.current_price || 0);
      }, 0);
    }

    let cashAndBank = 0;
    if (txData) {
      cashAndBank = txData.reduce((acc, t) => {
        const amount = Number(t.amount) || 0;
        if (t.type === 'income') return acc + amount;
        if (t.type === 'expense') return acc - amount;
        return acc;
      }, 0);
    }

    setTotalNetWorth(totalInvest + cashAndBank);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 pb-12 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',sans-serif] text-[#12112A] select-none antialiased">
      <div className="max-w-md mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex items-center gap-3 py-2">
          <button
            onClick={() => router.back()}
            className="size-10 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#12112A] shadow-xs active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Target size={20} className="text-[#8B5CF6]" /> Kelola Financial Goals
            </h1>
            <p className="text-xs text-[#6B7280] font-medium">Target impian, tabungan & alokasi aset</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF] font-medium bg-white rounded-[22px] border border-[#E5E7EB]">
            Memuat target keuangan...
          </div>
        ) : (
          <GoalsSectionMobile
            transactions={transactions}
            totalNetWorth={totalNetWorth}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
}