/** Turn arbitrary text into a URL/identifier-safe slug (max 32 chars). */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // separate accents from letters
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "") // drop invalid characters
    .trim()
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse repeated hyphens
    .replace(/^-+|-+$/g, "") // trim hyphens from the ends
    .slice(0, 32)
}
