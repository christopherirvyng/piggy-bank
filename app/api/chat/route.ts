import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Urutan model: utama (murah & cepat) -> fallback. Bisa di-override lewat env GEMINI_MODELS="model-a,model-b"
const MODELS: string[] = (process.env.GEMINI_MODELS || 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const AI_TIMEOUT_MS = 20000;
const TIMEZONE = 'Asia/Jakarta';

const ALLOWED_CATEGORIES = [
  'Food & Drinks',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Investment',
  'Salary',
  'Bonus',
  'Transfer',
  'Others',
] as const;

const ALLOWED_ACCOUNTS = ['bank', 'cash', 'investment'] as const;
const ALLOWED_TYPES = ['expense', 'income', 'transfer'] as const;
const ALLOWED_FREQUENCIES = ['monthly', 'interval_days'] as const;

// Kata kunci eksplisit yang WAJIB ada di prompt agar transaksi dianggap rutin.
const RECURRING_KEYWORDS = /\b(setiap|tiap|rutin|every|berulang)\b/i;

type Category = (typeof ALLOWED_CATEGORIES)[number];
type Account = (typeof ALLOWED_ACCOUNTS)[number];
type TxType = (typeof ALLOWED_TYPES)[number];
type Frequency = (typeof ALLOWED_FREQUENCIES)[number];

interface ParsedItem {
  title: string;
  amount: number;
  type: TxType;
  category: Category;
  account: Account;
  to_account: Account | null;
  date: string; // YYYY-MM-DD
  is_recurring: boolean;
  frequency: Frequency | null;
  interval_days: number | null;
  day_of_month: number | null;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers: normalisasi & validasi output AI                                 */
/* -------------------------------------------------------------------------- */

function getTodayInJakarta(): { todayStr: string; weekday: string } {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now); // YYYY-MM-DD
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'long' }).format(now);
  return { todayStr, weekday };
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Mengubah nilai amount dari AI menjadi angka murni.
 * Menangani number biasa maupun string seperti "100rb", "1,5jt", "50.000", "100k".
 */
function normalizeAmount(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : 0;
  if (typeof raw !== 'string') return 0;

  const text = raw.toLowerCase().replace(/rp\.?/g, '').replace(/\s+/g, '').trim();
  const match = text.match(/^([\d.,]+)(miliar|milyar|billion|m|juta|jt|ribu|rb|k)?$/);
  if (!match) return 0;

  const [, numPart, suffix] = match;

  if (suffix) {
    const value = parseFloat(numPart.replace(',', '.'));
    if (Number.isNaN(value)) return 0;
    const multiplier =
      suffix === 'miliar' || suffix === 'milyar' || suffix === 'billion' || suffix === 'm'
        ? 1_000_000_000
        : suffix === 'juta' || suffix === 'jt'
          ? 1_000_000
          : 1_000;
    return Math.round(value * multiplier);
  }

  // Tanpa suffix: titik/koma dianggap pemisah ribuan
  const value = parseInt(numPart.replace(/[.,]/g, ''), 10);
  return Number.isNaN(value) ? 0 : value;
}

function normalizeCategory(raw: unknown, type: TxType): Category {
  if (type === 'transfer') return 'Transfer';
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const found = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === value);
  return found ?? 'Others';
}

function normalizeAccount(raw: unknown): Account {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const found = ALLOWED_ACCOUNTS.find((a) => a === value);
  return found ?? 'bank';
}

function normalizeType(raw: unknown): TxType {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const found = ALLOWED_TYPES.find((t) => t === value);
  return found ?? 'expense';
}

/**
 * Validasi + normalisasi satu item dari AI.
 * Mengembalikan null jika item tidak layak disimpan (mis. amount <= 0).
 */
function normalizeItem(raw: any, todayStr: string, recurringAllowed: boolean): ParsedItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const amount = normalizeAmount(raw.amount);
  if (amount <= 0) return null;

  const type = normalizeType(raw.type);
  const account = normalizeAccount(raw.account);
  let toAccount: Account | null = null;
  let title = typeof raw.title === 'string' ? raw.title.trim() : '';

  if (type === 'transfer') {
    toAccount = raw.to_account ? normalizeAccount(raw.to_account) : null;
    // Transfer harus punya tujuan yang berbeda dari akun asal
    if (!toAccount || toAccount === account) return null;
    title = `Transfer: ${account.toUpperCase()} ➔ ${toAccount.toUpperCase()}`;
  } else if (!title) {
    title = 'Transaksi';
  }

  const date = isValidDateString(raw.date) ? raw.date : todayStr;

  // Guard: rutin hanya valid jika AI bilang rutin DAN prompt memuat kata kunci eksplisit.
  let isRecurring = recurringAllowed && raw.is_recurring === true;
  let frequency: Frequency | null = null;
  let intervalDays: number | null = null;
  let dayOfMonth: number | null = null;

  if (isRecurring) {
    const freq = typeof raw.frequency === 'string' ? raw.frequency.trim().toLowerCase() : '';

    if (freq === 'interval_days') {
      const n = Math.trunc(Number(raw.interval_days));
      if (Number.isFinite(n) && n > 0) {
        frequency = 'interval_days';
        intervalDays = n;
      }
    } else if (freq === 'monthly') {
      const d = Math.trunc(Number(raw.day_of_month));
      frequency = 'monthly';
      dayOfMonth = Number.isFinite(d) && d >= 1 && d <= 31 ? d : Number(date.slice(8, 10));
    }

    // Frekuensi tidak jelas -> default bulanan pada tanggal transaksi
    if (!frequency) {
      frequency = 'monthly';
      dayOfMonth = Number(date.slice(8, 10));
    }
  }

  if (!isRecurring) {
    frequency = null;
    intervalDays = null;
    dayOfMonth = null;
  }

  return {
    title,
    amount,
    type,
    category: normalizeCategory(raw.category, type),
    account,
    to_account: toAccount,
    date,
    is_recurring: isRecurring,
    frequency,
    interval_days: intervalDays,
    day_of_month: dayOfMonth,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers: AI                                                               */
/* -------------------------------------------------------------------------- */

function buildSystemInstruction(todayStr: string, weekday: string, balances: Record<string, unknown>): string {
  return `
You are a precise financial transaction parser for an Indonesian personal finance app.
Convert the user's text and/or receipt image into JSON. Output ONLY valid JSON, no markdown, no commentary.

TODAY: ${todayStr} (${weekday}), timezone Asia/Jakarta.

USER BALANCES (context only, do not copy into output):
- Cash: Rp ${balances.cash ?? 0}
- Bank: Rp ${balances.bank ?? 0}
- Investment: Rp ${balances.investment ?? 0}

OUTPUT FORMAT (exactly this shape):
{
  "items": [
    {
      "title": "string",
      "amount": 100000,
      "type": "expense" | "income" | "transfer",
      "category": one of the allowed categories,
      "account": "bank" | "cash" | "investment",
      "to_account": null | "bank" | "cash" | "investment",
      "date": "YYYY-MM-DD",
      "is_recurring": false,
      "frequency": null | "monthly" | "interval_days",
      "interval_days": null | number,
      "day_of_month": null | number
    }
  ]
}

RULES:
1. MULTI-ITEM: Extract EVERY transaction as a separate object in "items".
   Example: "tgl 10 okt makan nasgor 20k, es teh 5k, bensin 15k" => 3 items (nasgor 20000, es teh 5000, bensin 15000), all dated the 10th of October.
   For a receipt image, extract every purchased line item as its own object. If the receipt shows a date, use it; otherwise use TODAY.
   If no transaction can be found, return {"items": []}.

2. DATE: Output exact YYYY-MM-DD, computed from TODAY.
   - Specific dates ("15 okt", "15 oktober", "tgl 15 okt") => that day; if the year is not stated, use the year of TODAY.
   - Relative dates: "kemarin" = TODAY-1, "kemarin lusa" = TODAY-2, "2 hari lalu" = TODAY-2, "besok" = TODAY+1, "lusa" = TODAY+2, "minggu lalu" = TODAY-7.
   - A date mentioned once applies to all items in that sentence unless an item has its own date.
   - If no date is mentioned, use TODAY.

3. RECURRING (strict):
   - "is_recurring" is true ONLY IF the user explicitly writes one of: "setiap", "tiap", "rutin", "every", "berulang".
   - Mentioning a specific date such as "tgl 15 okt makan ayam 100rb" is NOT recurring => is_recurring false.
   - "setiap X hari" / "tiap X hari": is_recurring true, frequency "interval_days", interval_days X, day_of_month null.
   - "setiap tanggal X" / "tiap tgl X" / "setiap bulan": is_recurring true, frequency "monthly", day_of_month X (1-31), interval_days null.
   - For recurring items, "date" is the first occurrence (TODAY unless stated).
   - Non-recurring items: is_recurring false, frequency null, interval_days null, day_of_month null.

4. AMOUNT: Pure integer in Rupiah. Convert "100k"/"100rb"/"100 ribu" => 100000, "1jt"/"1 juta" => 1000000, "1,5jt" => 1500000, "50.000" => 50000.

5. CATEGORY must be exactly one of:
   "Food & Drinks", "Transportation", "Utilities", "Entertainment", "Healthcare", "Investment", "Salary", "Bonus", "Transfer", "Others".
   Hints: makan/minum/kopi/jajan => Food & Drinks; bensin/parkir/tol/ojek/gocar/grab => Transportation;
   listrik/PLN/air/wifi/pulsa/kuota/SPP/tagihan => Utilities; bioskop/game/netflix/spotify => Entertainment;
   dokter/obat/apotek/BPJS => Healthcare; saham/kripto/reksadana => Investment; gaji => Salary; bonus/THR/komisi => Bonus.
   Type "transfer" always uses category "Transfer".

6. TYPE: "expense" for spending, "income" for money received (gaji, bonus, dividen), "transfer" for moving money between the user's own accounts.

7. ACCOUNT must be exactly "bank", "cash", or "investment". Default "bank" when not mentioned.
   tunai/cash/dompet => "cash"; saham/kripto/reksadana/portfolio => "investment".
   For "transfer": "account" is the source and "to_account" is the destination (they must differ). For non-transfer, "to_account" is null.

8. TITLE: short, clear, title-cased (e.g. "Makan Nasgor", "Bensin"). Do not include the amount or the date in the title.
`.trim();
}

async function generateWithTimeout(
  ai: GoogleGenAI,
  model: string,
  contents: any[],
  systemInstruction: string,
  timeoutMs: number
): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout ${timeoutMs / 1000}s on ${model}`)), timeoutMs);
  });

  try {
    const response: any = await Promise.race([
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0,
        },
      }),
      timeoutPromise,
    ]);

    const text: string = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text.trim()) throw new Error(`Empty response from ${model}`);
    return text;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Mencoba tiap model secara berurutan. Melempar ApiError 502 jika semuanya gagal. */
async function callAiWithFallback(contents: any[], systemInstruction: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      return await generateWithTimeout(ai, model, contents, systemInstruction, AI_TIMEOUT_MS);
    } catch (err: any) {
      const msg = `${model}: ${err?.message || err}`;
      console.error('⚠️ AI model failed ->', msg);
      errors.push(msg);
    }
  }

  throw new ApiError('Layanan AI sedang tidak tersedia. Silakan coba lagi beberapa saat.', 502);
}

function parseAiJson(rawText: string): any[] {
  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError('Respons AI bukan JSON yang valid. Silakan coba lagi.', 502);
  }

  if (Array.isArray(parsed)) return parsed; // toleransi jika AI mengembalikan array langsung
  if (parsed && Array.isArray(parsed.items)) return parsed.items;

  throw new ApiError('Format respons AI tidak sesuai (field "items" tidak ditemukan).', 502);
}

/* -------------------------------------------------------------------------- */
/*  Helpers: Supabase                                                         */
/* -------------------------------------------------------------------------- */

function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new ApiError('Konfigurasi server belum lengkap (Supabase).', 500);
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function saveItems(supabase: SupabaseClient, items: ParsedItem[], userId: string): Promise<void> {
  const recurringItems = items.filter((i) => i.is_recurring);

  // 1) Simpan aturan rutin (jika ada)
  let insertedRecurringIds: string[] = [];

  if (recurringItems.length > 0) {
    const recurringRows = recurringItems.map((item) => ({
      title: item.title,
      amount: item.amount,
      type: item.type,
      category: item.category,
      account: item.account,
      to_account: item.type === 'transfer' ? item.to_account : null,
      frequency: item.frequency,
      day_of_month: item.frequency === 'monthly' ? item.day_of_month : null,
      interval_days: item.frequency === 'interval_days' ? item.interval_days : null,
      last_executed_date: item.date,
      user_id: userId,
    }));

    const { data, error } = await supabase.from('recurring_transactions').insert(recurringRows).select('id');

    if (error) {
      console.error('❌ Supabase Recurring Insert Error:', error);
      throw new ApiError(`Gagal menyimpan transaksi rutin: ${error.message}`, 500);
    }
    insertedRecurringIds = (data || []).map((r: any) => r.id).filter(Boolean);
  }

  // 2) Simpan transaksi: item non-rutin langsung, item rutin sebagai transaksi perdana
  const transactionRows = items.map((item) => ({
    title: item.is_recurring ? `[Otomatis] ${item.title}` : item.title,
    amount: item.amount,
    type: item.type,
    category: item.category,
    account: item.account,
    to_account: item.type === 'transfer' ? item.to_account : null,
    date: item.date,
    user_id: userId,
  }));

  const { error: txError } = await supabase.from('transactions').insert(transactionRows);

  if (txError) {
    console.error('❌ Supabase Insert Error:', txError);

    // Rollback aturan rutin yang sudah terlanjur masuk agar data tetap konsisten
    if (insertedRecurringIds.length > 0) {
      const { error: rollbackError } = await supabase
        .from('recurring_transactions')
        .delete()
        .in('id', insertedRecurringIds);
      if (rollbackError) console.error('❌ Rollback recurring gagal:', rollbackError);
    }

    throw new ApiError(`Gagal menyimpan transaksi: ${txError.message}`, 500);
  }
}

/* -------------------------------------------------------------------------- */
/*  Route handler                                                             */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      throw new ApiError('Konfigurasi server belum lengkap (Gemini API key).', 500);
    }

    const supabase = getSupabaseAdmin();

    // --- Auth ---
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) throw new ApiError('Unauthorized: Missing token', 401);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new ApiError('Unauthorized: Session expired', 401);

    // --- Input ---
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ApiError('Body request bukan JSON yang valid.', 400);
    }

    const userPrompt: string = typeof (body.prompt ?? body.message) === 'string' ? (body.prompt ?? body.message).trim() : '';
    const imageBase64: string | null = typeof body.imageBase64 === 'string' && body.imageBase64 ? body.imageBase64 : null;
    const balances = body.balances && typeof body.balances === 'object' ? body.balances : { cash: 0, bank: 0, investment: 0 };

    if (!userPrompt && !imageBase64) {
      throw new ApiError('Prompt atau gambar struk wajib diisi.', 400);
    }

    const { todayStr, weekday } = getTodayInJakarta();
    const systemInstruction = buildSystemInstruction(todayStr, weekday, balances);

    // --- Susun payload untuk AI ---
    const contents: any[] = [];
    if (userPrompt) contents.push(userPrompt);
    if (imageBase64) {
      const dataUrlMatch = imageBase64.match(/^data:(image\/[a-zA-Z+.-]+);base64,([\s\S]*)$/);
      contents.push({
        inlineData: {
          mimeType: dataUrlMatch ? dataUrlMatch[1] : 'image/jpeg',
          data: dataUrlMatch ? dataUrlMatch[2] : imageBase64,
        },
      });
    }

    // --- Panggil AI (gagal => throw, TIDAK ada data dummy) ---
    const rawText = await callAiWithFallback(contents, systemInstruction);
    const rawItems = parseAiJson(rawText);

    // Rutin hanya boleh jika prompt teks memuat kata kunci eksplisit
    const recurringAllowed = RECURRING_KEYWORDS.test(userPrompt);

    const items: ParsedItem[] = [];
    let skipped = 0;
    for (const raw of rawItems) {
      const item = normalizeItem(raw, todayStr, recurringAllowed);
      if (item) items.push(item);
      else skipped += 1;
    }

    if (items.length === 0) {
      throw new ApiError(
        'Tidak ada transaksi valid yang berhasil dikenali. Coba tulis dengan lebih jelas (contoh: "makan nasgor 20rb").',
        422
      );
    }

    // --- Simpan ke database ---
    await saveItems(supabase, items, user.id);

    return NextResponse.json({
      success: true,
      data: { items, skipped },
    });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('❌ Root API Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}