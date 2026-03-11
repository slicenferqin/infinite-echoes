import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '无尽回响 | Infinite Echoes',
  description: 'AI 驱动的无限流文字解谜游戏',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
