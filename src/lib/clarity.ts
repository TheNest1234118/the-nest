import Clarity from "@microsoft/clarity";

export function initClarity() {
  const id = import.meta.env.VITE_CLARITY_ID;

  console.log("CLARITY ID:", id);

  if (!id) return;
  if (typeof window === "undefined") return;

  Clarity.init(id);
}