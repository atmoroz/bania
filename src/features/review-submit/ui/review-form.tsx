"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";

import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

import { submitReview } from "../model/actions";

const RATING_WORDS = ["", "Погано", "Так собі", "Непогано", "Добре", "Чудово"] as const;

export function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSending, startSending] = useTransition();

  // What the stars show while the pointer is over them, without committing it.
  const shown = hovered || rating;

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
        <Star className="fill-bronze text-bronze mx-auto size-7" aria-hidden />
        <p className="font-display mt-4 text-[22px]">Дякуємо за відгук</p>
        <p className="text-muted-foreground mt-2 text-[15px] leading-6">
          Він з&apos;явиться на сайті після перевірки адміністратором.
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
            <span className="text-muted-foreground text-[14px]">{RATING_WORDS[shown]}</span>
          ) : null}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="label-caps text-muted-foreground">
          Відгук <span className="normal-case">(необов&apos;язково)</span>
        </span>
        <textarea
          name="body"
          rows={4}
          maxLength={4000}
          placeholder="Що сподобалось, а що можна покращити?"
          className="border-foreground/25 focus:border-bronze placeholder:text-muted-foreground/60 resize-y border-b bg-transparent py-2 text-[15px] leading-6 outline-none transition-colors"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="label-caps text-muted-foreground">
          Ім&apos;я <span className="normal-case">(необов&apos;язково)</span>
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
