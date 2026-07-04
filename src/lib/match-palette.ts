/**
 * Centralized match score color palette.
 * Used consistently in:
 *  - MatchBadge components (discover/investors, discover/startups)
 *  - MatchHeatMap chart slices and legend
 */

export type MatchPaletteEntry = {
  hex:      string;
  bg:       string;
  border:   string;
  text:     string;
  darkText: string;
};

export const MATCH_PALETTE: Record<"high" | "medium" | "low", MatchPaletteEntry> = {
  // 70%+ strong match — vivid green
  high: {
    hex:        "#00A65A",
    bg:         "rgba(0,166,90,0.12)",
    border:     "rgba(0,166,90,0.35)",
    text:       "#007A42",
    darkText:   "#34D98A",
  },
  // 40–69% good match — vibrant amber/orange
  medium: {
    hex:        "#FF9F1C",
    bg:         "rgba(255,159,28,0.12)",
    border:     "rgba(255,159,28,0.35)",
    text:       "#C47600",
    darkText:   "#FFBE5C",
  },
  // <40% low match — strong red/rose
  low: {
    hex:        "#FF4B5C",
    bg:         "rgba(255,75,92,0.12)",
    border:     "rgba(255,75,92,0.30)",
    text:       "#C8162A",
    darkText:   "#FF8090",
  },
};

/** Return the palette entry for a given numeric score */
export function paletteForScore(score: number): MatchPaletteEntry {
  if (score >= 70) return MATCH_PALETTE.high;
  if (score >= 40) return MATCH_PALETTE.medium;
  return MATCH_PALETTE.low;
}
