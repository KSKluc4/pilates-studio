import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import NextAuthSessionProvider from "../components/NextAuthSessionProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Estúdio Vit",
  description: "Sistema de gestão para estúdios de pilates",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <NextAuthSessionProvider>
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
