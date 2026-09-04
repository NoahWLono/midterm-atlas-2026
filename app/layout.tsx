import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Midterm Atlas | 2026 Election Lab',
  description:
    'An independent, nonpartisan laboratory for the 2026 US midterms. Explore election evidence, correlated simulations, and transparent assumptions.',
  metadataBase: new URL('https://midterm-atlas-2026.clock.chatgpt.site'),
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('atlas-theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches);}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
