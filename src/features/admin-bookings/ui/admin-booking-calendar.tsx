"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";

import { cn, formatVenueDate, scrollChildToTop, useMatchedHeight } from "@/shared/lib";
import {
  Button,
  Calendar,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  ScrollFade,
} from "@/shared/ui";

import {
  cancelBooking,
  confirmBooking,
  createBooking,
  getAdminDay,
  type AdminDay,
  type AdminSlot,
} from "../model/actions";

export type AdminRoom = { slug: string; name: string };

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const stateLabel: Record<AdminSlot["state"], string> = {
  free: "Вільно",
  pending: "Очікує підтвердження",
  confirmed: "Підтверджено",
  past: "Минув",
};

const stateStyle: Record<AdminSlot["state"], string> = {
  free: "border-bronze/20",
  pending: "border-bronze bg-bronze/10",
  confirmed: "border-sage/40 bg-sage-deep/30",
  past: "border-bronze/10 opacity-40",
};

type Pending = { kind: "confirm"; slot: AdminSlot } | { kind: "create"; slot: AdminSlot };

export function AdminBookingCalendar({ rooms }: { rooms: AdminRoom[] }) {
  const [roomSlug, setRoomSlug] = useState(rooms[0]?.slug ?? "");
  // Today, expanded, is what the owner needs on opening the page.
  const [date, setDate] = useState<Date>(() => new Date());
  const [day, setDay] = useState<AdminDay | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [dialog, setDialog] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isoDate = toIsoDate(date);

  const listRef = useRef<HTMLUListElement>(null);
  const firstOpenRef = useRef<HTMLLIElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  // Same reason as the public calendar: a grid row takes its tallest item, so
  // without this the long list sets the height and the calendar trails above.
  useMatchedHeight(leftColumnRef, rightColumnRef);

  useEffect(() => {
    startLoading(async () => setDay(await getAdminDay(roomSlug, isoDate)));
  }, [roomSlug, isoDate]);

  function refresh() {
    startLoading(async () => setDay(await getAdminDay(roomSlug, isoDate)));
  }

  const slots = useMemo(() => (day?.open ? day.slots : []), [day]);

  // The first hour still worth acting on: a pending hold if there is one,
  // otherwise the first hour that has not passed.
  const firstOpenIndex = useMemo(() => {
    const pending = slots.findIndex((s) => s.state === "pending");
    return pending >= 0 ? pending : slots.findIndex((s) => s.state !== "past");
  }, [slots]);

  // Scroll the list, not the page, so a day full of past hours opens on the
  // part the owner can do something about.
  useEffect(
    () => scrollChildToTop(() => listRef.current, () => firstOpenRef.current),
    [day],
  );

  async function onCancel(slot: AdminSlot) {
    if (!slot.booking) return;
    setBusyId(slot.booking.id);
    const result = await cancelBooking(slot.booking.id);
    setBusyId(null);
    if (!result.ok) setError(result.message);
    refresh();
  }

  async function onSubmit(formData: FormData) {
    if (!dialog) return;
    const name = String(formData.get("name") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const note = String(formData.get("note") ?? "");

    const result =
      dialog.kind === "confirm" && dialog.slot.booking
        ? await confirmBooking(dialog.slot.booking.id, name, phone)
        : await createBooking(roomSlug, [dialog.slot.startsAt], name, phone, note);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setDialog(null);
    refresh();
  }

  return (
    <div className="grid items-stretch gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
      <div ref={leftColumnRef}>
        <p className="label-caps text-bronze">Локація</p>
        <div className="mt-4 grid gap-2">
          {rooms.map((room) => (
            <button
              key={room.slug}
              type="button"
              onClick={() => setRoomSlug(room.slug)}
              className={cn(
                "border px-4 py-3 text-left text-[15px] transition-colors",
                room.slug === roomSlug
                  ? "border-bronze bg-sage-deep/40"
                  : "border-bronze/25 text-muted-foreground hover:border-bronze/60",
              )}
            >
              {room.name}
            </button>
          ))}
        </div>

        <p className="label-caps text-bronze mt-8">День</p>
        <Card className="mt-4 p-4">
          <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
        </Card>
      </div>

      <div ref={rightColumnRef} className="flex min-h-0 flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-[22px]">{formatVenueDate(date.toISOString())}</p>
          {isLoading ? (
            <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
          ) : null}
        </div>

        {error ? <p className="text-destructive mt-4 text-[15px]">{error}</p> : null}

        {day && !day.open ? (
          <p className="text-muted-foreground mt-6 text-[15px]">{day.reason}</p>
        ) : (
          <ScrollFade scrollRef={listRef} className="border-bronze/10 mt-6 border-y">
            <ul
              ref={listRef}
              className="relative flex max-h-[420px] min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3 lg:max-h-none"
            >
              {slots.map((slot, index) => (
                <li
                  key={slot.startsAt}
                  ref={index === firstOpenIndex ? firstOpenRef : null}
                  className={cn("flex shrink-0 flex-col gap-3 border p-4 md:flex-row md:items-center md:justify-between", stateStyle[slot.state])}
                >
                  <div>
                    <p className="text-[15px]">{slot.label}</p>
                    <p className="text-muted-foreground mt-1 text-[13px]">
                      {stateLabel[slot.state]}
                      {slot.booking?.customerName
                        ? ` · ${slot.booking.customerName}, ${slot.booking.customerPhone}`
                        : ""}
                      {slot.booking?.note ? ` · ${slot.booking.note}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {slot.state === "pending" ? (
                      <Button
                        onClick={() => setDialog({ kind: "confirm", slot })}
                        className="px-4 py-2"
                      >
                        <Check className="size-4" aria-hidden /> Підтвердити
                      </Button>
                    ) : null}

                    {slot.state === "free" ? (
                      <Button
                        variant="ghost"
                        onClick={() => setDialog({ kind: "create", slot })}
                        className="px-4 py-2"
                      >
                        <Plus className="size-4" aria-hidden /> Забронювати
                      </Button>
                    ) : null}

                    {slot.booking ? (
                      <Button
                        variant="ghost"
                        disabled={busyId === slot.booking.id}
                        onClick={() => onCancel(slot)}
                        className="px-4 py-2"
                      >
                        {busyId === slot.booking.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <X className="size-4" aria-hidden />
                        )}
                        Скасувати
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollFade>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogTitle>
            {dialog?.kind === "confirm" ? "Підтвердити бронь" : "Нова бронь"}
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-[15px]">
            {formatVenueDate(date.toISOString())} · {dialog?.slot.label}
          </p>

          <form action={onSubmit} className="mt-7 flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="label-caps text-muted-foreground">Ім&apos;я гостя</span>
              <input
                name="name"
                required
                defaultValue={dialog?.slot.booking?.customerName ?? ""}
                className="border-foreground/25 focus:border-bronze border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-caps text-muted-foreground">Телефон</span>
              <input
                name="phone"
                required
                inputMode="tel"
                defaultValue={dialog?.slot.booking?.customerPhone ?? ""}
                className="border-foreground/25 focus:border-bronze border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
              />
            </label>
            {dialog?.kind === "create" ? (
              <label className="flex flex-col gap-2">
                <span className="label-caps text-muted-foreground">Нотатка</span>
                <input
                  name="note"
                  className="border-foreground/25 focus:border-bronze border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
                />
              </label>
            ) : null}

            <Button type="submit" className="mt-2 w-full">
              {dialog?.kind === "confirm" ? "Підтвердити" : "Створити"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
