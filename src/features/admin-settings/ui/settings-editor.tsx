"use client";

import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

// Straight from the module, not the slice barrel: the barrel also exports
// the cached queries, and a "use cache" function cannot be pulled into a
// client bundle.
import {
  SOCIAL_KINDS,
  SocialIcon,
  socialLabel,
  type SocialKind,
} from "@/entities/settings/ui/social-icon";
import { Button, SaveBar, SelectField, SwitchField, TextField } from "@/shared/ui";

import {
  getVenueConfig,
  saveVenueConfig,
  type Closure,
  type DayHours,
  type SocialRow,
  type VenueConfig,
} from "../model/actions";

/** Postgres counts the week from Sunday; people read it from Monday. */
const WEEK = [
  { weekday: 1, label: "Понеділок" },
  { weekday: 2, label: "Вівторок" },
  { weekday: 3, label: "Середа" },
  { weekday: 4, label: "Четвер" },
  { weekday: 5, label: "П'ятниця" },
  { weekday: 6, label: "Субота" },
  { weekday: 0, label: "Неділя" },
];

const digits = (v: string, fallback: number) => {
  const n = Number.parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? fallback : n;
};

/**
 * Everything about the venue itself: who to call, when it is open, and the
 * rules every card inherits.
 *
 * Saved as a whole by one button, as everywhere else in the panel. Here it
 * is not only consistency: hours saved while the buffer failed would be a
 * calendar that offers sessions the database will refuse.
 */
export function SettingsEditor({ initial }: { initial: VenueConfig }) {
  const [saved, setSaved] = useState(initial);
  const [config, setConfig] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, startWork] = useTransition();

  const dirty = JSON.stringify(config) !== JSON.stringify(saved);

  const set = <K extends keyof VenueConfig["settings"]>(
    key: K,
    value: VenueConfig["settings"][K],
  ) => setConfig({ ...config, settings: { ...config.settings, [key]: value } });

  const setDay = (weekday: number, change: Partial<DayHours>) =>
    setConfig({
      ...config,
      hours: config.hours.map((h) => (h.weekday === weekday ? { ...h, ...change } : h)),
    });

  const setSocial = (index: number, change: Partial<SocialRow>) =>
    setConfig({
      ...config,
      social: config.social.map((l, i) => (i === index ? { ...l, ...change } : l)),
    });

  const setClosure = (index: number, change: Partial<Closure>) =>
    setConfig({
      ...config,
      closures: config.closures.map((c, i) => (i === index ? { ...c, ...change } : c)),
    });

  /** Takes one day's hours across the whole week — the common case by far. */
  function copyToWeek(from: DayHours) {
    setConfig({
      ...config,
      hours: config.hours.map((h) => ({
        ...h,
        isClosed: from.isClosed,
        opensAt: from.opensAt,
        closesAt: from.closesAt,
      })),
    });
  }

  function save() {
    startWork(async () => {
      const result = await saveVenueConfig(config);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      // Reloaded rather than assumed: new closures have ids now.
      const fresh = await getVenueConfig();
      setSaved(fresh);
      setConfig(fresh);
    });
  }

  return (
    <>
      {error ? <p className="text-destructive mt-8 text-[15px]">{error}</p> : null}

      <Group title="Контакти та назва">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Назва закладу"
            value={config.settings.siteTitle}
            onChange={(v) => set("siteTitle", v)}
          />
          <TextField
            label="Напис над назвою"
            hint="Маленькими літерами в шапці: BATHHOUSE."
            value={config.settings.wordmark}
            onChange={(v) => set("wordmark", v)}
          />
          <TextField
            label="Телефон, як показувати"
            value={config.settings.phoneDisplay}
            onChange={(v) => set("phoneDisplay", v)}
          />
          <TextField
            label="Телефон для набору"
            hint="У міжнародному вигляді: +380661231231. Саме за ним дзвонить кнопка."
            value={config.settings.phoneE164}
            onChange={(v) => set("phoneE164", v)}
          />
          <TextField
            label="Другий телефон"
            value={config.settings.extraPhoneDisplay}
            onChange={(v) => set("extraPhoneDisplay", v)}
          />
          <TextField
            label="Пошта"
            value={config.settings.email}
            onChange={(v) => set("email", v)}
          />
        </div>
        <TextField
          label="Адреса"
          value={config.settings.address}
          onChange={(v) => set("address", v)}
        />
        <TextField
          label="Посилання на карту"
          value={config.settings.mapUrl}
          onChange={(v) => set("mapUrl", v)}
        />
        <TextField
          label="Графік одним рядком"
          hint="Те, що написано в підвалі й на контактах. Це лише текст — він не впливає на календар."
          value={config.settings.openingHoursNote}
          onChange={(v) => set("openingHoursNote", v)}
        />
      </Group>

      <Group title="Соцмережі">
        <p className="text-muted-foreground/70 text-[12px] leading-4">
          Показуються в підвалі сайту, у цьому порядку, кожна зі своїм значком. Підпис
          — те, що буде видно замість назви мережі: нік або коротке пояснення.
        </p>

        {config.social.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">Поки жодної.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {config.social.map((link, i) => (
              <li
                key={link.id ?? `new-${i}`}
                className="border-bronze/15 flex flex-wrap items-end gap-3 border-b pb-4 last:border-b-0"
              >
                <span className="text-muted-foreground mb-2 shrink-0">
                  <SocialIcon kind={link.kind} className="size-5" />
                </span>

                <div className="w-40 shrink-0">
                  <SelectField
                    label="Мережа"
                    value={link.kind}
                    options={SOCIAL_KINDS.map((kind) => ({ value: kind, label: socialLabel[kind] }))}
                    onChange={(v) => setSocial(i, { kind: v as SocialKind })}
                  />
                </div>

                <div className="min-w-[220px] flex-1">
                  <TextField
                    label="Посилання"
                    value={link.url}
                    onChange={(v) => setSocial(i, { url: v })}
                  />
                </div>

                <div className="w-40">
                  <TextField
                    label="Підпис"
                    value={link.label}
                    onChange={(v) => setSocial(i, { label: v })}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={link.isVisible ? "Приховати з сайту" : "Показати на сайті"}
                    title={link.isVisible ? "Приховати з сайту" : "Показати на сайті"}
                    onClick={() => setSocial(i, { isVisible: !link.isVisible })}
                    className="border-bronze/25 hover:border-bronze border p-2 transition-colors"
                  >
                    {link.isVisible ? (
                      <Eye className="size-4" aria-hidden />
                    ) : (
                      <EyeOff className="size-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Прибрати"
                    title="Прибрати"
                    onClick={() =>
                      setConfig({
                        ...config,
                        social: config.social.filter((_, j) => j !== i),
                      })
                    }
                    className="border-bronze/25 hover:border-bronze border p-2 transition-colors"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="ghost"
          className="self-start px-5 py-3"
          onClick={() =>
            setConfig({
              ...config,
              social: [
                ...config.social,
                { id: null, kind: "telegram", url: "", label: "", isVisible: true },
              ],
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          Додати мережу
        </Button>
      </Group>

      <Group title="Правила бронювання">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            label="Мінімум, хвилин"
            hint="Скільки триває найкоротший сеанс. Картка може мати власне значення."
            value={String(config.settings.minDurationMinutes)}
            onChange={(v) => set("minDurationMinutes", digits(v, 60))}
          />
          <TextField
            label="Перерва між сеансами, хвилин"
            hint="Час на прибирання та підготовку. Він недоступний для бронювання."
            value={String(config.settings.bufferMinutes)}
            onChange={(v) => set("bufferMinutes", digits(v, 0))}
          />
          <TextField
            label="Крок сітки, хвилин"
            hint="Через скільки починається наступний можливий сеанс: 60 — щогодини."
            value={String(config.settings.slotStepMinutes)}
            onChange={(v) => set("slotStepMinutes", digits(v, 60))}
          />
        </div>
      </Group>

      <Group title="Години роботи">
        <ul className="flex flex-col gap-4">
          {WEEK.map(({ weekday, label }) => {
            const day = config.hours.find((h) => h.weekday === weekday);
            if (!day) return null;
            return (
              <li
                key={weekday}
                className="border-bronze/15 border-b pb-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                  {/* The day and its switch share a line, whatever the
                      width: on a phone they were stacking into a mosaic
                      where the one thing you want to see at a glance -- is
                      this day open -- was never beside its name. */}
                  <div className="flex flex-1 items-center justify-between gap-3 sm:flex-none sm:justify-start sm:gap-5">
                    <span className="text-[15px] sm:w-24">{label}</span>
                    <SwitchField
                      label=""
                      onLabel="Відчинено"
                      offLabel="Вихідний"
                      value={!day.isClosed}
                      onChange={(open) => setDay(weekday, { isClosed: !open })}
                    />
                  </div>

                  {day.isClosed ? (
                    <span className="text-muted-foreground text-[13px]">
                      Цього дня календар нічого не пропонує
                    </span>
                  ) : (
                    <div className="flex items-end gap-3">
                      <div className="w-28">
                        <TextField
                          label="Відкриття"
                          type="time"
                          value={day.opensAt}
                          onChange={(v) => setDay(weekday, { opensAt: v })}
                        />
                      </div>
                      <div className="w-28">
                        <TextField
                          label="Закриття"
                          type="time"
                          value={day.closesAt}
                          onChange={(v) => setDay(weekday, { closesAt: v })}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    title="Застосувати цей час до всіх днів"
                    // No `ml-auto` on a phone: an auto margin makes the
                    // button greedy for the leftover space and pushes
                    // itself onto a line of its own, three pixels short of
                    // fitting beside the times.
                    className="px-2 py-2 sm:ml-auto sm:px-4"
                    onClick={() => copyToWeek(day)}
                  >
                    <Copy className="size-4" aria-hidden />
                    <span className="hidden sm:inline">На всі дні</span>
                    <span className="sr-only sm:hidden">На всі дні</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground/70 text-[12px] leading-4">
          Кнопка з двома квадратами копіює час цього дня на всі інші. Нічні зміни (коли
          закриття після опівночі) поки не підтримуються — час закриття має бути пізніше
          за час відкриття того ж дня.
        </p>
      </Group>

      <Group title="Закриті дати">
        {config.closures.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">
            Поки жодної. Це вихідні, ремонт чи свята — у ці дні календар нічого не
            пропонує.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {config.closures.map((closure, i) => (
              <li
                key={closure.id ?? `new-${i}`}
                className="border-bronze/15 flex flex-wrap items-end gap-4 border-b pb-4 last:border-b-0"
              >
                <div className="w-40">
                  <TextField
                    label="Від"
                    type="date"
                    value={closure.startsOn}
                    onChange={(v) => setClosure(i, { startsOn: v })}
                  />
                </div>
                <div className="w-40">
                  <TextField
                    label="До включно"
                    type="date"
                    value={closure.endsOn}
                    onChange={(v) => setClosure(i, { endsOn: v })}
                  />
                </div>
                <div className="min-w-[200px] flex-1">
                  <TextField
                    label="Причина"
                    value={closure.reason}
                    onChange={(v) => setClosure(i, { reason: v })}
                  />
                </div>
                <button
                  type="button"
                  aria-label="Прибрати"
                  title="Прибрати"
                  onClick={() =>
                    setConfig({
                      ...config,
                      closures: config.closures.filter((_, j) => j !== i),
                    })
                  }
                  className="border-bronze/25 hover:border-bronze border p-2 transition-colors"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="ghost"
          className="self-start px-5 py-3"
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            setConfig({
              ...config,
              closures: [
                ...config.closures,
                { id: null, startsOn: today, endsOn: today, reason: "" },
              ],
            });
          }}
        >
          <Plus className="size-4" aria-hidden />
          Додати період
        </Button>
      </Group>

      <SaveBar
        status={dirty ? "Є незбережені зміни. На сайті їх ще не видно." : "Усе збережено."}
        dirty={dirty}
        busy={busy}
        onDiscard={() => {
          setError(null);
          setConfig(saved);
        }}
        onSave={save}
      />
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-bronze/15 mt-8 flex flex-col gap-6 border p-5">
      <h2 className="label-caps text-bronze">{title}</h2>
      {children}
    </section>
  );
}
