'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, PiggyBank } from 'lucide-react';
import BudgetSectionMobile from '@/components/mobile/mbudgetsection';

export default function BudgetsDetailPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
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

    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false });

    if (txData) setTransactions(txData);
    if (budgetData) setBudgets(budgetData);
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
              <PiggyBank size={20} className="text-[#6366F1]" /> Kelola Monthly Budget
            </h1>
            <p className="text-xs text-[#6B7280] font-medium">Atur alokasi & limit batas pengeluaran bulanan</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF] font-medium bg-white rounded-[22px] border border-[#E5E7EB]">
            Memuat data budgeting...
          </div>
        ) : (
          <BudgetSectionMobile transactions={transactions} budgets={budgets} />
        )}
      </div>
    </div>
  );
}