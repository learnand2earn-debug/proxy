import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Proxy Intelligence, Discovery & Monitoring Platform',
  description: 'Enterprise-grade proxy inventory, health verification, SSRF protection, inactive recovery monitoring, and browser extension companion.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
