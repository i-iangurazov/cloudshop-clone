import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import "./globals.css";
import { Providers } from "./providers";
import { defaultLocale } from "@/lib/locales";
import { defaultTimeZone } from "@/lib/timezone";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
  };
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const locale = (await getLocale()) ?? defaultLocale;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${openSans.className} min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100`}
      >
        <Providers locale={locale} messages={messages} timeZone={defaultTimeZone}>
          {children}
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
