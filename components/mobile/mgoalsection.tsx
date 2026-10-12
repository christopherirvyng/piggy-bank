'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, Plus, Edit2, Trash2, X, Camera } from 'lucide-react';

export interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  is_auto_track: boolean;
  monthly_contribution?: number;
  image_url?: string;
  notes?: string;
}

interface Transaction {
  amount: number;
  type: string;
}

export default function GoalsSectionMobile({
  transactions = [],
  totalNetWorth = 0,
  onRefresh,
}: {
  transactions?: Transaction[];
  totalNetWorth?: number;
  onRefresh?: () => void;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [isAutoTrack, setIsAutoTrack] = useState(true);
  const [monthlyContrib, setMonthlyContrib] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const { data, error } = await supabase.from('financial_goals').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setGoals(data);
      if (onRefresh) onRefresh();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setIsAutoTrack(true);
    setMonthlyContrib('');
    setImageUrl(null);
    setEditingGoal(null);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('financial_goals').insert([
        {
          title,
          target_amount: Number(targetAmount) || 0,
          current_amount: isAutoTrack ? 0 : Number(currentAmount || 0),
          is_auto_track: isAutoTrack,
          monthly_contribution: Number(monthlyContrib || 0),
          image_url: imageUrl,
          user_id: session.user.id,
        },
      ]);

      if (!error) {
        resetForm();
        setShowAddModal(false);
        fetchGoals();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    setLoading(true);

    const { error } = await supabase
      .from('financial_goals')
      .update({
        title: editingGoal.title,
        target_amount: Number(editingGoal.target_amount) || 0,
        current_amount: editingGoal.is_auto_track ? 0 : Number(editingGoal.current_amount || 0),
        is_auto_track: editingGoal.is_auto_track,
        monthly_contribution: Number(editingGoal.monthly_contribution || 0),
        image_url: editingGoal.image_url,
      })
      .eq('id', editingGoal.id);

    if (!error) {
      resetForm();
      fetchGoals();
    }
    setLoading(false);
  };

  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('financial_goals').delete().eq('id', id);
    if (!error) fetchGoals();
  };

  const getGoalCurrentAmount = (g: Goal) => {
    return g.is_auto_track ? totalNetWorth : Number(g.current_amount || 0);
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-[22px] border border-[#E5E7EB] shadow-[0_4px_16px_rgba(26,26,46,0.07)] space-y-4 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',sans-serif] select-none antialiased">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[34px] items-center justify-center rounded-xl bg-[#F3E8FF] text-[#8B5CF6]">
            <Target size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#12112A] tracking-tight">Financial Goals</h3>
            <p className="text-[11px] font-medium text-[#6B7280]">Target impian & tabungan</p>
          </div>
        </div>

        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-1 rounded-xl bg-[#F3E8FF] px-3 py-1.5 text-xs font-bold text-[#8B5CF6] active:scale-95 transition cursor-pointer"
        >
          <Plus size={14} />
          <span>Tambah</span>
        </button>
      </div>

      {/* GOAL CARDS */}
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#6B7280] font-medium border border-dashed border-[#E5E7EB] rounded-2xl">
            Belum ada target keuangan terdaftar.
          </div>
        ) : (
          goals.map((g) => {
            const currentVal = getGoalCurrentAmount(g);
            const targetVal = Number(g.target_amount) || 0;
            const remainingGap = Math.max(0, targetVal - currentVal);
            const progressPercent = targetVal > 0 ? Math.min(Math.round((currentVal / targetVal) * 100), 100) : 0;

            return (
              <div key={g.id} className="p-4 border border-[#E5E7EB] rounded-[18px] bg-white space-y-3 shadow-xs">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {g.image_url ? (
                      <img src={g.image_url} alt="Progress" className="w-11 h-11 rounded-xl object-cover border border-[#E5E7EB] shrink-0" />
                    ) : (
                      <div className="w-11 h-11 bg-[#F3E8FF] text-[#8B5CF6] rounded-xl flex items-center justify-center shrink-0">
                        <Target size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#12112A] truncate">{g.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                          g.is_auto_track ? 'bg-[#F3E8FF] text-[#8B5CF6]' : 'bg-[#F3F4F6] text-[#4B5563]'
                        }`}>
                          {g.is_auto_track ? 'Auto Net Worth' : 'Manual'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280] mt-0.5 font-medium">
                        {progressPercent >= 100 ? '🎉 Goal Completed!' : `Selisih: Rp ${remainingGap.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingGoal(g); setImageUrl(g.image_url || null); }}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#8B5CF6] transition rounded-lg hover:bg-[#F3F4F6]"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition rounded-lg hover:bg-[#F3F4F6]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* NUMERIC STATS */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#F3F4F6]">
                  <div>
                    <span className="text-[11px] text-[#6B7280] font-medium block">Terkumpul</span>
                    <span className="font-bold text-[#12112A] text-sm">Rp {currentVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#6B7280] font-medium block">Target Akhir</span>
                    <span className="font-bold text-[#374151] text-sm">Rp {targetVal.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progressPercent >= 100 ? 'bg-[#16A34A]' : 'bg-[#8B5CF6]'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#6B7280]">
                    <span>Progress: {progressPercent}%</span>
                    <span>Sisa: Rp {remainingGap.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL ADD */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[22px] max-w-sm w-full p-4 space-y-3 border border-[#E5E7EB] shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#F3F4F6] pb-2">
              <h3 className="font-bold text-[#12112A] text-sm">Tambah Financial Goal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9CA3AF] hover:text-[#374151]"><X size={16} /></button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">Nama Target</label>
                <input
                  type="text"
                  placeholder="Misal: DP Rumah, Beli Laptop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl font-semibold text-[#111827]"
                  required
                />
              </div>

              <div className="flex gap-1 bg-[#F3F4F6] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsAutoTrack(true)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${isAutoTrack ? 'bg-white text-[#8B5CF6] shadow-xs' : 'text-[#6B7280]'}`}
                >
                  Auto Net Worth
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutoTrack(false)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${!isAutoTrack ? 'bg-white text-[#8B5CF6] shadow-xs' : 'text-[#6B7280]'}`}
                >
                  Manual
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">Target Dana (Rp)</label>
                <input
                  type="number"
                  placeholder="50000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl font-semibold text-[#111827]"
                  required
                />
              </div>

              {!isAutoTrack && (
                <div>
                  <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">Dana Terkumpul (Rp)</label>
                  <input
                    type="number"
                    placeholder="10000000"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl font-semibold text-[#111827]"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#4B5563] block">Foto Progress / Dokumentasi</label>
                {imageUrl && (
                  <div className="relative w-full h-24 mb-1 rounded-xl overflow-hidden border border-[#E5E7EB]">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImageUrl(null)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full"><X size={12} /></button>
                  </div>
                )}
                <label className="w-full py-2 bg-[#F9FAFB] border border-dashed border-[#D1D5DB] rounded-xl flex items-center justify-center gap-1.5 text-[#6B7280] hover:bg-[#F3F4F6] cursor-pointer">
                  <Camera size={14} />
                  <span className="text-xs font-semibold">{imageUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F3F4F6]">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3.5 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-xl font-bold">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-[#8B5CF6] text-white rounded-xl font-bold">Simpan Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}