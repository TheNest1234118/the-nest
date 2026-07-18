import React, { useState } from "react";
import { exportNestData } from "@/lib/exportNest";
import {
  ProfileShell,
  ProfileCard,
  SectionLabel,
  SettingRow,
} from "@/pages/ProfileShell";

export function ProfileData() {
  const [msg, setMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  };

  const clearKey = (key: string, label: string) => {
    localStorage.removeItem(key);
    flash(label);
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently? This will remove your account and all associated data. This action cannot be undone."
    );

    if (!confirmed || deleting) return;

    try {
      setDeleting(true);

      const response = await fetch("/api/account", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Remove all local Nest data after successful database deletion
      Object.keys(localStorage)
        .filter((key) => key.startsWith("nest_"))
        .forEach((key) => localStorage.removeItem(key));

      // Optional: clear remaining auth/session data if stored locally
      sessionStorage.clear();

      // Redirect user after account deletion
      window.location.href = "/";
    } catch (error) {
      console.error("Account deletion failed:", error);
      flash("Could not delete account");
      setDeleting(false);
    }
  };

  return (
    <ProfileShell
      title="Export Data"
      subtitle="Download or clear local Nest data."
    >
      <SectionLabel>Data & Security</SectionLabel>

      <ProfileCard>
        <SettingRow
          label="Download my Nest"
          onTap={() =>
            exportNestData().then(() => flash("Backup downloaded"))
          }
        />

        <SettingRow
          label="Clear session history"
          destructive
          onTap={() =>
            clearKey("nest_state", "Session data cleared")
          }
        />

        <SettingRow
          label="Clear thoughts"
          destructive
          onTap={() =>
            clearKey("nest_thoughts", "Thoughts cleared")
          }
        />

        <SettingRow
          label="Remove voice capsules"
          destructive
          onTap={() =>
            clearKey("nest_memos", "Voice capsules removed")
          }
        />

        <SettingRow
          label="Clear anchors"
          destructive
          onTap={() =>
            clearKey("nest_anchors", "Anchors cleared")
          }
        />

        <SettingRow
          label="Reset atmosphere"
          destructive
          onTap={() =>
            clearKey("nest_atmo_preset", "Atmosphere reset")
          }
        />

        <SettingRow
          label="Clear everything"
          description="All local Nest data"
          danger
          destructive
          onTap={() => {
            Object.keys(localStorage)
              .filter((key) => key.startsWith("nest_"))
              .forEach((key) => localStorage.removeItem(key));

            flash("All data cleared");
          }}
        />

        <SettingRow
          label={deleting ? "Deleting account..." : "Delete my account"}
          description="Permanently delete your account and all data"
          danger
          destructive
          last
          onTap={deleteAccount}
        />
      </ProfileCard>

      {msg && (
        <p
          style={{
            marginTop: 14,
            color: "rgba(205,170,100,.62)",
            fontSize: 12,
          }}
        >
          {msg}
        </p>
      )}
    </ProfileShell>
  );
}