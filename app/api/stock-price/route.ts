import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const rawSymbol = symbol.trim().toUpperCase();
    
    // Tentukan format Yahoo Finance Symbol
    let formattedSymbol = rawSymbol;
    const cryptoTickers = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'NEAR'];
    
    if (cryptoTickers.includes(rawSymbol) || rawSymbol.endsWith('-USD')) {
      formattedSymbol = rawSymbol.endsWith('-USD') ? rawSymbol : `${rawSymbol}-USD`;
    } else if (!rawSymbol.includes('.')) {
      formattedSymbol = `${rawSymbol}.JK`;
    }

    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];
    const regularMarketPrice = result?.meta?.regularMarketPrice;

    if (!regularMarketPrice) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 });
    }

    return NextResponse.json({
      symbol: rawSymbol,
      price: regularMarketPrice,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}