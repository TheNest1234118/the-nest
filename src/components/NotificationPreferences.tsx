import React, { useEffect, useState } from "react";
import {
  readNotificationPreferences,
  requestNestNotifications,
  trackNotificationCategorySelected,
  writeNotificationPreferences,
  type NestNotificationPreferences,
  type NotificationCategory,
} from "@/lib/notifications";

const LABELS: Record<NotificationCategory, { title: string; desc: string }> = {
  evening_reflection: {
    title: "Evening Reflection",
    desc: "A quiet check-in around the end of the day.",
  },
  sleep_unwind: {
    title: "Sleep & Unwind",
    desc: "A gentle invitation to slow down before sleep.",
  },
  thought_reminders: {
    title: "Thought Reminders",
    desc: "Return to saved thoughts when they may still matter.",
  },
  weekly_reflection: {
    title: "Weekly Reflection",
    desc: "A calm moment to look back without pressure.",
  },
};

export function NotificationPreferences({
  flash,
}: {
  flash?: (msg: string) => void;
}) {
  const [prefs, setPrefs] = useState<NestNotificationPreferences>(
    readNotificationPreferences
  );

  useEffect(() => {
    writeNotificationPreferences(prefs);
  }, []);

  const update = async (next: NestNotificationPreferences) => {
    setPrefs(next);
    await writeNotificationPreferences(next);
  };

  const enableAll = async () => {
    const granted = await requestNestNotifications();

    if (!granted) {
      flash?.("Notifications were not enabled");
      return;
    }

    await update({
      ...prefs,
      enabled: true,
    });

    flash?.("Gentle reminders enabled");
  };

  const disableAll = async () => {
    await update({
      ...prefs,
      enabled: false,
    });

    flash?.("Notifications paused");
  };

  const toggleCategory = async (category: NotificationCategory) => {
    const next = {
      ...prefs,
      [category]: !prefs[category],
    };

    trackNotificationCategorySelected(category, Boolean(next[category]));
    await update(next);
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.024)",
        border: "1px solid rgba(255,255,255,0.062)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <button style={rowStyle} onClick={prefs.enabled ? disableAll : enableAll}>
        <div>
          <div style={labelStyle}>
            {prefs.enabled ? "Gentle reminders on" : "Enable gentle reminders"}
          </div>
          <div style={descStyle}>
            Calm invitations to reflect, unwind, or return to something you saved.
          </div>
        </div>
        <span style={valueStyle}>{prefs.enabled ? "On" : "Off"}</span>
      </button>

      {(["evening_reflection", "sleep_unwind", "thought_reminders", "weekly_reflection"] as NotificationCategory[]).map(
        (category) => (
          <button
            key={category}
            style={{
              ...rowStyle,
              opacity: prefs.enabled ? 1 : 0.42,
            }}
            disabled={!prefs.enabled}
            onClick={() => toggleCategory(category)}
          >
            <div>
              <div style={labelStyle}>{LABELS[category].title}</div>
              <div style={descStyle}>{LABELS[category].desc}</div>
            </div>
            <span style={valueStyle}>{prefs[category] ? "On" : "Off"}</span>
          </button>
        )
      )}

      <button style={{ ...rowStyle, borderBottom: "none" }} onClick={disableAll}>
        <div>
          <div style={labelStyle}>No Notifications</div>
          <div style={descStyle}>Pause all reminders from The Nest.</div>
        </div>
      </button>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.044)",
  padding: "15px 18px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  textAlign: "left",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(220,205,182,0.78)",
};

const descStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(155,140,118,0.36)",
  marginTop: 3,
};

const valueStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(205,170,100,0.52)",
};