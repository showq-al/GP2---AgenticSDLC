import "./globals.css";

export const metadata = {
  title: "GP2",
  description: "GP2 Project",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}