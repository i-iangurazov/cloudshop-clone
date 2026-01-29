"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/signout-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DashboardIcon,
  InventoryIcon,
  ActivityIcon,
  PurchaseOrdersIcon,
  SuppliersIcon,
  ProductsIcon,
  StoresIcon,
  UnitsIcon,
  UsersIcon,
  OnboardingIcon,
  HelpIcon,
  SupportIcon,
  MetricsIcon,
  JobsIcon,
  BillingIcon,
  AdjustIcon,
  UploadIcon,
  MenuIcon,
  CloseIcon,
  UserIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { normalizeLocale } from "@/lib/locales";
import { trpc } from "@/lib/trpc";
import { translateError } from "@/lib/translateError";

type NavItem = {
  key: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  managerOnly?: boolean;
};

type AppShellProps = {
  children: ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
  impersonation?: {
    targetName?: string | null;
    targetEmail?: string | null;
    expiresAt: string;
  } | null;
};

const stripLocaleFromPath = (pathname: string) => {
  const segments = pathname.split("/");
  const maybeLocale = normalizeLocale(segments[1]);
  if (maybeLocale) {
    const rest = `/${segments.slice(2).join("/")}`;
    return rest === "/" ? "/" : rest.replace(/\/$/, "");
  }
  return pathname;
};

export const AppShell = ({ children, user, impersonation }: AppShellProps) => {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tHeader = useTranslations("appHeader");
  const tErrors = useTranslations("errors");
  const tSupport = useTranslations("adminSupport");
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const normalizedPath = stripLocaleFromPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const navItems = useMemo<NavItem[]>(
    () => [
      { key: "dashboard", href: "/dashboard", icon: DashboardIcon },
      { key: "inventory", href: "/inventory", icon: InventoryIcon },
      { key: "reports", href: "/reports", icon: ActivityIcon, managerOnly: true },
      { key: "purchaseOrders", href: "/purchase-orders", icon: PurchaseOrdersIcon },
      { key: "suppliers", href: "/suppliers", icon: SuppliersIcon },
      { key: "products", href: "/products", icon: ProductsIcon },
      { key: "stores", href: "/stores", icon: StoresIcon },
      { key: "onboarding", href: "/onboarding", icon: OnboardingIcon, adminOnly: true },
      { key: "users", href: "/settings/users", icon: UsersIcon, adminOnly: true },
      { key: "attributes", href: "/settings/attributes", icon: AdjustIcon, adminOnly: true },
      { key: "units", href: "/settings/units", icon: UnitsIcon, adminOnly: true },
      { key: "imports", href: "/settings/import", icon: UploadIcon, adminOnly: true },
      { key: "billing", href: "/billing", icon: BillingIcon, adminOnly: true },
      { key: "adminSupport", href: "/admin/support", icon: SupportIcon, adminOnly: true },
      { key: "adminMetrics", href: "/admin/metrics", icon: MetricsIcon, adminOnly: true },
      { key: "adminJobs", href: "/admin/jobs", icon: JobsIcon, adminOnly: true },
      { key: "help", href: "/help", icon: HelpIcon },
    ],
    [],
  );

  const roleLabel =
    user.role === "ADMIN"
      ? tCommon("roles.admin")
      : user.role === "MANAGER"
        ? tCommon("roles.manager")
        : tCommon("roles.staff");

  const displayName = user.name ?? user.email ?? tCommon("userFallback");

  const exitImpersonation = async () => {
    try {
      await fetch("/api/impersonation", { method: "DELETE" });
      toast({ variant: "success", description: tSupport("impersonationEnded") });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast({ variant: "error", description: tErrors("unexpectedError") });
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(scanValue.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [scanValue]);

  const quickSearchQuery = trpc.products.searchQuick.useQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 },
  );

  const findByBarcodeMutation = trpc.products.findByBarcode.useMutation({
    onSuccess: (product, variables) => {
      if (product) {
        router.push(`/products/${product.id}`);
        setScanValue("");
        setShowResults(false);
        return;
      }
      const normalized = variables.value.trim();
      if (!normalized) {
        return;
      }
      toast({
        variant: "info",
        description: tHeader("barcodeNotFound", { value: normalized }),
        actionLabel: tHeader("createWithBarcode"),
        actionHref: `/products/new?barcode=${encodeURIComponent(normalized)}`,
      });
      setScanValue("");
      setShowResults(false);
    },
    onError: (error) => {
      toast({
        variant: "error",
        description: translateError(tErrors, error),
      });
    },
  });

  const handleScanSubmit = () => {
    if (!scanValue.trim() || findByBarcodeMutation.isLoading) {
      return;
    }
    findByBarcodeMutation.mutate({ value: scanValue });
  };

  const renderNavItems = (onNavigate?: () => void) =>
    navItems
      .filter((item) => {
        if (item.adminOnly && user.role !== "ADMIN") {
          return false;
        }
        if (item.managerOnly && user.role === "STAFF") {
          return false;
        }
        return true;
      })
      .map((item) => {
        const isActive =
          normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
              isActive ? "bg-gray-100 text-ink" : "text-gray-600 hover:bg-gray-50",
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden />
            <span>{tNav(item.key)}</span>
          </Link>
        );
      });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {impersonation ? (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <span>
              {tSupport("impersonationActive", {
                user: impersonation.targetName ?? impersonation.targetEmail ?? tCommon("userFallback"),
              })}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={exitImpersonation}>
              {tSupport("exitImpersonation")}
            </Button>
          </div>
        </div>
      ) : null}
      <header
        className={cn(
          "sticky z-40 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-3 shadow-sm lg:hidden",
          impersonation ? "top-10" : "top-0",
        )}
      >
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  aria-label={tCommon("openMenu")}
                >
                  <MenuIcon className="h-4 w-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tCommon("openMenu")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {tNav("platform")}
            </p>
            <p className="text-lg font-semibold text-ink">{tNav("brand")}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-gray-100 bg-white px-6 py-8 lg:flex">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {tNav("platform")}
              </p>
              <h1 className="text-xl font-semibold text-ink">{tNav("brand")}</h1>
            </div>
            <nav className="space-y-1">{renderNavItems()}</nav>
          </div>
          <div className="mt-10 border-t border-gray-100 pt-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <UserIcon className="h-4 w-4" aria-hidden />
              <span className="font-medium text-ink">{displayName}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{roleLabel}</p>
            <div className="mt-4">
              <SignOutButton />
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Input
                  type="search"
                  placeholder={tHeader("scanPlaceholder")}
                  value={scanValue}
                  onChange={(event) => setScanValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleScanSubmit();
                    }
                  }}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => {
                    setTimeout(() => setShowResults(false), 150);
                  }}
                  inputMode="search"
                  aria-label={tHeader("scanLabel")}
                />
                {showResults && quickSearchQuery.data?.length ? (
                  <div className="absolute z-20 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-64 overflow-y-auto py-1">
                      {quickSearchQuery.data.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full flex-col px-3 py-2 text-left text-sm transition hover:bg-gray-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            router.push(`/products/${item.id}`);
                            setScanValue("");
                            setShowResults(false);
                          }}
                        >
                          <span className="font-medium text-ink">{item.name}</span>
                          <span className="text-xs text-gray-500">{item.sku}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="hidden lg:flex">
                <LanguageSwitcher />
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-label={tCommon("closeMenu")}
          />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {tNav("platform")}
                </p>
                <p className="text-lg font-semibold text-ink">{tNav("brand")}</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileOpen(false)}
                      aria-label={tCommon("closeMenu")}
                    >
                      <CloseIcon className="h-4 w-4" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tCommon("closeMenu")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <nav className="mt-6 space-y-1">
              {renderNavItems(() => setMobileOpen(false))}
            </nav>

            <div className="mt-8 border-t border-gray-100 pt-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <UserIcon className="h-4 w-4" aria-hidden />
                <span className="font-medium text-ink">{displayName}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{roleLabel}</p>
              <div className="mt-4">
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
};
