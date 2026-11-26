"use client";

import { uk } from "react-day-picker/locale";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib";

/**
 * Month picker, styled to the design rather than to a component library.
 *
 * react-day-picker is used directly instead of shadcn's wrapper: the wrapper
 * brings 200 lines of rounded-pill styling that this design would override line
 * by line — it calls for a rectilinear grid with hairline dividers and no
 * rounding anywhere. What is worth keeping from the library is the Ukrainian
 * locale, month navigation and keyboard support, and that is what is left.
 */
export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={uk}
      showOutsideDays={false}
      weekStartsOn={1}
      className={cn("w-full", className)}
      classNames={{
        months: "flex flex-col",
        month: "w-full",
        month_caption: "flex items-center justify-between pb-6",
        caption_label: "font-display text-[22px] leading-7 capitalize",
        nav: "flex items-center gap-2",
        button_previous:
          "border-bronze/30 hover:border-bronze hover:bg-bronze/10 inline-flex size-9 items-center justify-center border transition-colors disabled:opacity-30",
        button_next:
          "border-bronze/30 hover:border-bronze hover:bg-bronze/10 inline-flex size-9 items-center justify-center border transition-colors disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "label-caps text-muted-foreground flex-1 pb-3 text-center",
        week: "flex w-full",
        day: "border-bronze/10 flex-1 border-t p-0",
        day_button:
          "aria-selected:bg-bronze aria-selected:text-primary-foreground hover:bg-surface-high flex h-12 w-full items-center justify-center text-[15px] transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent",
        today: "text-bronze font-medium",
        outside: "opacity-30",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
