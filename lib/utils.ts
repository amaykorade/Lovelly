// Simple utility to combine NativeWind / Tailwind-style class names.
// Filters out falsy values and joins the rest with spaces.
export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}


