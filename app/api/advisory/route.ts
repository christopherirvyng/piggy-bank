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
      // Ambil riwayat pesan dalam sesi spesifik
      const { data, error } = await supabaseAdmin
        .from('advisory_chat_history')
        .select('id, sender, text, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json({ success: true, messages: [] });
      }

      return NextResponse.json({ success: true, messages: data || [] });
    } else {
      // Ambil daftar sesi milik user
      const { data, error } = await supabaseAdmin
        .from('advisory_sessions')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch sessions error:', error);
        return NextResponse.json({ success: true, sessions: [] });
      }

      return NextResponse.json({ success: true, sessions: data || [] });
    }
  } catch (err: any) {
    console.error('GET Advisory Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Kirim pesan ke AI & simpan di sesi spesifik dengan Safeguard Fallback
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

      if (sErr || !newSession) throw sErr || new Error('Failed to create session');
      sessionId = newSession.id;
    }

    // 2. Simpan pesan user
    if (prompt) {
      await supabaseAdmin.from('advisory_chat_history').insert([
        { session_id: sessionId, user_id: user.id, sender: 'user', text: prompt }
      ]);
    }

    // 3. System Prompt & Setup Chat Contents
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
- Jawab pertanyaan pengguna berdasarkan data di atas secara presisi, ramah, dan ringkas.
- JANGAN GUNAKAN format Markdown sama sekali seperti bold (**), miring (*), atau header (#). Tulis teks biasa yang bersih.`;

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

    // 4. Multi-Layer Safeguard Models Execution
    const modelLayers = [
      'gemini-3.5-flash',       // Layer 1 Utama
      'gemini-3.5-flash-lite',  // Layer 2 Fallback
      'gemini-3.1-flash-lite',  // Layer 3 Fallback Terakhir
    ];

    let replyText = '';
    let lastError: any = null;

    for (const model of modelLayers) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
          }
        );

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          replyText = data.candidates[0].content.parts[0].text;
          break; // Sukses, langsung keluar dari loop
        } else {
          console.warn(`[Safeguard] Model ${model} gagal/down, mencoba model berikutnya...`, data.error?.message);
          lastError = data.error?.message;
        }
      } catch (err: any) {
        console.warn(`[Safeguard] Error panggil ${model}:`, err.message);
        lastError = err.message;
      }
    }

    if (!replyText) {
      return NextResponse.json(
        { error: `Seluruh model Gemini gagal merespon. Error terakhir: ${lastError}` },
        { status: 500 }
      );
    }

    // 5. Simpan balasan AI ke database
    await supabaseAdmin.from('advisory_chat_history').insert([
      { session_id: sessionId, user_id: user.id, sender: 'ai', text: replyText }
    ]);

    return NextResponse.json({ reply: replyText, sessionId });
  } catch (error: any) {
    console.error('POST Advisory Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Hapus Sesi Spesifik
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
      const { error: delErr } = await supabaseAdmin
        .from('advisory_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (delErr) throw delErr;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE Advisory Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}