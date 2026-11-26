"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button, Card } from "@/shared/ui";

import { signIn, type SignInState } from "../model/actions";

const initial: SignInState = { error: null };

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <Card className="w-full max-w-sm p-8">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[28px] leading-9">Вхід</h1>

      <form action={action} className="mt-8 flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="label-caps text-muted-foreground">Пошта</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="border-foreground/25 focus:border-bronze border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="label-caps text-muted-foreground">Пароль</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="border-foreground/25 focus:border-bronze border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
          />
        </label>

        {state.error ? (
          <p className="text-destructive text-[15px]">{state.error}</p>
        ) : null}

        <Button type="submit" disabled={pending} className="mt-2 w-full disabled:opacity-50">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Увійти
        </Button>
      </form>
    </Card>
  );
}
