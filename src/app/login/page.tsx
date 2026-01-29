import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LoginPage = async () => {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="w-full max-w-md flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("loginTitle")}</CardTitle>
          <p className="text-sm text-gray-500">{t("loginSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-6 text-xs text-gray-400">{t("demoAccounts")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
