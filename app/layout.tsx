import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "./components/AnimatedBackground";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ChatWindowProvider } from "./contexts/ChatWindowContext";
import { UsuariosOrganizacionProvider } from "./contexts/UsuariosOrganizacionContext";
import { ProyectosProvider } from "./contexts/ProyectosContext";
import { RecursosProvider } from "./contexts/RecursosContext";
import TotalTimeNavbar from "./components/total-time-info";
import SettingsModal from "./components/SettingsModal";
import { ChatWindowManager } from "@/components/chat/ChatWindowManager";
import { IncomingMessagesListener } from "@/components/chat/IncomingMessagesListener";
import { MemoryMonitorWrapper } from "./components/MemoryMonitorWrapper";
import "@/utils/supabaseChannelMonitor"; // Monitor de canales

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Total-Time",
  description: "by BTM-Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <UsuariosOrganizacionProvider>
            <ProyectosProvider>
              <RecursosProvider>
                <SettingsProvider>
                  <ChatWindowProvider>
                <AnimatedBackground />
                <TotalTimeNavbar />
                <SettingsModal />
                <main className="pt-16 h-screen overflow-hidden">
                  {children}
                </main>
                <ChatWindowManager />
                <IncomingMessagesListener />
                {/* Monitor de memoria - configurable desde settings */}
                {/*<MemoryMonitorWrapper />*/}
                  </ChatWindowProvider>
                </SettingsProvider>
              </RecursosProvider>
            </ProyectosProvider>
          </UsuariosOrganizacionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
