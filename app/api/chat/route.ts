import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET: Ambil daftar sesi atau isi pesan sesi tertentu
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');

    if (sessionId) {
      // Fetch messages for a specific session & restrict by user_id for security
      const { data, error } = await supabaseAdmin
        .from('advisory_chat_history')
        .select('id, sender, text, created_at')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase fetch messages error:', error);
        return NextResponse.json({ success: false, messages: [], error: error.message }, { status: 200 });
      }

      return NextResponse.json({ success: true, messages: data || [] });
    } else {
      // Fetch list of sessions
      const { data, error } = await supabaseAdmin
        .from('advisory_sessions')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch sessions error:', error);
        return NextResponse.json({ success: false, sessions: [], error: error.message }, { status: 200 });
      }

      return NextResponse.json({ success: true, sessions: data || [] });
    }
  } catch (err: any) {
    console.error('API Advisory GET Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Kirim pesan ke AI & simpan di sesi spesifik
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const body = await req.json();
    let { sessionId, messages = [], financialContext = {}, prompt = '' } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });

    // 1. Buat Sesi Baru jika sessionId belum ada
    if (!sessionId) {
      const sessionTitle = prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt || 'New Conversation';
      const { data: newSession, error: sErr } = await supabaseAdmin
        .from('advisory_sessions')
        .insert([{ user_id: user.id, title: sessionTitle }])
        .select()
        .single();

      if (sErr || !newSession) {
        console.error('Failed creating session:', sErr);
        throw sErr || new Error('Failed to create session');
      }
      sessionId = newSession.id;
    }

    // 2. Simpan pesan user
    if (prompt) {
      await supabaseAdmin.from('advisory_chat_history').insert([
        { session_id: sessionId, user_id: user.id, sender: 'user', text: prompt }
      ]);
    }

    // 3. System Prompt
    const systemPrompt = `Kamu adalah "Piggy", AI Financial Advisor pintar yang ramah, proaktif, dan bijak.
Gunakan bahasa Indonesia yang santai, suportif, dan mudah dipahami.

DATA KEUANGAN REAL-TIME PENGGUNA SAAT INI:
- Nama: ${financialContext?.username || 'Pengguna'}
- Total Portfolio (Net Worth): Rp ${Number(financialContext?.totalNetWorth || 0).toLocaleString('id-ID')}
- Saldo Kas (Cash Balance): Rp ${Number(financialContext?.cashBalance || 0).toLocaleString('id-ID')}
- Saldo Bank (Bank Balance): Rp ${Number(financialContext?.bankBalance || 0).toLocaleString('id-ID')}
- Nilai Investasi (Investment): Rp ${Number(financialContext?.investmentBalance || 0).toLocaleString('id-ID')}
- Pemasukan Bulan Ini: Rp ${Number(financialContext?.totalIncomeMonth || 0).toLocaleString('id-ID')}
- Pengeluaran Bulan Ini: Rp ${Number(financialContext?.totalExpenseMonth || 0).toLocaleString('id-ID')}
- Net Cashflow Bulan Ini: Rp ${Number(financialContext?.netCashflow || 0).toLocaleString('id-ID')}
- Savings Rate: ${financialContext?.savingsRate || 0}%

STRICT INSTRUCTION:
- Jawab pertanyaan pengguna berdasarkan data di atas secara presisi, ramah, dan ringkas.`;

    const formattedHistory = messages
      .filter((m: any) => m.text)
      .map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

    const contents = [
      { role: 'user', parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Siap! Aku memahami seluruh data keuanganmu. Ada yang bisa Piggy bantu?' }] },
      ...formattedHistory,
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'Gemini error' }, { status: 500 });

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, Piggy tidak dapat merespon saat ini.';

    // 4. Simpan balasan AI
    await supabaseAdmin.from('advisory_chat_history').insert([
      { session_id: sessionId, user_id: user.id, sender: 'ai', text: replyText }
    ]);

    return NextResponse.json({ reply: replyText, sessionId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Hapus Sesi Spesifik beserta isinya
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');

    if (sessionId) {
      // 1. Hapus riwayat chat terlebih dahulu
      await supabaseAdmin.from('advisory_chat_history').delete().eq('session_id', sessionId).eq('user_id', user.id);
      // 2. Hapus sesinya
      await supabaseAdmin.from('advisory_sessions').delete().eq('id', sessionId).eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}