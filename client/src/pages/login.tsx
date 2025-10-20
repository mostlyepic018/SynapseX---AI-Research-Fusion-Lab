import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { login, register as apiRegister, me, logout, listMyActions, type UserAction, type AuthUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [actions, setActions] = useState<UserAction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    me().then((u) => {
      setUser(u);
      if (u) navigate('/agents');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    listMyActions().then(setActions).catch(() => setActions([]));
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = mode === 'login'
        ? await login({ username, password })
        : await apiRegister({ username, password, email: email || undefined });
  setUser(u);
      toast({ title: mode === 'login' ? 'Logged in' : 'Registered', description: u.username });
      setUsername(''); setPassword('');
  navigate('/agents');
    } catch (e: any) {
      toast({ title: 'Auth failed', description: e?.message || 'error', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  async function onLogout() {
    await logout();
    setUser(null);
    setActions([]);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Login / Register</h1>
      {!user ? (
        <form onSubmit={onSubmit} className="space-y-3 border rounded-md p-4">
          <div className="flex gap-3">
            <button type="button" className={`px-3 py-1 rounded ${mode==='login'?'bg-black text-white':'border'}`} onClick={()=>setMode('login')}>Login</button>
            <button type="button" className={`px-3 py-1 rounded ${mode==='register'?'bg-black text-white':'border'}`} onClick={()=>setMode('register')}>Register</button>
          </div>
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-sm mb-1">Email (optional)</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
          )}
          <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border rounded p-4">
            <div>
              <div className="font-medium">Logged in as</div>
              <div className="text-sm text-muted-foreground">{user.username} · {new Date(user.created_at).toLocaleString()}</div>
            </div>
            <button onClick={onLogout} className="px-3 py-2 border rounded">Logout</button>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Your recent actions</h2>
            <div className="border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Method</th>
                    <th className="text-left p-2">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map(a => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                      <td className="p-2">{a.method}</td>
                      <td className="p-2">{a.path}</td>
                    </tr>
                  ))}
                  {!actions.length && (
                    <tr><td className="p-3 text-muted-foreground" colSpan={3}>No actions yet. Use the app to generate history.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
