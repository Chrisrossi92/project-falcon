import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combine class names with tailwind merging
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format a date string to a readable format (e.g., "Jul 2, 2025")
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format a number as USD currency (e.g., "$1,200.00")
export function formatCurrency(value) {
  const number = parseFloat(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(number);
}


