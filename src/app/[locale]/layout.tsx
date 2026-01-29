import { notFound } from "next/navigation";

import { normalizeLocale } from "@/lib/locales";

const LocaleLayout = ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) => {
  if (!normalizeLocale(params.locale)) {
    notFound();
  }

  return children;
};

export default LocaleLayout;
