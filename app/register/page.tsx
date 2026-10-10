'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PiggyBank, Lock, User, Loader2, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok');
      setLoading(false);
      return;
    }

    const cleanInput = identifier.trim().toLowerCase();
    const formattedEmail = cleanInput.includes('@')
      ? cleanInput
      : `${cleanInput}@piggy.app`;

    const { error } = await supabase.auth.signUp({
      email: formattedEmail,
      password,
      options: {
        data: {
          username: cleanInput,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center bg-cover bg-center bg-fixed font-sans antialiased relative p-4 select-none"
      style={{ backgroundImage: `url('/dashboard-bg.webp')` }}
    >
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-600/30 mb-3">
            <PiggyBank size={26} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Daftar Akun Baru
          </h1>
          <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
            Piggy Bank AI Companion <Sparkles size={12} className="text-amber-500 fill-amber-500" />
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleRegister} className="space-y-4 text-xs font-medium">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-600 font-semibold pl-1">Username / ID</label>
            <div className="relative flex items-center">
              <User size={15} className="absolute left-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pilih username bebas..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 transition font-medium"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-600 font-semibold pl-1">Password</label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 transition font-medium"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-600 font-semibold pl-1">Konfirmasi Password</label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="Ketik ulang password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 transition font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Buat Akun'}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Sudah punya akun?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Masuk
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}