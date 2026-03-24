import { createContext, useContext, useEffect, useState } from "react";
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

  const signOut = async () => {
    setUser(null);
    setUserLabel(null);
    setIsAdmin(false);
    setHasSubscription(false);

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

      const { data: subscriptionRow } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", sessionUser.id)
        .limit(1)
        .maybeSingle();

      if (mounted) {
        if (data?.name) setUserLabel(data.name);
        setIsAdmin(data?.role === "admin" || data?.role === "super_admin");
        setHasSubscription(Boolean(subscriptionRow?.id));
        setLoading(false);
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
