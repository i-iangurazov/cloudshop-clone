import { toIntlLocale } from "@/lib/locales";
import { defaultTimeZone } from "@/lib/timezone";

export const formatCurrencyKGS = (amount: number, locale: string) =>
  new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "KGS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const formatNumber = (
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(toIntlLocale(locale), options).format(value);

export const formatDate = (value: Date | string | number, locale: string) =>
  new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: defaultTimeZone,
  }).format(new Date(value));

export const formatDateTime = (value: Date | string | number, locale: string) =>
  new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: defaultTimeZone,
  }).format(new Date(value));
