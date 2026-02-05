import './globals.css'

export const metadata = {
  title: 'AgenticSDLC',
  description: 'Multi-Agent System for Software Development',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
