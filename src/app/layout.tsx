import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'RetailOps | Kwe & Cole',
  description: 'Retail field operations for Kwe & Cole',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f7f7f5', color: '#171717', fontFamily: 'Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
