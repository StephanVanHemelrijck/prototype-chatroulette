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
      <body className={`${inter.className} w-screen h-auto bg-zinc-800`}>
        <SocketContextProvider>
          <Header />
          {children}
        </SocketContextProvider>
      </body>
    </html>
  );
}
