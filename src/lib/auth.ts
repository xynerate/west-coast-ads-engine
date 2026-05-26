import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ALLOWED_EMAILS = [
  "emmanuelledaniel1@gmail.com",
  "richard.bridgstock@gmail.com",
  "dugdan1979molteno@gmail.com",
] as const;

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase() as (typeof ALLOWED_EMAILS)[number]);
}

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  email: string | null;
  isAllowed: boolean;
};

export function useAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const email = user?.email ?? null;

  return {
    loading,
    session,
    user,
    email,
    isAllowed: isAllowedEmail(email),
  };
}

export async function signInWithGoogle(): Promise<void> {
  const base = import.meta.env.BASE_URL || "/";
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}${base}`.replace(/\/+$/, "/")
      : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
