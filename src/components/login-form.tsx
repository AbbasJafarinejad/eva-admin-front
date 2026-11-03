"use client";

import { type FormEvent, useState } from "react";
import { Button, Card } from "@heroui/react";
import { LockKey } from "@phosphor-icons/react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "تعداد تلاش زیاد بود. کمی بعد دوباره امتحان کن." : "رمز ورود درست نیست.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("اتصال برقرار نشد. دوباره تلاش کن.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <Card className="w-full max-w-md gap-5 rounded-3xl border border-separator bg-surface p-7 sm:p-9">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent"><LockKey size={26} weight="duotone" /></div>
        <div className="text-center">
          <p className="text-sm font-semibold text-accent">MEET EVA · PRIVATE</p>
          <h1 className="mt-2 text-2xl font-black">ورود به پنل مدیریت</h1>
          <p className="mt-2 text-sm leading-6 text-muted">این بخش فقط برای مدیر ایواست.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label htmlFor="password" className="text-sm font-semibold">رمز ورود</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required minLength={16} className="h-12 rounded-xl border border-separator bg-surface-secondary px-4 outline-none transition focus:border-accent" />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" isPending={pending} className="h-12 rounded-xl">ورود امن</Button>
        </form>
      </Card>
    </main>
  );
}
