"use client";

import { Star } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

import { submitReview } from "../model/actions";

/**
 * The handful people actually use when they write about a visit.
 *
 * A short curated row, not an emoji picker library: a phone already has the
 * whole keyboard, so this is for the desktop visitor who has none to hand,
 * and twelve covers what shows up in practice.
 */
const EMOJI = ["😊", "😂", "😍", "🥰", "🔥", "👍", "❤️", "🙏", "💧", "🌿", "🧖", "✨"] as const;

/** A face and a word per rating. The face reads before the word does. */
const RATING_FACES = ["", "😞", "😐", "🙂", "😊", "🤩"] as const;
const RATING_WORDS = ["", "Погано", "Так собі", "Непогано", "Добре", "Чудово"] as const;

export function ReviewForm() {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSending, startSending] = useTransition();

  // What the stars show while the pointer is over them, without committing it.
  const shown = hovered || rating;

  /**
   * Drop an emoji in at the caret.
   *
   * setRangeText rather than rewriting value: it replaces the selection, moves
   * the caret after what was inserted, and leaves the undo history intact —
   * all of which hand-rolled insertion gets wrong.
   *
   * The caret only survives because the buttons refuse focus on mousedown
   * (see below). Without that the field blurs before the click is handled and
   * the insertion point is gone; falling back to the end of the text keeps it
   * useful rather than silent if that ever fails.
   */
  function insertEmoji(emoji: string) {
    const field = bodyRef.current;
    if (!field) return;

    const at = field.selectionStart ?? field.value.length;
    const to = field.selectionEnd ?? at;

    field.setRangeText(emoji, at, to, "end");
    field.focus();
  }

  function onSubmit(formData: FormData) {
    const body = String(formData.get("body") ?? "");
    const author = String(formData.get("author") ?? "");

    startSending(async () => {
      const result = await submitReview(rating, body, author);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="border-bronze/25 bg-surface-low border p-8 text-center">
        <p className="text-[34px] leading-none" aria-hidden>
          🙏
        </p>
        <p className="font-display mt-4 text-[22px]">Дякуємо за відгук</p>
        <p className="text-muted-foreground mt-2 text-[15px] leading-6">
          Він з’явиться на сайті після перевірки адміністратором.
        </p>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-7">
      <fieldset>
        <legend className="label-caps text-bronze">Ваша оцінка</legend>

        {/* Radios rather than buttons: a rating is a single choice out of five,
            and this gives keyboard and screen-reader behaviour for free. */}
        <div className="mt-4 flex items-center gap-3" onMouseLeave={() => setHovered(0)}>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                className="cursor-pointer p-1"
                onMouseEnter={() => setHovered(value)}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => {
                    setRating(value);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <Star
                  aria-hidden
                  className={cn(
                    "size-7 transition-colors",
                    value <= shown ? "fill-bronze text-bronze" : "text-bronze/25",
                  )}
                />
                <span className="sr-only">{value} з 5</span>
              </label>
            ))}
          </div>
          {shown > 0 ? (
            <span className="flex items-center gap-2 text-[14px]">
              <span aria-hidden className="text-[20px] leading-none">
                {RATING_FACES[shown]}
              </span>
              <span className="text-muted-foreground">{RATING_WORDS[shown]}</span>
            </span>
          ) : null}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="label-caps text-muted-foreground">
          Відгук <span className="normal-case">(необов’язково)</span>
        </span>
        <textarea
          ref={bodyRef}
          name="body"
          rows={4}
          maxLength={4000}
          placeholder="Що сподобалось, а що можна покращити?"
          className="border-foreground/25 focus:border-bronze placeholder:text-muted-foreground/60 resize-y border-b bg-transparent py-2 text-[15px] leading-6 outline-none transition-colors"
        />
      </label>

      <div className="-mt-3 flex flex-wrap gap-1">
        {EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            // Keeps the caret where the visitor left it: without this the
            // field blurs on mousedown and the emoji has nowhere to go.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertEmoji(emoji)}
            aria-label={`Додати ${emoji}`}
            className="hover:bg-bronze/12 rounded px-2 py-1 text-[18px] leading-none transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2">
        <span className="label-caps text-muted-foreground">
          Ім’я <span className="normal-case">(необов’язково)</span>
        </span>
        <input
          name="author"
          maxLength={120}
          className="border-foreground/25 focus:border-bronze border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
        />
      </label>

      {error ? <p className="text-destructive text-[14px] leading-snug">{error}</p> : null}

      <Button type="submit" disabled={rating === 0 || isSending} className="w-full sm:w-auto">
        {isSending ? "Надсилаємо…" : rating === 0 ? "Оберіть оцінку" : "Надіслати відгук"}
      </Button>
    </form>
  );
}
