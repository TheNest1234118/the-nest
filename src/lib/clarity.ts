import clarity from "@microsoft/clarity";

export function initClarity() {
  clarity.init(import.meta.env.VITE_CLARITY_ID);
}