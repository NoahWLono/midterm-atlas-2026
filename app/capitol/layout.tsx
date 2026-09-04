import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'An after-hours visitor pass · Midterm Atlas',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
