import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function removeHashtags(text?: string | null) {
  if (!text) return "";

  return text
    .replace(/(^|\s)#[^\s#]+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
