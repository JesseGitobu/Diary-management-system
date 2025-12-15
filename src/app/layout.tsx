// src/app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { APP_CONFIG } from "@/lib/config/constants"
import { AuthProvider } from "@/lib/hooks/useAuth"
import { OnlineStatusIndicator } from "@/components/common/OnlineStatusIndicator"
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { PWARegister } from "@/components/pwa/PWARegister"
import { PerformanceDebugger } from "@/lib/performance/monitoring"
import { Toaster } from "react-hot-toast"

const inter = Inter({ subsets: ["latin"] })

// 1. UPDATED METADATA
export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
  manifest: '/manifest.json',
  // Next.js handles these tags automatically based on this object
  // icons: {
  //   icon: '/icons/icon.png',
  //   apple: '/icons/icon.png', // This covers apple-touch-icon
  // },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_CONFIG.name,
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* 2. REMOVED MANUAL <HEAD> TAGS - The metadata object above handles them now */}
      <body className={inter.className}>
        <AuthProvider>
          <PWARegister />
          <OnlineStatusIndicator />
          <main className="min-h-screen bg-background">
            {children}
          </main>
          <InstallPrompt />
          <PerformanceDebugger />
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#16a34a',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}