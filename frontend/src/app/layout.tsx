import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GoogleAnalytics } from '@/components/Analytics';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://devenira.com'),
  title: {
    default: 'Devenira — See Proof Your Cut Is Working, Weekly',
    template: '%s | Devenira',
  },
  description: 'Upload a photo. See your AI goal body. Check in weekly to watch the gap close with visual proof. Built by someone who lost 50kg and knows the mirror lies.',
  keywords: ['body fat tracking', 'body transformation progress', 'weekly body check-in', 'cutting progress tracker', 'body recomp tracker', 'physique tracking app', 'body fat scanner', 'AI body transformation', 'visual progress proof'],
  authors: [{ name: 'Devenira' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://devenira.com',
    siteName: 'Devenira',
    title: 'Devenira — The Mirror Lies. Your Weekly Check-in Doesn\u2019t.',
    description: 'AI body check-in that shows the gap closing every week. Free first scan, no sign-up.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Devenira — See Proof Your Cut Is Working',
    description: 'AI body check-in that shows the gap closing every week. Built by someone who went from 120kg to 70kg.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    var ct = localStorage.getItem('color-theme');
    if (ct && ct !== 'gold') document.documentElement.classList.add('theme-' + ct);
    var lang = localStorage.getItem('ftf-locale');
    if (lang) document.documentElement.lang = lang;
    if (lang === 'ar') document.documentElement.dir = 'rtl';
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <GoogleAnalytics />
      </head>
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} font-sans antialiased bg-[#0a0a0f] text-white min-h-screen`}>
        {/* Fallback when client bundle has not loaded yet (e.g. ChunkLoadError) */}
        <div id="root-fallback" className="fixed inset-0 z-0 flex items-center justify-center bg-[#0a0a0f]" aria-hidden="true">
          <div className="text-center text-white/90">
            <p className="text-lg font-medium">Devenira</p>
            <p className="text-sm text-white/50 mt-1">Loading…</p>
          </div>
        </div>
        <div id="root-app" className="relative z-10 min-h-screen">
          <ThemeProvider>
            <LanguageProvider>
              <ErrorBoundary>
                <AuthProvider>
                  <SubscriptionProvider>
                    {children}
                    <Toaster position="top-center" />
                  </SubscriptionProvider>
                </AuthProvider>
              </ErrorBoundary>
            </LanguageProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
