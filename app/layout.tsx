import "./globals.css";

export const metadata = { title: "SGA Presentation OS", description: "Interactive presentation: budget + calendar + PDFs + edits in real-time" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-50">
        {children}
      </body>
    </html>
  );
}
