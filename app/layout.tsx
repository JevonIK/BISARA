import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BISARA — Belajar BISINDO untuk Berkomunikasi',
    template: '%s · BISARA',
  },
  description:
    'Platform belajar BISINDO berbasis misi, latihan kamera, dan simulasi percakapan sehari-hari.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
