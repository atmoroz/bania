"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Phone } from "lucide-react";

import { cn } from "@/shared/lib";
import {
  Button,
  ButtonLink,
  Calendar,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui";

import { getDayAvailability, placeHold, type DayAvailability } from "../model/actions";
import { formatVenueDate, type Slot } from "../model/slots";

export type BookingRoom = { slug: string; name: string };

/** Local date as YYYY-MM-DD, which is what the schedule function expects. */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const stateStyles: Record<Slot["state"], string> = {
  free: "border-bronze/25 hover:border-bronze hover:bg-bronze/10",
  busy: "border-bronze/10 text-muted-foreground line-through cursor-not-allowed",
  held: "border-bronze/10 text-muted-foreground cursor-not-allowed",
  past: "border-bronze/10 text-muted-foreground opacity-40 cursor-not-allowed",
};

const stateLabels: Record<Slot["state"], string> = {
  free: "Вільно",
  busy: "Зайнято",
  held: "Утримується",
  past: "Минув",
};

export function BookingCalendar({
  rooms,
  phoneDisplay,
  phoneHref,
}: {
  rooms: BookingRoom[];
  phoneDisplay: string;
  phoneHref: string;
}) {
  const [roomSlug, setRoomSlug] = useState(rooms[0]?.slug ?? "");
  const [date, setDate] = useState<Date>(() => new Date());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, startLoading] = useTransition();

  const [held, setHeld] = useState<{ slots: Slot[]; date: Date } | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const isoDate = toIsoDate(date);

  // The effect only fetches. Clearing the selection belongs to the actions that
  // invalidate it — changing room or day — not to a side effect of rendering.
  useEffect(() => {
    startLoading(async () => {
      setAvailability(await getDayAvailability(roomSlug, isoDate));
    });
  }, [roomSlug, isoDate]);

  function chooseRoom(slug: string) {
    setRoomSlug(slug);
    setSelected([]);
  }

  function chooseDate(next: Date) {
    setDate(next);
    setSelected([]);
  }

  function refresh() {
    startLoading(async () => {
      setAvailability(await getDayAvailability(roomSlug, isoDate));
    });
  }

  // The hold lives five minutes. The countdown is the honest part of the
  // promise: when it reaches zero the slot really is free again.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const slots = useMemo(
    () => (availability?.open ? availability.slots : []),
    [availability],
  );
  const selectedSlots = useMemo(
    () => slots.filter((s) => selected.includes(s.startsAt)),
    [slots, selected],
  );

  function toggle(slot: Slot) {
    if (slot.state !== "free") return;
    setSelected((current) =>
      current.includes(slot.startsAt)
        ? current.filter((s) => s !== slot.startsAt)
        : [...current, slot.startsAt],
    );
  }

  async function confirm() {
    setIsHolding(true);
    setHoldError(null);
    const result = await placeHold(roomSlug, selected);
    setIsHolding(false);

    if (!result.ok) {
      setHoldError(result.message);
      refresh();
      return;
    }

    setHeld({ slots: selectedSlots, date });
    setSecondsLeft(300);
    setSelected([]);
    refresh();
  }

  const holdIsLive = secondsLeft > 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
      <div>
        <p className="label-caps text-bronze">1. Оберіть локацію</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {rooms.map((room) => (
            <button
              key={room.slug}
              type="button"
              onClick={() => chooseRoom(room.slug)}
              className={cn(
                "border px-4 py-3 text-[15px] transition-colors",
                room.slug === roomSlug
                  ? "border-bronze bg-sage-deep/40 text-foreground"
                  : "border-bronze/25 text-muted-foreground hover:border-bronze/60",
              )}
            >
              {room.name}
            </button>
          ))}
        </div>

        <p className="label-caps text-bronze mt-10">2. Оберіть день</p>
        <Card className="mt-4 p-5">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && chooseDate(d)}
            disabled={{ before: new Date() }}
          />
        </Card>
      </div>

      <div>
        <p className="label-caps text-bronze">
          3. Оберіть сеанси <span className="text-muted-foreground">(по 2 години)</span>
        </p>
        <p className="text-muted-foreground mt-2 text-[13px]">{formatVenueDate(date.toISOString())}</p>

        {isLoading ? (
          <p className="text-muted-foreground mt-6 flex items-center gap-2 text-[15px]">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Завантаження…
          </p>
        ) : availability && !availability.open ? (
          <p className="text-muted-foreground mt-6 text-[15px]">{availability.reason}</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {slots.map((slot) => {
              const isSelected = selected.includes(slot.startsAt);
              return (
                <li key={slot.startsAt}>
                  <button
                    type="button"
                    onClick={() => toggle(slot)}
                    disabled={slot.state !== "free"}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center justify-between border px-5 py-4 text-left transition-colors",
                      stateStyles[slot.state],
                      isSelected && "border-bronze bg-sage-deep/40",
                    )}
                  >
                    <span className="flex items-center gap-3 text-[15px]">
                      {isSelected ? (
                        <Check className="text-bronze size-4" aria-hidden />
                      ) : (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            slot.state === "free" ? "bg-sage" : "bg-muted-foreground/50",
                          )}
                          aria-hidden
                        />
                      )}
                      {slot.label}
                    </span>
                    <span className="label-caps text-muted-foreground">
                      {stateLabels[slot.state]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {holdError ? (
          <p className="text-destructive mt-5 text-[15px]">{holdError}</p>
        ) : null}

        {selected.length > 0 ? (
          <Button
            onClick={confirm}
            disabled={isHolding || holdIsLive}
            className="mt-8 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isHolding ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Бронюємо…
              </>
            ) : holdIsLive ? (
              `Бронь активна ще ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            ) : (
              `Підтвердити (${selected.length})`
            )}
          </Button>
        ) : null}
      </div>

      <Dialog open={held !== null} onOpenChange={(open) => !open && setHeld(null)}>
        <DialogContent>
          <DialogTitle>Бронь створено</DialogTitle>
          <DialogDescription>
            {held ? formatVenueDate(held.date.toISOString()) : null}
          </DialogDescription>

          <ul className="border-bronze/15 mt-6 flex flex-col border-t">
            {held?.slots.map((slot) => (
              <li
                key={slot.startsAt}
                className="border-bronze/15 flex items-center justify-between border-b py-3 text-[15px]"
              >
                <span>{slot.label}</span>
                <Check className="text-sage size-4" aria-hidden />
              </li>
            ))}
          </ul>

          <p className="mt-7 text-[15px] leading-6">
            Для завершення бронювання зв&apos;яжіться з адміністратором.
          </p>
          <p className="text-muted-foreground mt-2 text-[15px] leading-6">
            Бронь без підтвердження буде активна протягом{" "}
            <span className="text-bronze font-medium">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
            .
          </p>

          <ButtonLink href={phoneHref} className="mt-7 w-full">
            <Phone className="size-4" aria-hidden />
            {phoneDisplay}
          </ButtonLink>
        </DialogContent>
      </Dialog>
    </div>
  );
}
