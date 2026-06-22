import React, { useEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/pwa";
import {
  readNotificationPreferences,
  requestNestNotifications,
  trackReminderPreferenceChanged,
  writeNotificationPreferences,
  type NestNotificationPreferences,
  type ReminderFrequency,
  type ReminderPreset,
} from "@/lib/notifications";

const PRESETS: {
  key: ReminderPreset;
  label: string;
  time: string;
}[] = [
  { key: "before_bed", label: "Before bed", time: "21:00" },
  { key: "evening", label: "Evening", time: "19:30" },
  { key: "morning", label: "Morning", time: "08:30" },
  { key: "custom", label: "Custom", time: "" },
];
const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

export function NotificationPreferences({
  flash,
}: {
  flash?: (msg: string) => void;
}) {
  const [prefs, setPrefs] = useState<NestNotificationPreferences>(
    readNotificationPreferences
  );
  const isStandalone =
  typeof window !== "undefined" ? isStandalonePwa() : false;
  useEffect(() => {
    writeNotificationPreferences(prefs);
  }, []);
  if (!isStandalone) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.024)",
          border: "1px solid rgba(255,255,255,0.062)",
          borderRadius: 16,
          padding: "15px 18px",
        }}
      >
        <div style={labelStyle}>Reminders unavailable</div>
        <div style={descStyle}>
          To use reminders, add The Nest to your Home Screen first.
          <br />
          iPhone: Share → Add to Home Screen
          <br />
          Android: Menu → Install app
        </div>
      </div>
    );
  }
  const update = (next: NestNotificationPreferences) => {
    setPrefs(next);
  };
  const saveSettings = async () => {
    if (prefs.enabled) {
      const granted = await requestNestNotifications();
  
      if (!granted) {
        flash?.("Notifications were not enabled");
        return;
      }
    }
  
    trackReminderPreferenceChanged(prefs);
    writeNotificationPreferences(prefs).catch(console.error);
  
    flash?.("Reminder settings saved");
  };

  const enableReminders = async () => {
    console.log("ENABLE CLICKED");
  
    const granted = await requestNestNotifications();
  
    console.log("GRANTED RESULT", granted);
  
    if (!granted) {
      flash?.("Notifications were not enabled");
      return;
    }
  
    await update({
      ...prefs,
      enabled: true,
      reminder_timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich",
    });
  
    flash?.("Gentle reminders enabled");
  };

  const disableReminders = async () => {
    await update({
      ...prefs,
      enabled: false,
    });

    flash?.("Reminders paused");
  };

  const choosePreset = async (preset: ReminderPreset, time: string) => {
    await update({
      ...prefs,
      preset,
      reminder_time: preset === "custom" ? prefs.reminder_time : time,
    });
  };

  const chooseFrequency = async (frequency: ReminderFrequency) => {
    await update({
      ...prefs,
      reminder_frequency: frequency,
      reminder_days:
        frequency === "daily"
          ? [1, 2, 3, 4, 5, 6, 0]
          : frequency === "weekly"
          ? [0]
          : prefs.reminder_days,
    });
  };

  const toggleDay = async (day: number) => {
    const selected = prefs.reminder_days.includes(day);

    await update({
      ...prefs,
      reminder_frequency: "selected_days",
      reminder_days: selected
        ? prefs.reminder_days.filter((d) => d !== day)
        : [...prefs.reminder_days, day],
    });
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
      <button
        style={rowStyle}
        onClick={prefs.enabled ? disableReminders : enableReminders}
      >
        <div>
          <div style={labelStyle}>
            {prefs.enabled ? "Gentle reminders on" : "Enable gentle reminders"}
          </div>
          <div style={descStyle}>
            Choose when The Nest should remind you. Pick a time when you usually
            have space to reflect.
          </div>
        </div>
        <span style={valueStyle}>{prefs.enabled ? "On" : "Off"}</span>
      </button>

      <div
        style={{
          opacity: prefs.enabled ? 1 : 0.42,
          pointerEvents: prefs.enabled ? "auto" : "none",
        }}
      >
        <div style={blockStyle}>
          <div style={labelStyle}>Reminder time</div>
          <input
            type="time"
            value={prefs.reminder_time}
            onChange={(e) =>
              update({
                ...prefs,
                reminder_time: e.target.value,
                preset: "custom",
                reminder_timezone:
                  Intl.DateTimeFormat().resolvedOptions().timeZone ||
                  "Europe/Zurich",
              })
            }
            style={inputStyle}
          />
        </div>
        <div style={blockStyle}>
  <div style={labelStyle}>Reminder message</div>
  <div style={descStyle}>
    This is the message you’ll receive in your reminder.
  </div>
  <textarea
    value={prefs.reminder_message}
    onChange={(e) =>
      update({
        ...prefs,
        reminder_message: e.target.value,
      })
    }
    placeholder="Write your reminder message..."
    style={{
      ...inputStyle,
      minHeight: 80,
      resize: "vertical",
      fontFamily: "inherit",
    }}
  />
</div>
        <div style={blockStyle}>
          <div style={labelStyle}>Quick presets</div>
          <div style={pillWrapStyle}>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => choosePreset(preset.key, preset.time)}
                style={{
                  ...pillStyle,
                  border:
                    prefs.preset === preset.key
                      ? "1px solid rgba(205,170,100,0.42)"
                      : pillStyle.border,
                  color:
                    prefs.preset === preset.key
                      ? "rgba(230,200,145,0.92)"
                      : pillStyle.color,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div style={blockStyle}>
          <div style={labelStyle}>Frequency</div>
          <div style={pillWrapStyle}>
            {[
              { key: "daily", label: "Daily" },
              { key: "selected_days", label: "Selected days" },
              { key: "weekly", label: "Weekly" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => chooseFrequency(item.key as ReminderFrequency)}
                style={{
                  ...pillStyle,
                  border:
                    prefs.reminder_frequency === item.key
                      ? "1px solid rgba(205,170,100,0.42)"
                      : pillStyle.border,
                  color:
                    prefs.reminder_frequency === item.key
                      ? "rgba(230,200,145,0.92)"
                      : pillStyle.color,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...blockStyle, borderBottom: "none" }}>
          <div style={labelStyle}>Reminder days</div>
          <div style={pillWrapStyle}>
            {DAYS.map((day) => {
              const active = prefs.reminder_days.includes(day.value);

              return (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  style={{
                    ...dayStyle,
                    border: active
                      ? "1px solid rgba(205,170,100,0.42)"
                      : dayStyle.border,
                    color: active
                      ? "rgba(230,200,145,0.92)"
                      : dayStyle.color,
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <button style={rowStyle} onClick={saveSettings}>
  <div>
    <div style={labelStyle}>Save reminder settings</div>
    <div style={descStyle}>
      Your reminder will follow this time, timezone, and selected days.
    </div>
  </div>
  <span style={valueStyle}>Save</span>
</button>
      <button style={{ ...rowStyle, borderBottom: "none" }} onClick={disableReminders}>
        <div>
          <div style={labelStyle}>No reminders</div>
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

const blockStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.044)",
  padding: "15px 18px",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(220,205,182,0.78)",
};

const descStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(155,140,118,0.36)",
  marginTop: 3,
  lineHeight: 1.45,
};

const valueStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(205,170,100,0.52)",
};

const inputStyle: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "11px 12px",
  color: "rgba(240,232,218,0.88)",
  fontSize: 13,
};

const pillWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const pillStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(255,255,255,0.065)",
  borderRadius: 999,
  padding: "8px 11px",
  color: "rgba(185,162,128,0.52)",
  fontSize: 12,
  cursor: "pointer",
};

const dayStyle: React.CSSProperties = {
  ...pillStyle,
  minWidth: 44,
};