import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkillSwap | Peer-to-Peer Student Skill Exchange',
  description: 'Learn and teach skills peer-to-peer. Discover classmates, trade knowledge, and arrange learning sessions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
