import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/shared/ToastProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Verified Local Talent Platform',
  description: 'Host-community digital recruitment platform for mining industries',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}