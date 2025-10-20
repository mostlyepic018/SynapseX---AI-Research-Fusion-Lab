import { useEffect, useState } from "react";
import { me, type AuthUser } from "@/lib/api";
import { Redirect } from "wouter";

export function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    me().then(u => { if (mounted) setUser(u); }).catch(() => { if (mounted) setUser(null); });
    return () => { mounted = false; };
  }, []);

  if (user === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Checking session…</div>;
  }
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

export function RedirectIfAuthed({ to = "/agents" }: { to?: string }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    me().then(u => { if (mounted) setUser(u); }).catch(() => { if (mounted) setUser(null); });
    return () => { mounted = false; };
  }, []);
  if (user === undefined) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (user) return <Redirect to={to} />;
  return null;
}
