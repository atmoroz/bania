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
  SlotListSkeleton,
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

function guestLine(booking: { customerName: string | null; customerPhone: string | null } | null | undefined) {
  if (!booking) return "";
  return [booking.customerName, booking.customerPhone].filter(Boolean).join(", ");
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

/**
 * How much of a visitor's hold is left, in words.
 *
 * A ten-minute hold looked the same at the fifth second and the five
 * hundred and ninety-fifth, which is exactly what the owner needs to
 * know before pressing confirm with somebody on the telephone.
 */
function holdLeft(expiresAt: string | null | undefined, nowMs: number): string | null {
  if (!expiresAt) return null;
  const left = Math.round((new Date(expiresAt).getTime() - nowMs) / 1000);
  if (left <= 0) return "час вийшов";
  if (left < 60) return `${left} с`;
  return `${Math.ceil(left / 60)} хв`;
}

function slotsHaveHold(day: AdminDay | null): boolean {
  if (!day?.open) return false;
  return day.slots.some((slot) => slot.state === "pending");
}

export function AdminBookingCalendar({ rooms }: { rooms: AdminRoom[] }) {
  const [roomSlug, setRoomSlug] = useState(rooms[0]?.slug ?? "");
  // Today, expanded, is what the owner needs on opening the page.
  const [date, setDate] = useState<Date>(() => new Date());
  const [day, setDay] = useState<AdminDay | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [dialog, setDialog] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Carried across the switch from confirming to creating, so a name
  // taken down over the telephone is not lost with the dead hold.
  const [typed, setTyped] = useState<{ name: string; phone: string } | null>(null);

  const isoDate = toIsoDate(date);

  const listRef = useRef<HTMLUListElement>(null);
  const firstOpenRef = useRef<HTMLLIElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  // Same reason as the public calendar: a grid row takes its tallest item, so
  // without this the long list sets the height and the calendar trails above.
  useMatchedHeight(leftColumnRef, rightColumnRef);

  useEffect(() => {
    // The failure belonged to the card and day that were on screen when
    // it happened; carrying it to the next one had the owner reading a
    // warning about a booking they could no longer see.
    startLoading(async () => {
      setError(null);
      setDay(await getAdminDay(roomSlug, isoDate));
    });
  }, [roomSlug, isoDate]);

  function refresh() {
    startLoading(async () => setDay(await getAdminDay(roomSlug, isoDate)));
  }

  // The day on screen goes stale on its own: holds lapse and visitors
  // release them, and nothing told the owner. The second it opens, the
  // page would re-read the day under a half-typed name, so the poll
  // stands still while the dialog is open.
  const hasHold = slotsHaveHold(day);
  useEffect(() => {
    if (dialog) return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    const poll = setInterval(
      () => void getAdminDay(roomSlug, isoDate).then(setDay),
      hasHold ? 15_000 : 60_000,
    );
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [dialog, hasHold, roomSlug, isoDate]);

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
    [day, isLoading],
  );

  async function onCancel(slot: AdminSlot) {
    if (!slot.booking) return;
    setBusyId(slot.booking.id);
    const result = await cancelBooking(slot.booking.id);
    setBusyId(null);
    if (!result.ok) setError(result.message);
    refresh();
  }

  function openDialog(next: Pending) {
    setError(null);
    setTyped(null);
    setDialog(next);
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
      // The hold died under the owner's hand, but the hour did not: turn
      // the dialog into a new booking for the same hour so whoever is on
      // the telephone can be written in without hunting for the row.
      if (result.stale) {
        setTyped({ name, phone });
        setDialog({ kind: "create", slot: { ...dialog.slot, booking: null } });
      }
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

        {/* Only when no dialog is covering it; the dialog shows its own. */}
        {error && !dialog ? (
          <p className="text-destructive mt-4 text-[15px]">{error}</p>
        ) : null}

        {/* Placeholder rows, not an empty frame: the owner opens this mid-call
            and should see the list taking shape rather than a blank panel. */}
        {!day || isLoading ? (
          <div className="border-bronze/10 mt-6 border-y">
            <SlotListSkeleton rows={6} />
          </div>
        ) : !day.open ? (
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
                  // One row at every width. Stacking the button under the
                  // hour made each slot three lines tall on a phone, and a
                  // day is sixteen of them. The row still wraps when a slot
                  // needs two buttons and there is no space for both.
                  className={cn(
                    "flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border p-4",
                    stateStyle[slot.state],
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[15px]">{slot.label}</p>
                    <p className="text-muted-foreground mt-1 text-[13px]">
                      {stateLabel[slot.state]}
                      {slot.state === "pending" && holdLeft(slot.booking?.holdExpiresAt, nowMs)
                        ? ` · лишилось ${holdLeft(slot.booking?.holdExpiresAt, nowMs)}`
                        : ""}
                      {/* Either may be missing, so join what there is rather
                          than hanging a comma off a blank or, worse, hiding a
                          phone number because no name was taken. */}
                      {guestLine(slot.booking) ? ` · ${guestLine(slot.booking)}` : ""}
                      {slot.booking?.note ? ` · ${slot.booking.note}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    {slot.state === "pending" ? (
                      <Button
                        onClick={() => openDialog({ kind: "confirm", slot })}
                        className="px-4 py-2"
                      >
                        <Check className="size-4" aria-hidden /> Підтвердити
                      </Button>
                    ) : null}

                    {slot.state === "free" ? (
                      <Button
                        variant="ghost"
                        onClick={() => openDialog({ kind: "create", slot })}
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

          {error ? (
            <p className="text-destructive mt-5 text-[14px] leading-snug">{error}</p>
          ) : null}

          <form action={onSubmit} className="mt-7 flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="label-caps text-muted-foreground">
                Ім’я гостя <span className="normal-case">(необов’язково)</span>
              </span>
              <input
                name="name"
                defaultValue={typed?.name ?? dialog?.slot.booking?.customerName ?? ""}
                className="border-foreground/25 focus:border-bronze border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-caps text-muted-foreground">
                Телефон <span className="normal-case">(необов’язково)</span>
              </span>
              <input
                name="phone"
                inputMode="tel"
                defaultValue={typed?.phone ?? dialog?.slot.booking?.customerPhone ?? ""}
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
