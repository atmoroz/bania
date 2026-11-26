"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib";

/**
 * Thin wrapper over Radix Dialog, styled to the design: sharp corners, a
 * hairline bronze border, and the frosted "steam" surface the spec calls for
 * on overlays.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bg-surface-lowest/80 fixed inset-0 z-50 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "bg-surface-container border-bronze/30 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border p-7 md:p-9",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="text-muted-foreground hover:text-foreground absolute top-5 right-5 transition-colors"
          aria-label="Закрити"
        >
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-[28px] leading-9", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground mt-3 text-[15px] leading-6", className)}
      {...props}
    />
  );
}
