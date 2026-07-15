import "./globals.css";

export const metadata = {
  title: "Sparkles - Software Contable",
  description: "Contabilidad y gestión tributaria (Colombia)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
