import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "register";

export function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    setBusy(true);
    setMessage("");

    const res =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (res.error) {
      setMessage(res.error.message);
      return;
    }

    if (mode === "register" && !res.data.session) {
      setMessage("Check your email to confirm your account.");
      return;
    }

    onSuccess();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45 }}
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: 22,
              background: "rgba(15, 12, 9, 0.94)",
              border: "1px solid rgba(205,170,100,0.14)",
              padding: 22,
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {(["login", "register"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      background: mode === m ? "rgba(205,170,100,0.10)" : "transparent",
                      border: `1px solid ${mode === m ? "rgba(205,170,100,0.22)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 999,
                      padding: "8px 13px",
                      color: mode === m ? "rgba(230,205,160,0.9)" : "rgba(180,160,130,0.45)",
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(180,160,130,0.45)" }}>
                <X size={17} />
              </button>
            </div>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              style={inputStyle}
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              style={{ ...inputStyle, marginTop: 10 }}
            />

            {message && (
              <p style={{ color: "rgba(205,170,100,0.55)", fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>
                {message}
              </p>
            )}

            <button
              onClick={submit}
              disabled={busy || !email || !password}
              style={{
                width: "100%",
                marginTop: 18,
                padding: 14,
                borderRadius: 13,
                border: "1px solid rgba(205,170,100,0.22)",
                background: "rgba(205,170,100,0.09)",
                color: "rgba(220,195,150,0.88)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                cursor: busy ? "default" : "pointer",
                opacity: busy || !email || !password ? 0.45 : 1,
              }}
            >
              {busy ? "wait" : mode === "login" ? "enter" : "create"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.075)",
  borderRadius: 13,
  padding: "14px 15px",
  color: "rgba(235,218,192,0.88)",
  outline: "none",
  fontSize: 13,
};