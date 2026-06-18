import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SMMGEN — #1 Social Media Marketing Panel',
  description:
    'Buy Instagram followers, TikTok likes, YouTube views and more at the best prices. Fast delivery, 24/7 support.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
