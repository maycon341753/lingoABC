import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  userLabel: string | null;
  isAdmin: boolean;
  hasSubscription: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userLabel: null,
  isAdmin: false,
  hasSubscription: false,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const expiresTimeoutRef = useRef<number | null>(null);

  const signOut = async () => {
    setUser(null);
    setUserLabel(null);
    setIsAdmin(false);
    setHasSubscription(false);
    if (typeof window !== "undefined" && expiresTimeoutRef.current != null) {
      window.clearTimeout(expiresTimeoutRef.current);
      expiresTimeoutRef.current = null;
    }

    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      await supabase.auth.signOut({ scope: "local" });
    }

    if (typeof window !== "undefined") {
      const keys = Object.keys(window.localStorage);
      for (const k of keys) {
        if (k.startsWith("sb-") || k.includes("supabase")) {
          window.localStorage.removeItem(k);
        }
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (sessionUser: User | null) => {
      if (!sessionUser) {
        if (mounted) {
          setUser(null);
          setUserLabel(null);
          setIsAdmin(false);
          setHasSubscription(false);
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setUser(sessionUser);
        setUserLabel(sessionUser.email ?? "Usuário");
      }

      const { data } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", sessionUser.id)
        .maybeSingle();

      const nowMs = Date.now();
      let isActive = false;
      let expiresAtMs: number | null = null;

      const planTry = await supabase
        .from("v_user_profile_plan")
        .select("subscription_status, expires_at")
        .eq("user_id", sessionUser.id)
        .maybeSingle();

      if (!planTry.error && planTry.data) {
        const status = String((planTry.data as { subscription_status?: string | null } | null)?.subscription_status ?? "")
          .toLowerCase()
          .trim();
        const expiresAtIso = String((planTry.data as { expires_at?: string | null } | null)?.expires_at ?? "");
        const t = expiresAtIso ? new Date(expiresAtIso).getTime() : NaN;
        expiresAtMs = Number.isFinite(t) ? t : null;
        isActive = (status === "active" || status === "ativa" || status === "ativo") && (expiresAtMs == null || expiresAtMs > nowMs);
      }
      if (!isActive) {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("status, expires_at")
          .eq("user_id", sessionUser.id)
          .order("expires_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        const row = subRow as { status?: string | null; expires_at?: string | null } | null;
        const status = String(row?.status ?? "").toLowerCase().trim();
        const expiresAtIso = String(row?.expires_at ?? "");
        const t = expiresAtIso ? new Date(expiresAtIso).getTime() : NaN;
        expiresAtMs = Number.isFinite(t) ? t : expiresAtMs;
        isActive = (status === "active" || status === "ativa" || status === "ativo") && (expiresAtMs == null || expiresAtMs > nowMs);
      }

      if (mounted) {
        if (data?.name) setUserLabel(data.name);
        setIsAdmin(data?.role === "admin" || data?.role === "super_admin");
        setHasSubscription(isActive);
        setLoading(false);
      }

      if (typeof window !== "undefined" && expiresTimeoutRef.current != null) {
        window.clearTimeout(expiresTimeoutRef.current);
        expiresTimeoutRef.current = null;
      }
      if (typeof window !== "undefined" && mounted && isActive && expiresAtMs != null) {
        const delay = Math.max(0, expiresAtMs - Date.now() + 500);
        expiresTimeoutRef.current = window.setTimeout(() => {
          setHasSubscription(false);
        }, delay);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null);
    });

    return () => {
      mounted = false;
      if (typeof window !== "undefined" && expiresTimeoutRef.current != null) {
        window.clearTimeout(expiresTimeoutRef.current);
        expiresTimeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userLabel, isAdmin, hasSubscription, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
