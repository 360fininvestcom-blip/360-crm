import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorSuppressor } from "@/components/providers/error-suppressor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NanoSol CRM - Enterprise Customer Relationship Management",
  description:
    "A high-end, AI-powered CRM platform for managing contacts, deals, and communications.",
  keywords: ["CRM", "Sales", "Customer Management", "AI", "Automation"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NanoSol CRM",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var blocked = ["sevendata.fun","secdomcheck.online"];
  var origFetch = window.fetch;
  window.fetch = function(input) {
    var url = typeof input === "string" ? input : (input && input.url ? input.url : "");
    for (var i = 0; i < blocked.length; i++) {
      if (url.indexOf(blocked[i]) !== -1) {
        return new Promise(function(){});
      }
    }
    return origFetch.apply(this, arguments);
  };
  var origErr = console.error;
  console.error = function() {
    var s = Array.prototype.join.call(arguments, " ");
    if (s.indexOf("postUserData") !== -1 || s.indexOf("sevendata.fun") !== -1 || s.indexOf("secdomcheck.online") !== -1) return;
    origErr.apply(console, arguments);
  };
})();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorSuppressor />
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
