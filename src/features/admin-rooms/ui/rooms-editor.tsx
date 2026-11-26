"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button, ButtonLink } from "@/shared/ui";

import { getAdminRooms, saveRooms, type AdminRoom } from "../model/actions";
import { RoomEditor, type Card } from "./room-editor";

const toCards = (rooms: AdminRoom[]): Card[] =>
  rooms.map(({ cover, ...room }) => ({
    ...room,
    key: room.id,
    coverMediaId: cover?.mediaId ?? null,
  }));

/** Everything that would be written, so a card counts as changed only when it is. */
const shape = (card: Card) =>
  JSON.stringify([
    card.id,
    card.slug,
    card.name,
    card.eyebrow,
    card.summary,
    card.description,
    card.capacity,
    card.pricePerHour,
    card.highlights,
    card.ctaLabel,
    card.isFeatured,
    card.isVisible,
    card.acceptsBookings,
    card.minDurationMinutes,
    card.coverMediaId,
    card.photos.map((p) => p.mediaId),
    [...card.componentIds].sort(),
  ]);

/**
 * The catalogue of cards.
 *
 * Saved as a whole by one button, like the pages and the gallery. Nothing is
 * deleted here: a card can already be attached to bookings, and "no longer
 * offered" is what the visibility switch is for.
 */
export function RoomsEditor({ initial }: { initial: AdminRoom[] }) {
  const [saved, setSaved] = useState(() => toCards(initial));
  const [cards, setCards] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [busy, startWork] = useTransition();

  const changedKeys = new Set(
    cards
      .filter((card, i) => {
        const before = saved.find((s) => s.key === card.key);
        // Position counts as a change: the order is what the site renders in.
        return !before || shape(before) !== shape(card) || saved.indexOf(before) !== i;
      })
      .map((c) => c.key),
  );
  const dirty = changedKeys.size > 0 || cards.length !== saved.length;

  function move(index: number, direction: "up" | "down") {
    const to = direction === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= cards.length) return;
    const next = [...cards];
    const [card] = next.splice(index, 1);
    if (!card) return;
    next.splice(to, 0, card);
    setCards(next);
  }

  function add() {
    setCards([
      ...cards,
      {
        key: `new-${crypto.randomUUID()}`,
        id: null,
        slug: "",
        name: "",
        eyebrow: "",
        summary: "",
        description: "",
        capacity: null,
        pricePerHour: null,
        highlights: [],
        ctaLabel: "",
        isFeatured: false,
        isVisible: true,
        acceptsBookings: true,
        minDurationMinutes: null,
        minimumMinutes: 60,
        coverMediaId: null,
        photos: [],
        componentIds: [],
      },
    ]);
  }

  function save() {
    const blank = cards.find((c) => c.name.trim() === "" || c.slug.trim() === "");
    if (blank) {
      setError("У кожної картки має бути назва й адреса.");
      return;
    }

    startWork(async () => {
      const result = await saveRooms(
        cards.map((c) => ({
          id: c.id,
          slug: c.slug.trim(),
          name: c.name.trim(),
          eyebrow: c.eyebrow,
          summary: c.summary,
          description: c.description,
          capacity: c.capacity,
          pricePerHour: c.pricePerHour,
          highlights: c.highlights.map((h) => h.trim()).filter(Boolean),
          ctaLabel: c.ctaLabel,
          isFeatured: c.isFeatured,
          isVisible: c.isVisible,
          acceptsBookings: c.acceptsBookings,
          minDurationMinutes: c.minDurationMinutes,
          coverMediaId: c.coverMediaId,
          photoMediaIds: c.photos.map((p) => p.mediaId),
          componentIds: c.componentIds,
        })),
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setError(null);
      // Reloaded rather than assumed: new cards have ids now, and the next
      // save has to update them instead of creating them again.
      const fresh = toCards(await getAdminRooms());
      setSaved(fresh);
      setCards(fresh);
    });
  }

  return (
    <>
      {error ? <p className="text-destructive mt-8 text-[15px]">{error}</p> : null}

      <ul className="mt-8 flex flex-col gap-4">
        {cards.map((card, index) => (
          <RoomEditor
            key={card.key}
            card={card}
            others={cards
              .filter((c) => c.key !== card.key && c.id !== null)
              .map((c) => ({ id: c.id as string, name: c.name || c.slug }))}
            changed={changedKeys.has(card.key)}
            index={index}
            total={cards.length}
            onChange={(next) => setCards(cards.map((c) => (c.key === card.key ? next : c)))}
            onMove={(direction) => move(index, direction)}
          />
        ))}
      </ul>

      <Button type="button" variant="ghost" className="mt-6" onClick={add}>
        <Plus className="size-4" aria-hidden />
        Додати локацію
      </Button>

      <div className="border-bronze/20 mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="text-muted-foreground text-[13px]">
          {dirty ? "Є незбережені зміни. На сайті їх ще не видно." : "Усе збережено."}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/pricing" variant="ghost">
            Сторінка на сайті
          </ButtonLink>
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || busy}
            onClick={() => {
              setError(null);
              setCards(saved);
            }}
          >
            Скасувати
          </Button>
          <Button type="button" disabled={!dirty || busy} onClick={save}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Зберегти
          </Button>
        </div>
      </div>
    </>
  );
}
