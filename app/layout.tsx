import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Piggy Bank AI',
  description: 'Smart Financial Tracker with Gemini AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans antialiased bg-[#F2F2F7]">
        {children}
      </body>
    </html>
  );
}