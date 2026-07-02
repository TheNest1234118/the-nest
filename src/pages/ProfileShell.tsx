import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export function ProfileShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top,0px)+46px) 18px 42px",
      }}
    >
      <header style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        <Link href="/home">
          <button
            style={{
              background: "none",
              border: "none",
              color: "rgba(185,162,128,.38)",
              padding: "4px 4px 0 0",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={22} strokeWidth={1.4} />
          </button>
        </Link>

        <div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 29,
              fontWeight: 400,
              color: "rgba(235,215,180,.9)",
              marginBottom: 7,
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p style={{ fontSize: 13, color: "rgba(185,162,128,.52)", lineHeight: 1.55 }}>
              {subtitle}
            </p>
          )}
        </div>
      </header>

      {children}
    </motion.div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        letterSpacing: "0.18em",
        color: "rgba(185,158,115,0.36)",
        marginBottom: 10,
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

export function ProfileCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.024)",
        border: "1px solid rgba(255,255,255,0.062)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export function SettingRow({
  label,
  description,
  destructive,
  danger,
  last,
  onTap,
}: any) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%",
        border: "none",
        background: "none",
        padding: 14,
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
        textAlign: "left",
        cursor: onTap ? "pointer" : "default",
        color: danger ? "rgba(215,100,80,0.8)" : "rgba(225,210,188,0.78)",
      }}
    >
      <div style={{ fontSize: 13 }}>{label}</div>
      {description && (
        <div
          style={{
            fontSize: 11,
            opacity: 0.5,
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      )}
    </button>
  );
}