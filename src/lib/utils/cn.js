import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind‑aware className combiner (clsx + tailwind-merge). */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
export default cn;
