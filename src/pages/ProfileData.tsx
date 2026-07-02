import React, { useState } from "react";
import { exportNestData } from "@/lib/exportNest";
import { ProfileShell, ProfileCard, SectionLabel, SettingRow } from "@/pages/ProfileShell";

export function ProfileData() {
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  };

  const clearKey = (key: string, label: string) => {
    localStorage.removeItem(key);
    flash(label);
  };

  return (
    <ProfileShell title="Export Data" subtitle="Download or clear local Nest data.">
      <SectionLabel>Data & Security</SectionLabel>

      <ProfileCard>
        <SettingRow label="Download my Nest" onTap={() => exportNestData().then(() => flash("Backup downloaded"))} />
        <SettingRow label="Clear session history" destructive onTap={() => clearKey("nest_state", "Session data cleared")} />
        <SettingRow label="Clear thoughts" destructive onTap={() => clearKey("nest_thoughts", "Thoughts cleared")} />
        <SettingRow label="Remove voice capsules" destructive onTap={() => clearKey("nest_memos", "Voice capsules removed")} />
        <SettingRow label="Clear anchors" destructive onTap={() => clearKey("nest_anchors", "Anchors cleared")} />
        <SettingRow label="Reset atmosphere" destructive onTap={() => clearKey("nest_atmo_preset", "Atmosphere reset")} />
        <SettingRow
          label="Clear everything"
          description="All local Nest data"
          danger
          destructive
          last
          onTap={() => {
            Object.keys(localStorage)
              .filter((k) => k.startsWith("nest_"))
              .forEach((k) => localStorage.removeItem(k));
            flash("All data cleared");
          }}
        />
      </ProfileCard>

      {msg && <p style={{ marginTop: 14, color: "rgba(205,170,100,.62)", fontSize: 12 }}>{msg}</p>}
    </ProfileShell>
  );
}