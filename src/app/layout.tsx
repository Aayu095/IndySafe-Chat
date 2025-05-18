import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a common, clean sans-serif font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Changed from geist to a more standard variable name
});

export const metadata: Metadata = {
  title: 'IndySafe Chat',
  description: 'Public safety chatbot for Indianapolis empowering Indiana Communities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
