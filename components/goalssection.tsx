'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, Plus, Edit2, Trash2, Check, X, RefreshCw, Edit3, Loader2 } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  is_auto_track: boolean;
  monthly_contribution: number;
  expected_return_rate: number;
}

interface Transaction {
  amount: number;
  type: string;
  account?: 'cash' | 'bank' | 'investment';
}

export default function GoalsSection({ transactions = [] }: { transactions?: Transaction[] }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [isAutoTrack, setIsAutoTrack] = useState(true);
  const [monthlyContrib, setMonthlyContrib] = useState('');
  const [returnRate, setReturnRate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const { data, error } = await supabase.from('financial_goals').select('*');
    if (!error && data) setGoals(data);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
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
          expected_return_rate: Number(returnRate || 0),
          user_id: session.user.id,
        },
      ]);

      if (!error) {
        setTitle('');
        setTargetAmount('');
        setCurrentAmount('');
        setIsAutoTrack(true);
        setMonthlyContrib('');
        setReturnRate('');
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
        expected_return_rate: Number(editingGoal.expected_return_rate || 0),
      })
      .eq('id', editingGoal.id);

    if (!error) {
      setEditingGoal(null);
      fetchGoals();
    }
    setLoading(false);
  };

  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('financial_goals').delete().eq('id', id);
    if (!error) fetchGoals();
  };

  const totalNetWorth = transactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount);
  }, 0);

  const getGoalCurrentAmount = (g: Goal) => {
    return g.is_auto_track ? totalNetWorth : Number(g.current_amount || 0);
  };

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-sans">
      
      {/* Title Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h3 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
          <Target size={15} className="text-purple-600 shrink-0" /> Financial Goals
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-[11px] font-medium text-purple-600 hover:text-purple-700 transition flex items-center gap-0.5 bg-purple-50 px-2 py-0.5 rounded-lg"
        >
          <Plus size={12} /> Goal
        </button>
      </div>

      {/* Goal Cards List */}
      <div className="space-y-2.5">
        {goals.length === 0 ? (
          <p className="text-[11px] font-normal text-slate-400 text-center py-3">No financial goals added yet.</p>
        ) : (
          goals.map((g) => {
            const currentVal = getGoalCurrentAmount(g);
            const progressPercent = g.target_amount > 0 ? Math.min(Math.round((currentVal / g.target_amount) * 100), 100) : 0;

            return (
              <div key={g.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 space-y-2 text-xs">
                
                {/* Judul & Action Buttons */}
                <div className="flex justify-between items-center gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs truncate">{g.title}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      g.is_auto_track ? 'bg-purple-100/80 text-purple-700' : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {g.is_auto_track ? 'Auto' : 'Manual'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditingGoal(g)} className="p-0.5 text-slate-400 hover:text-indigo-600 transition">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => handleDeleteGoal(g.id)} className="p-0.5 text-slate-400 hover:text-rose-600 transition">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block">Current</span>
                    <span className="font-semibold text-slate-800">Rp {currentVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-medium block">Target</span>
                    <span className="font-semibold text-slate-700">Rp {Number(g.target_amount).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-normal">
                  <span>{progressPercent}% Completed</span>
                  <span>Remains: Rp {Math.max(0, g.target_amount - currentVal).toLocaleString('id-ID')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Goal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-xl space-y-3 border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 text-xs">New Financial Goal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400"><X size={14} /></button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-2 text-xs font-normal">
              <input
                type="text"
                placeholder="Goal Title (e.g. Emergency Fund)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsAutoTrack(true)}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-lg transition ${
                    isAutoTrack ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Auto Net Worth
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutoTrack(false)}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-lg transition ${
                    !isAutoTrack ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Manual Input
                </button>
              </div>

              <input
                type="number"
                placeholder="Target Amount (Rp)"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />

              {!isAutoTrack && (
                <input
                  type="number"
                  placeholder="Current Saved (Rp)"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              )}

              <div className="flex justify-end gap-1.5 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-medium">Cancel</button>
                <button type="submit" disabled={loading} className="px-3 py-1 bg-purple-600 text-white rounded-xl text-[10px] font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Goal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-xl space-y-3 border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 text-xs">Edit Financial Goal</h3>
              <button onClick={() => setEditingGoal(null)} className="text-slate-400"><X size={14} /></button>
            </div>

            <form onSubmit={handleUpdateGoal} className="space-y-2 text-xs font-normal">
              <input
                type="text"
                value={editingGoal.title}
                onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditingGoal({ ...editingGoal, is_auto_track: true })}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-lg transition ${
                    editingGoal.is_auto_track ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Auto Net Worth
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGoal({ ...editingGoal, is_auto_track: false })}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-lg transition ${
                    !editingGoal.is_auto_track ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Manual
                </button>
              </div>

              <input
                type="number"
                value={editingGoal.target_amount}
                onChange={(e) => setEditingGoal({ ...editingGoal, target_amount: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />

              {!editingGoal.is_auto_track && (
                <input
                  type="number"
                  value={editingGoal.current_amount}
                  onChange={(e) => setEditingGoal({ ...editingGoal, current_amount: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              )}

              <div className="flex justify-end gap-1.5 pt-2">
                <button type="button" onClick={() => setEditingGoal(null)} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-medium">Cancel</button>
                <button type="submit" disabled={loading} className="px-3 py-1 bg-purple-600 text-white rounded-xl text-[10px] font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}