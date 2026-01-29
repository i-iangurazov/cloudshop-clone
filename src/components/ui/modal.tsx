"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export const Modal = ({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const tCommon = useTranslations("common");

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={() => onOpenChange(false)}
        aria-label={tCommon("close")}
      />
      <div className={cn("relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl", className)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  aria-label={tCommon("close")}
                >
                  <CloseIcon className="h-4 w-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tCommon("close")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
};
