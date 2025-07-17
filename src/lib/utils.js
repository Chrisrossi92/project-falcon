import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value) => {
  if (value == null) return '$0.00'; // Fallback for null/undefined
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (dateString) => {
  if (!dateString) return '—'; // Fallback for null/undefined
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  }); // Outputs e.g., "7/16/2025" – customize options as needed (add time with hour/minute if required)
};
