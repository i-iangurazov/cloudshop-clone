"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { trpc } from "@/lib/trpc";
import { translateError } from "@/lib/translateError";

const ResetRequestPage = () => {
  const t = useTranslations("reset");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("emailInvalid")),
      }),
    [t],
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const requestMutation = trpc.publicAuth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSent(true);
      toast({ variant: "success", description: t("requestSent") });
    },
    onError: (error) => {
      toast({ variant: "error", description: translateError(tErrors, error) });
    },
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <p className="text-sm text-gray-600">{t("requestSent")}</p>
          ) : (
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => requestMutation.mutate(values))}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={t("emailPlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={requestMutation.isLoading}>
                  {requestMutation.isLoading ? <Spinner className="h-4 w-4" /> : null}
                  {requestMutation.isLoading ? tCommon("loading") : t("send")}
                </Button>
              </form>
            </Form>
          )}
          <a href="/login" className="text-sm font-semibold text-ink underline">
            {t("backToLogin")}
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetRequestPage;
