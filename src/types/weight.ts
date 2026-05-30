// src/types/weight.ts (inline here for convenience)
export interface WeightRecord {
  id: string
  animal_id: string
  weight_kg: number
  recorded_at: string
  recorded_by?: string
  method: 'scale' | 'tape_measure' | 'visual_estimate'
  notes?: string
  body_condition_score?: number // 1-5 scale
}

export interface AnimalWeightSummary {
  animal_id: string
  tag_number: string
  name?: string
  breed?: string
  production_status?: string
  gender?: string
  current_weight?: number
  previous_weight?: number
  target_weight?: number
  last_measured_at?: string
  weight_history: WeightRecord[]
  trend: 'gaining' | 'losing' | 'stable' | 'unknown'
  change_kg?: number       // vs previous record
  change_pct?: number      // percentage change
  days_since_last?: number
  body_condition_score?: number
}

// ─── Simulation Data ────────────────────────────────────────────────────────

function pastDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

function makeHistory(
  animalId: string,
  weights: number[],
  daysAgoList: number[]
): WeightRecord[] {
  return weights.map((w, i) => ({
    id: `wr-${animalId}-${i}`,
    animal_id: animalId,
    weight_kg: w,
    recorded_at: pastDate(daysAgoList[i]),
    recorded_by: i % 2 === 0 ? 'John Kamau' : 'Mary Wanjiku',
    method: (['scale', 'tape_measure', 'scale', 'scale', 'tape_measure'] as const)[i % 5],
    notes: i === 0 ? 'Routine monthly check' : undefined,
    body_condition_score: [3.5, 3.0, 3.5, 4.0, 3.5, 3.0, 4.0][i % 7],
  }))
}

export const SIMULATED_WEIGHT_SUMMARIES: AnimalWeightSummary[] = [
  {
    animal_id: 'a1',
    tag_number: 'KE-0012',
    name: 'Daisy',
    breed: 'Friesian',
    production_status: 'lactating',
    gender: 'female',
    current_weight: 542,
    previous_weight: 528,
    target_weight: 560,
    last_measured_at: pastDate(7),
    trend: 'gaining',
    change_kg: 14,
    change_pct: 2.65,
    days_since_last: 7,
    body_condition_score: 3.5,
    weight_history: makeHistory('a1', [480, 495, 510, 522, 528, 542], [120, 90, 60, 45, 30, 7]),
  },
  {
    animal_id: 'a2',
    tag_number: 'KE-0023',
    name: 'Bella',
    breed: 'Ayrshire',
    production_status: 'lactating',
    gender: 'female',
    current_weight: 498,
    previous_weight: 510,
    target_weight: 520,
    last_measured_at: pastDate(14),
    trend: 'losing',
    change_kg: -12,
    change_pct: -2.35,
    days_since_last: 14,
    body_condition_score: 2.5,
    weight_history: makeHistory('a2', [520, 515, 512, 510, 498], [90, 60, 45, 30, 14]),
  },
  {
    animal_id: 'a3',
    tag_number: 'KE-0034',
    name: 'Rose',
    breed: 'Jersey',
    production_status: 'served',
    gender: 'female',
    current_weight: 380,
    previous_weight: 378,
    target_weight: 400,
    last_measured_at: pastDate(5),
    trend: 'stable',
    change_kg: 2,
    change_pct: 0.53,
    days_since_last: 5,
    body_condition_score: 3.0,
    weight_history: makeHistory('a3', [360, 365, 374, 378, 380], [90, 60, 30, 15, 5]),
  },
  {
    animal_id: 'a4',
    tag_number: 'KE-0045',
    name: 'Stella',
    breed: 'Friesian',
    production_status: 'heifer',
    gender: 'female',
    current_weight: 295,
    previous_weight: 278,
    target_weight: 350,
    last_measured_at: pastDate(10),
    trend: 'gaining',
    change_kg: 17,
    change_pct: 6.12,
    days_since_last: 10,
    body_condition_score: 3.5,
    weight_history: makeHistory('a4', [200, 225, 250, 268, 278, 295], [150, 120, 90, 60, 30, 10]),
  },
  {
    animal_id: 'a5',
    tag_number: 'KE-0056',
    name: 'Luna',
    breed: 'Ayrshire',
    production_status: 'calf',
    gender: 'female',
    current_weight: 68,
    previous_weight: 52,
    target_weight: 80,
    last_measured_at: pastDate(3),
    trend: 'gaining',
    change_kg: 16,
    change_pct: 30.77,
    days_since_last: 3,
    body_condition_score: 4.0,
    weight_history: makeHistory('a5', [32, 44, 52, 68], [60, 30, 15, 3]),
  },
  {
    animal_id: 'a6',
    tag_number: 'KE-0067',
    name: 'Mango',
    breed: 'Friesian',
    production_status: 'calf',
    gender: 'male',
    current_weight: 74,
    previous_weight: 56,
    target_weight: 85,
    last_measured_at: pastDate(6),
    trend: 'gaining',
    change_kg: 18,
    change_pct: 32.14,
    days_since_last: 6,
    body_condition_score: 4.0,
    weight_history: makeHistory('a6', [36, 48, 56, 74], [60, 30, 14, 6]),
  },
  {
    animal_id: 'a7',
    tag_number: 'KE-0078',
    name: 'Grace',
    breed: 'Jersey',
    production_status: 'steaming_dry_cows',
    gender: 'female',
    current_weight: 460,
    previous_weight: 450,
    target_weight: 480,
    last_measured_at: pastDate(20),
    trend: 'stable',
    change_kg: 10,
    change_pct: 2.22,
    days_since_last: 20,
    body_condition_score: 3.5,
    weight_history: makeHistory('a7', [440, 445, 450, 460], [60, 45, 30, 20]),
  },
  {
    animal_id: 'a8',
    tag_number: 'KE-0089',
    name: 'Amber',
    breed: 'Friesian',
    production_status: 'open_culling_dry_cows',
    gender: 'female',
    current_weight: 510,
    previous_weight: 525,
    target_weight: 520,
    last_measured_at: pastDate(35),
    trend: 'losing',
    change_kg: -15,
    change_pct: -2.86,
    days_since_last: 35,
    body_condition_score: 2.0,
    weight_history: makeHistory('a8', [535, 530, 525, 510], [90, 60, 35, 0]),
  },
]