import './globals.css';

export const metadata = { title: 'RetailOps | Kwe & Cole', description: 'Retail execution and sampling operations' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
