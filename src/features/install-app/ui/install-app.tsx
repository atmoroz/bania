"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowDownToLine, Share, SquarePlus } from "lucide-react";

import { cn } from "@/shared/lib";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui";

/**
 * The event Chrome fires when it would offer installation itself. It is not
 * in lib.dom: every browser that has it agrees on this shape, and the ones
 * that do not have it never fire it.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

/**
 * Which browser this is, read once. Through useSyncExternalStore rather
 * than an effect: `navigator` does not exist while the page is rendered on
 * the server, and the compiler rightly refuses a setState that only
 * cascades a second render to say so.
 */
function usePlatform(): Platform | null {
  return useSyncExternalStore(
    () => () => {},
    () => {
      const ua = navigator.userAgent;
      // iPadOS reports itself as a Mac; the touch points give it away.
      const isIOS =
        /iphone|ipad|ipod/i.test(ua) ||
        (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
      return isIOS ? "ios" : /android/i.test(ua) ? "android" : "desktop";
    },
    () => null,
  );
}

/** Whether the page is already running as the installed app. */
function useStandalone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(display-mode: standalone)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari's own flag, which predates the media query.
      ("standalone" in navigator && navigator.standalone === true),
    () => false,
  );
}

/**
 * "Встановити" beside the wordmark.
 *
 * Installation is the whole point of the PWA — an icon on the home screen
 * that opens the calendar — and nothing on the site said it was possible.
 * Chrome buries its own offer in a menu and Safari never offers at all.
 *
 * Where the browser will do it, the button runs the real prompt. Where it
 * will not, the dialog shows the three taps for that browser instead,
 * because "install it from the menu" is not instructions.
 *
 * It disappears once the app is installed, and never appears in a browser
 * that cannot install anything.
 */
export function InstallApp({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const platform = usePlatform();
  const installed = useStandalone() || justInstalled;

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Kept rather than shown: the browser's own bar would compete with
      // this button, and the button can fire the same prompt on demand.
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setJustInstalled(true);
      setPrompt(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // A desktop browser that never fires the event cannot install anything,
  // so there is nothing to offer. On a phone the instructions always apply.
  const canOffer = prompt !== null || platform === "ios" || platform === "android";
  if (installed || platform === null || !canOffer) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // One prompt per event: Chrome will fire a fresh one if it is declined.
    setPrompt(null);
    if (outcome === "accepted") setJustInstalled(true);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Встановити застосунок"
        className={cn(
          "border-bronze/30 text-muted-foreground hover:border-bronze hover:text-foreground flex shrink-0 items-center gap-2 border px-3 py-2 transition-colors",
          className,
        )}
      >
        <ArrowDownToLine className="size-4 shrink-0" aria-hidden />
        <span className="label-caps hidden sm:inline">Встановити</span>
        <span className="sr-only sm:hidden">Встановити застосунок</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <p className="label-caps text-bronze">Застосунок</p>
          <DialogTitle className="mt-3">Баня на головному екрані</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-3 text-[15px] leading-6">
            Іконка поряд з іншими застосунками: один дотик — і ви в календарі,
            без адресного рядка. Сторінки відкриваються швидше, бо фото та шрифти
            вже на телефоні. Місця займає менше мегабайта.
          </DialogDescription>

          {prompt ? (
            <>
              <p className="mt-7 text-[15px] leading-6">
                Натисніть кнопку — браузер запитає підтвердження, і застосунок
                з&apos;явиться на екрані.
              </p>
              <Button type="button" className="mt-7 w-full" onClick={install}>
                <ArrowDownToLine className="size-4" aria-hidden />
                Встановити
              </Button>
            </>
          ) : (
            <Steps platform={platform} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * What to tap, named as that browser names it.
 *
 * Safari has no install prompt at all and never will; Chrome's own menu
 * item appears only once it decides the site qualifies, which is not
 * something the site can see.
 */
function Steps({ platform }: { platform: Platform }) {
  const steps: { icon: React.ReactNode; text: React.ReactNode }[] =
    platform === "ios"
      ? [
          {
            icon: <Share className="size-4" aria-hidden />,
            text: (
              <>
                Відкрийте сайт у <strong className="font-medium">Safari</strong> і
                натисніть «Поділитися» — квадрат зі стрілкою внизу екрана.
              </>
            ),
          },
          {
            icon: <SquarePlus className="size-4" aria-hidden />,
            text: <>Прогорніть список і оберіть «На екран «Додому»».</>,
          },
          {
            icon: <ArrowDownToLine className="size-4" aria-hidden />,
            text: <>Натисніть «Додати» — іконка з&apos;явиться на екрані.</>,
          },
        ]
      : [
          {
            icon: <Share className="size-4" aria-hidden />,
            text: (
              <>
                Відкрийте меню браузера — три крапки праворуч угорі в{" "}
                <strong className="font-medium">Chrome</strong>.
              </>
            ),
          },
          {
            icon: <SquarePlus className="size-4" aria-hidden />,
            text: <>Оберіть «Встановити застосунок» або «Додати на головний екран».</>,
          },
          {
            icon: <ArrowDownToLine className="size-4" aria-hidden />,
            text: <>Підтвердіть — іконка з&apos;явиться поряд з іншими застосунками.</>,
          },
        ];

  return (
    <ol className="border-bronze/15 mt-7 flex flex-col border-t">
      {steps.map((step, i) => (
        <li
          key={i}
          className="border-bronze/15 flex items-start gap-4 border-b py-4 text-[15px] leading-6"
        >
          <span className="border-bronze/30 text-bronze flex size-9 shrink-0 items-center justify-center border">
            {step.icon}
          </span>
          <span className="min-w-0">
            <span className="label-caps text-bronze/70 mr-2 text-[11px]">
              {String(i + 1).padStart(2, "0")}
            </span>
            {step.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
