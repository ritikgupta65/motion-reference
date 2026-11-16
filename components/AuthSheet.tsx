"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  refreshAuth: () => Promise<void>;
  toast: (m: string) => void;
}

export default function AuthSheet({ open, onClose, refreshAuth, toast }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doAuth = async () => {
    const e = email.trim();
    if (!e || !password) {
      toast("Enter email and password");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    onClose();
    setEmail("");
    setPassword("");
    await refreshAuth();
    toast("Signed in — owner mode");
  };

  return (
    <div className={"overlay" + (open ? " open" : "")} id="authOverlay">
      <div className="sheet">
        <h2>Owner sign in</h2>
        <div className="sub">Only the owner can add, edit, or delete. Everyone else browses freely.</div>
        <div className="field">
          <label>Email</label>
          <input type="text" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={doAuth} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
