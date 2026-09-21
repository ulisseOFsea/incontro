import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return [
    Math.floor(s / 3600),
    Math.floor(s / 60) % 60,
    s % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function downloadBlob(data: Blob | string, name: string, type = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const nav = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (b: Blob, n: string) => void;
  };
  if (typeof nav.msSaveOrOpenBlob === "function") {
    nav.msSaveOrOpenBlob(blob, name);
    return URL.createObjectURL(blob);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.target = "_blank";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return url;
}

export function isEmail(value: string) {
  const v = value.trim();
  return v.length > 4 && v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Lettura file non riuscita."));
    reader.readAsDataURL(blob);
  });
}
