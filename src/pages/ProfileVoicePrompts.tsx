import React, { useEffect, useState } from "react";
import { Mic, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  addCustomVoicePrompt,
  loadVoicePrompts,
  resetVoicePrompts,
  saveVoicePrompts,
  type VoicePrompt,
} from "@/lib/voicePrompts";
import {
  ProfileShell,
  ProfileCard,
  SectionLabel,
} from "@/pages/ProfileShell";

export function ProfileVoicePrompts() {
  const [prompts, setPrompts] = useState<VoicePrompt[]>([]);
  const [newPrompt, setNewPrompt] = useState("");

  useEffect(() => {
    setPrompts(loadVoicePrompts());
  }, []);

  function update(next: VoicePrompt[]) {
    setPrompts(next);
    saveVoicePrompts(next);
  }

  function toggle(id: string) {
    update(
      prompts.map((prompt) =>
        prompt.id === id ? { ...prompt, enabled: !prompt.enabled } : prompt
      )
    );
  }

  function move(id: string, direction: -1 | 1) {
    const index = prompts.findIndex((p) => p.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= prompts.length) return;

    const next = [...prompts];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    update(next);
  }

  function remove(id: string) {
    update(prompts.filter((prompt) => prompt.id !== id));
  }

  function addPrompt() {
    const text = newPrompt.trim();
    if (!text) return;

    const next = addCustomVoicePrompt(text);
    setPrompts(next);
    setNewPrompt("");
  }

  function restoreDefaults() {
    setPrompts(resetVoicePrompts());
  }

  return (
    <ProfileShell
      title="Voice Prompts"
      subtitle="Gentle starting points for richer voice memories."
    >
      <SectionLabel>Guided Voice Prompts</SectionLabel>

      <div
        style={{
          background: "rgba(255,255,255,0.024)",
          border: "1px solid rgba(255,255,255,0.062)",
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Mic size={18} color="rgba(205,170,100,.62)" />

          <div>
            <div
              style={{
                color: "rgba(235,215,180,.88)",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Optional guidance before recording
            </div>
            <div
              style={{
                color: "rgba(185,162,128,.52)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Prompts help you know what to talk about. They never force the
              recording.
            </div>
          </div>
        </div>
      </div>

      <SectionLabel>Your Prompts</SectionLabel>

      <ProfileCard>
        {prompts.map((prompt, index) => (
          <div
            key={prompt.id}
            style={{
              padding: 14,
              borderBottom:
                index === prompts.length - 1
                  ? "none"
                  : "1px solid rgba(255,255,255,.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                onClick={() => toggle(prompt.id)}
                style={{
                  width: 38,
                  height: 24,
                  borderRadius: 999,
                  border: prompt.enabled
                    ? "1px solid rgba(205,170,100,.28)"
                    : "1px solid rgba(255,255,255,.08)",
                  background: prompt.enabled
                    ? "rgba(205,170,100,.12)"
                    : "rgba(255,255,255,.035)",
                  color: prompt.enabled
                    ? "rgba(205,170,100,.8)"
                    : "rgba(175,158,132,.4)",
                  fontSize: 10,
                  cursor: "pointer",
                  flex: "0 0 auto",
                }}
              >
                {prompt.enabled ? "On" : "Off"}
              </button>

              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: prompt.enabled
                      ? "rgba(225,210,188,.78)"
                      : "rgba(175,158,132,.4)",
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  {prompt.text}
                </p>

                <p
                  style={{
                    marginTop: 5,
                    color: "rgba(175,158,132,.32)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                  }}
                >
                  {prompt.source}
                </p>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => move(prompt.id, -1)} style={smallButton}>
                  ↑
                </button>
                <button onClick={() => move(prompt.id, 1)} style={smallButton}>
                  ↓
                </button>

                {prompt.source === "custom" && (
                  <button
                    onClick={() => remove(prompt.id)}
                    style={{
                      ...smallButton,
                      color: "rgba(220,120,120,.7)",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </ProfileCard>

      <div style={{ height: 18 }} />

      <SectionLabel>Add Custom Prompt</SectionLabel>

      <div
        style={{
          background: "rgba(255,255,255,0.024)",
          border: "1px solid rgba(255,255,255,0.062)",
          borderRadius: 18,
          padding: 14,
        }}
      >
        <textarea
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="What should your future self remember?"
          style={{
            width: "100%",
            minHeight: 82,
            resize: "none",
            background: "rgba(255,255,255,.026)",
            border: "1px solid rgba(255,255,255,.065)",
            borderRadius: 14,
            padding: 13,
            outline: "none",
            color: "rgba(225,210,188,.82)",
            fontSize: 13,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />

        <button
          onClick={addPrompt}
          disabled={!newPrompt.trim()}
          style={{
            ...primaryButton,
            opacity: newPrompt.trim() ? 1 : 0.45,
            marginTop: 10,
          }}
        >
          <Plus size={15} />
          Add prompt
        </button>
      </div>

      <button
        onClick={restoreDefaults}
        style={{
          ...primaryButton,
          marginTop: 16,
          background: "rgba(255,255,255,.026)",
        }}
      >
        <RotateCcw size={15} />
        Restore default prompts
      </button>
    </ProfileShell>
  );
}

const smallButton: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.06)",
  background: "rgba(255,255,255,.026)",
  color: "rgba(185,162,128,.52)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const primaryButton: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(205,170,100,.16)",
  background: "rgba(205,170,100,.07)",
  color: "rgba(225,205,176,.82)",
  borderRadius: 14,
  padding: "13px 14px",
  cursor: "pointer",
  fontSize: 11,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};