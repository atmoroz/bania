"use client";

import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Check, Loader2, Phone } from "lucide-react";

// Straight from the modules, not the slice barrel: the barrel also exports
// the cached query, which cannot be pulled into a client bundle.
import { IncludedDialog, RulesDialog } from "@/entities/rules/ui/rules-dialog";
import type { RuleSection } from "@/entities/rules/model/api";
import {
  cn,
  formatHryvnia,
  hasRunOfFreeSlots,
  formatVenueDate,
  scrollChildToTop,
  useMatchedHeight,
  type Slot,
} from "@/shared/lib";
import {
  Button,
  ButtonLink,
  Calendar,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  ScrollFade,
  SlotListSkeleton,
} from "@/shared/ui";

import {
  getDayAvailability,
  getRangeAvailability,
  placeHold,
  releaseHold,
  type DayAvailability,
} from "../model/actions";

export type BookingRoom = {
  slug: string;
  name: string;
  /** Minor units per hour; null when the card carries no price of its own. */
  pricePerHour: number | null;
};

/** Local date as YYYY-MM-DD, which is what the schedule function expects. */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Midnight today, so "before" means "an earlier day" and not "earlier than this
 * instant". Passing `new Date()` happens to work because react-day-picker
 * normalises it, but that is the library's behaviour rather than our intent,
 * and at 23:00 the difference is the whole of today.
 */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const stateStyles: Record<Slot["state"], string> = {
  free: "border-bronze/25 hover:border-bronze hover:bg-bronze/10",
  busy: "border-bronze/10 text-muted-foreground cursor-not-allowed",
  held: "border-bronze/10 text-muted-foreground cursor-not-allowed",
  past: "border-bronze/10 text-muted-foreground opacity-40 cursor-not-allowed",
};

/**
 * The hold this browser made, kept across reloads.
 *
 * Only what the page needs to show it and to let it go. The ids are the
 * ownership: they were returned to this browser and nowhere else.
 */
type MyHold = {
  ids: string[];
  expiresAt: string;
  roomSlug: string;
  roomName: string;
  dateLabel: string;
  from: string;
  to: string;
  hours: number;
};

const HOLD_KEY = "bania.hold";
const HOLD_EVENT = "bania:hold";

/**
 * localStorage as an external store, read with useSyncExternalStore.
 *
 * Not an effect that calls setState on mount: that renders twice for
 * nothing and the compiler refuses it. Subscribing also means a second
 * tab of the same site sees the hold appear and disappear.
 */
function subscribeToHold(onChange: () => void) {
  window.addEventListener(HOLD_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(HOLD_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function rawHold(): string | null {
  try {
    return window.localStorage.getItem(HOLD_KEY);
  } catch {
    return null;
  }
}

function parseHold(raw: string | null): MyHold | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MyHold;
    // Written by an older version of this code, or nonsense.
    return Array.isArray(parsed.ids) && typeof parsed.expiresAt === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeMyHold(hold: MyHold) {
  try {
    window.localStorage.setItem(HOLD_KEY, JSON.stringify(hold));
  } catch {
    // Private browsing, a full quota: the hold still exists in the
    // database and still lapses on its own. Nothing to tell anyone.
  }
  window.dispatchEvent(new Event(HOLD_EVENT));
}

function clearMyHold() {
  try {
    window.localStorage.removeItem(HOLD_KEY);
  } catch {
    // As above.
  }
  window.dispatchEvent(new Event(HOLD_EVENT));
}

const stateLabels: Record<Slot["state"], string> = {
  free: "Вільно",
  busy: "Заброньовано",
  held: "Утримується",
  past: "Минув",
};

export function BookingCalendar({
  rooms,
  phoneDisplay,
  phoneHref,
  rules,
  included,
}: {
  rooms: BookingRoom[];
  phoneDisplay: string;
  phoneHref: string;
  /** The house rules, read beside the button that books. */
  rules: RuleSection[];
  /** What the hour includes, behind the info icon next to them. */
  included: RuleSection[];
}) {
  // A link from a price card names its room, so the visitor lands on the one
  // they clicked rather than on whichever happens to be first.
  const requestedRoom = useSearchParams().get("room");
  const [roomSlug, setRoomSlug] = useState(
    () =>
      (requestedRoom && rooms.some((r) => r.slug === requestedRoom)
        ? requestedRoom
        : rooms[0]?.slug) ?? "",
  );
  const [date, setDate] = useState<Date>(() => new Date());
  const [month, setMonth] = useState<Date>(() => new Date());
  const [fullDates, setFullDates] = useState<string[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, startLoading] = useTransition();

  const [held, setHeld] = useState<{ slots: Slot[]; date: Date } | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  /**
   * The hold this browser owns, and the clock that counts it down.
   *
   * Both are read rather than stored twice: `mine` comes from
   * localStorage through the store above, and the seconds left are
   * arithmetic on it. A reload therefore restores the countdown instead
   * of showing free hours the database is still holding — which is
   * exactly what it used to do.
   */
  const storedRaw = useSyncExternalStore(subscribeToHold, rawHold, () => null);
  const mine = useMemo(() => parseHold(storedRaw), [storedRaw]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const secondsLeft = mine
    ? Math.max(0, Math.round((Date.parse(mine.expiresAt) - nowMs) / 1000))
    : 0;

  const isoDate = toIsoDate(date);

  const listRef = useRef<HTMLUListElement>(null);
  const firstOpenRef = useRef<HTMLLIElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  useMatchedHeight(leftColumnRef, rightColumnRef);

  // The effect only fetches. Clearing the selection belongs to the actions that
  // invalidate it — changing room or day — not to a side effect of rendering.
  useEffect(() => {
    startLoading(async () => {
      setAvailability(await getDayAvailability(roomSlug, isoDate));
    });
  }, [roomSlug, isoDate]);

  // Which days in the visible month are already full, so the calendar can say
  // so before the visitor clicks. Refetched when the room or the month changes.
  useEffect(() => {
    if (!roomSlug) return;
    let cancelled = false;

    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    void getRangeAvailability(roomSlug, toIsoDate(first), toIsoDate(last)).then((result) => {
      if (cancelled) return;
      setFullDates(result.fullDates);
      setClosedDates(result.closedDates);
    });

    return () => {
      cancelled = true;
    };
  }, [roomSlug, month]);

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

  /**
   * Bring the first bookable hour into view inside the list.
   *
   * Scrolls the container rather than calling scrollIntoView, which would move
   * the page as well and throw away where the visitor was looking. Early in the
   * day this does nothing; late in the day it saves scrolling past a dozen
   * hours that have already gone.
   */
  // isLoading is a dependency, not just availability: while the hours are
  // being fetched the list is replaced by placeholders, so the element to
  // scroll does not exist. Re-running when it comes back means the scroll no
  // longer depends on the retry budget outlasting the request.
  useEffect(
    () => scrollChildToTop(() => listRef.current, () => firstOpenRef.current),
    [availability, isLoading],
  );

  // One clock while a hold is running. When it reaches the expiry the
  // stored hold is dropped, which is also what the database has done by
  // then, and the store notifies everything that reads it.
  useEffect(() => {
    if (!mine) return;
    const id = setInterval(() => {
      setNowMs(Date.now());
      if (Date.parse(mine.expiresAt) <= Date.now()) clearMyHold();
    }, 1000);
    return () => clearInterval(id);
  }, [mine]);

  const slots = useMemo(
    () => (availability?.open ? availability.slots : []),
    [availability],
  );
  const selectedSlots = useMemo(
    () => slots.filter((s) => selected.includes(s.startsAt)),
    [slots, selected],
  );

  const slotMinutes = availability?.open ? availability.slotMinutes : 60;
  const minimumMinutes = availability?.open ? availability.minimumMinutes : 120;
  const minimumHours = Math.round(minimumMinutes / 60);

  /**
   * The minimum applies to each unbroken stretch, not to the total.
   *
   * Picking 10:00 and 14:00 is two hours of selection but two separate
   * one-hour bookings, and the database refuses both. Checking runs here
   * means the button says so before the visitor finds out the hard way.
   */
  // The first hour that is still bookable; -1 when the day is over.
  const firstOpenIndex = useMemo(
    () => slots.findIndex((s) => s.state !== "past"),
    [slots],
  );

  // What is being bought, in words and in money. A visitor was one click
  // from a ~2 200 ₴ commitment with the figure printed nowhere on the
  // page; this is the only place it can honestly appear, because until
  // the hours are chosen there is no total.
  const chosenRoom = rooms.find((r) => r.slug === roomSlug);
  const total =
    chosenRoom?.pricePerHour != null ? chosenRoom.pricePerHour * selectedSlots.length : null;

  const everyRunLongEnough = useMemo(() => {
    if (selectedSlots.length === 0) return false;

    const starts = selectedSlots
      .map((s) => new Date(s.startsAt).getTime())
      .sort((a, b) => a - b);

    let runStart = starts[0] as number;
    let previous = runStart;

    for (const start of starts.slice(1)) {
      if (start === previous + slotMinutes * 60_000) {
        previous = start;
        continue;
      }
      if (previous + slotMinutes * 60_000 - runStart < minimumMinutes * 60_000) return false;
      runStart = start;
      previous = start;
    }

    return previous + slotMinutes * 60_000 - runStart >= minimumMinutes * 60_000;
  }, [selectedSlots, slotMinutes, minimumMinutes]);

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

    const stored: MyHold = {
      ids: result.bookingIds,
      expiresAt: result.expiresAt,
      roomSlug,
      roomName: chosenRoom?.name ?? "",
      dateLabel: formatVenueDate(date.toISOString()),
      from: selectedSlots[0]?.label.split(" — ")[0] ?? "",
      to: selectedSlots[selectedSlots.length - 1]?.label.split(" — ")[1] ?? "",
      hours: selectedSlots.length,
    };
    writeMyHold(stored);
    setNowMs(Date.now());
    setSelected([]);
    refresh();
  }

  /** One press frees every hour of the hold, not one at a time. */
  async function release() {
    if (!mine) return;
    setIsReleasing(true);
    await releaseHold(mine.ids);
    setIsReleasing(false);
    clearMyHold();
    setHeld(null);
    refresh();
  }

  const holdIsLive = secondsLeft > 0;

  /**
   * The chosen day is open but has nothing left worth offering.
   *
   * Checked against the day's own slots rather than the month summary: the
   * month data can be a few seconds old, and this is the figure the visitor is
   * about to act on. On today it also covers the ordinary case of the hours
   * simply having run out.
   */
  const dayIsFull =
    availability?.open === true &&
    !hasRunOfFreeSlots(slots, Math.ceil(minimumMinutes / slotMinutes));

  const isToday = isoDate === toIsoDate(new Date());

  return (
    <div className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
      <div ref={leftColumnRef}>
        <p className="label-caps text-bronze">1. Оберіть локацію</p>
        {/* A grid, not a wrapping row: content-sized buttons produced a ragged
            staircase. Equal cells make the choice read as one set of options. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <button
              key={room.slug}
              type="button"
              onClick={() => chooseRoom(room.slug)}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-1 border px-4 py-4 text-center leading-tight transition-colors",
                room.slug === roomSlug
                  ? "border-bronze bg-sage-deep/40 text-foreground"
                  : "border-bronze/25 text-muted-foreground hover:border-bronze/60",
              )}
            >
              <span className="text-[15px]">{room.name}</span>
              {room.pricePerHour !== null ? (
                <span
                  className={cn(
                    "text-[13px]",
                    room.slug === roomSlug ? "text-bronze" : "text-muted-foreground/70",
                  )}
                >
                  від {formatHryvnia(room.pricePerHour)} / год
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <p className="label-caps text-bronze mt-10">2. Оберіть день</p>
        {/* The one frame on the page that keeps its ember turning: the
            calendar is the thing this page exists for. */}
        <Card ember="always" className="mt-4 p-5">
          {/* Full days stay clickable. Disabling them would hide why they are
              unavailable, and the visitor is owed the reason. */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && chooseDate(d)}
            month={month}
            onMonthChange={setMonth}
            disabled={{ before: startOfToday() }}
            modifiers={{
              full: (d) => fullDates.includes(toIsoDate(d)),
              closed: (d) => closedDates.includes(toIsoDate(d)),
            }}
            modifiersClassNames={{
              full: "text-muted-foreground/40 line-through",
              closed: "text-muted-foreground/40 line-through",
            }}
          />

          <p className="text-muted-foreground mt-4 flex items-center gap-2 text-[12px]">
            <span className="text-muted-foreground/40 line-through">00</span>
            <span>— вільного часу немає</span>
          </p>
        </Card>
      </div>

      {/* A column, so the list can take the slack and both columns end level
          instead of one trailing below the other. */}
      <div ref={rightColumnRef} className="flex min-h-0 flex-col">
        <p className="label-caps text-bronze">
          3. Оберіть сеанси{" "}
          {/* The figure comes from the card, not from the sentence: the
              chan asks for three hours and this line used to say two,
              contradicting the button a few rows below it. */}
          <span className="text-muted-foreground">
            (по годині, мінімум {minimumHours} поспіль)
          </span>
        </p>
        <p className="text-muted-foreground mt-2 text-[13px]">{formatVenueDate(date.toISOString())}</p>

        {isLoading ? (
          <div className="border-bronze/10 mt-5 border-y">
            <SlotListSkeleton />
          </div>
        ) : availability && !availability.open ? (
          <p className="text-muted-foreground mt-6 text-[15px]">{availability.reason}</p>
        ) : dayIsFull ? (
          <div className="border-bronze/20 bg-surface-low mt-6 border p-7">
            <p className="text-[15px] leading-6">
              {isToday
                ? "На жаль, на сьогодні вільного часу вже немає."
                : "На жаль, на цей день вільного часу немає."}
            </p>
            <p className="text-muted-foreground mt-2 text-[15px] leading-6">
              Будь ласка, оберіть іншу дату — у календарі закреслені дні вже зайняті.
            </p>
          </div>
        ) : (
          <ScrollFade scrollRef={listRef} className="border-bronze/10 mt-5 border-y">
            <ul
              ref={listRef}
              className="relative flex max-h-[380px] min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3 lg:max-h-none"
            >
              {slots.map((slot, index) => {
                const isSelected = selected.includes(slot.startsAt);
                const isFirstOpen = index === firstOpenIndex;
                return (
                  <li key={slot.startsAt} ref={isFirstOpen ? firstOpenRef : null} className="shrink-0">
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
          </ScrollFade>
        )}

        {!isLoading && slots.some((slot) => slot.state === "held") ? (
          <p className="text-muted-foreground mt-4 text-[12px] leading-5">
            «Утримується» — хтось обрав цю годину, але ще не підтвердив її дзвінком.
            Якщо потрібен саме цей час, запитайте адміністратора.
          </p>
        ) : null}

        {holdError ? (
          <p className="text-destructive mt-5 text-[15px]">{holdError}</p>
        ) : null}

        {/* Shown whenever there is something to choose, so the rule is visible
            before anything is clicked rather than appearing only once a
            selection exists. Hidden on a day with nothing left: a disabled
            "minimum two hours" under "this day is full" answers a question
            nobody is asking. */}
        {/* A hold this browser owns: what it is, that it is not yet a
            booking, and the two things to do about it. It replaces the
            confirm button, because with a hold running there is nothing
            to confirm until this one is settled. */}
        {mine && holdIsLive ? (
          <div className="border-bronze/30 mt-8 flex flex-col gap-3 border p-5">
            <p className="label-caps text-bronze">Ваша бронь</p>
            <p className="text-[15px]">{mine.roomName}</p>
            <p className="text-muted-foreground text-[13px] leading-5">
              {mine.dateLabel} · {mine.from} — {mine.to} · {mine.hours} год
            </p>
            <p className="text-muted-foreground text-[13px] leading-5">
              Ще не підтверджена. Зателефонуйте адміністратору, щоб закріпити цей час:
              без дзвінка години звільняться через{" "}
              <span className="text-bronze">{Math.max(1, Math.ceil(secondsLeft / 60))} хв</span>.
            </p>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={phoneHref} className="flex-1 justify-center">
                <Phone className="size-4" aria-hidden />
                {phoneDisplay}
              </ButtonLink>
              <Button
                type="button"
                variant="ghost"
                onClick={release}
                disabled={isReleasing}
                className="flex-1 justify-center"
              >
                {isReleasing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Скасовуємо…
                  </>
                ) : (
                  "Скасувати бронь"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
          {/* The summary sits directly above the button, so the last thing
              read before committing is what is being committed to. */}
          {selectedSlots.length > 0 && !dayIsFull && availability?.open !== false ? (
            <div className="border-bronze/20 mt-8 flex flex-col gap-2 border p-5">
              <p className="text-[15px]">{chosenRoom?.name}</p>
              <p className="text-muted-foreground text-[13px] leading-5">
                {formatVenueDate(date.toISOString())} ·{" "}
                {selectedSlots[0]?.label.split(" — ")[0]} —{" "}
                {selectedSlots[selectedSlots.length - 1]?.label.split(" — ")[1]} ·{" "}
                {selectedSlots.length} год
              </p>
              {total !== null ? (
                <p className="border-bronze/15 mt-2 flex items-baseline justify-between border-t pt-3">
                  <span className="label-caps text-muted-foreground">До сплати</span>
                  <span className="text-bronze text-[18px]">{formatHryvnia(total)}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            onClick={confirm}
            disabled={isHolding || holdIsLive || !everyRunLongEnough}
            className={cn(
              "mt-8 w-full disabled:cursor-not-allowed disabled:opacity-50",
              (dayIsFull || availability?.open === false) && "hidden",
            )}
          >
            {isHolding ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Бронюємо…
              </>
            ) : holdIsLive ? (
              `Бронь активна ще ${Math.max(1, Math.ceil(secondsLeft / 60))} хв`
            ) : everyRunLongEnough ? (
              total !== null
                ? `Забронювати · ${formatHryvnia(total)}`
                : `Забронювати (${selectedSlots.length} год)`
            ) : (
              `Мінімум ${minimumHours} год`
            )}
          </Button>
          </>
        )}

        {/* Under the booking button, where it is read at the moment it
            matters. Always shown, even on a full day: somebody choosing
            another date still wants to know the terms. */}
        {rules.length > 0 || included.length > 0 ? (
          <div className="mt-3 flex items-stretch gap-3">
            <RulesDialog sections={rules} />
            <IncludedDialog sections={included} />
          </div>
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

          {/* The room, which the guest has to name on the telephone and
              which this dialog used to leave out. */}
          <p className="text-bronze mt-6 text-[15px]">{chosenRoom?.name}</p>

          <p className="mt-5 text-[15px] leading-6">
            Для завершення бронювання зв’яжіться з адміністратором.
          </p>
          <p className="text-muted-foreground mt-2 text-[15px] leading-6">
            Бронь без підтвердження буде активна ще{" "}
            <span className="text-bronze font-medium">
              {Math.max(1, Math.ceil(secondsLeft / 60))} хв
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
