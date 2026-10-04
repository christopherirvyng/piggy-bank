import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key belum dipasang' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Memanggil ModelService.ListModels
    const response = await ai.models.list();

    return NextResponse.json({ success: true, models: response });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}