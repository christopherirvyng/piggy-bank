'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, Plus, Edit2, Trash2, X, Upload, Image as ImageIcon, Camera, TrendingUp } from 'lucide-react';

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

export default function GoalsSection({ 
  transactions = [], 
  onRefresh 
}: { 
  transactions?: Transaction[];
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
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
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
    if (!error) {
      fetchGoals();
    }
  };

  const totalNetWorth = transactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount);
  }, 0);

  const getGoalCurrentAmount = (g: Goal) => {
    return g.is_auto_track ? totalNetWorth : Number(g.current_amount || 0);
  };

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-sans select-none cursor-default">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
          <Target size={15} className="text-purple-600 shrink-0" /> Financial Goals & Progress
        </h3>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-xl cursor-pointer"
        >
          <Plus size={13} /> Add Goal
        </button>
      </div>

      {/* List Goal Cards */}
      <div className="space-y-2.5">
        {goals.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Belum ada target keuangan yang ditambahkan.</p>
        ) : (
          goals.map((g) => {
            const currentVal = getGoalCurrentAmount(g);
            const targetVal = Number(g.target_amount) || 0;
            const remainingGap = Math.max(0, targetVal - currentVal);
            const progressPercent = targetVal > 0 ? Math.min(Math.round((currentVal / targetVal) * 100), 100) : 0;

            return (
              <div key={g.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/60 space-y-2 text-xs">
                
                {/* Visual Header + Title */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {g.image_url ? (
                      <div className="relative group shrink-0">
                        <img src={g.image_url} alt="Progress Dokumentasi" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                        <Target size={18} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-xs truncate">{g.title}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
                          g.is_auto_track ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {g.is_auto_track ? 'Auto Net Worth' : 'Manual'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {progressPercent >= 100 ? '🎉 Goal Completed!' : `Selisih: Rp ${remainingGap.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => {
                        setEditingGoal(g);
                        setImageUrl(g.image_url || null);
                      }} 
                      className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer" 
                      title="Edit Goal"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={() => handleDeleteGoal(g.id)} 
                      className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer" 
                      title="Hapus Goal"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="grid grid-cols-2 gap-1 text-xs pt-0.5">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Terkumpul Saat Ini</span>
                    <span className="font-bold text-slate-800">Rp {currentVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium block">Target Akhir</span>
                    <span className="font-bold text-slate-700">Rp {targetVal.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-purple-600'}`} 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>Progress: {progressPercent}%</span>
                  <span>Kurang: Rp {remainingGap.toLocaleString('id-ID')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Goal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-xl space-y-3 border border-slate-100 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Tambah Goal Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Nama Target</label>
                <input
                  type="text"
                  placeholder="Misal: DP Rumah, Beli Laptop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-text font-medium"
                  required
                />
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsAutoTrack(true)}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
                    isAutoTrack ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Auto Net Worth
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutoTrack(false)}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
                    !isAutoTrack ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Manual Input
                </button>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Target Dana (Rp)</label>
                <input
                  type="number"
                  placeholder="50000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-text font-medium"
                  required
                />
              </div>

              {!isAutoTrack && (
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Dana Terkumpul Sekarang (Rp)</label>
                  <input
                    type="number"
                    placeholder="10000000"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-text font-medium"
                    required
                  />
                </div>
              )}

              {/* Upload Foto Progress / Dokumentasi */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-slate-400 block">Dokumentasi / Foto Progress</label>
                {imageUrl && (
                  <div className="relative w-full h-24 mb-1 rounded-xl overflow-hidden border border-slate-200">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl(null)} 
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <label className="w-full py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-1.5 text-slate-500 hover:bg-slate-100 transition cursor-pointer">
                  <Camera size={13} />
                  <span className="text-[10px] font-medium">{imageUrl ? 'Ganti Foto Dokumentasi' : 'Upload Foto Progress'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="px-3.5 py-1 bg-purple-600 text-white rounded-xl text-xs font-semibold cursor-pointer">Simpan Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Goal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-xl space-y-3 border border-slate-100 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Edit Financial Goal</h3>
              <button onClick={() => setEditingGoal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
            </div>

            <form onSubmit={handleUpdateGoal} className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Judul Target</label>
                <input
                  type="text"
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditingGoal({ ...editingGoal, is_auto_track: true })}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
                    editingGoal.is_auto_track ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Auto Net Worth
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGoal({ ...editingGoal, is_auto_track: false })}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
                    !editingGoal.is_auto_track ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Manual
                </button>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Target Dana (Rp)</label>
                <input
                  type="number"
                  value={editingGoal.target_amount}
                  onChange={(e) => setEditingGoal({ ...editingGoal, target_amount: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              {!editingGoal.is_auto_track && (
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Dana Terkumpul (Rp)</label>
                  <input
                    type="number"
                    value={editingGoal.current_amount}
                    onChange={(e) => setEditingGoal({ ...editingGoal, current_amount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    required
                  />
                </div>
              )}

              {/* Upload Foto Progress */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-slate-400 block">Update Foto Progress / Dokumentasi</label>
                {editingGoal.image_url && (
                  <div className="relative w-full h-24 mb-1 rounded-xl overflow-hidden border border-slate-200">
                    <img src={editingGoal.image_url} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setEditingGoal({ ...editingGoal, image_url: '' })} 
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <label className="w-full py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-1.5 text-slate-500 hover:bg-slate-100 transition cursor-pointer">
                  <Camera size={13} />
                  <span className="text-[10px] font-medium">Ganti Foto Dokumentasi</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingGoal({ ...editingGoal, image_url: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditingGoal(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="px-3.5 py-1 bg-purple-600 text-white rounded-xl text-xs font-semibold cursor-pointer">Update Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}