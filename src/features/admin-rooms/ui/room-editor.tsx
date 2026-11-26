"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/lib";
import { SwitchField, TextField } from "@/shared/ui";

import type { AdminRoom, RoomPhoto } from "../model/actions";
import { RoomPhotos } from "./room-photos";
import { StringList } from "./string-list";

/** A card being edited. `id` is null until it has been saved once. */
export type Card = Omit<AdminRoom, "cover" | "id"> & {
  key: string;
  /** Null until the card has been saved once. */
  id: string | null;
  coverMediaId: string | null;
};

const digits = (v: string) => {
  const n = Number.parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
};

/**
 * One card: everything the catalogue knows about it.
 *
 * Collapsed by default, like a page's blocks — the catalogue is a list to
 * scan, and one open card at a time is how it is actually edited.
 */
export function RoomEditor({
  card,
  others,
  changed,
  index,
  total,
  onChange,
  onMove,
}: {
  card: Card;
  /** The other cards, offered as the parts a bundle can be made of. */
  others: { id: string; name: string }[];
  changed: boolean;
  index: number;
  total: number;
  onChange: (next: Card) => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(card.id === null);
  const set = <K extends keyof Card>(key: K, value: Card[K]) => onChange({ ...card, [key]: value });

  return (
    <li
      className={cn(
        "border",
        changed ? "border-bronze" : "border-bronze/15",
        !card.isVisible && "bg-surface-low/50 border-dashed",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronUp className="text-bronze size-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="text-bronze size-4 shrink-0" aria-hidden />
          )}
          <span className="text-[15px]">{card.name || "Без назви"}</span>
          {card.componentIds.length > 0 ? (
            <span className="label-caps text-sage">Сет</span>
          ) : null}
          {!card.isVisible ? <span className="label-caps text-bronze">Приховано</span> : null}
          {!card.acceptsBookings ? (
            <span className="label-caps text-bronze">Без бронювання</span>
          ) : null}
          {card.id === null ? <span className="label-caps text-sage">Нова</span> : null}
          {changed ? <span className="label-caps text-bronze">Змінено</span> : null}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Вище"
            disabled={index === 0}
            onClick={() => onMove("up")}
            className="border-bronze/25 hover:border-bronze border p-2 transition-colors disabled:opacity-30"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Нижче"
            disabled={index === total - 1}
            onClick={() => onMove("down")}
            className="border-bronze/25 hover:border-bronze border p-2 transition-colors disabled:opacity-30"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-bronze/10 flex flex-col gap-6 border-t p-5">
          <TextField label="Назва" value={card.name} onChange={(v) => set("name", v)} />

          {card.id === null ? (
            <TextField
              label="Адреса"
              hint="Латинськими літерами, через дефіс: саме це потрапить у посилання на календар. Після збереження не змінюється."
              value={card.slug}
              onChange={(v) => set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            />
          ) : (
            <p className="text-muted-foreground text-[13px]">
              Адреса: <span className="text-foreground">{card.slug}</span>. Її не змінюємо —
              на неї вже можуть вести посилання.
            </p>
          )}

          <TextField label="Надзаголовок" value={card.eyebrow} onChange={(v) => set("eyebrow", v)} />
          <TextField
            label="Короткий опис"
            hint="Один рядок під назвою у вузьких місцях."
            value={card.summary}
            onChange={(v) => set("summary", v)}
          />
          <TextField
            label="Опис"
            rows={4}
            value={card.description}
            onChange={(v) => set("description", v)}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Місткість, осіб"
              value={card.capacity === null ? "" : String(card.capacity)}
              onChange={(v) => set("capacity", digits(v))}
            />
            {/* The column is in kopiyky — money is kept away from floats —
                but nobody types kopiyky. Shown and read in hryvnia. */}
            <TextField
              label="Ціна за годину, грн"
              value={card.pricePerHour === null ? "" : String(Math.round(card.pricePerHour / 100))}
              onChange={(v) => {
                const hryvnia = digits(v);
                set("pricePerHour", hryvnia === null ? null : hryvnia * 100);
              }}
            />
          </div>

          <TextField
            label="Мінімальне замовлення, хвилин"
            hint={`Порожнє — береться загальна налаштування закладу. Зараз база вимагає ${card.minimumMinutes} хв.`}
            value={card.minDurationMinutes === null ? "" : String(card.minDurationMinutes)}
            onChange={(v) => set("minDurationMinutes", digits(v))}
          />

          <TextField
            label="Напис на кнопці"
            value={card.ctaLabel}
            onChange={(v) => set("ctaLabel", v)}
          />

          <StringList
            label="Переваги"
            hint="Список із галочками на картці."
            value={card.highlights}
            onChange={(v) => set("highlights", v)}
          />

          <RoomPhotos
            photos={card.photos}
            coverMediaId={card.coverMediaId}
            onChange={(v: RoomPhoto[]) => set("photos", v)}
            onCover={(v) => set("coverMediaId", v)}
          />

          {others.length > 0 ? (
            <fieldset className="border-bronze/15 flex flex-col gap-3 border p-4">
              <legend className="label-caps text-muted-foreground px-2">Складається з</legend>
              <p className="text-muted-foreground/70 text-[12px] leading-4">
                Позначте, якщо ця картка — сет із інших зон. Бронювання сету займає кожну
                з них, тому вони не продадуться двічі. Нічого не позначено — картка сама
                по собі.
              </p>
              {others.map((other) => (
                <label key={other.id} className="flex items-center gap-3 text-[15px]">
                  <input
                    type="checkbox"
                    checked={card.componentIds.includes(other.id)}
                    onChange={(e) =>
                      set(
                        "componentIds",
                        e.target.checked
                          ? [...card.componentIds, other.id]
                          : card.componentIds.filter((id) => id !== other.id),
                      )
                    }
                    className="accent-bronze size-4"
                  />
                  {other.name}
                </label>
              ))}
            </fieldset>
          ) : null}

          <SwitchField
            label="Показувати на сайті"
            value={card.isVisible}
            onChange={(v) => set("isVisible", v)}
          />
          <SwitchField
            label="Приймає бронювання"
            hint="Вимкніть, якщо зона показана, але тимчасово не працює."
            value={card.acceptsBookings}
            onChange={(v) => set("acceptsBookings", v)}
          />
          <SwitchField
            label="Виділити картку"
            hint="Обводить її бронзовою рамкою в каталозі."
            value={card.isFeatured}
            onChange={(v) => set("isFeatured", v)}
          />
        </div>
      ) : null}
    </li>
  );
}
