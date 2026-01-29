"use client";

import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";
import { defaultLocale, locales, normalizeLocale, type Locale } from "@/lib/locales";

export const LanguageSwitcher = () => {
  const t = useTranslations("common");
  const router = useRouter();
  const locale = normalizeLocale(useLocale()) ?? defaultLocale;
  const { data: session } = useSession();

  const updateLocale = trpc.users.updateLocale.useMutation();
  const localeLabels: Record<Locale, string> = {
    ru: t("locales.ru"),
    kg: t("locales.kg"),
  };

  const handleSwitch = async (nextLocale: Locale) => {
    if (nextLocale === locale) {
      return;
    }
    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ locale: nextLocale }),
    });
    if (!response.ok) {
      return;
    }
    if (session?.user) {
      updateLocale.mutate({ locale: nextLocale });
    }
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="font-semibold text-gray-400">{t("language")}</span>
      {locales.map((availableLocale) => (
        <button
          key={availableLocale}
          type="button"
          className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
            locale === availableLocale
              ? "border-ink bg-ink text-white"
              : "border-gray-200 text-gray-500 hover:bg-gray-100"
          }`}
          aria-label={t("switchLocale", { locale: localeLabels[availableLocale] })}
          onClick={() => handleSwitch(availableLocale)}
        >
          {localeLabels[availableLocale]}
        </button>
      ))}
    </div>
  );
};
