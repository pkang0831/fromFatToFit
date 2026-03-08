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
  title: {
    default: 'Devenira — AI-Powered Fitness Tracking',
    template: '%s | Devenira',
  },
  description: 'Track calories with your camera, scan your body fat with AI, and visualize your transformation. All-in-one AI fitness app.',
  keywords: ['fitness tracker', 'calorie counter', 'body fat scanner', 'AI fitness', 'workout tracker', 'meal tracker', 'body transformation'],
  authors: [{ name: 'Devenira' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://devenira.com',
    siteName: 'Devenira',
    title: 'Devenira — AI-Powered Fitness Tracking',
    description: 'Track calories with your camera, scan your body fat with AI, and visualize your transformation.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Devenira — AI-Powered Fitness Tracking',
    description: 'Track calories with your camera, scan your body fat with AI, and visualize your transformation.',
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
    if (ct && ct !== 'cyan') document.documentElement.classList.add('theme-' + ct);
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
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} font-sans`}>
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
      </body>
    </html>
  );
}
