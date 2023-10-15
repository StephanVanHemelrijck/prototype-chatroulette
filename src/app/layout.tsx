import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SocketContextProvider } from "./context/store";
import Header from "./components/Header/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chatroulette Clone",
  description:
    "Project made by @vanhemelrijckstephan, for the course expertlab at Erasmushogeschool Brussel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} w-screen bg-stone-200 text-stone-900`}
      >
        <SocketContextProvider>
          <Header />
          <main style={{ height: "calc(100vh - 76px)" }}>{children}</main>
        </SocketContextProvider>
      </body>
    </html>
  );
}
