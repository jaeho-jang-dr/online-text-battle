import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Online Text Battle',
  description: 'Battle with text against players worldwide',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}