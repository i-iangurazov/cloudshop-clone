"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { MoreIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type ActionMenuContextValue = {
  close: () => void;
};

const ActionMenuContext = createContext<ActionMenuContextValue | null>(null);

export const ActionMenu = ({ children, align = "right" }: { children: React.ReactNode; align?: "left" | "right" }) => {
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-8 px-0"
        aria-label={tCommon("actions")}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreIcon className="h-4 w-4" aria-hidden />
      </Button>
      {open ? (
        <div
          className={cn(
            "absolute z-30 mt-2 min-w-[160px] rounded-md border border-gray-200 bg-white p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <ActionMenuContext.Provider value={{ close: () => setOpen(false) }}>
            {children}
          </ActionMenuContext.Provider>
        </div>
      ) : null}
    </div>
  );
};

export const ActionMenuItem = ({
  children,
  onSelect,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  const ctx = useContext(ActionMenuContext);
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm text-ink transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400",
        className,
      )}
      onClick={() => {
        if (disabled) {
          return;
        }
        onSelect?.();
        ctx?.close();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
