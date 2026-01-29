"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AddIcon,
  CloseIcon,
  EmptyIcon,
  StatusDangerIcon,
  StatusPendingIcon,
  StatusSuccessIcon,
  ViewIcon,
} from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrencyKGS, formatDate } from "@/lib/i18nFormat";
import { getPurchaseOrderStatusLabel } from "@/lib/i18n/status";
import { trpc } from "@/lib/trpc";
import { translateError } from "@/lib/translateError";
import { useSse } from "@/lib/useSse";

const PurchaseOrdersPage = () => {
  const t = useTranslations("purchaseOrders");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const canManage = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";
  const { toast } = useToast();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const listQuery = trpc.purchaseOrders.list.useQuery();
  const cancelMutation = trpc.purchaseOrders.cancel.useMutation({
    onMutate: (variables) => {
      setCancelingId(variables.purchaseOrderId);
    },
    onSuccess: () => {
      listQuery.refetch();
      toast({ variant: "success", description: t("cancelSuccess") });
    },
    onError: (error) => {
      toast({ variant: "error", description: translateError(tErrors, error) });
    },
    onSettled: () => {
      setCancelingId(null);
    },
  });

  useSse({
    "purchaseOrder.updated": () => listQuery.refetch(),
  });

  const statusLabel = (status: string) => getPurchaseOrderStatusLabel(t, status);

  const statusIcon = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return StatusSuccessIcon;
      case "PARTIALLY_RECEIVED":
        return StatusPendingIcon;
      case "CANCELLED":
        return StatusDangerIcon;
      case "APPROVED":
      case "SUBMITTED":
        return StatusPendingIcon;
      default:
        return StatusPendingIcon;
    }
  };

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          canManage ? (
            <Link href="/purchase-orders/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <AddIcon className="h-4 w-4" aria-hidden />
                {t("new")}
              </Button>
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("number")}</TableHead>
                    <TableHead>{t("supplier")}</TableHead>
                    <TableHead>{t("store")}</TableHead>
                    <TableHead>{t("statusLabel")}</TableHead>
                    <TableHead>{t("total")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("created")}</TableHead>
                    <TableHead>{tCommon("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data?.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="text-xs text-gray-500" title={po.id}>
                        {po.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Link className="font-medium text-ink" href={`/purchase-orders/${po.id}`}>
                          {po.supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{po.store.name}</TableCell>
                      <TableCell>
                          <Badge
                            variant={
                              po.status === "RECEIVED"
                                ? "success"
                                : po.status === "PARTIALLY_RECEIVED"
                                  ? "warning"
                                  : po.status === "CANCELLED"
                                    ? "danger"
                                    : "warning"
                            }
                          >
                          {(() => {
                            const Icon = statusIcon(po.status);
                            return <Icon className="h-3 w-3" aria-hidden />;
                          })()}
                          {statusLabel(po.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {po.hasCost ? formatCurrencyKGS(po.total, locale) : tCommon("notAvailable")}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 hidden md:table-cell">
                        {formatDate(po.createdAt, locale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shadow-none"
                                aria-label={tCommon("view")}
                                onClick={() => router.push(`/purchase-orders/${po.id}`)}
                              >
                                <ViewIcon className="h-4 w-4" aria-hidden />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tCommon("view")}</TooltipContent>
                          </Tooltip>
                          {canManage && (po.status === "DRAFT" || po.status === "SUBMITTED") ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-danger shadow-none hover:text-danger"
                                  aria-label={t("cancelOrder")}
                                  onClick={() => {
                                    const confirmed = window.confirm(t("confirmCancel"));
                                    if (!confirmed) {
                                      return;
                                    }
                                    cancelMutation.mutate({ purchaseOrderId: po.id });
                                  }}
                                  disabled={cancelingId === po.id}
                                >
                                  {cancelingId === po.id ? (
                                    <Spinner className="h-4 w-4" />
                                  ) : (
                                    <CloseIcon className="h-4 w-4" aria-hidden />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("cancelOrder")}</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
          {listQuery.isLoading ? (
            <p className="mt-4 text-sm text-gray-500">{tCommon("loading")}</p>
          ) : !listQuery.data?.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <EmptyIcon className="h-4 w-4" aria-hidden />
                {t("noOrders")}
              </div>
              {canManage ? (
                <Link href="/purchase-orders/new" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    <AddIcon className="h-4 w-4" aria-hidden />
                    {t("new")}
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : null}
          {listQuery.error ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-red-500">
              <span>{translateError(tErrors, listQuery.error)}</span>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => listQuery.refetch()}
              >
                {tCommon("tryAgain")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrdersPage;
