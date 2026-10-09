import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], financialContext = {} } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Gemini API Key missing in environment');
      return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
    }

    // System Prompt berisi instruksi peran dan data real-time pengguna
    const systemPrompt = `Kamu adalah "Piggy", AI Financial Advisor pintar yang ramah, proaktif, dan bijak.
Gunakan bahasa Indonesia yang santai, suportif, dan mudah dipahami.

DATA KEUANGAN REAL-TIME PENGGUNA SAAT INI:
- Nama: ${financialContext?.username || 'Pengguna'}
- Total Portfolio (Net Worth): Rp ${Number(financialContext?.totalNetWorth || 0).toLocaleString('id-ID')}
- Saldo Kas (Cash): Rp ${Number(financialContext?.cashBalance || 0).toLocaleString('id-ID')}
- Saldo Bank: Rp ${Number(financialContext?.bankBalance || 0).toLocaleString('id-ID')}
- Nilai Investasi: Rp ${Number(financialContext?.investmentBalance || 0).toLocaleString('id-ID')}
- Pemasukan Bulan Ini: Rp ${Number(financialContext?.totalIncomeMonth || 0).toLocaleString('id-ID')}
- Pengeluaran Bulan Ini: Rp ${Number(financialContext?.totalExpenseMonth || 0).toLocaleString('id-ID')}
- Net Cashflow Bulan Ini: Rp ${Number(financialContext?.netCashflow || 0).toLocaleString('id-ID')}
- Savings Rate: ${financialContext?.savingsRate || 0}%

Jawab pertanyaan pengguna berdasarkan data di atas secara presisi, ramah, dan ringkas.`;

    // Filter pesan agar hanya menyertakan history percakapan asli (tanpa pesan salam bawaan jika role salah)
    const formattedHistory = messages
      .filter((m: any) => m.text)
      .map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

    // Menyusun struktur contents dengan peranan user & model yang berselang-seling
    const contents = [
      {
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }],
      },
      {
        role: 'model',
        parts: [{ text: 'Siap! Aku memahami seluruh data keuanganmu. Ada yang bisa Piggy bantu?' }],
      },
      ...formattedHistory,
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', JSON.stringify(data));
      return NextResponse.json(
        { error: data.error?.message || 'Gagal terhubung ke Gemini API' },
        { status: 500 }
      );
    }

    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Maaf, Piggy tidak dapat memberikan respon saat ini.';

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error('Advisory Route Catch Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}