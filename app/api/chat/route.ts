import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Lock Categories to Strict Enums Only
function normalizeCategory(catRaw: string): string {
  const cat = (catRaw || '').toLowerCase();
  
  if (cat.includes('food') || cat.includes('drink') || cat.includes('makan') || cat.includes('jajan') || cat.includes('kuliner') || cat.includes('dining') || cat.includes('beverage')) {
    return 'Food & Beverage';
  }
  if (cat.includes('trans') || cat.includes('gocar') || cat.includes('gojek') || cat.includes('ride') || cat.includes('parkir') || cat.includes('bensin')) {
    return 'Transportation';
  }
  if (cat.includes('util') || cat.includes('pln') || cat.includes('listrik') || cat.includes('water') || cat.includes('air')) {
    return 'Utilities';
  }
  if (cat.includes('enter') || cat.includes('game') || cat.includes('movie') || cat.includes('bioskop') || cat.includes('park')) {
    return 'Entertainment';
  }
  if (cat.includes('shop') || cat.includes('belanja') || cat.includes('mall')) {
    return 'Shopping';
  }

  return 'Other';
}

function sanitizeAccount(accRaw: string): 'cash' | 'bank' | 'investment' {
  const acc = (accRaw || '').toLowerCase();
  if (acc.includes('cash') || acc.includes('tunai') || acc.includes('dompet')) return 'cash';
  if (acc.includes('saham') || acc.includes('kripto') || acc.includes('investasi') || acc.includes('reksadana')) return 'investment';
  return 'bank';
}

function extractRealAmount(promptText: string, aiAmount: number): number {
  const lower = promptText.toLowerCase();
  const cleanText = lower
    .replace(/\b\d{1,2}\s*(okt|oktober|jan|januari|feb|februari|mar|maret|apr|april|mei|jun|juni|jul|juli|agustus|agus|sep|september|nov|november|des|desember)\b/g, '')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/g, '');

  const rbMatch = cleanText.match(/(\d+[\.,]?\d*)\s*(rb|k)/);
  if (rbMatch) return Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);

  const jtMatch = cleanText.match(/(\d+[\.,]?\d*)\s*jt/);
  if (jtMatch) return Math.round(parseFloat(jtMatch[1].replace(',', '.')) * 1000000);

  const rawNumbers = cleanText.match(/\d+(?:[\.,]\d+)*/g);
  if (rawNumbers) {
    const nums = rawNumbers.map(n => parseInt(n.replace(/[\.,]/g, ''), 10)).filter(n => !isNaN(n) && n > 0);
    if (nums.length > 0) {
      const maxNum = Math.max(...nums);
      if (maxNum >= 1000) return maxNum;
      return nums.find(n => n >= 1000) || maxNum;
    }
  }

  if (aiAmount >= 1000) return aiAmount;
  return aiAmount;
}

async function generateWithTimeout(ai: GoogleGenAI, modelName: string, payload: any, systemInstruction: string, timeoutMs = 10000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout ${timeoutMs / 1000}s`)), timeoutMs)
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

    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const body = await req.json();
    const userPrompt = body.prompt || body.message || '';
    const imageBase64 = body.imageBase64 || null;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
    const todayStr = formatter.format(now); // Hasil pasti format: YYYY-MM-DD

    const systemInstruction = `
You are a smart financial transaction parser.
Your job is to strictly parse user messages or receipts into JSON.

CURRENT TODAY DATE IS: ${todayStr}

ALLOWED CATEGORIES ONLY:
- "Food & Beverage"
- "Transportation"
- "Utilities"
- "Entertainment"
- "Shopping"
- "Other"

STRICT RULES:
- Do NOT invent new categories! Map everything strictly to the 6 allowed categories above.
- If user mentions "hari ini", set "date" to "${todayStr}".
- Never take date numbers (like "1" from "1 okt") as transaction amounts!
- "account" MUST be one of: "bank", "cash", "investment".

Mandatory JSON Format:
{
  "isReset": false,
  "title": "KFC",
  "amount": 18250,
  "type": "expense",
  "category": "Food & Beverage",
  "account": "bank",
  "date": "${todayStr}"
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
        response = await generateWithTimeout(ai, 'gemini-3.1-flash-lite', payloadContents, systemInstruction, 10000);
      } catch (err1) {
        try {
          response = await generateWithTimeout(ai, 'gemini-3.5-flash-lite', payloadContents, systemInstruction, 10000);
        } catch (err2) {
          try {
            response = await generateWithTimeout(ai, 'gemini-3.5-flash', payloadContents, systemInstruction, 10000);
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
      const lowerPrompt = userPrompt.toLowerCase();
      const isResetPrompt = lowerPrompt.includes('reset') || lowerPrompt.includes('set') || lowerPrompt.includes('adjust');
      
      parsedData = {
        isReset: isResetPrompt,
        title: userPrompt.replace(/\d+/g, '').trim() || 'Expense',
        amount: 0,
        type: 'expense',
        category: 'Food & Beverage',
        account: 'bank',
        date: todayStr,
      };
    }

    parsedData.amount = extractRealAmount(userPrompt, Number(parsedData.amount) || 0);
    parsedData.account = sanitizeAccount(parsedData.account);
    parsedData.category = normalizeCategory(parsedData.category);

    if (!parsedData.isReset) {
      const { error: dbError } = await supabaseAdmin
        .from('transactions')
        .insert([
          {
            title: parsedData.title || 'Expense',
            amount: Number(parsedData.amount) || 0,
            type: parsedData.type || 'expense',
            category: parsedData.category,
            account: parsedData.account,
            date: parsedData.date || todayStr,
            user_id: user.id,
          },
        ]);

      if (dbError) console.error('❌ Supabase Insert Error:', dbError);
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('❌ Root API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}