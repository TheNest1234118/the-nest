import { ReflectionExperience } from "@/pages/ReflectionExperience";

function isWeeklyUnlocked() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();

  return day === 0 && hour >= 20;
}

export function WeeklyReflection() {
  if (!isWeeklyUnlocked()) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: "#09090d",
          color: "rgba(242,231,213,.92)",
          maxWidth: 480,
          margin: "0 auto",
          padding: "80px 22px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "rgba(205,170,100,.52)", fontSize: 11, letterSpacing: ".18em" }}>
          WEEKLY REFLECTION
        </p>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, fontWeight: 400 }}>
          Your week is still unfolding.
        </h1>

        <p style={{ color: "rgba(185,162,128,.62)", fontSize: 14, lineHeight: 1.6 }}>
          Your Weekly Reflection unlocks every Sunday at 8 PM.
        </p>
      </div>
    );
  }

  return <ReflectionExperience kind="weekly" />;
}