import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { isDemoMode, enableDemo, disableDemo, DEMO_USER } from "./demo";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; name: string | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

// Minimal fake Supabase user/profile used while demo mode is active.
const DEMO_AUTH_USER = { id: DEMO_USER.id, email: DEMO_USER.email } as unknown as User;
const DEMO_PROFILE: Profile = { id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email };

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  }

  useEffect(() => {
    // Demo mode: serve a fake user entirely client-side, skip Supabase.
    if (isDemoMode()) {
      setUser(DEMO_AUTH_USER);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, name: null };
    let name: string | null = null;
    if (data.user) {
      const { data: prof } = await supabase.from("profiles").select("name").eq("id", data.user.id).single();
      name = prof?.name ?? null;
    }
    return { error: null, name };
  }

  async function signUp(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },   // trigger reads raw_user_meta_data->>'name'
    });
    if (error) return { error: error.message };
    if (data.user) {
      // Belt-and-suspenders: also upsert the profile directly
      await supabase.from("profiles").upsert({
        id: data.user.id,
        name,
        email,
      });
    }
    return { error: null };
  }

  function enterDemo() {
    enableDemo();
    setSession(null);
    setUser(DEMO_AUTH_USER);
    setProfile(DEMO_PROFILE);
    setLoading(false);
  }

  async function signOut() {
    if (isDemoMode()) {
      disableDemo();
      setUser(null);
      setProfile(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <Ctx.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, enterDemo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
