import type { Metadata } from 'next'
import { M_PLUS_Rounded_1c, Zen_Maru_Gothic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import '../styles/themes/brand.css'

const rounded = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['400','500','700','800'],
  variable: '--font-sans-rounded',
  display: 'swap',
})

const zen = Zen_Maru_Gothic({
  subsets: ['latin'],
  weight: ['400','500','700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${rounded.className} ${rounded.variable} ${zen.variable} antialiased theme-bamboo shape-soft`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
