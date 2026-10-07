import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ambil variabel environment (fleksibel membaca dengan/tanpa prefix NEXT_PUBLIC_)
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    // 1. Ambil Authorization Token dari Header Request
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Harap login terlebih dahulu' },
        { status: 401 }
      );
    }

    // 2. Verifikasi Token Supabase untuk mendapatkan data User
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Session tidak valid atau kadaluarsa' },
        { status: 401 }
      );
    }

    // 3. Validasi API Key Gemini
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key Gemini belum ada di Environment Variables' },
        { status: 400 }
      );
    }

    const { prompt, imageBase64 } = await req.json();

    const systemInstruction = `
Kamu adalah parser transaksi keuangan cerdas. Tugasmu mengekstrak data dari teks atau foto struk.
Kembalikan HANYA format JSON valid tanpa tanda backtick markdown (\`\`\`json).

Aturan Khusus Penyesuaian Saldo / Reset:
- "isReset": true -> Jika user minta set/adjust/reset saldo ke angka tertentu (contoh: "set cash 500rb", "adjust saldo bank jadi 1jt", "reset cash ke 0").
- "excludeFromStats": true -> Jika transaksi bersifat penyesuaian/transfer/pindah uang yang TIDAK boleh mempengaruhi grafik Pemasukan & Pengeluaran real.

Aturan Deteksi Account (Dompet/Sumber Uang):
- "cash" -> Jika ada kata seperti: cash, tunai, uang fisik, dompet.
- "investment" -> Jika ada kata seperti: saham, kripto, reksadana, investasi, bibit, ajaib, crypto.
- "bank" -> Jika ada kata seperti: bank, rekening, bca, mandiri, gopay, ovo, dana, qris, debit, atau jika tidak disebutkan.

Format JSON Wajib untuk Transaksi Biasa:
{
  "isReset": false,
  "excludeFromStats": false,
  "title": "Nama barang/transaksi",
  "amount": 20000,
  "type": "expense",
  "category": "Food & Beverage",
  "account": "bank",
  "date": "2026-10-04"
}

Format JSON Wajib untuk Manual Adjust / Set Saldo:
{
  "isReset": true,
  "excludeFromStats": true,
  "account": "cash",
  "targetAmount": 350000
}
    `;

    const ai = new GoogleGenAI({ apiKey });

    const contents: any[] = [];
    if (prompt) contents.push(prompt);

    if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.split(',')[1] || imageBase64,
        },
      });
    }

    const payloadContents = contents.length > 0 ? contents : ['Catat transaksi 0 rupiah'];

    let response: any = null;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: payloadContents,
        config: { systemInstruction },
      });
    } catch (primaryError: any) {
      console.warn('⚠️ Gemini 2.5 Flash sibuk, coba beralih ke Gemini 3.5 Flash Lite...');
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: payloadContents,
          config: { systemInstruction },
        });
      } catch (fallbackError: any) {
        console.warn('⚠️ AI Service sibuk, beralih ke local parser...');
        response = null;
      }
    }

    let rawText = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData;
    try {
      if (!rawText) throw new Error('Respon AI kosong');
      parsedData = JSON.parse(rawText);
    } catch (e) {
      const lowerPrompt = (prompt || '').toLowerCase();
      const isResetPrompt = lowerPrompt.includes('reset') || lowerPrompt.includes('nolkan') || lowerPrompt.includes('set saldo') || lowerPrompt.includes('adjust');
      const isExcludePrompt = lowerPrompt.includes('ga ngaruh') || lowerPrompt.includes('gak ngaruh') || lowerPrompt.includes('pindah') || lowerPrompt.includes('transfer');

      if (isResetPrompt) {
        let detectedAccount: 'cash' | 'bank' | 'investment' = 'bank';
        if (lowerPrompt.includes('cash') || lowerPrompt.includes('tunai')) detectedAccount = 'cash';
        else if (lowerPrompt.includes('saham') || lowerPrompt.includes('investasi')) detectedAccount = 'investment';

        const matches = lowerPrompt.match(/\d+/g);
        let targetAmount = matches ? parseInt(matches.join(''), 10) : 0;
        if (lowerPrompt.includes('rb') && targetAmount < 1000) targetAmount *= 1000;
        if (lowerPrompt.includes('jt') && targetAmount < 1000) targetAmount *= 1000000;

        parsedData = {
          isReset: true,
          excludeFromStats: true,
          account: detectedAccount,
          targetAmount: targetAmount,
        };
      } else {
        const matches = (prompt || '').match(/\d+/g);
        let amount = matches ? parseInt(matches.join(''), 10) : 20000;
        if (lowerPrompt.includes('rb') && amount < 1000) amount *= 1000;
        if (lowerPrompt.includes('jt') && amount < 1000) amount *= 1000000;

        const isIncome = lowerPrompt.includes('dapet') || lowerPrompt.includes('gaji') || lowerPrompt.includes('penghasilan');

        let detectedAccount: 'cash' | 'bank' | 'investment' = 'bank';
        if (lowerPrompt.includes('cash') || lowerPrompt.includes('tunai')) detectedAccount = 'cash';
        else if (lowerPrompt.includes('saham') || lowerPrompt.includes('investasi')) detectedAccount = 'investment';

        parsedData = {
          isReset: false,
          excludeFromStats: isExcludePrompt,
          title: prompt || 'Transaksi',
          amount: amount,
          type: isIncome ? 'income' : 'expense',
          category: isExcludePrompt ? 'Adjustment/Transfer' : (isIncome ? 'Income' : 'Food & Beverage'),
          account: detectedAccount,
          date: new Date().toISOString().split('T')[0],
        };
      }
    }

    // 4. Simpan Otomatis Hasil Ekstraksi Transaksi ke Supabase Beserta user_id
    if (!parsedData.isReset) {
      const { error: dbError } = await supabase
        .from('transactions')
        .insert([
          {
            title: parsedData.title,
            amount: parsedData.amount,
            type: parsedData.type,
            category: parsedData.category,
            account: parsedData.account,
            date: parsedData.date,
            exclude_from_stats: parsedData.excludeFromStats,
            user_id: user.id, // Menyimpan ID user yang sedang login
          },
        ]);

      if (dbError) {
        console.error('❌ Error simpan ke Supabase:', dbError);
      }
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('❌ Error Detail Backend:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}