import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Circular House', description: 'Construction management for circular, low-waste residential projects.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
