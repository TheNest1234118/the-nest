import React from "react";
import { useLocation } from "wouter";
import { ProfileShell, ProfileCard, SectionLabel, SettingRow } from "@/pages/ProfileShell";

export function ProfileHelp() {
  const [, navigate] = useLocation();

  return (
    <ProfileShell title="Help & Guide" subtitle="Understand how The Nest works.">
      <SectionLabel>Help & Guide</SectionLabel>
      <ProfileCard>
        <SettingRow label="Open The Nest Guide" description="Revisit the first-time introduction" onTap={() => navigate("/onboarding")} />
        <SettingRow label="What are Capsules?" description="Voice notes for moments you don’t want to lose" />
        <SettingRow label="What are Thoughts?" description="Short written notes, ideas or reminders" />
        <SettingRow label="What are Reflections?" description="Weekly and monthly looks back at what you left behind" />
        <SettingRow label="What are Anchors?" description="Grounding reminders for overwhelming moments" />
        <SettingRow label="Privacy & AI Reflections" description="Reflections are created from your own saved thoughts and voice notes" last />
      </ProfileCard>
    </ProfileShell>
  );
}