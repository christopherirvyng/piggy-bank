import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function normalizeCategory(catRaw: string, type: string, promptText: string = ''): string {
  if (type === 'transfer') return 'Transfer';

  const cat = (catRaw || '').toLowerCase().trim();
  const prompt = (promptText || '').toLowerCase().trim();
  const combined = `${cat} ${prompt}`;

  if (
    combined.includes('food') ||
    combined.includes('drink') ||
    combined.includes('makan') ||
    combined.includes('jajan') ||
    combined.includes('kuliner') ||
    combined.includes('fnb') ||
    combined.includes('beverage') ||
    combined.includes('kopi') ||
    combined.includes('restoran')
  ) {
    return 'Food & Drinks';
  }

  if (
    combined.includes('trans') ||
    combined.includes('gocar') ||
    combined.includes('gojek') ||
    combined.includes('grab') ||
    combined.includes('ride') ||
    combined.includes('parkir') ||
    combined.includes('bensin') ||
    combined.includes('tol') ||
    combined.includes('ojek')
  ) {
    return 'Transportation';
  }

  if (
    combined.includes('util') ||
    combined.includes('pln') ||
    combined.includes('listrik') ||
    combined.includes('water') ||
    combined.includes('air') ||
    combined.includes('pdam') ||
    combined.includes('wifi') ||
    combined.includes('internet') ||
    combined.includes('pulsa') ||
    combined.includes('kuota') ||
    combined.includes('tagihan') ||
    combined.includes('bill') ||
    combined.includes('token') ||
    combined.includes('spp') ||
    combined.includes('sekolah') ||
    combined.includes('kuliah')
  ) {
    return 'Utilities';
  }

  if (
    combined.includes('enter') ||
    combined.includes('game') ||
    combined.includes('movie') ||
    combined.includes('bioskop') ||
    combined.includes('park') ||
    combined.includes('hiburan') ||
    combined.includes('netflix') ||
    combined.includes('spotify') ||
    combined.includes('steam')
  ) {
    return 'Entertainment';
  }

  if (
    combined.includes('health') ||
    combined.includes('sehat') ||
    combined.includes('dokter') ||
    combined.includes('obat') ||
    combined.includes('apotek') ||
    combined.includes('rumah sakit') ||
    combined.includes('asuransi') ||
    combined.includes('bpjs') ||
    combined.includes('clinic')
  ) {
    return 'Healthcare';
  }

  if (
    combined.includes('invest') ||
    combined.includes('saham') ||
    combined.includes('crypto') ||
    combined.includes('kripto') ||
    combined.includes('reksadana') ||
    combined.includes('dividen') ||
    combined.includes('yield')
  ) {
    return 'Investment';
  }

  if (
    combined.includes('bonus') ||
    combined.includes('thr') ||
    combined.includes('insentif') ||
    combined.includes('reward') ||
    combined.includes('komisi')
  ) {
    return 'Bonus';
  }

  if (
    combined.includes('gaji') ||
    combined.includes('salary') ||
    combined.includes('digaji') ||
    combined.includes('wage') ||
    combined.includes('paycheck') ||
    combined.includes('pemasukan')
  ) {
    return 'Salary';
  }

  return 'Others';
}

function sanitizeAccount(accRaw: string): 'cash' | 'bank' | 'investment' {
  const acc = (accRaw || '').toLowerCase().trim();

  if (acc.includes('cash') || acc.includes('tunai') || acc.includes('dompet') || acc.includes('kas')) {
    return 'cash';
  }

  if (
    acc.includes('saham') ||
    acc.includes('kripto') ||
    acc.includes('investasi') ||
    acc.includes('reksadana') ||
    acc.includes('portfolio') ||
    acc.includes('investment')
  ) {
    return 'investment';
  }

  return 'bank';
}

function extractRealAmount(promptText: string, aiAmount: number): number {
  const lower = promptText.toLowerCase();

  const mMatch = lower.match(/(\d+[\.,]?\d*)\s*(miliar|milyar|billion|\bm\b(?!\w))/);
  if (mMatch) {
    const val = parseFloat(mMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000000000);
  }

  const jtMatch = lower.match(/(\d+[\.,]?\d*)\s*(juta|jt(?!\w))/);
  if (jtMatch) {
    const val = parseFloat(jtMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000000);
  }

  const rbMatch = lower.match(/(\d+[\.,]?\d*)\s*(ribu|rb|\bk\b(?!\w))/);
  if (rbMatch) {
    const val = parseFloat(rbMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000);
  }

  return aiAmount;
}

function parseExplicitDateFromPrompt(promptText: string, todayStr: string): string | null {
  const lower = promptText.toLowerCase();
  const months: { [key: string]: string } = {
    jan: '01', januari: '01',
    feb: '02', februari: '02',
    mar: '03', maret: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06',
    jul: '07', juli: '07',
    agu: '08', agustus: '08', aug: '08',
    sep: '09', september: '09',
    okt: '10', oktober: '10', oct: '10',
    nov: '11', november: '11',
    des: '12', desember: '12', dec: '12'
  };

  const matchDate = lower.match(/(\d{1,2})\s*(jan|januari|feb|februari|mar|maret|apr|april|mei|may|jun|juni|jul|juli|agu|agustus|aug|sep|september|okt|oktober|oct|nov|november|des|desember|dec)/i);
  if (matchDate) {
    const day = matchDate[1].padStart(2, '0');
    const monthKey = matchDate[2].toLowerCase();
    const month = months[monthKey];
    const year = todayStr.split('-')[0];
    if (month) return `${year}-${month}-${day}`;
  }

  if (lower.includes('kemarin')) {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  return null;
}

function parseIntervalDaysFromPrompt(promptText: string): number | null {
  const lower = promptText.toLowerCase();
  const matchInterval = lower.match(/(?:setiap|tiap)\s+(\d+)\s*hari/i);
  if (matchInterval && matchInterval[1]) {
    const days = parseInt(matchInterval[1], 10);
    if (days > 0) return days;
  }
  return null;
}

function parseMonthlyDayFromPrompt(promptText: string): number | null {
  const lower = promptText.toLowerCase();

  if (lower.includes('akhir bulan')) return 31;
  if (lower.includes('awal bulan')) return 1;

  const matchDay = lower.match(/(?:tanggal|tgl|setiap\s+tgl|setiap\s+tanggal)\s*(\d{1,2})/i);
  if (matchDay && matchDay[1]) {
    const day = parseInt(matchDay[1], 10);
    if (day >= 1 && day <= 31) return day;
  }

  return null;
}

async function generateWithTimeout(
  ai: GoogleGenAI,
  modelName: string,
  payload: any,
  systemInstruction: string,
  timeoutMs = 10000
) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout ${timeoutMs / 1000}s on ${modelName}`)), timeoutMs)
  );

  const apiPromise = ai.models.generateContent({
    model: modelName,
    contents: payload,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
    },
  });

  return Promise.race([apiPromise, timeoutPromise]);
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized: Session expired' }, { status: 401 });

    const body = await req.json();
    const userPrompt = body.prompt || body.message || '';
    const imageBase64 = body.imageBase64 || null;
    const balances = body.balances || { cash: 0, bank: 0, investment: 0 };

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
    const todayStr = formatter.format(now);

    const systemInstruction = `
You are a smart financial transaction parser.
Your job is to strictly parse user prompts or receipts into JSON.

CURRENT TODAY DATE IS: ${todayStr}

DATE PARSING RULES:
- If the user explicitly mentions a date (e.g., "18 okt", "18 oktober", "kemarin", "2 hari lalu"), extract and calculate the exact target date in "YYYY-MM-DD" format using CURRENT TODAY DATE as reference.
- If no date is specified in prompt, set "date": "${todayStr}".

CURRENT USER BALANCES:
- Cash Balance: Rp ${balances.cash ?? 0}
- Bank Balance: Rp ${balances.bank ?? 0}
- Investment Balance: Rp ${balances.investment ?? 0}

ALLOWED CATEGORIES ONLY:
- "Food & Drinks" (Meals, drinks, food, coffee, restaurants, etc.)
- "Transportation" (Gojek, Grab, gas, parking, transport, etc.)
- "Utilities" (Bills, wifi, electricity, phone credit, SPP, etc.)
- "Entertainment" (Movies, games, netflix, spotify, etc.)
- "Healthcare" (Doctors, medicine, pharmacy, etc.)
- "Investment" (Stocks, crypto, mutual funds, etc.)
- "Salary" (Wages, income)
- "Bonus" (THR, incentives)
- "Transfer" (Transfers between accounts)
- "Others"

RECURRING RULES:
- If prompt says "setiap X hari" (e.g. "setiap 30 hari"):
  * Set "is_recurring": true
  * Set "frequency": "interval_days"
  * Set "interval_days": X
  * Set "day_of_month": null
- If prompt says "setiap tanggal X" or "tiap tgl X":
  * Set "is_recurring": true
  * Set "frequency": "monthly"
  * Set "day_of_month": X
  * Set "interval_days": null

MANDATORY JSON FORMAT:
{
  "isReset": false,
  "is_recurring": false,
  "frequency": null,
  "interval_days": null,
  "day_of_month": null,
  "title": "Makan Nasi Goreng",
  "amount": 16000,
  "type": "expense",
  "category": "Food & Drinks",
  "account": "bank",
  "to_account": null,
  "date": "2026-10-18"
}
`;

    let response: any = null;

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const contents: any[] = [];
      if (userPrompt) contents.push(userPrompt);
      if (imageBase64) {
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64.split(',')[1] || imageBase64,
          },
        });
      }
      const payloadContents = contents.length > 0 ? contents : ['0'];

      try {
        response = await generateWithTimeout(ai, 'gemini-3.5-flash-lite', payloadContents, systemInstruction, 10000);
      } catch (err1) {
        try {
          response = await generateWithTimeout(ai, 'gemini-3.8-flash', payloadContents, systemInstruction, 10000);
        } catch (err2) {
          try {
            response = await generateWithTimeout(ai, 'gemini-3.1-flash-lite', payloadContents, systemInstruction, 10000);
          } catch (err3) {
            response = null;
          }
        }
      }
    }

    let rawText = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData: any;
    try {
      if (!rawText) throw new Error('AI Response empty');
      parsedData = JSON.parse(rawText);
    } catch (e) {
      parsedData = {
        isReset: false,
        is_recurring: false,
        frequency: null,
        day_of_month: null,
        interval_days: null,
        title: userPrompt.replace(/\d+/g, '').trim() || 'Transaksi',
        amount: 0,
        type: 'expense',
        category: 'Others',
        account: 'bank',
        to_account: null,
        date: todayStr,
      };
    }

    // Tangani Ekstraksi Tanggal
    const explicitDate = parseExplicitDateFromPrompt(userPrompt, todayStr);
    if (explicitDate) {
      parsedData.date = explicitDate;
    } else if (!parsedData.date) {
      parsedData.date = todayStr;
    }

    // Tangani Rutin
    const intervalDays = parseIntervalDaysFromPrompt(userPrompt);
    const monthlyDay = parseMonthlyDayFromPrompt(userPrompt);

    if (intervalDays !== null) {
      parsedData.is_recurring = true;
      parsedData.frequency = 'interval_days';
      parsedData.interval_days = intervalDays;
      parsedData.day_of_month = null;
    } else if (monthlyDay !== null) {
      parsedData.is_recurring = true;
      parsedData.frequency = 'monthly';
      parsedData.day_of_month = monthlyDay;
      parsedData.interval_days = null;
    }

    parsedData.amount = extractRealAmount(userPrompt, Number(parsedData.amount) || 0);
    parsedData.account = sanitizeAccount(parsedData.account);
    if (parsedData.to_account) {
      parsedData.to_account = sanitizeAccount(parsedData.to_account);
    }
    parsedData.category = normalizeCategory(parsedData.category, parsedData.type, userPrompt);

    if (parsedData.type === 'transfer') {
      const fromName = parsedData.account.toUpperCase();
      const toName = (parsedData.to_account || 'BANK').toUpperCase();
      parsedData.title = `Transfer: ${fromName} ➔ ${toName}`;
    }

    if (!parsedData.isReset) {
      if (parsedData.is_recurring) {
        const payload: any = {
          title: parsedData.title || 'Transaksi Rutin',
          amount: Number(parsedData.amount) || 0,
          type: parsedData.type || 'expense',
          category: parsedData.category || 'Others',
          account: parsedData.account || 'bank',
          to_account: parsedData.type === 'transfer' ? parsedData.to_account || 'bank' : null,
          frequency: parsedData.frequency || 'monthly',
          last_executed_date: parsedData.date || todayStr,
          user_id: user.id,
        };

        if (parsedData.frequency === 'monthly') {
          payload.day_of_month = Number(parsedData.day_of_month) || 1;
        } else if (parsedData.frequency === 'interval_days') {
          payload.interval_days = Number(parsedData.interval_days) || 30;
        }

        const { error: recError } = await supabaseAdmin.from('recurring_transactions').insert([payload]);

        if (recError) {
          console.error('❌ Supabase Recurring Insert Error:', recError);
          return NextResponse.json(
            { success: false, error: `Gagal menyimpan transaksi rutin: ${recError.message}` },
            { status: 500 }
          );
        }

        await supabaseAdmin.from('transactions').insert([
          {
            title: `[Otomatis] ${parsedData.title || 'Transaksi Rutin'}`,
            amount: Number(parsedData.amount) || 0,
            type: parsedData.type || 'expense',
            category: parsedData.category || 'Others',
            account: parsedData.account || 'bank',
            to_account: parsedData.type === 'transfer' ? parsedData.to_account || 'bank' : null,
            date: parsedData.date || todayStr,
            user_id: user.id,
          },
        ]);

      } else {
        const { error: dbError } = await supabaseAdmin.from('transactions').insert([
          {
            title: parsedData.title || 'Transaksi',
            amount: Number(parsedData.amount) || 0,
            type: parsedData.type || 'expense',
            category: parsedData.category || 'Others',
            account: parsedData.account || 'bank',
            to_account: parsedData.type === 'transfer' ? parsedData.to_account || 'bank' : null,
            date: parsedData.date || todayStr,
            user_id: user.id,
          },
        ]);

        if (dbError) {
          console.error('❌ Supabase Insert Error:', dbError);
          return NextResponse.json(
            { success: false, error: `Gagal menyimpan transaksi: ${dbError.message}` },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('❌ Root API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}