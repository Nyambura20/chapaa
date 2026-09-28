/**
 * Geographic outlines and hotspot coordinates for Kenya & East Africa.
 * Accurately scaled for SVG rendering in the SecOps threat deck.
 */

export interface Hotspot {
  id: string;
  name: string;
  county: string;
  x: number; // SVG % coord
  y: number; // SVG % coord
  threatCount: number;
  lastScam: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const KENYA_HOTSPOTS: Hotspot[] = [
  {
    id: 'nbo',
    name: 'Nairobi Central',
    county: 'Nairobi',
    x: 48,
    y: 62,
    threatCount: 18,
    lastScam: 'Fake M-Pesa Reversal (0701***231)',
    severity: 'CRITICAL',
  },
  {
    id: 'mba-changamwe',
    name: 'Changamwe Sentinel',
    county: 'Mombasa',
    x: 74,
    y: 84,
    threatCount: 9,
    lastScam: 'School Fee Paybill 522123 Mismatch',
    severity: 'CRITICAL',
  },
  {
    id: 'mba-bamburi',
    name: 'Bamburi Ward',
    county: 'Mombasa',
    x: 77,
    y: 81,
    threatCount: 5,
    lastScam: 'Predatory Loan Till 98821',
    severity: 'HIGH',
  },
  {
    id: 'ksm',
    name: 'Kisumu Port',
    county: 'Kisumu',
    x: 27,
    y: 54,
    threatCount: 7,
    lastScam: 'Fuliza Limit Increase Bait',
    severity: 'HIGH',
  },
  {
    id: 'eld',
    name: 'Eldoret CBD',
    county: 'Uasin Gishu',
    x: 32,
    y: 44,
    threatCount: 6,
    lastScam: 'Maranda High Impersonator',
    severity: 'MEDIUM',
  },
  {
    id: 'nkr',
    name: 'Nakuru Town',
    county: 'Nakuru',
    x: 40,
    y: 53,
    threatCount: 8,
    lastScam: 'Fake Reversal SMS',
    severity: 'HIGH',
  },
  {
    id: 'gar',
    name: 'Garissa Hub',
    county: 'Garissa',
    x: 72,
    y: 49,
    threatCount: 3,
    lastScam: 'Unverified SACCO Paybill',
    severity: 'MEDIUM',
  },
  {
    id: 'mld',
    name: 'Malindi Sub-County',
    county: 'Kilifi',
    x: 79,
    y: 74,
    threatCount: 4,
    lastScam: 'Crypto Advance Fee Trap',
    severity: 'MEDIUM',
  },
];

// Simplified high-fidelity SVG path coordinates for Kenya boundary
// ViewBox 0 0 500 550
export const KENYA_SVG_PATH =
  "M 195,50 " + // Turkana north border with South Sudan
  "L 270,55 " + // North border towards Ethiopia
  "L 320,80 " + // Moyale border
  "L 380,120 " + // Mandera triangle corner
  "L 410,170 " + // Mandera border with Somalia
  "L 395,240 " + // Wajir / Garissa eastern border
  "L 385,320 " + // Boni forest down to Indian Ocean
  "L 395,370 " + // Lamu archipelago coastline
  "L 360,420 " + // Malindi coast
  "L 335,465 " + // Mombasa coast
  "L 310,500 " + // Diani / Shimoni southern border with Tanzania
  "L 275,470 " + // Kilimanjaro / Taveta border
  "L 220,410 " + // Amboseli / Namanga border
  "L 180,390 " + // Kajiado / Magadi border
  "L 140,360 " + // Mara / Serengeti border
  "L 110,350 " + // Lake Victoria shore (Migori/Homa Bay)
  "L 100,310 " + // Rusinga / Kisumu bay
  "L 115,260 " + // Busia / Uganda border
  "L 135,210 " + // Mt Elgon border
  "L 165,130 " + // West Pokot / Turkana border
  "Z";
