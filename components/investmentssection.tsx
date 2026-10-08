'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Plus, Trash2, AreaChart as ChartIcon, Sliders, RefreshCw, Edit2, X, Check } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Asumsi Kurs USD ke IDR
const USD_TO_IDR = 15500;

export interface AssetHolding {
  id: string;
  ticker: string;
  type: 'stock' | 'crypto' | 'mutual_fund' | 'cash';
  lots: number;           // Untuk Saham
  shares: number;         // Total Lembar / Unit / Koin
  buyPrice: number;       // Harga Beli (Rp untuk Saham, USD untuk Crypto)
  amountInvested: number; // Total Modal (Rp untuk Saham, USD untuk Crypto)
  currentPrice: number;   // Harga Pasar (Rp untuk Saham, USD untuk Crypto)
  currency: 'IDR' | 'USD';
}

export default function InvestmentsSection({ onRefresh }: { onRefresh?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'simulator'>('holdings');

  // --- HOLDING ASSETS STATE ---
  const [holdings, setHoldings] = useState<AssetHolding[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // State Edit Modal
  const [editingAsset, setEditingAsset] = useState<AssetHolding | null>(null);

  // Form Input Aset Baru
  const [newTicker, setNewTicker] = useState('');
  const [newType, setNewType] = useState<'stock' | 'crypto' | 'mutual_fund' | 'cash'>('stock');
  
  // Inputs Saham (IDR)
  const [newLots, setNewLots] = useState('');            // Jumlah Lot
  const [newStockBuyPrice, setNewStockBuyPrice] = useState(''); // Harga Beli Saham (Rp)

  // Inputs Crypto (USD Flow)
  const [newTotalModalUSD, setNewTotalModalUSD] = useState('');   // Modal dalam USD ($)
  const [newCryptoBuyPriceUSD, setNewCryptoBuyPriceUSD] = useState(''); // Harga Koin dalam USD ($)

  // --- SIMULATOR PARAMETER STATES ---
  const [initialCapital, setInitialCapital] = useState<number>(5000000);
  const [monthlyTopUp, setMonthlyTopUp] = useState<number>(500000);
  const [monthlyReturn, setMonthlyReturn] = useState<number>(2.5);
  const [duration, setDuration] = useState<number>(30);
  const [durationType, setDurationType] = useState<'months' | 'days'>('days');

  useEffect(() => {
    fetchHoldings();
  }, []);

  // --- FETCH DATA DARI SUPABASE ---
  const fetchHoldings = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_holdings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: AssetHolding[] = data.map((h: any) => ({
          id: h.id,
          ticker: h.ticker,
          type: h.type,
          lots: Number(h.lots || 0),
          shares: Number(h.shares || (Number(h.lots || 0) * 100)),
          buyPrice: Number(h.buy_price || 0),
          amountInvested: Number(h.amount_invested || 0),
          currentPrice: Number(h.current_price || 0),
          currency: h.type === 'crypto' ? 'USD' : 'IDR',
        }));
        setHoldings(formatted);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Error fetching holdings:', err);
    }
  };

  // --- CALCULATIONS FOR HOLDINGS (KONVERSI USD KE IDR UNTUK TOTAL PORTFOLIO) ---
  const totalInvestedIDR = holdings.reduce((acc, h) => {
    const valueInIDR = h.currency === 'USD' ? h.amountInvested * USD_TO_IDR : h.amountInvested;
    return acc + valueInIDR;
  }, 0);

  const totalCurrentValueIDR = holdings.reduce((acc, h) => {
    const rawVal = h.shares * h.currentPrice;
    const valueInIDR = h.currency === 'USD' ? rawVal * USD_TO_IDR : rawVal;
    return acc + valueInIDR;
  }, 0);

  const totalPnLIDR = totalCurrentValueIDR - totalInvestedIDR;
  const totalPnLPercent = totalInvestedIDR > 0 ? ((totalPnLIDR / totalInvestedIDR) * 100).toFixed(2) : '0.00';

  // --- SYNC REAL MARKET PRICE FROM API ---
  const handleSyncPrices = async () => {
    setLoadingSync(true);
    try {
      const updated = await Promise.all(
        holdings.map(async (h) => {
          if (h.type === 'stock') {
            try {
              const res = await fetch(`/api/stock-price?symbol=${h.ticker}`);
              const data = await res.json();
              if (res.ok && data.price) {
                const newPrice = Number(data.price);
                await supabase
                  .from('investment_holdings')
                  .update({ current_price: newPrice })
                  .eq('id', h.id);

                return { ...h, currentPrice: newPrice };
              }
            } catch (err) {
              console.error(`Gagal sync harga ${h.ticker}:`, err);
            }
          }
          return h;
        })
      );
      setHoldings(updated);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error syncing market prices:', err);
    } finally {
      setLoadingSync(false);
    }
  };

  // --- TAMBAH ASET BARU (SUPPORT USD & IDR) ---
  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker) return;
    setLoadingAction(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sesi login telah berakhir.');
        setLoadingAction(false);
        return;
      }

      let lots = 0;
      let shares = 0;
      let buyPrice = 0;
      let amountInvested = 0;
      let currentPrice = 0;

      if (newType === 'stock') {
        lots = Number(newLots) || 0;
        buyPrice = Number(newStockBuyPrice) || 0;
        shares = lots * 100;
        amountInvested = shares * buyPrice;
        currentPrice = buyPrice;

        try {
          const res = await fetch(`/api/stock-price?symbol=${newTicker}`);
          const data = await res.json();
          if (res.ok && data.price) {
            currentPrice = Number(data.price);
          }
        } catch (err) {
          console.error('Fetch live price failed during add:', err);
        }
      } else if (newType === 'crypto') {
            amountInvested = Number(newTotalModalUSD) || 0;
            buyPrice = Number(newCryptoBuyPriceUSD) || 0;

            // Ambil Live Market Price via API jika tidak dimasukkan manual
            try {
            const res = await fetch(`/api/stock-price?symbol=${newTicker}`);
            const data = await res.json();
            if (res.ok && data.price) {
                currentPrice = Number(data.price);
                if (!buyPrice) buyPrice = currentPrice;
            }
            } catch (err) {
            console.error('Fetch live crypto price failed:', err);
            }

            shares = buyPrice > 0 ? (amountInvested / buyPrice) : 0;
      }

      const payload = {
        user_id: session.user.id,
        ticker: newTicker.toUpperCase().trim(),
        type: newType,
        lots,
        shares,
        buy_price: buyPrice,
        amount_invested: amountInvested,
        current_price: currentPrice,
      };

      const { error } = await supabase.from('investment_holdings').insert([payload]);

      if (error) {
        alert(`Gagal menambah aset: ${error.message}`);
      } else {
        setNewTicker('');
        setNewLots('');
        setNewStockBuyPrice('');
        setNewTotalModalUSD('');
        setNewCryptoBuyPriceUSD('');
        fetchHoldings();
      }
    } catch (err) {
      console.error('Error adding holding:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  // --- HAPUS ASET DARI SUPABASE ---
  const handleDeleteHolding = async (id: string) => {
    const { error } = await supabase.from('investment_holdings').delete().eq('id', id);
    if (!error) {
      fetchHoldings();
    } else {
      alert(`Gagal menghapus aset: ${error.message}`);
    }
  };

  // --- SAVE EDIT ASET KE SUPABASE ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setLoadingAction(true);

    try {
      const shares = editingAsset.type === 'stock' 
        ? editingAsset.lots * 100 
        : (editingAsset.buyPrice > 0 ? editingAsset.amountInvested / editingAsset.buyPrice : editingAsset.shares);

      const payload = {
        ticker: editingAsset.ticker.toUpperCase().trim(),
        type: editingAsset.type,
        lots: editingAsset.lots,
        shares,
        buy_price: editingAsset.buyPrice,
        amount_invested: editingAsset.amountInvested,
        current_price: editingAsset.currentPrice,
      };

      const { error } = await supabase
        .from('investment_holdings')
        .update(payload)
        .eq('id', editingAsset.id);

      if (error) {
        alert(`Gagal update aset: ${error.message}`);
      } else {
        setEditingAsset(null);
        fetchHoldings();
      }
    } catch (err) {
      console.error('Error saving edit:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  // --- GENERATE DATA SIMULASI COMPOUNDING ---
  const generateChartData = () => {
    const P = Number(initialCapital) || 0;
    const PMT = Number(monthlyTopUp) || 0;
    const rMonthly = (Number(monthlyReturn) || 0) / 100;
    const periods = Math.max(1, Number(duration) || 1);

    const data = [];
    let currentBalance = P;
    let totalDeposited = P;

    if (durationType === 'days') {
      const dailyRate = Math.pow(1 + rMonthly, 1 / 30) - 1;
      const dailyTopUp = PMT / 30;

      data.push({
        period: 'Hari 0',
        total: Math.round(currentBalance),
        capital: Math.round(totalDeposited),
        profit: 0,
      });

      const stepInterval = periods > 60 ? Math.ceil(periods / 30) : 1;

      for (let day = 1; day <= periods; day++) {
        currentBalance = (currentBalance + dailyTopUp) * (1 + dailyRate);
        totalDeposited += dailyTopUp;

        if (day % stepInterval === 0 || day === periods) {
          data.push({
            period: `Hari ${day}`,
            total: Math.round(currentBalance),
            capital: Math.round(totalDeposited),
            profit: Math.round(currentBalance - totalDeposited),
          });
        }
      }
    } else {
      data.push({
        period: 'Bln 0',
        total: Math.round(currentBalance),
        capital: Math.round(totalDeposited),
        profit: 0,
      });

      for (let month = 1; month <= periods; month++) {
        currentBalance = (currentBalance + PMT) * (1 + rMonthly);
        totalDeposited += PMT;

        data.push({
          period: `Bln ${month}`,
          total: Math.round(currentBalance),
          capital: Math.round(totalDeposited),
          profit: Math.round(currentBalance - totalDeposited),
        });
      }
    }

    return data;
  };

  const chartData = generateChartData();
  const lastStep = chartData.length > 0 ? chartData[chartData.length - 1] : { total: 0, capital: 0, profit: 0 };

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-sans select-none cursor-default text-slate-900">
      
      {/* Header Switcher */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
          <TrendingUp size={15} className="text-slate-900 shrink-0" /> Investment Portfolio & Simulator
        </h3>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('holdings')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
              activeSubTab === 'holdings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Asset Holdings & PnL
          </button>
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
              activeSubTab === 'simulator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Compounding Simulator
          </button>
        </div>
      </div>

      {/* SUBTAB 1: ASSET HOLDINGS & REALTIME PNL */}
      {activeSubTab === 'holdings' && (
        <div className="space-y-3">
          {/* Top Summary Dashboard (Converted to Total IDR for Piggy Bank Dashboard) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <p className="text-[9px] text-slate-600 font-bold uppercase">Total Modal (Capital IDR)</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">Rp {totalInvestedIDR.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <p className="text-[9px] text-slate-600 font-bold uppercase">Nilai Pasar (Total IDR)</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">Rp {totalCurrentValueIDR.toLocaleString('id-ID')}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${totalPnLIDR >= 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'}`}>
              <p className="text-[9px] text-slate-700 font-bold uppercase">Total PnL (Unrealized)</p>
              <p className={`text-xs font-bold mt-0.5 ${totalPnLIDR >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {totalPnLIDR >= 0 ? '+' : ''}Rp {totalPnLIDR.toLocaleString('id-ID')} ({totalPnLPercent}%)
              </p>
            </div>
          </div>

          {/* Form Input Asset Baru (Support USD vs IDR) */}
          <form onSubmit={handleAddHolding} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <p className="font-bold text-slate-900 text-[10px]">Tambah Portfolio Aset</p>
              <span className="text-[9px] text-slate-500">
                {newType === 'stock' ? '*Saham menggunakan Rupiah (IDR) & Lot' : '*Crypto menggunakan Dollar ($ USD)'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <input
                type="text"
                placeholder="Ticker (e.g. BBCA, BTC)"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-medium text-xs text-slate-900 focus:outline-none cursor-text"
                required
              />
              <select
                value={newType}
                onChange={(e: any) => setNewType(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-medium text-xs text-slate-900 cursor-pointer"
              >
                <option value="stock">Saham (IDX - Rp)</option>
                <option value="crypto">Crypto ($ USD)</option>
                <option value="mutual_fund">Reksadana (Rp)</option>
                <option value="cash">Cash (Rp)</option>
              </select>

              {newType === 'stock' ? (
                <>
                  <input
                    type="number"
                    placeholder="Jumlah Lot"
                    value={newLots}
                    onChange={(e) => setNewLots(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-medium text-xs text-slate-900 focus:outline-none cursor-text"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Harga Beli / Lembar (Rp)"
                    value={newStockBuyPrice}
                    onChange={(e) => setNewStockBuyPrice(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-medium text-xs text-slate-900 focus:outline-none cursor-text"
                    required
                  />
                </>
              ) : (
                <>
                  <input
                    type="number"
                    placeholder={newType === 'crypto' ? 'Total Modal ($ USD)' : 'Total Modal (Rp)'}
                    value={newTotalModalUSD}
                    onChange={(e) => setNewTotalModalUSD(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-medium text-xs text-slate-900 focus:outline-none cursor-text"
                    required
                  />
                  <input
                    type="number"
                    placeholder={newType === 'crypto' ? 'Harga Beli / Koin ($ USD)' : 'Harga per Unit (Rp)'}
                    value={newCryptoBuyPriceUSD}
                    onChange={(e) => setNewCryptoBuyPriceUSD(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-medium text-xs text-slate-900 focus:outline-none cursor-text"
                    required={newType === 'crypto'}
                  />
                </>
              )}
            </div>

            {/* Preview Kalkulasi Otomatis */}
            {newType === 'crypto' && newTotalModalUSD && newCryptoBuyPriceUSD && Number(newCryptoBuyPriceUSD) > 0 && (
              <p className="text-[10px] text-slate-600 font-medium">
                Estimasi Koin Didapat: <strong className="text-slate-900">{(Number(newTotalModalUSD) / Number(newCryptoBuyPriceUSD)).toFixed(6)} {newTicker.toUpperCase() || 'Coin'}</strong>
                <span className="text-slate-500 ml-2">(Est. Rp {(Number(newTotalModalUSD) * USD_TO_IDR).toLocaleString('id-ID')})</span>
              </p>
            )}

            <div className="flex justify-between items-center pt-0.5">
              <button
                type="button"
                onClick={handleSyncPrices}
                disabled={loadingSync}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
              >
                <RefreshCw size={12} className={loadingSync ? 'animate-spin' : ''} />
                <span>{loadingSync ? 'Syncing Market...' : 'Sync Market Prices'}</span>
              </button>

              <button 
                type="submit" 
                disabled={loadingAction}
                className="px-3 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus size={12} /> {loadingAction ? 'Menyimpan...' : 'Tambah Aset'}
              </button>
            </div>
          </form>

          {/* List Holdings & PnL Table */}
          <div className="space-y-1.5">
            {holdings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">Belum ada aset investasi yang dicatat.</p>
            ) : (
              holdings.map((h) => {
                const isUSD = h.currency === 'USD';
                const currentVal = h.shares * h.currentPrice;
                const pnlValue = currentVal - h.amountInvested;
                const pnlPercent = h.amountInvested > 0 ? ((pnlValue / h.amountInvested) * 100).toFixed(2) : '0.00';
                const symbolPrefix = isUSD ? '$' : 'Rp ';

                return (
                  <div key={h.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-900 rounded text-[9px] font-extrabold uppercase">
                        {h.type}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{h.ticker}</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {h.type === 'stock' 
                            ? `${h.lots} Lot (${h.shares.toLocaleString('id-ID')} Lembar) @ Buy Rp ${h.buyPrice.toLocaleString('id-ID')}`
                            : `${h.shares < 1 ? h.shares.toFixed(6) : h.shares.toLocaleString('id-ID')} ${h.ticker} @ Buy $${h.buyPrice.toLocaleString('en-US')}`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">
                          Harga Pasar: <strong className="text-slate-900">{symbolPrefix}{h.currentPrice.toLocaleString(isUSD ? 'en-US' : 'id-ID')}</strong>
                        </span>
                        <span className="font-bold text-slate-900 block">Nilai: {symbolPrefix}{currentVal.toLocaleString(isUSD ? 'en-US' : 'id-ID')}</span>
                      </div>

                      <div className={`text-right min-w-[90px] px-2 py-1 rounded-lg ${pnlValue >= 0 ? 'bg-emerald-100/70 text-emerald-800' : 'bg-rose-100/70 text-rose-800'}`}>
                        <span className="font-extrabold text-xs block">
                          {pnlValue >= 0 ? '+' : ''}{symbolPrefix}{pnlValue.toLocaleString(isUSD ? 'en-US' : 'id-ID')}
                        </span>
                        <span className="text-[9px] font-bold block">({pnlValue >= 0 ? '+' : ''}{pnlPercent}%)</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingAsset(h)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 transition rounded-lg hover:bg-slate-200 cursor-pointer"
                          title="Edit Aset"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteHolding(h.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Hapus Aset"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: COMPOUNDING SIMULATOR */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3.5">
            
            {/* PARAMETER SIMULASI */}
            <div className="col-span-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                <Sliders size={13} className="text-slate-900" /> Parameter Simulasi
              </h4>

              {/* Modal Awal */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-700 font-semibold">Modal Awal (Rp)</span>
                  <input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value) || 0)}
                    className="w-24 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900 text-right focus:outline-none cursor-text"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100000000"
                  step="500000"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer h-1 bg-slate-200 rounded-lg"
                />
              </div>

              {/* Deposit Tambahan */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-700 font-semibold">Top-up / Bln (Rp)</span>
                  <input
                    type="number"
                    value={monthlyTopUp}
                    onChange={(e) => setMonthlyTopUp(Number(e.target.value) || 0)}
                    className="w-24 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900 text-right focus:outline-none cursor-text"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="20000000"
                  step="100000"
                  value={monthlyTopUp}
                  onChange={(e) => setMonthlyTopUp(Number(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer h-1 bg-slate-200 rounded-lg"
                />
              </div>

              {/* Return per Bulan */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-700 font-semibold">Return / Bln (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={monthlyReturn}
                    onChange={(e) => setMonthlyReturn(Number(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900 text-right focus:outline-none cursor-text"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.1"
                  value={monthlyReturn}
                  onChange={(e) => setMonthlyReturn(Number(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer h-1 bg-slate-200 rounded-lg"
                />
              </div>

              {/* Durasi Waktu */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-700 font-semibold">Durasi</span>
                    <select
                      value={durationType}
                      onChange={(e: any) => {
                        const newType = e.target.value;
                        setDurationType(newType);
                        if (newType === 'days' && duration < 30) setDuration(30);
                        if (newType === 'months' && duration > 120) setDuration(12);
                      }}
                      className="bg-slate-200 text-slate-900 px-1 py-0.2 rounded text-[9px] font-bold cursor-pointer"
                    >
                      <option value="days">Hari</option>
                      <option value="months">Bulan</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 1)}
                    className="w-16 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900 text-right focus:outline-none cursor-text"
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max={durationType === 'months' ? 120 : 365}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer h-1 bg-slate-200 rounded-lg"
                />
              </div>

              {/* Proyeksi Ringkas */}
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl space-y-0.5 text-slate-900">
                <span className="text-[9px] text-slate-600 font-bold uppercase block">Estimasi Hasil Akhir</span>
                <span className="text-sm font-black text-slate-900 block truncate">
                  Rp {lastStep.total.toLocaleString('id-ID')}
                </span>
                <div className="flex justify-between items-center text-[9px] text-slate-700 pt-1 border-t border-slate-200 font-medium">
                  <span>Modal: Rp {lastStep.capital.toLocaleString('id-ID')}</span>
                  <span className="font-bold text-emerald-600">+Rp {lastStep.profit.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* AREA CHART HIJAU */}
            <div className="col-span-8 bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                  <ChartIcon size={14} className="text-emerald-600" /> Kurva Pertumbuhan Compounding
                </h4>
                <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-900">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Total Portfolio</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> Total Modal</span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGreenTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="period" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={9} 
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000000000 ? `${(v / 1000000000).toFixed(1)}B` : `${(v / 1000000).toFixed(0)}M`} 
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `Rp ${Number(val).toLocaleString('id-ID')}`, 
                        name === 'total' ? 'Nilai Akhir' : 'Total Modal'
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '10px', padding: '6px 10px' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGreenTotal)" />
                    <Area type="monotone" dataKey="capital" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL EDIT ASSET */}
      {editingAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-xl space-y-3 border border-slate-100 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Edit Asset Holding</h3>
              <button onClick={() => setEditingAsset(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Ticker / Symbol</label>
                <input
                  type="text"
                  value={editingAsset.ticker}
                  onChange={(e) => setEditingAsset({ ...editingAsset, ticker: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-text"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Jenis Aset</label>
                <select
                  value={editingAsset.type}
                  onChange={(e: any) => setEditingAsset({ ...editingAsset, type: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 cursor-pointer"
                >
                  <option value="stock">Saham (IDX - Rp)</option>
                  <option value="crypto">Crypto ($ USD)</option>
                  <option value="mutual_fund">Reksadana (Rp)</option>
                  <option value="cash">Cash (Rp)</option>
                </select>
              </div>

              {editingAsset.type === 'stock' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Jumlah Lot</label>
                    <input
                      type="number"
                      value={editingAsset.lots}
                      onChange={(e) => setEditingAsset({ ...editingAsset, lots: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 cursor-text"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Harga Beli / Lembar (Rp)</label>
                    <input
                      type="number"
                      value={editingAsset.buyPrice}
                      onChange={(e) => setEditingAsset({ ...editingAsset, buyPrice: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 cursor-text"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Total Modal ({editingAsset.type === 'crypto' ? '$ USD' : 'Rp'})</label>
                    <input
                      type="number"
                      value={editingAsset.amountInvested}
                      onChange={(e) => setEditingAsset({ ...editingAsset, amountInvested: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 cursor-text"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Harga Beli / Unit ({editingAsset.type === 'crypto' ? '$ USD' : 'Rp'})</label>
                    <input
                      type="number"
                      value={editingAsset.buyPrice}
                      onChange={(e) => setEditingAsset({ ...editingAsset, buyPrice: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 cursor-text"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Harga Pasar Saat Ini ({editingAsset.type === 'crypto' ? '$ USD' : 'Rp'})</label>
                <input
                  type="number"
                  value={editingAsset.currentPrice}
                  onChange={(e) => setEditingAsset({ ...editingAsset, currentPrice: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-text"
                  required
                />
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditingAsset(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={loadingAction}
                  className="px-3.5 py-1 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <Check size={12} /> {loadingAction ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}