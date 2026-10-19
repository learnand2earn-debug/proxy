import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WebsiteSpark - Autonomous Proxy Intelligence & DRM Engine',
  description: 'Enterprise proxy discovery, continuous nanosecond health diagnostics, targeted country harvesting, and single-site DRM licensing.',
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
