'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Send, Upload, Wallet, ArrowUpRight, ArrowDownRight, Sparkles, Loader2, Trash2, Edit3, X, Check, Calendar, Banknote, Building2, TrendingUp, PieChart as PieChartIcon, ShieldAlert, Sliders, AlertTriangle, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  const router = useRouter();

  // State Adjust Saldo
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; account: 'cash' | 'bank' | 'investment'; currentBal: number }>({ open: false, account: 'bank', currentBal: 0 });
  const [targetAmountInput, setTargetAmountInput] = useState<number>(0);

  // State Edit
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // State Modal Delete Custom
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    // 1. Cek session user saat ini
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Jika belum login, redirect ke /login
      router.push('/login');
      return;
    }

    setUserEmail(session.user.email || 'User');
    fetchTransactions(session.user.id);
  };

  const fetchTransactions = async (userId?: string) => {
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
    
    // RLS otomatis memfilter data berdasarkan user_id, namun memfilter eksplisit juga sangat disarankan
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Filter Waktu
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

  // Hitung Saldo
  const calculateAccountBalance = (accountType: 'cash' | 'bank' | 'investment') => {
    return transactions
      .filter((t) => (t.account || 'bank') === accountType)
      .reduce((acc, curr) => {
        return curr.type === 'income'
          ? acc + Number(curr.amount)
          : acc - Number(curr.amount);
      }, 0);
  };

  const cashBalance = calculateAccountBalance('cash');
  const bankBalance = calculateAccountBalance('bank');
  const investmentBalance = calculateAccountBalance('investment');

  // Eksekusi Adjust
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
        title: `Penyesuaian Saldo ${accountType.toUpperCase()}`,
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
    }
  };

  const handleOpenAdjust = (accountType: 'cash' | 'bank' | 'investment') => {
    const currentBal = calculateAccountBalance(accountType);
    setAdjustModal({ open: true, account: accountType, currentBal });
    setTargetAmountInput(currentBal);
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('transactions').delete().eq('id', deleteTargetId);

    if (!error) {
      setDeleteTargetId(null);
      if (session) fetchTransactions(session.user.id);
    }
  };

  // Update
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
    }
  };

  // Submit AI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input && !selectedFile) return;

    // 1. Ambil session user aktif
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
      // 2. Kirim Request ke API Route dengan Authorization Token Header
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // <--- PENTING: Sertakan Token Supabase User
        },
        body: JSON.stringify({ prompt: input, imageBase64 }),
      });

      const result = await res.json();

      if (result.success && result.data) {
        if (result.data.isReset) {
          const { account, targetAmount } = result.data;
          await executeResetAccount(account || 'bank', targetAmount || 0);
          setInput('');
          setSelectedFile(null);
        } else {
          // Backend API Route (/api/chat) sudah menyimpan otomatis ke Supabase dengan user_id
          setInput('');
          setSelectedFile(null);
          fetchTransactions(session.user.id);
        }
      } else if (result.error) {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isExcluded = (item: Transaction) => 
    item.category?.toLowerCase().includes('adjustment') || 
    item.category?.toLowerCase().includes('transfer');

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income' && !isExcluded(t))
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense' && !isExcluded(t))
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalBalance = totalIncome - totalExpense;

  const categoryChartData = Object.entries(
    filteredTransactions
      .filter((t) => t.type === 'expense' && !isExcluded(t))
      .reduce((acc: { [key: string]: number }, curr) => {
        const cat = curr.category || 'Lainnya';
        acc[cat] = (acc[cat] || 0) + Number(curr.amount);
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6 text-slate-800 pb-20">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="text-emerald-600" size={24} /> Piggy Bank AI
              </h1>
              <p className="text-xs text-slate-500">
                Logged in as: <span className="font-semibold text-slate-700">{userEmail}</span>
              </p>
            </div>
            
            {/* Logout Mobile */}
            <button
              onClick={handleLogout}
              className="sm:hidden p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl gap-1 text-[11px] sm:text-xs font-semibold text-slate-600 flex-1 sm:flex-none">
              <button
                onClick={() => setTimeframe('today')}
                className={`py-1.5 px-2 text-center rounded-lg transition ${
                  timeframe === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setTimeframe('weekly')}
                className={`py-1.5 px-2 text-center rounded-lg transition ${
                  timeframe === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setTimeframe('monthly')}
                className={`py-1.5 px-2 text-center rounded-lg transition ${
                  timeframe === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setTimeframe('all')}
                className={`py-1.5 px-2 text-center rounded-lg transition ${
                  timeframe === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Semua
              </button>
            </div>

            {/* Logout Desktop */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        {/* Breakdown Saldo Aset */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Banknote size={20} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Cash</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Rp {cashBalance.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>
            <button
              onClick={() => handleOpenAdjust('cash')}
              className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition text-xs font-medium flex items-center gap-1"
            >
              <Sliders size={14} /> Adjust
            </button>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Bank</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Rp {bankBalance.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>
            <button
              onClick={() => handleOpenAdjust('bank')}
              className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition text-xs font-medium flex items-center gap-1"
            >
              <Sliders size={14} /> Adjust
            </button>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Investasi</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Rp {investmentBalance.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>
            <button
              onClick={() => handleOpenAdjust('investment')}
              className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition text-xs font-medium flex items-center gap-1"
            >
              <Sliders size={14} /> Adjust
            </button>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase truncate">
              Net Flow
            </p>
            <h2 className="text-base sm:text-2xl font-bold text-slate-900 mt-0.5">
              Rp {totalBalance.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] sm:text-xs font-semibold text-emerald-500 uppercase flex items-center gap-0.5 truncate">
              <ArrowUpRight size={12} /> Pemasukan
            </p>
            <h2 className="text-base sm:text-2xl font-bold text-emerald-600 mt-0.5">
              Rp {totalIncome.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] sm:text-xs font-semibold text-rose-500 uppercase flex items-center gap-0.5 truncate">
              <ArrowDownRight size={12} /> Pengeluaran
            </p>
            <h2 className="text-base sm:text-2xl font-bold text-rose-600 mt-0.5">
              Rp {totalExpense.toLocaleString('id-ID')}
            </h2>
          </div>
        </div>

        {/* Form AI Chat */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-indigo-600">
            <Sparkles size={16} /> Chat AI / Struk
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder='Tulis transaksi atau "Set cash 350rb"...'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            
            <div className="flex gap-2">
              <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer text-xs font-medium transition">
                <Upload size={15} />
                <span className="truncate max-w-[80px]">
                  {selectedFile ? selectedFile.name : 'Struk'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={15} />}
                <span>Proses</span>
              </button>
            </div>
          </form>
        </div>

        {/* Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <PieChartIcon size={16} className="text-indigo-600" /> Analisis Kategori
          </h3>

          {categoryChartData.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Belum ada data pengeluaran.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-1/2 h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`, 'Total']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-2">
                {categoryChartData.map((item, idx) => (
                  <div key={item.name} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">Rp {item.value.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daftar Transaksi */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" /> Riwayat
            </h3>
            <span className="text-[11px] text-slate-400">{filteredTransactions.length} item</span>
          </div>
          
          {filteredTransactions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Tidak ada transaksi.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((item) => {
                const excluded = isExcluded(item);
                return (
                  <div key={item.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                        {item.title}
                        {excluded && (
                          <span className="px-1 py-0.2 bg-slate-100 text-slate-500 rounded text-[9px] font-semibold flex items-center gap-0.5">
                            <ShieldAlert size={9} /> Adj
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-400">
                        {item.date} • {item.category} • <span className="capitalize text-indigo-500 font-medium">{item.account || 'bank'}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <span className={`font-semibold text-xs sm:text-sm ${excluded ? 'text-slate-400 line-through' : (item.type === 'income' ? 'text-emerald-600' : 'text-slate-900')}`}>
                        {item.type === 'income' ? '+' : '-'} Rp {Number(item.amount).toLocaleString('id-ID')}
                      </span>
                      
                      <button
                        onClick={() => setEditingTransaction(item)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal Custom Confirm Hapus */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl text-center space-y-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Hapus Transaksi?</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adjust Saldo */}
      {adjustModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 text-sm capitalize">Adjust {adjustModal.account}</h3>
              <button onClick={() => setAdjustModal({ open: false, account: 'bank', currentBal: 0 })} className="text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-slate-400">Saldo Sekarang</p>
                <p className="text-base font-bold text-slate-700">Rp {adjustModal.currentBal.toLocaleString('id-ID')}</p>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500">Target Saldo Baru (Rp)</label>
                <input
                  type="number"
                  value={targetAmountInput}
                  onChange={(e) => setTargetAmountInput(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => executeResetAccount(adjustModal.account, 0)}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-semibold"
                >
                  Reset 0
                </button>
                <button
                  type="button"
                  onClick={() => executeResetAccount(adjustModal.account, targetAmountInput)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1"
                >
                  <Check size={12} /> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 text-sm">Edit Transaksi</h3>
              <button onClick={() => setEditingTransaction(null)} className="text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-2 text-xs">
              <div>
                <label className="text-slate-500">Judul</label>
                <input
                  type="text"
                  value={editingTransaction.title}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, title: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-slate-500">Nominal (Rp)</label>
                <input
                  type="number"
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: Number(e.target.value) })}
                  className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500">Tipe</label>
                  <select
                    value={editingTransaction.type}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, type: e.target.value as 'income' | 'expense' })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500">Akun</label>
                  <select
                    value={editingTransaction.account || 'bank'}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, account: e.target.value as 'cash' | 'bank' | 'investment' })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="investment">Investasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500">Kategori</label>
                <input
                  type="text"
                  value={editingTransaction.category}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-slate-500">Tanggal</label>
                <input
                  type="date"
                  value={editingTransaction.date}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-1"
                >
                  <Check size={14} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}