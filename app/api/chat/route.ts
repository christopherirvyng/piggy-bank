import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
You are an intelligent financial assistant that extracts ALL transaction items from user text or receipts into a JSON ARRAY.

CURRENT TODAY DATE IS: ${todayStr}

RULES:
1. MULTIPLE ITEMS: If the prompt contains multiple items (e.g. "makan nasgor 20rb, es teh 5k, bensin 15k" OR a receipt with multiple lines), extract EACH item as a separate object in the "items" array.
2. DATES:
   - If user explicitly mentions past/future dates (e.g., "15 okt", "kemarin", "2 hari lalu"), compute exact target date in "YYYY-MM-DD".
   - Default date is "${todayStr}".
3. RECURRING:
   - Set "is_recurring": true ONLY IF words like "setiap", "tiap", "rutin", or "every" are explicitly written for that item.
   - If user just states a date like "15 okt makan nasgor", "is_recurring" MUST BE false.
4. CATEGORIES (Must be one of):
   - "Food & Drinks", "Transportation", "Utilities", "Entertainment", "Healthcare", "Investment", "Salary", "Bonus", "Transfer", "Others".
5. ACCOUNTS (Must be one of: "bank", "cash", "investment"):
   - Infer from prompt (e.g. "cash", "tunai" -> "cash"). Default is "bank".

MANDATORY JSON RESPONSE FORMAT:
{
  "items": [
    {
      "title": "Makan Nasgor",
      "amount": 20000,
      "type": "expense",
      "category": "Food & Drinks",
      "account": "bank",
      "to_account": null,
      "date": "2026-10-15",
      "is_recurring": false,
      "frequency": null,
      "interval_days": null,
      "day_of_month": null
    }
  ]
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
          response = null;
        }
      }
    }

    let rawText = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedItems: any[] = [];
    try {
      if (!rawText) throw new Error('AI Response empty');
      const parsedJson = JSON.parse(rawText);
      parsedItems = Array.isArray(parsedJson.items) ? parsedJson.items : [parsedJson];
    } catch (e) {
      // Fallback jika AI gagal total
      parsedItems = [
        {
          title: userPrompt || 'Transaksi',
          amount: 0,
          type: 'expense',
          category: 'Others',
          account: 'bank',
          to_account: null,
          date: todayStr,
          is_recurring: false,
          frequency: null,
          interval_days: null,
          day_of_month: null,
        },
      ];
    }

    // Lakukan Loop & Insert untuk semua transaksi yang berhasil di-extract AI
    const insertedResults: any[] = [];

    for (const item of parsedItems) {
      const amountNum = Number(item.amount) || 0;
      const isRec = Boolean(item.is_recurring);

      if (isRec) {
        // Simpan ke Jadwal Rutin
        const recPayload: any = {
          title: item.title || 'Transaksi Rutin',
          amount: amountNum,
          type: item.type || 'expense',
          category: item.category || 'Others',
          account: item.account || 'bank',
          to_account: item.type === 'transfer' ? item.to_account || 'bank' : null,
          frequency: item.frequency || 'monthly',
          last_executed_date: item.date || todayStr,
          user_id: user.id,
        };

        if (item.frequency === 'monthly') recPayload.day_of_month = Number(item.day_of_month) || 1;
        if (item.frequency === 'interval_days') recPayload.interval_days = Number(item.interval_days) || 30;

        await supabaseAdmin.from('recurring_transactions').insert([recPayload]);

        // Insert juga ke riwayat transaksi perdana
        const { data: txData } = await supabaseAdmin.from('transactions').insert([
          {
            title: `[Otomatis] ${item.title || 'Transaksi Rutin'}`,
            amount: amountNum,
            type: item.type || 'expense',
            category: item.category || 'Others',
            account: item.account || 'bank',
            to_account: item.type === 'transfer' ? item.to_account || 'bank' : null,
            date: item.date || todayStr,
            user_id: user.id,
          },
        ]).select();

        if (txData) insertedResults.push(txData[0]);
      } else {
        // Transaksi Biasa
        const { data: txData } = await supabaseAdmin.from('transactions').insert([
          {
            title: item.title || 'Transaksi',
            amount: amountNum,
            type: item.type || 'expense',
            category: item.category || 'Others',
            account: item.account || 'bank',
            to_account: item.type === 'transfer' ? item.to_account || 'bank' : null,
            date: item.date || todayStr,
            user_id: user.id,
          },
        ]).select();

        if (txData) insertedResults.push(txData[0]);
      }
    }

    return NextResponse.json({ success: true, items: parsedItems, inserted: insertedResults });
  } catch (error: any) {
    console.error('❌ Root API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}