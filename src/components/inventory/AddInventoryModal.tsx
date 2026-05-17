'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import {
  X, Package, AlertTriangle, Calendar, FlaskConical,
  Thermometer, ChevronDown, CheckCircle2, Loader2, Users,
  Search, Wrench, ChevronRight, Info,
} from 'lucide-react'

interface AddInventoryModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onItemAdded: (item: any) => void
}

const UNITS = [
  'kg', 'g', 'liters', 'ml', 'pieces', 'boxes', 'bales', 'vials',
  'bottles', 'doses', 'kits', 'bags', 'drums', 'units', 'Straws', 'tablets',
  'capsules', 'sachets', 'rolls', 'sheets', 'pairs', 'sets', 'Other',
]

// Stock-level unit options (richer set for the stock step)
const STOCK_UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'liters', label: 'Liters (L)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'pieces', label: 'Pieces (pcs)' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'bales', label: 'Bales' },
  { value: 'vials', label: 'Vials' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'doses', label: 'Doses' },
  { value: 'kits', label: 'Kits' },
  { value: 'bags', label: 'Bags' },
  { value: 'drums', label: 'Drums' },
  { value: 'units', label: 'Units' },
  { value: 'Straws', label: 'Straws' },
  { value: 'tablets', label: 'Tablets' },
  { value: 'capsules', label: 'Capsules' },
  { value: 'sachets', label: 'Sachets' },
  { value: 'rolls', label: 'Rolls' },
  { value: 'sheets', label: 'Sheets' },
  { value: 'pairs', label: 'Pairs' },
  { value: 'sets', label: 'Sets' },
  { value: 'Other', label: 'Other' },
]

// ─────────────────────────────────────────────────────────────────────────────
// FIELD TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export interface CategoryField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'toggle' | 'textarea'
  placeholder?: string
  hint?: string
  options?: string[]
  unit?: string
  required?: boolean
  /** If set, this field only appears when the subcategory code matches one of these values */
  onlyForSubcategories?: string[]
  /** If true, renders an extra free-text input when the selected value is "Other" */
  allowOtherInput?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY-LEVEL FIELDS
// ─────────────────────────────────────────────────────────────────────────────
export const CATEGORY_FIELDS: Record<string, CategoryField[]> = {

  medical: [
    { key: 'manufacturer', label: 'Manufacturer / Brand', type: 'text', placeholder: 'e.g. Norbrook, Bayer, Vetoquinol, Merial', hint: 'Company that manufactured the product' },
    { key: 'manufacturer_country', label: 'Country of Manufacture', type: 'select', options: ['Kenya', 'South Africa', 'India', 'UK', 'Germany', 'France', 'USA', 'Netherlands', 'Belgium', 'Israel', 'Australia', 'Other'], allowOtherInput: true },
    { key: 'registration_number', label: 'KVB / Regulatory Reg. No.', type: 'text', placeholder: 'e.g. KVB/PHARM/001/2024', hint: 'Kenya Veterinary Board registration number' },
    { key: 'drug_batch_number', label: 'Batch / Lot Number', type: 'text', placeholder: 'e.g. PEN-2026-C4', hint: 'From the manufacturer label' },
    { key: 'manufacture_date', label: 'Manufacture Date', type: 'date', hint: 'Date of manufacture printed on label' },
    { key: 'withdrawal_period_milk_days', label: 'Milk Withdrawal Period', type: 'number', placeholder: '0', unit: 'days', hint: 'Days before milk can be sold/used after last dose' },
    { key: 'withdrawal_period_meat_days', label: 'Meat Withdrawal Period', type: 'number', placeholder: '0', unit: 'days', hint: 'Days before animal can be slaughtered after last dose' },
    { key: 'storage_temperature', label: 'Storage Temperature', type: 'select', options: ['Room temp (15–25 °C)', 'Cool (8–15 °C)', 'Refrigerated (2–8 °C)', 'Frozen (< −18 °C)', 'Protected from light', 'Other'], allowOtherInput: true },
    { key: 'dosage_per_animal', label: 'Dosage per Animal', type: 'text', placeholder: 'e.g. 5 ml / 100 kg BW', hint: 'Standard dose for one cow' },
    { key: 'route_of_administration', label: 'Route of Administration', type: 'select', options: ['Intramuscular (IM)', 'Intravenous (IV)', 'Subcutaneous (SC)', 'Intramammary', 'Oral / Drench', 'Topical / Pour-on', 'Intranasal', 'Intravaginal', 'Other'], allowOtherInput: true },
    { key: 'treatment_duration_days', label: 'Treatment Duration', type: 'number', placeholder: '5', unit: 'days', hint: 'Typical course length' },
    { key: 'administered_by', label: 'Administered By', type: 'select', options: ['Veterinarian only', 'Farm staff (trained)', 'Either'] },
    { key: 'requires_prescription', label: 'Prescription Required', type: 'toggle', hint: 'Requires a vet prescription to purchase / administer' },
    { key: 'withholding_notes', label: 'Withholding / Special Notes', type: 'textarea', placeholder: 'Any additional compliance, milk testing, or handling notes…' },
  ],

  cropInputs: [
    { key: 'manufacturer', label: 'Manufacturer / Brand', type: 'text', placeholder: 'e.g. MEA Fertilizers, Kenya Seed Co., Syngenta' },
    { key: 'registration_number', label: 'PCPB / KEPHIS Reg. No.', type: 'text', placeholder: 'e.g. PCPB (CR) 0234', hint: 'Pest Control Products Board or KEPHIS registration' },
    { key: 'npk_ratio', label: 'NPK Ratio', type: 'text', placeholder: 'e.g. 23-23-0, CAN 26%N', hint: 'Nitrogen-Phosphorus-Potassium (fertilizers)' },
    { key: 'active_ingredient', label: 'Active Ingredient(s)', type: 'text', placeholder: 'e.g. Glyphosate 360 g/L, Imidacloprid 350 SC', hint: 'For pesticides / herbicides' },
    { key: 'formulation_type', label: 'Formulation Type', type: 'select', options: ['Granular', 'Powder / WP', 'Liquid / EC', 'Suspension Concentrate (SC)', 'Soluble Liquid (SL)', 'Seed dressing', 'Other'], allowOtherInput: true },
    { key: 'application_rate', label: 'Application Rate', type: 'text', placeholder: 'e.g. 50 kg / ha or 2 L / ha' },
    { key: 'seed_variety', label: 'Seed Variety / Lot No.', type: 'text', placeholder: 'e.g. DK8031 Maize, Pioneer P3253W' },
    { key: 'germination_rate_pct', label: 'Germination Rate', type: 'number', placeholder: '85', unit: '%', hint: 'As stated on seed bag label' },
    { key: 'reentry_interval_days', label: 'Re-entry Interval', type: 'number', placeholder: '0', unit: 'days', hint: 'Days before animals/workers can re-enter treated area' },
    { key: 'pre_harvest_interval_days', label: 'Pre-harvest Interval', type: 'number', placeholder: '0', unit: 'days', hint: 'Days from last application to harvest / grazing' },
    { key: 'target_field', label: 'Target Field / Block', type: 'text', placeholder: 'e.g. Block A — Napier, Paddock 3' },
    { key: 'target_crop', label: 'Target Crop', type: 'select', options: ['Napier grass', 'Rhodes grass', 'Kikuyu', 'Maize (silage)', 'Sorghum', 'Lucerne / Alfalfa', 'Brachiaria', 'Other forage', 'Vegetables', 'Other'], allowOtherInput: true },
    { key: 'hazard_class', label: 'Pesticide Hazard Class', type: 'select', options: ['N/A (fertilizer / seed)', 'Class Ia (Extremely hazardous)', 'Class Ib (Highly hazardous)', 'Class II (Moderately hazardous)', 'Class III (Slightly hazardous)', 'Class IV (Unlikely hazardous)'] },
    { key: 'ppe_required', label: 'PPE Required', type: 'text', placeholder: 'e.g. Gloves, goggles, respirator' },
  ],

  construction: [
    { key: 'manufacturer', label: 'Supplier / Manufacturer', type: 'text', placeholder: 'e.g. Bamburi Cement, Devki Steel' },
    { key: 'project_tag', label: 'Project / Job Tag', type: 'text', placeholder: 'e.g. Calf Pen Extension 2026' },
    { key: 'material_grade', label: 'Material Grade / Spec', type: 'text', placeholder: 'e.g. Y12 Deformed Bar, Grade 43 Cement, C30' },
    { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
    { key: 'delivery_note_number', label: 'Delivery Note No.', type: 'text', placeholder: 'e.g. DN-2026-04451' },
    { key: 'estimated_project_consumption', label: 'Est. Project Consumption', type: 'number', placeholder: '0', hint: 'How much this project will use (same unit as stock)' },
    { key: 'structure_type', label: 'Structure / Asset Type', type: 'select', options: ['Dairy parlour', 'Calf pen', 'Maternity pen', 'Feed store', 'Silage pit / bunker', 'Water tank', 'Perimeter fence', 'Crush / handling facility', 'Staff quarters', 'Office', 'Other'], allowOtherInput: true },
    { key: 'asset_linked', label: 'Linked Asset / Structure', type: 'text', placeholder: 'e.g. Dairy Parlour, Silage Pit B' },
    { key: 'quality_tested', label: 'Quality / Strength Tested', type: 'toggle', hint: 'e.g. cement cube test, steel certificate received' },
  ],

  // fuel: fuel_type is EXCLUDED from general — shown only for 'other' subcategory via SUBCATEGORY_FIELDS
  fuel: [
    { key: 'supplier_name', label: 'Supplier / Dealer', type: 'text', placeholder: 'e.g. Total Energies, Rubis, National Oil, Hashi' },
    { key: 'tank_id', label: 'Tank ID / Location', type: 'text', placeholder: 'e.g. Main farm diesel tank, Generator compound' },
    { key: 'tank_capacity', label: 'Tank Capacity', type: 'number', placeholder: '2000', unit: 'liters', hint: 'Total tank size on farm' },
    { key: 'reorder_threshold_pct', label: 'Reorder at Tank %', type: 'number', placeholder: '25', unit: '%', hint: 'Alert when tank drops below this percentage' },
    { key: 'equipment_assigned', label: 'Primary Equipment', type: 'text', placeholder: 'e.g. Milking plant, Generator, Tractor — MF 375' },
    { key: 'consumption_per_hour', label: 'Avg. Consumption', type: 'number', placeholder: '0', unit: 'L/hr', hint: 'Helps forecast reorder dates' },
    { key: 'consumption_per_day', label: 'Daily Consumption (farm total)', type: 'number', placeholder: '0', unit: 'liters/day' },
    { key: 'supplier_delivery_schedule', label: 'Supplier Delivery Schedule', type: 'text', placeholder: 'e.g. Every Tuesday, or call-off on request' },
    { key: 'fuel_meter_reading', label: 'Meter / Dipstick Reading at Receipt', type: 'number', placeholder: '0', unit: 'liters', hint: 'Record tank level when this delivery landed' },
  ],

  maintenance: [
    { key: 'manufacturer', label: 'Manufacturer / Brand', type: 'text', placeholder: 'e.g. DeLaval, GEA, Alfa Laval, Parker' },
    { key: 'compatible_equipment', label: 'Compatible Equipment', type: 'text', placeholder: 'e.g. DeLaval cluster, Kipor KDE6700T Generator' },
    { key: 'part_number', label: 'Part / SKU Number', type: 'text', placeholder: 'e.g. DL-4812-A, OEM-2234-KE' },
    { key: 'replacement_interval', label: 'Replacement Interval', type: 'text', placeholder: 'e.g. Every 2,500 milkings / 12 weeks' },
    { key: 'last_replaced_date', label: 'Last Replaced', type: 'date', hint: 'Date this part was last swapped out' },
    { key: 'lead_time_days', label: 'Supplier Lead Time', type: 'number', placeholder: '3', unit: 'days', hint: 'Days from order to delivery — critical for buffer stock' },
    { key: 'local_supplier', label: 'Local Supplier (Kenya)', type: 'text', placeholder: 'e.g. Agri-Vet Supplies Nakuru, DeLaval Kenya Nairobi' },
    { key: 'is_critical_spare', label: 'Critical Spare', type: 'toggle', hint: 'Milking / operations stop if this part runs out' },
    { key: 'warranty_months', label: 'Warranty Period', type: 'number', placeholder: '0', unit: 'months' },
    { key: 'installation_notes', label: 'Installation / Torque Notes', type: 'textarea', placeholder: 'Any torque settings, calibration steps, or installation tips…' },
  ],

  dairyHygiene: [
    { key: 'manufacturer', label: 'Manufacturer / Brand', type: 'text', placeholder: 'e.g. Kilco, Ecolab, Diversey, FIL' },
    { key: 'registration_number', label: 'KEBS / PCPB Reg. No.', type: 'text', placeholder: 'e.g. KEBS/CS-1234' },
    { key: 'active_ingredient', label: 'Active Ingredient', type: 'text', placeholder: 'e.g. Iodine 0.5%, Chlorhexidine 0.5%, Peracetic acid 5%' },
    { key: 'concentration_pct', label: 'Use Concentration', type: 'number', placeholder: '0.5', unit: '%', hint: 'Dilution % for ready-to-use solution' },
    { key: 'dilution_ratio', label: 'Dilution Ratio', type: 'text', placeholder: 'e.g. 1:200 with clean water' },
    { key: 'ml_per_cow_per_milking', label: 'Usage per Cow / Milking', type: 'number', placeholder: '12', unit: 'ml', hint: 'Helps auto-calculate session consumption (e.g. 500 cows × 12 ml)' },
    { key: 'application_point', label: 'Application Point', type: 'select', options: ['Pre-dip', 'Post-dip', 'Pre & post dip', 'CIP / Pipeline wash (acid)', 'CIP / Pipeline wash (alkali)', 'Teat spray', 'Surface / floor disinfectant', 'Footbath', 'Other'], allowOtherInput: true },
    { key: 'contact_time_sec', label: 'Required Contact Time', type: 'number', placeholder: '30', unit: 'seconds' },
    { key: 'linked_scc_target', label: 'Target SCC', type: 'number', placeholder: '200', unit: '000 cells/ml', hint: 'Milk quality benchmark this product supports' },
    { key: 'foam_or_liquid', label: 'Product Form', type: 'select', options: ['Liquid (ready to use)', 'Liquid concentrate', 'Foam concentrate', 'Powder', 'Gel', 'Tablet / effervescent', 'Other'], allowOtherInput: true },
    { key: 'compatible_with_iodine_test', label: 'Compatible with Iodine SNF Test', type: 'toggle', hint: 'Does teat dip residue interfere with milk SNF / iodine testing?' },
  ],

  breeding: [
    { key: 'semen_name', label: 'Semen / Bull Name', type: 'text', placeholder: 'e.g. Llyod, Silverado, Bolt, Pathway', hint: 'Commercial semen name as listed in the straw catalog' },
    { key: 'sire_code', label: 'Sire Code / Bull ID', type: 'text', placeholder: 'e.g. HOL-ZA-28834, NAAB code 007HO15229', hint: 'International or local sire identification code' },
    { key: 'breed', label: 'Breed', type: 'select', options: ['Holstein Friesian (HF)', 'Jersey', 'Guernsey', 'Ayrshire', 'Brown Swiss', 'Fleckvieh', 'Montbeliarde', 'HF × Jersey cross', 'HF × Ayrshire cross', 'Boran', 'Sahiwal', 'Other crossbreed', 'Other'], allowOtherInput: true },
    { key: 'supplier', label: 'Semen Supplier / AI Centre', type: 'text', placeholder: 'e.g. Semex, ABS Global, Select Sires, CIC Kenya, KAGRC' },
    { key: 'catalogue_code', label: 'Supplier Catalogue Code', type: 'text', placeholder: 'e.g. SEMEX 0151HO04109' },
    { key: 'genomic_rating', label: 'Genomic / EBV Rating', type: 'text', placeholder: 'e.g. +850 kg milk, TPI 2450, PLI £450' },
    { key: 'milk_ebv', label: 'Milk EBV (kg)', type: 'number', placeholder: '0', hint: 'Estimated breeding value for milk yield' },
    { key: 'fat_ebv_pct', label: 'Fat EBV (%)', type: 'number', placeholder: '0.00', hint: 'Estimated breeding value for fat %' },
    { key: 'protein_ebv_pct', label: 'Protein EBV (%)', type: 'number', placeholder: '0.00', hint: 'Estimated breeding value for protein %' },
    { key: 'scs_score', label: 'Somatic Cell Score (SCS)', type: 'number', placeholder: '2.8', hint: 'Lower is better — linked to mastitis resistance' },
    { key: 'calving_ease_score', label: 'Calving Ease Score', type: 'select', options: ['1 – Excellent', '2 – Good', '3 – Average', '4 – Difficult', '5 – Very difficult'] },
    { key: 'straw_type', label: 'Straw Type', type: 'select', options: ['Conventional (0.5 ml)', 'Mini straw (0.25 ml)', 'Sexed — Female (X-sorted)', 'Sexed — Male (Y-sorted)', 'Embryo'] },
    { key: 'sperm_concentration', label: 'Sperm Concentration', type: 'number', placeholder: '20', unit: '×10⁶ / straw', hint: 'Guaranteed motile sperm cells per straw' },
    { key: 'ln2_tank_id', label: 'LN₂ Storage Tank', type: 'text', placeholder: 'e.g. Tank A — Parlour Store, Tank B — Office' },
    { key: 'ln2_canister_goblet', label: 'Canister & Goblet Position', type: 'text', placeholder: 'e.g. Canister 3, Goblet 2 — top rack', hint: 'Exact location inside the LN₂ dewar for quick retrieval' },
    { key: 'ln2_level_cm', label: 'Current LN₂ Level', type: 'number', placeholder: '25', unit: 'cm', hint: 'Alert recommended at <10 cm to prevent straw loss' },
    { key: 'conception_rate_pct', label: 'Historic First-Service CR', type: 'number', placeholder: '60', unit: '%', hint: 'Farm-recorded first-service conception rate for this sire' },
    { key: 'disease_status', label: 'Disease Status Certification', type: 'text', placeholder: 'e.g. BVD-free, IBR-free, Health certificate #HC-2026-0044' },
  ],

  // Office: item_type drives what subcategory-specific fields appear
  office: [
    { key: 'item_type', label: 'Item Type', type: 'select', options: ['Ear tags (conventional)', 'RFID / EID tags', 'Rumen boluses (ID)', 'Rumen boluses (health)', 'Neck tags', 'Leg bands', 'Stationery', 'PPE — Gloves (examination)', 'PPE — Gloves (household)', 'PPE — Boots', 'PPE — Overalls', 'PPE — Safety helmets', 'Printer / label consumables', 'Other'], allowOtherInput: true },
    { key: 'manufacturer', label: 'Manufacturer / Brand', type: 'text', placeholder: 'e.g. Allflex, Dalton, Destron Fearing, Caisley' },
    // Regulatory Standard — only for tag-related item types (shown conditionally in render)
    { key: 'regulatory_standard', label: 'Regulatory Standard', type: 'text', placeholder: 'e.g. KVB / KEBS approved, ISO 11784/11785 compliant', onlyForSubcategories: ['eartags', 'rfidtags', 'boluses', 'necktags', 'legbands'] },
    // Tag-specific fields
    { key: 'tag_colour', label: 'Tag Colour', type: 'select', options: ['Yellow', 'Orange', 'Red', 'Blue', 'Green', 'White', 'Black', 'Pink', 'Other'], allowOtherInput: true, onlyForSubcategories: ['eartags', 'rfidtags', 'necktags', 'legbands'] },
    { key: 'tag_size', label: 'Tag Size / Type', type: 'select', options: ['Full size (adult)', 'Calf size (small)', 'Button tag', 'Visual + EID combo', 'Other'], allowOtherInput: true, onlyForSubcategories: ['eartags', 'rfidtags', 'necktags', 'legbands'] },
    { key: 'tags_per_animal', label: 'Tags per Animal', type: 'number', placeholder: '2', hint: 'Both ears? Official + management tag?', onlyForSubcategories: ['eartags', 'rfidtags', 'necktags', 'legbands'] },
    { key: 'annual_calves_est', label: 'Est. Annual Calves', type: 'number', placeholder: '500', hint: 'Drives minimum annual tag stock requirement', onlyForSubcategories: ['eartags', 'rfidtags', 'necktags', 'legbands'] },
    { key: 'frequency_mhz', label: 'RFID Frequency', type: 'select', options: ['N/A (visual only)', '134.2 kHz (ISO 11784/11785)', '125 kHz (EM4100)', 'UHF 860–960 MHz', 'Other'], allowOtherInput: true, onlyForSubcategories: ['rfidtags'] },
  ],

  packaging: [
    { key: 'container_type', label: 'Container Type', type: 'select', options: ['20L jerry can (HDPE)', '10L jerry can (HDPE)', '5L bottle', '1L bottle', '500 ml bottle', '250 ml bottle', 'Sachet / pouch (50 ml)', 'Sachet / pouch (500 ml)', 'Bulk tank (own)', 'Carton / tray', 'Other'], allowOtherInput: true },
    { key: 'manufacturer', label: 'Packaging Supplier', type: 'text', placeholder: 'e.g. Elewa Packaging, Orbit Plastics, Custom Plastics Ltd' },
    { key: 'label_version', label: 'Label Version', type: 'text', placeholder: 'e.g. v3.1 — May 2026', hint: 'Track label compliance version to avoid recalls' },
    { key: 'label_language', label: 'Label Language(s)', type: 'select', options: ['English', 'Swahili', 'English + Swahili', 'Other'], allowOtherInput: true },
    { key: 'kebs_mark', label: 'KEBS Diamond Mark', type: 'toggle', hint: 'Does packaging carry current KEBS mark of quality?' },
    { key: 'units_per_production_run', label: 'Units per Production Run', type: 'number', placeholder: '0', hint: 'How many packaging units does one filling run consume?' },
    { key: 'supplier_moq', label: 'Supplier MOQ', type: 'number', placeholder: '500', hint: 'Minimum order quantity from packaging supplier' },
    { key: 'damage_rate_pct', label: 'Avg. Damage / Spoilage', type: 'number', placeholder: '2', unit: '%', hint: 'Add buffer to reorder calculations' },
    { key: 'tamper_evident', label: 'Tamper-evident Seal', type: 'toggle', hint: 'Packaging has tamper-evident shrink sleeve or seal' },
  ],

  kitchen: [
    { key: 'staff_count', label: 'Staff to Cater', type: 'number', placeholder: '30', hint: 'Number of farm staff eating daily — drives consumption estimate' },
    { key: 'meals_per_day', label: 'Meals per Day', type: 'select', options: ['1 (lunch only)', '2 (breakfast + lunch)', '2 (lunch + dinner)', '3 (breakfast + lunch + dinner)', 'Other'], allowOtherInput: true },
    { key: 'weekly_consumption', label: 'Weekly Consumption', type: 'number', placeholder: '0', hint: 'In the same unit as stock (kg, liters, etc.)' },
    { key: 'delivery_schedule', label: 'Delivery Schedule', type: 'text', placeholder: 'e.g. Every Monday from Karatina Market' },
    { key: 'supplier_name', label: 'Supplier Name', type: 'text', placeholder: 'e.g. Nakumatt, local market, co-op farm' },
    { key: 'storage_method', label: 'Storage Method', type: 'select', options: ['Dry store (ambient)', 'Refrigerated (2–8 °C)', 'Frozen (< −18 °C)', 'Open shelf', 'Sealed container / bin', 'Other'], allowOtherInput: true },
    { key: 'fifo_enabled', label: 'FIFO Rotation Enforced', type: 'toggle', hint: 'First-in-first-out shelf rotation is enforced' },
    { key: 'halal_certified', label: 'Halal Certified', type: 'toggle', hint: 'Product is halal certified (where relevant)' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCATEGORY-SPECIFIC FIELDS
// ─────────────────────────────────────────────────────────────────────────────
export const SUBCATEGORY_FIELDS: Record<string, CategoryField[]> = {

  'medical:vaccines': [
    { key: 'vaccine_type', label: 'Vaccine Type', type: 'select', options: ['Live attenuated', 'Inactivated / Killed', 'Toxoid', 'Subunit / recombinant', 'mRNA', 'Other'], allowOtherInput: true },
    { key: 'antigen_strains', label: 'Antigen / Strains Covered', type: 'text', placeholder: 'e.g. FMD O, A, SAT1; BVD Type 1+2; IBR, BRSV, PI3' },
    { key: 'adjuvant', label: 'Adjuvant', type: 'text', placeholder: 'e.g. Aluminium hydroxide, oil-based, saponin' },
    { key: 'vaccination_program', label: 'Vaccination Program', type: 'select', options: ['Primary course (2 doses)', 'Annual booster (1 dose)', 'Biannual booster', 'Quarterly', 'On outbreak / ring vaccination', 'Calves only', 'Other'], allowOtherInput: true },
    { key: 'min_age_weeks', label: 'Minimum Age at First Dose', type: 'number', placeholder: '0', unit: 'weeks' },
    { key: 'revaccination_interval_weeks', label: 'Revaccination Interval', type: 'number', placeholder: '52', unit: 'weeks' },
    { key: 'government_program', label: 'Government / CAP Program', type: 'toggle', hint: 'Supplied or co-funded through DVS / County Vet program' },
  ],
  'medical:antibiotics': [
    { key: 'antibiotic_class', label: 'Antibiotic Class', type: 'select', options: ['Penicillins (e.g. Penicillin G, Amoxicillin)', 'Cephalosporins (e.g. Ceftiofur, Cefquinome)', 'Macrolides (e.g. Oxytetracycline, Tulathromycin)', 'Tetracyclines (e.g. Oxytetracycline)', 'Sulfonamides', 'Aminoglycosides (e.g. Gentamicin)', 'Fluoroquinolones (e.g. Enrofloxacin)', 'Lincosamides (e.g. Lincomycin)', 'Polymyxins (e.g. Colistin)', 'Other'], allowOtherInput: true },
    { key: 'indication', label: 'Primary Indication', type: 'select', options: ['Mastitis (intramammary)', 'Mastitis (systemic)', 'Respiratory infection (BRD)', 'Foot rot / Digital dermatitis', 'Metritis / Endometritis', 'Navel ill (calves)', 'Pneumonia (calves)', 'Diarrhoea (calves)', 'Wound / abscess', 'Dry cow therapy', 'Other'], allowOtherInput: true },
    { key: 'sensitivity_tested', label: 'Sensitivity / Culture Tested', type: 'toggle', hint: 'Use only after lab culture & sensitivity test on farm' },
    { key: 'critically_important', label: 'WHO Critically Important Antibiotic', type: 'toggle', hint: 'Flag if this is a WHO CIA (e.g. Fluoroquinolones, 3rd-gen Cephalosporins)' },
  ],
  'medical:dewormers': [
    { key: 'drug_class', label: 'Anthelmintic Class', type: 'select', options: ['Benzimidazoles (BZ) — e.g. Albendazole, Fenbendazole', 'Macrocyclic lactones (ML) — e.g. Ivermectin, Doramectin', 'Levamisole / Tetramisole', 'Closantel (flukes + worms)', 'Salicylanilides', 'Combination product', 'Other'], allowOtherInput: true },
    { key: 'target_parasites', label: 'Target Parasites', type: 'text', placeholder: 'e.g. Haemonchus, Fasciola, Ostertagia, Trichostrongylus, ticks' },
    { key: 'spectrum', label: 'Spectrum', type: 'select', options: ['Narrow spectrum (specific worms)', 'Broad spectrum (multiple roundworms)', 'Ecto- + endoparasite (pour-on)', 'Flukicide only', 'Flukicide + roundworm'] },
    { key: 'resistance_risk', label: 'Resistance Risk', type: 'select', options: ['Low (rotate regularly)', 'Medium (monitor FEC post treatment)', 'High (confirm efficacy by FEC)'] },
    { key: 'faecal_egg_count_target', label: 'Target FEC Reduction', type: 'text', placeholder: 'e.g. >95% reduction at day 14 post treatment' },
  ],
  'medical:hormones': [
    { key: 'hormone_type', label: 'Hormone Type', type: 'select', options: ['Oxytocin', 'GnRH (e.g. Receptal, Fertagyl)', 'Prostaglandin F2α (PGF2α — e.g. Estrumate, Lutalyse)', 'Progesterone (CIDR / PRID)', 'Oestradiol', 'Dexamethasone / Corticosteroid', 'Insulin / metabolic', 'Other'], allowOtherInput: true },
    { key: 'reproductive_protocol', label: 'Reproductive Protocol', type: 'select', options: ['Ovsynch', 'Doublesynch', 'Presynch-Ovsynch', 'G6G', 'CIDR-based protocol', 'Heat detection + AI', 'Induction of parturition', 'Milk let-down (oxytocin)', 'Other'], allowOtherInput: true },
    { key: 'cows_per_treatment', label: 'Cows per Treatment Cycle', type: 'number', placeholder: '0', hint: 'Number of cows enrolled in each synchronisation batch' },
  ],
  'medical:vitamins': [
    { key: 'vitamin_minerals', label: 'Vitamins / Minerals Included', type: 'text', placeholder: 'e.g. Vit A, D3, E, Selenium, Copper, Zinc, Cobalt, B12' },
    { key: 'deficiency_targeted', label: 'Deficiency / Condition Targeted', type: 'select', options: ['Milk fever (hypocalcaemia — Ca/P)', 'Grass tetany (hypomagnesaemia — Mg)', 'White muscle disease (Se/Vit E)', 'Retained placenta prevention', 'Poor body condition / weight gain', 'Reproductive performance', 'Immune support (transition cows)', 'Calf scours prevention', 'General maintenance', 'Other'], allowOtherInput: true },
    { key: 'delivery_method', label: 'Delivery Method', type: 'select', options: ['Injection (IM/SC)', 'Oral drench', 'Rumen bolus', 'In-feed / top-dress', 'Water soluble', 'Lick block', 'Intramammary'], allowOtherInput: true },
    { key: 'transition_cow_use', label: 'Transition Cow Protocol', type: 'toggle', hint: '3 weeks pre-calving to 3 weeks post-calving use' },
  ],

  'cropInputs:seeds': [
    { key: 'seed_treatment', label: 'Seed Treatment', type: 'text', placeholder: 'e.g. Thiram fungicide, Gaucho insecticide, untreated' },
    { key: 'days_to_maturity', label: 'Days to Maturity / Harvest', type: 'number', placeholder: '90', unit: 'days' },
    { key: 'planting_rate', label: 'Planting Rate', type: 'text', placeholder: 'e.g. 25 kg/ha, 75,000 plants/ha' },
    { key: 'row_spacing_cm', label: 'Row Spacing', type: 'number', placeholder: '75', unit: 'cm' },
    { key: 'expected_dry_matter_pct', label: 'Expected DM % (silage)', type: 'number', placeholder: '30', unit: '%', hint: 'Whole plant dry matter % at silage harvest' },
  ],
  'cropInputs:fertilizers': [
    { key: 'lime_requirement', label: 'Lime Required (soil pH adj.)', type: 'toggle', hint: 'Was a soil pH test done to confirm lime need?' },
    { key: 'soil_test_date', label: 'Soil Test Date', type: 'date', hint: 'Date of most recent soil analysis report' },
    { key: 'recommended_by', label: 'Recommendation Source', type: 'text', placeholder: 'e.g. Crop Nutrition Lab, county extension officer' },
    { key: 'split_application', label: 'Split Application', type: 'toggle', hint: 'Applied in multiple splits (e.g. basal + top-dress)' },
  ],
  'cropInputs:pesticides': [
    { key: 'pre_mix', label: 'Pre-mix Product', type: 'toggle', hint: 'Is this a pre-mixed combination of two or more actives?' },
    { key: 'application_equipment', label: 'Application Equipment', type: 'select', options: ['Knapsack sprayer', 'Motorised mist blower', 'Tractor-mounted boom', 'Drone / aerial', 'Granule spreader', 'Seed treatment dresser', 'Other'], allowOtherInput: true },
    { key: 'water_volume', label: 'Water Volume per Ha', type: 'number', placeholder: '200', unit: 'L/ha', hint: 'Carrier water volume for dilution' },
  ],

  // Fuel subcategory-specific: only the 'other' subcategory shows fuel_type
  'fuel:diesel': [
    { key: 'sulphur_content', label: 'Sulphur Content', type: 'select', options: ['ULSD < 10 ppm', 'LSD < 50 ppm', 'Standard diesel (350 ppm)', 'HSD (industrial)', 'Unknown'] },
    { key: 'cetane_number', label: 'Cetane Number', type: 'number', placeholder: '51', hint: '≥51 recommended for modern CR diesel engines' },
  ],
  'fuel:petrol': [],  // no extra fields beyond general fuel
  'fuel:lubricants': [
    { key: 'viscosity_grade', label: 'Viscosity Grade', type: 'select', options: ['SAE 5W-30', 'SAE 10W-40', 'SAE 15W-40', 'SAE 20W-50', 'SAE 30 (monograde)', 'SAE 40 (monograde)', 'ISO VG 46 (hydraulic)', 'ISO VG 68 (hydraulic)', 'NLGI 2 grease', 'Other'], allowOtherInput: true },
    { key: 'oil_spec', label: 'Oil Specification', type: 'text', placeholder: 'e.g. API CK-4, ACEA E9, OEM approval number' },
    { key: 'change_interval_hours', label: 'Change Interval', type: 'number', placeholder: '500', unit: 'engine hours' },
  ],
  // For 'Other' fuel subcategory: show fuel_type selector
  'fuel:other': [
    { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Diesel', 'Petrol', 'LPG (cooking)', 'Lubricant / Engine oil', 'Hydraulic oil', 'Gear oil', 'Grease', 'Paraffin', 'Other'], allowOtherInput: true },
  ],

  'maintenance:spareparts': [
    { key: 'system', label: 'Equipment System', type: 'select', options: ['Milking cluster / liner', 'Milk pump', 'Pulsator', 'Vacuum pump', 'Plate cooler', 'Milk tank / bulk cooler', 'Generator / alternator', 'Tractor drivetrain', 'Water pump', 'Automatic feeders', 'Heat detection system', 'Other'], allowOtherInput: true },
    { key: 'oem_vs_aftermarket', label: 'OEM or Aftermarket', type: 'select', options: ['OEM (original manufacturer)', 'OEM-equivalent (approved)', 'Quality aftermarket', 'Generic / unknown origin'] },
    { key: 'service_interval_milkings', label: 'Service Interval', type: 'number', placeholder: '2500', unit: 'milkings', hint: 'e.g. liners at 2,500 milkings; rubberware at 3 months' },
  ],
  'maintenance:plumbing': [
    { key: 'pipe_material', label: 'Pipe / Fitting Material', type: 'select', options: ['uPVC', 'cPVC (hot water)', 'Polypropylene (PP-R)', 'HDPE', 'Copper', 'GI (galvanised iron)', 'Stainless steel', 'PEX', 'Other'], allowOtherInput: true },
    { key: 'pipe_diameter_mm', label: 'Pipe Diameter', type: 'number', placeholder: '25', unit: 'mm' },
    { key: 'pressure_rating_bar', label: 'Pressure Rating', type: 'number', placeholder: '10', unit: 'bar' },
  ],
  'maintenance:tools': [
    { key: 'tool_category', label: 'Tool Category', type: 'select', options: ['Hand tools (spanners, pliers)', 'Power tools (drill, grinder)', 'Welding equipment', 'Lifting equipment (jack, chain block)', 'Measuring instruments', 'PPE / safety equipment', 'Other'], allowOtherInput: true },
    { key: 'calibration_due', label: 'Calibration Due Date', type: 'date', hint: 'For weighing scales, pressure gauges, thermometers' },
    { key: 'insured', label: 'Covered by Equipment Insurance', type: 'toggle' },
  ],

  'dairyHygiene:teatdips': [
    { key: 'iodine_concentration_pct', label: 'Iodine Concentration', type: 'number', placeholder: '0.5', unit: '%', hint: 'Standard post-dip: 0.5%; pre-dip: 0.1–0.3%' },
    { key: 'glycerine_pct', label: 'Glycerine / Emollient %', type: 'number', placeholder: '3', unit: '%', hint: 'Teat conditioning agent — reduces chapping' },
    { key: 'application_method', label: 'Application Method', type: 'select', options: ['Dip cup (individual)', 'Spray gun / hand pump', 'Automatic post-spray system', 'Other'], allowOtherInput: true },
    { key: 'residue_free_time_min', label: 'Residue-free Time', type: 'number', placeholder: '30', unit: 'min', hint: 'Time post-dip before milking to avoid residue carry-over' },
  ],
  'dairyHygiene:disinfectants': [
    { key: 'pathogen_spectrum', label: 'Pathogen Spectrum', type: 'select', options: ['Bacteria only (bactericidal)', 'Bacteria + fungi', 'Bacteria + enveloped viruses', 'Broad spectrum (bacteria, fungi, viruses, spores)', 'Mycobactericidal (TB)', 'Other'], allowOtherInput: true },
    { key: 'footbath_concentration', label: 'Footbath Concentration', type: 'number', placeholder: '5', unit: '%', hint: 'If used in foot bath — recommended dilution %' },
    { key: 'footbath_change_interval', label: 'Footbath Change Interval', type: 'select', options: ['Every 150 cow passes', 'Every 200 cow passes', 'Daily', 'Every 2 days', 'Twice weekly', 'Weekly', 'Other'], allowOtherInput: true },
  ],
  'dairyHygiene:detergents': [
    { key: 'detergent_type', label: 'Detergent Type', type: 'select', options: ['Alkaline (protein/fat removal — CIP acid step pre-wash)', 'Caustic alkali (strong pipeline cleaning)', 'Acid (mineral / milk stone removal)', 'Chlorinated alkali (combined clean + sanitise)', 'Enzyme-based (biofilm)', 'Neutral (teat/udder washing)', 'Other'], allowOtherInput: true },
    { key: 'use_temperature_c', label: 'Use Temperature', type: 'number', placeholder: '55', unit: '°C', hint: 'Recommended CIP wash temperature' },
    { key: 'cip_volume_per_wash_l', label: 'CIP Volume per Wash', type: 'number', placeholder: '80', unit: 'liters', hint: 'Volume of solution used per pipeline wash cycle' },
  ],

  'breeding:semen': [
    { key: 'ai_technician', label: 'AI Technician / Inseminator', type: 'text', placeholder: 'e.g. James Kamau (farm AI tech), CIC Kenya mobile team' },
    { key: 'heat_detection_method', label: 'Heat Detection Method', type: 'select', options: ['Visual observation', 'Tail paint / chalk', 'Kamar patches', 'Pedometer / activity monitor', 'Automated (HR-Tag, SCR)', 'Synchronisation protocol (no heat detection)', 'Other'], allowOtherInput: true },
    { key: 'ai_method', label: 'AI Method', type: 'select', options: ['Natural heat AI', 'Timed AI (TAI) — fixed time', 'Double Ovsynch', 'Presynch-Ovsynch', 'Other protocol'], allowOtherInput: true },
    { key: 'straws_per_cow', label: 'Straws Used per Cow', type: 'number', placeholder: '1', hint: 'Typically 1; some protocols use 2 for sexed semen' },
    { key: 'target_calving_pattern', label: 'Target Calving Pattern', type: 'select', options: ['Year-round (continuous)', 'Compact (8–10 week block)', 'Spring block', 'Autumn block', 'Other'], allowOtherInput: true },
    { key: 'expected_conception_rate', label: 'Expected Conception Rate', type: 'number', placeholder: '55', unit: '%', hint: 'Based on sire data and farm records for planning straw inventory' },
    { key: 'backup_bull_on_farm', label: 'Backup Bull on Farm', type: 'toggle', hint: 'Is a sweep bull available for repeat breeders?' },
  ],
  'breeding:aiconsumables': [
    { key: 'consumable_type', label: 'Consumable Type', type: 'select', options: ['AI sheaths / straws guards', 'Gloves (rectal examination)', 'Lubricant', 'AI gun / catheter', 'Straw cutter / tweezers', 'Thawing flask / thermometer', 'LN₂ top-up equipment', 'Synchronisation syringes / needles', 'CIDR / PRID applicator', 'Embryo transfer equipment', 'Other'], allowOtherInput: true },
    { key: 'compatible_gun_model', label: 'Compatible AI Gun Model', type: 'text', placeholder: 'e.g. IMV half-straw gun, Minitüb full-straw' },
    { key: 'sterile_pack', label: 'Individually Sterile Packed', type: 'toggle', hint: 'Single-use sterile packaging per unit' },
  ],

  'office:stationery': [
    { key: 'stationery_use', label: 'Primary Use', type: 'select', options: ['Milk recording sheets', 'Health treatment records', 'Breeding / calving records', 'Feed intake sheets', 'Daily task / labour log', 'Financial records', 'General office', 'Other'], allowOtherInput: true },
  ],
  'office:staffcons': [
    { key: 'ppe_type', label: 'PPE Type', type: 'select', options: ['Examination gloves (nitrile)', 'Household gloves (rubber)', 'Milking overalls', 'Gumboots / wellington boots', 'Safety helmet', 'Face shield / goggles', 'Ear defenders', 'Hi-vis vest', 'Other'], allowOtherInput: true },
    { key: 'size', label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size / universal', 'Other'], allowOtherInput: true },
    { key: 'replacement_frequency', label: 'Replacement Frequency', type: 'select', options: ['Daily (disposable)', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'On wear-out'] },
  ],

  'kitchen:drygoods': [
    { key: 'grain_type', label: 'Grain / Staple Type', type: 'select', options: ['Maize flour (unga)', 'Rice', 'Wheat flour', 'Beans (mixed)', 'Lentils', 'Soya', 'Rolled oats / porridge', 'Other'], allowOtherInput: true },
    { key: 'moisture_content_pct', label: 'Moisture Content', type: 'number', placeholder: '13', unit: '%', hint: 'Store dry goods below 14% MC to prevent mould' },
    { key: 'bag_size_kg', label: 'Bag Size', type: 'number', placeholder: '90', unit: 'kg' },
  ],
  'kitchen:gas': [
    { key: 'cylinder_size_kg', label: 'Cylinder Size', type: 'select', options: ['6 kg', '13 kg', '22 kg', '35 kg (commercial)', '48 kg (commercial)', 'Bulk tank', 'Other'], allowOtherInput: true },
    { key: 'cylinders_on_site', label: 'Cylinders on Site', type: 'number', placeholder: '2', hint: 'Including the active cylinder' },
    { key: 'usage_days_per_cylinder', label: 'Usage per Cylinder', type: 'number', placeholder: '14', unit: 'days', hint: 'Helps forecast reorder frequency' },
  ],
  'kitchen:appliances': [
    { key: 'appliance_type', label: 'Appliance Type', type: 'select', options: ['Industrial gas cooker / stove', 'Pressure cooker', 'Electric kettle', 'Microwave', 'Refrigerator (kitchen)', 'Chest freezer (kitchen)', 'Water dispenser', 'Other'], allowOtherInput: true },
    { key: 'warranty_months', label: 'Warranty Period', type: 'number', placeholder: '12', unit: 'months' },
    { key: 'service_schedule', label: 'Service Schedule', type: 'text', placeholder: 'e.g. Annual service by supplier' },
  ],

  'packaging:containers': [
    { key: 'food_grade', label: 'Food Grade Material', type: 'toggle', hint: 'FDA/KEBS-approved food-contact grade (HDPE2, PP5)' },
    { key: 'reusable', label: 'Reusable / Returnable', type: 'toggle', hint: 'Containers are returned, cleaned, and reused by customers' },
    { key: 'lid_type', label: 'Lid Type', type: 'select', options: ['Screw cap', 'Snap-on lid', 'Tamper-evident ring cap', 'Foil heat seal', 'No lid (open top)', 'Other'], allowOtherInput: true },
    { key: 'graduation_markings', label: 'Volume Graduation Markings', type: 'toggle', hint: 'Container has ml/L measurement markings (useful for dispensing)' },
  ],
  'packaging:labels': [
    { key: 'label_material', label: 'Label Material', type: 'select', options: ['Paper (uncoated)', 'Paper (gloss laminated)', 'Polypropylene (PP) self-adhesive', 'BOPP (waterproof)', 'Shrink sleeve (PVC/PET)', 'Direct thermal (barcode only)', 'Other'], allowOtherInput: true },
    { key: 'printing_method', label: 'Printing Method', type: 'select', options: ['Inkjet (in-house)', 'Laser (in-house)', 'Flexographic (supplier)', 'Digital offset (supplier)', 'Other'], allowOtherInput: true },
    { key: 'label_dimensions_mm', label: 'Label Dimensions', type: 'text', placeholder: 'e.g. 100 mm × 70 mm' },
    { key: 'barcode_type', label: 'Barcode Type', type: 'select', options: ['EAN-13', 'EAN-8', 'Code 128', 'QR code', 'No barcode', 'Other'], allowOtherInput: true },
  ],

  'construction:cement': [
    { key: 'cement_class', label: 'Cement Class', type: 'select', options: ['CEM I 42.5R (OPC)', 'CEM I 52.5R (high early strength)', 'CEM II / B-V 32.5R (PPC — pozzolanic)', 'CEM III (blast furnace — sulphate resistant)', 'Special rapid-hardening', 'Other'], allowOtherInput: true },
    { key: 'bags_per_m3_mix', label: 'Bags per m³ Mix', type: 'number', placeholder: '7', unit: 'bags/m³', hint: 'e.g. 7 × 50 kg bags for C25 mix (1:2:4)' },
  ],
  'construction:iron': [
    { key: 'steel_grade', label: 'Steel Grade', type: 'select', options: ['Y8 (8mm deformed bar)', 'Y10 (10mm deformed bar)', 'Y12 (12mm deformed bar)', 'Y16 (16mm deformed bar)', 'Y20 (20mm deformed bar)', 'R6 (6mm round — links)', 'Mild steel flat bar', 'Angle iron', 'Square hollow section (SHS)', 'Rectangular hollow section (RHS)', 'GI sheet', 'Other'], allowOtherInput: true },
    { key: 'length_per_bar_m', label: 'Length per Bar', type: 'number', placeholder: '12', unit: 'm' },
    { key: 'bars_per_bundle', label: 'Bars per Bundle', type: 'number', placeholder: '10' },
  ],
  'construction:roofing': [
    { key: 'roofing_type', label: 'Roofing Type', type: 'select', options: ['GI corrugated iron sheets (gauge 30)', 'GI corrugated iron sheets (gauge 28)', 'Box profile (IBR)', 'Colorbond / prepainted IBR', 'Fibre cement / asbestos-free', 'Polycarbonate (clear sheets)', 'Bamboo / thatch (calf pens)', 'Other'], allowOtherInput: true },
    { key: 'sheet_length_m', label: 'Sheet Length', type: 'number', placeholder: '3.6', unit: 'm' },
    { key: 'sheets_per_bundle', label: 'Sheets per Bundle', type: 'number', placeholder: '10' },
  ],
  'construction:fencing': [
    { key: 'fencing_type', label: 'Fencing Type', type: 'select', options: ['Barbed wire (2-strand)', 'Barbed wire (3-strand)', 'Plain wire (paddock subdivision)', 'Chain link (chainmail)', 'Electric fence (permanent)', 'Electric fence (temporary / tape)', 'Post-and-rail (timber)', 'Concrete Y-pole', 'Steel droppers / star pickets', 'Gate (pedestrian)', 'Gate (vehicle)', 'Cattle crush components', 'Other'], allowOtherInput: true },
    { key: 'roll_length_m', label: 'Roll / Length', type: 'number', placeholder: '200', unit: 'm' },
    { key: 'paddock_or_perimeter', label: 'Use', type: 'select', options: ['Perimeter fence', 'Paddock subdivision', 'Handling facility', 'Calf pen', 'Parlour holding area', 'Other'], allowOtherInput: true },
  ],
}

// Office subcategory codes that show tag-specific fields
const TAG_SUBCATEGORY_CODES = ['eartags', 'rfidtags', 'necktags', 'legbands']

// ─────────────────────────────────────────────────────────────────────────────
// MachineryPicker
// ─────────────────────────────────────────────────────────────────────────────
function MachineryPicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [equipment, setEquipment] = useState<{ id: string; name: string; type: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchEquipment = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/equipment')
        if (!res.ok) throw new Error('Failed to fetch equipment')
        const data = await res.json()
        setEquipment(data || [])
      } catch (err) {
        setError('Could not load equipment list')
        setEquipment([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchEquipment()
  }, [])

  const filtered = query.trim()
    ? equipment.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.type.toLowerCase().includes(query.toLowerCase()))
    : equipment

  const grouped = filtered.reduce<Record<string, typeof equipment>>((acc, m) => {
    if (!acc[m.type]) acc[m.type] = []
    acc[m.type].push(m)
    return acc
  }, {})

  const selectedMachine = equipment.find(m => m.id === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Label className="text-sm font-medium flex items-center gap-1.5 mb-1">
        <Wrench className="h-3.5 w-3.5 text-gray-400" />
        Equipment / Machinery
        <span className="ml-1 text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Optional</span>
      </Label>
      <p className="text-xs text-gray-400 mb-1.5">Link this spare part to a specific machine on your farm.</p>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${isOpen ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-300 hover:border-gray-400'}`}
      >
        {selectedMachine ? (
          <span className="text-gray-900 font-medium">{selectedMachine.name} <span className="font-normal text-gray-500">({selectedMachine.type})</span></span>
        ) : value === 'custom' ? (
          <span className="text-gray-500 italic">Enter manually below…</span>
        ) : (
          <span className="text-gray-400">Select a machine (optional)…</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input autoFocus type="text" placeholder="Search machinery…" value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {isLoading ? <p className="text-sm text-gray-500 text-center py-6">Loading equipment…</p>
              : error ? <p className="text-sm text-red-500 text-center py-6">{error}</p>
              : (
                <>
                  {value && (
                    <button type="button" onClick={() => { onChange(''); setIsOpen(false); setQuery('') }}
                      className="w-full px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 text-left border-b border-gray-100">
                      ✕ Clear selection
                    </button>
                  )}
                  {Object.keys(grouped).length === 0
                    ? <p className="text-sm text-gray-400 text-center py-6">No machines found</p>
                    : Object.entries(grouped).map(([type, machines]) => (
                      <div key={type}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">{type}</div>
                        {machines.map(m => (
                          <button key={m.id} type="button"
                            onClick={() => { onChange(m.id); setIsOpen(false); setQuery('') }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors ${value === m.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-800'}`}>
                            <span>{m.name}</span>
                            {value === m.id && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    ))
                  }
                </>
              )}
          </div>
          <div className="border-t p-2">
            <button type="button" onClick={() => { onChange('custom'); setIsOpen(false); setQuery('') }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
              Not in list — enter manually
            </button>
          </div>
        </div>
      )}

      {value === 'custom' && (
        <div className="mt-2">
          <Input placeholder="Enter machine or equipment name…" className="text-sm"
            onChange={e => onChange(`custom:${e.target.value}`)} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OtherInput — rendered below a select when "Other" is chosen
// ─────────────────────────────────────────────────────────────────────────────
function OtherInput({ fieldKey, values, onChange }: {
  fieldKey: string
  values: Record<string, any>
  onChange: (key: string, val: any) => void
}) {
  const otherKey = `${fieldKey}_other`
  return (
    <div className="mt-2">
      <Input
        placeholder="Please specify…"
        value={values[otherKey] ?? ''}
        onChange={e => onChange(otherKey, e.target.value)}
        className="text-sm border-dashed border-indigo-300 focus:border-indigo-500"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Determine if a field should be visible given the current subcategory
// ─────────────────────────────────────────────────────────────────────────────
function isFieldVisible(field: CategoryField, subcategoryCode: string): boolean {
  if (!field.onlyForSubcategories) return true
  return field.onlyForSubcategories.includes(subcategoryCode)
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryDetailsStep
// ─────────────────────────────────────────────────────────────────────────────
function CategoryDetailsStep({
  categoryCode,
  subcategoryCode,
  categoryName,
  subcategoryName,
  values,
  onChange,
  errors,
}: {
  categoryCode: string
  subcategoryCode: string
  categoryName: string
  subcategoryName: string
  values: Record<string, any>
  onChange: (key: string, val: any) => void
  errors: Record<string, string>
}) {
  const catFields = (CATEGORY_FIELDS[categoryCode] ?? []).filter(f => isFieldVisible(f, subcategoryCode))
  const subKey = subcategoryCode ? `${categoryCode}:${subcategoryCode}` : ''
  const subFields = subKey ? (SUBCATEGORY_FIELDS[subKey] ?? []) : []

  // Deduplicate: subcategory fields take precedence
  const catFieldKeys = new Set(catFields.map(f => f.key))
  const uniqueSubFields = subFields.filter(f => !catFieldKeys.has(f.key))

  const hasFields = catFields.length > 0 || uniqueSubFields.length > 0

  if (!hasFields) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Info className="h-6 w-6 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">No extra fields for this category</p>
          <p className="text-xs text-gray-400 mt-1">Click <strong>Next</strong> to continue to Stock Levels.</p>
        </div>
      </div>
    )
  }

  const renderField = (field: CategoryField) => {
    const val = values[field.key] ?? (field.type === 'toggle' ? false : '')
    const err = errors[field.key]
    const showOther = field.allowOtherInput && val === 'Other'

    if (field.type === 'toggle') {
      return (
        <div key={field.key}
          onClick={() => onChange(field.key, !val)}
          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all select-none ${val ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </p>
            {field.hint && <p className="text-xs text-gray-500 mt-0.5">{field.hint}</p>}
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-4 ${val ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
            {val && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        </div>
      )
    }

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          <Label className="text-sm font-medium flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
            {field.unit && <span className="ml-1 text-gray-400 font-normal">({field.unit})</span>}
          </Label>
          {field.hint && <p className="text-xs text-gray-400 mt-0.5 mb-1">{field.hint}</p>}
          <div className="relative mt-1">
            <select
              value={val}
              onChange={e => onChange(field.key, e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="">Select…</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {showOther && <OtherInput fieldKey={field.key} values={values} onChange={onChange} />}
          {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.key}>
          <Label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          {field.hint && <p className="text-xs text-gray-400 mt-0.5 mb-1">{field.hint}</p>}
          <textarea
            placeholder={field.placeholder}
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={3}
          />
          {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        </div>
      )
    }

    // text | number | date
    return (
      <div key={field.key}>
        <Label htmlFor={field.key} className="text-sm font-medium flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
          {field.unit && <span className="ml-1 text-gray-400 font-normal">({field.unit})</span>}
        </Label>
        {field.hint && <p className="text-xs text-gray-400 mt-0.5 mb-1">{field.hint}</p>}
        <Input
          id={field.key}
          type={field.type}
          placeholder={field.placeholder}
          value={val}
          min={field.type === 'number' ? 0 : undefined}
          step={field.type === 'number' ? 'any' : undefined}
          onChange={e => onChange(field.key, e.target.value)}
          className="mt-1"
        />
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Tip banner */}
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex gap-2">
        <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 leading-relaxed">
          Fields for <strong>{categoryName}</strong>
          {subcategoryName && <> — <strong>{subcategoryName}</strong></>}.
          All are optional unless marked <span className="text-red-500"> *</span>.
        </p>
      </div>

      {/* Category-level general fields */}
      {catFields.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {categoryName} — General
          </p>
          {catFields.map(renderField)}
        </div>
      )}

      {/* Subcategory-specific fields — visually separated with a well-spaced divider */}
      {uniqueSubFields.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 border-t border-dashed border-gray-300" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap px-1">
              {subcategoryName} — Specific Details
            </span>
            <div className="flex-1 border-t border-dashed border-gray-300" />
          </div>
          <div className="space-y-4 pt-1">
            {uniqueSubFields.map(renderField)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────
type Step = 'basic' | 'details' | 'stock' | 'tracking' | 'review'

const STEPS: { key: Step; label: string }[] = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'details', label: 'Category Details' },
  { key: 'stock', label: 'Stock Levels' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'review', label: 'Review' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────
export function AddInventoryModal({ farmId, isOpen, onClose, onItemAdded }: AddInventoryModalProps) {
  const [step, setStep] = useState<Step>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [isLoadingDepts, setIsLoadingDepts] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCats, setIsLoadingCats] = useState(false)

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    subcategory_id: '',
    machineryId: '',
    description: '',
    unit_of_measure: 'kg',
    // Purchase info (new)
    purchase_quantity: '',
    purchase_quantity_unit: 'kg',
    purchase_amount: '',     // total purchase cost
    cost_per_unit: '',       // auto-calculated or manually entered
    supplier: '',
    storage_location: '',
    department_id: '',
    // Stock
    current_stock: '',
    stock_unit: 'kg',        // user-selected unit for stock (new)
    minimum_stock: '',
    reorder_level: '',
    reorder_quantity: '',
    // Tracking
    is_perishable: false,
    requires_batch_tracking: false,
    expiry_date: '',
    batch_number: '',
    notes: '',
  })

  const [categoryMeta, setCategoryMeta] = useState<Record<string, any>>({})
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({})

  // ── Auto-calculate cost per unit when purchase_quantity or purchase_amount changes
  useEffect(() => {
    const qty = parseFloat(form.purchase_quantity)
    const amount = parseFloat(form.purchase_amount)
    if (qty > 0 && amount > 0) {
      setForm(f => ({ ...f, cost_per_unit: (amount / qty).toFixed(4) }))
    }
  }, [form.purchase_quantity, form.purchase_amount])

  useEffect(() => {
    if (!isOpen) return
    const fetchDepts = async () => {
      setIsLoadingDepts(true)
      try {
        const res = await fetch('/api/teams/departments')
        const json = await res.json()
        if (json.success) setDepartments(json.data)
      } catch { } finally { setIsLoadingDepts(false) }
    }
    const fetchCategories = async () => {
      setIsLoadingCats(true)
      try {
        const res = await fetch('/api/inventory/categories?include_subcategories=true')
        const json = await res.json()
        if (json.success) setCategories(json.data)
      } catch { } finally { setIsLoadingCats(false) }
    }
    fetchDepts()
    fetchCategories()
  }, [isOpen])

  const set = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const setMeta = (key: string, value: any) => {
    setCategoryMeta(m => ({ ...m, [key]: value }))
    setMetaErrors(e => ({ ...e, [key]: '' }))
  }

  const selectedCategory = categories.find(c => c.id === form.category_id)
  const subcategories = selectedCategory?.subcategories || []
  const selectedSubcat = subcategories.find((s: any) => s.id === form.subcategory_id)
  const categoryCode: string = selectedCategory?.code ?? ''
  const subcategoryCode: string = selectedSubcat?.code ?? ''

  const validate = (s: Step): boolean => {
    const errs: Record<string, string> = {}

    if (s === 'basic') {
      if (!form.name.trim()) errs.name = 'Item name is required'
      if (!form.category_id) errs.category_id = 'Category is required'
      if (!form.subcategory_id && subcategories.length > 0)
        errs.subcategory_id = 'Subcategory is required'
      if (!form.unit_of_measure) errs.unit_of_measure = 'Unit is required'
      if (form.purchase_quantity && isNaN(Number(form.purchase_quantity)))
        errs.purchase_quantity = 'Must be a number'
      if (form.purchase_amount && isNaN(Number(form.purchase_amount)))
        errs.purchase_amount = 'Must be a number'
      if (form.purchase_quantity && !form.purchase_quantity_unit)
        errs.purchase_quantity_unit = 'Select a unit'
    }

    if (s === 'details') {
      const catFields = (CATEGORY_FIELDS[categoryCode] ?? []).filter(f => isFieldVisible(f, subcategoryCode))
      const subKey = subcategoryCode ? `${categoryCode}:${subcategoryCode}` : ''
      const subFields = subKey ? (SUBCATEGORY_FIELDS[subKey] ?? []) : []
      const seen = new Set(catFields.map(f => f.key))
      const uniqueSubFields = subFields.filter(f => !seen.has(f.key))
      const mErrs: Record<string, string> = {}
      ;[...catFields, ...uniqueSubFields].forEach(f => {
        if (f.required) {
          const val = categoryMeta[f.key]
          if (val === undefined || val === null || val === '')
            mErrs[f.key] = `${f.label} is required`
        }
      })
      if (Object.keys(mErrs).length > 0) { setMetaErrors(mErrs); return false }
    }

    if (s === 'stock') {
      if (!form.current_stock || isNaN(Number(form.current_stock)))
        errs.current_stock = 'Enter a valid quantity'
      if (!form.stock_unit)
        errs.stock_unit = 'Select a stock unit'
      if (form.minimum_stock && isNaN(Number(form.minimum_stock)))
        errs.minimum_stock = 'Must be a number'
      if (form.reorder_level && isNaN(Number(form.reorder_level)))
        errs.reorder_level = 'Must be a number'
      if (form.minimum_stock && form.reorder_level &&
        Number(form.reorder_level) < Number(form.minimum_stock))
        errs.reorder_level = 'Reorder level should be ≥ minimum stock'
    }

    if (s === 'tracking') {
      if (form.is_perishable && !form.requires_batch_tracking)
        errs.requires_batch_tracking = 'Perishable items must have batch tracking enabled'
      if (form.requires_batch_tracking && form.expiry_date) {
        const expiry = new Date(form.expiry_date)
        if (expiry <= new Date())
          errs.expiry_date = 'Expiry date must be in the future'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    const idx = STEPS.findIndex(s => s.key === step)
    if (!validate(step)) return
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
  }

  const back = () => {
    const idx = STEPS.findIndex(s => s.key === step)
    if (idx > 0) setStep(STEPS[idx - 1].key)
  }

  const handleSubmit = async () => {
    if (!validate('stock')) { setStep('stock'); return }
    setIsSubmitting(true)
    try {
      const cleanMeta = Object.fromEntries(
        Object.entries(categoryMeta).filter(([, v]) => v !== '' && v !== null && v !== undefined),
      )
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id,
        subcategory_id: form.subcategory_id || null,
        department_id: form.department_id || null,
        equipment_id: form.machineryId || null,
        description: form.description?.trim() || null,
        unit_of_measure: form.stock_unit || form.unit_of_measure,
        current_stock: Number(form.current_stock),
        minimum_stock: Number(form.minimum_stock) || 0,
        reorder_level: Number(form.reorder_level) || 0,
        reorder_quantity: Number(form.reorder_quantity) || 0,
        cost_per_unit: Number(form.cost_per_unit) || 0,
        purchase_quantity: form.purchase_quantity ? Number(form.purchase_quantity) : null,
        purchase_quantity_unit: form.purchase_quantity_unit || null,
        purchase_amount: form.purchase_amount ? Number(form.purchase_amount) : null,
        is_perishable: form.is_perishable,
        requires_batch_tracking: form.requires_batch_tracking,
        shelf_life_days: form.expiry_date
          ? Math.ceil((new Date(form.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        supplier_preferred: form.supplier?.trim() || null,
        notes: form.notes?.trim() || null,
        category_metadata: Object.keys(cleanMeta).length > 0 ? cleanMeta : null,
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) { onItemAdded(data.item); handleClose() }
      else setErrors(data.errors || { submit: data.error || 'Failed to create item' })
    } catch {
      setErrors({ submit: 'Network error — please try again' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm({
      name: '', category_id: '', subcategory_id: '', machineryId: '', description: '',
      unit_of_measure: 'kg', purchase_quantity: '', purchase_quantity_unit: 'kg',
      purchase_amount: '', cost_per_unit: '', supplier: '', storage_location: '',
      department_id: '', current_stock: '', stock_unit: 'kg', minimum_stock: '',
      reorder_level: '', reorder_quantity: '', is_perishable: false,
      requires_batch_tracking: false, expiry_date: '', batch_number: '', notes: '',
    })
    setCategoryMeta({})
    setMetaErrors({})
    setStep('basic')
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const stepIdx = STEPS.findIndex(s => s.key === step)
  const progress = ((stepIdx + 1) / STEPS.length) * 100

  const filledMetaCount = Object.values(categoryMeta).filter(
    v => v !== '' && v !== null && v !== undefined && v !== false,
  ).length

  // Effective unit label shown in stock step
  const effectiveUnit = form.stock_unit || form.unit_of_measure

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Add Inventory Item</h2>
              <p className="text-xs text-gray-500">
                Step {stepIdx + 1} of {STEPS.length} — {STEPS[stepIdx].label}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-gray-100 shrink-0">
          <div className="h-1 bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Step pills */}
        <div className="flex gap-1 px-6 py-3 border-b bg-gray-50 shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => i < stepIdx && setStep(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                s.key === step
                  ? 'bg-indigo-600 text-white'
                  : i < stepIdx
                  ? 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {i < stepIdx && <CheckCircle2 className="h-3 w-3" />}
              {s.label}
              {s.key === 'details' && i < stepIdx && filledMetaCount > 0 && (
                <span className="ml-1 bg-indigo-200 text-indigo-800 rounded-full px-1.5 py-0.5 text-[10px]">
                  {filledMetaCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: BASIC INFO ── */}
          {step === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Spring, Bearings, Oxytetracycline 20%, Penicillin-Strep"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="mt-1"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Department */}
              <div>
                <Label htmlFor="department" className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  Managing Department
                </Label>
                <div className="relative mt-1">
                  <select
                    id="department"
                    value={form.department_id}
                    onChange={e => set('department_id', e.target.value)}
                    disabled={isLoadingDepts}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {isLoadingDepts && <p className="text-[10px] text-gray-400 mt-1">Loading departments…</p>}
              </div>

              {/* Category */}
              <div>
                <Label className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <select
                    value={form.category_id}
                    onChange={e => {
                      set('category_id', e.target.value)
                      set('subcategory_id', '')
                      setCategoryMeta({})
                      setMetaErrors({})
                    }}
                    disabled={isLoadingCats}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                  >
                    <option value="">Select a category…</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {isLoadingCats && <p className="text-xs text-gray-400 mt-1">Loading categories…</p>}
                {errors.category_id && <p className="text-xs text-red-600 mt-1">{errors.category_id}</p>}
              </div>

              {/* Subcategory pills */}
              {form.category_id && subcategories.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">
                    Subcategory <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {subcategories.map((sub: any) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          set('subcategory_id', sub.id)
                          setCategoryMeta({})
                          setMetaErrors({})
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          form.subcategory_id === sub.id
                            ? 'border-indigo-400 bg-indigo-100 text-indigo-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                  {errors.subcategory_id && <p className="text-xs text-red-600 mt-1">{errors.subcategory_id}</p>}
                </div>
              )}

              {/* Machinery picker — only for maintenance */}
              {categoryCode === 'maintenance' && (
                <MachineryPicker
                  value={form.machineryId}
                  onChange={val => set('machineryId', val)}
                />
              )}

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <textarea
                  id="description"
                  placeholder="Optional notes about this item…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Unit of Measure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">
                    Unit of Measure <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <select
                      value={form.unit_of_measure}
                      onChange={e => {
                        set('unit_of_measure', e.target.value)
                        // Sync stock_unit if not yet changed separately
                        if (form.stock_unit === form.unit_of_measure || !form.stock_unit)
                          set('stock_unit', e.target.value)
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.unit_of_measure && <p className="text-xs text-red-600 mt-1">{errors.unit_of_measure}</p>}
                </div>
                <div>
                  <Label htmlFor="supplier" className="text-sm font-medium">Supplier</Label>
                  <Input
                    id="supplier"
                    placeholder="e.g. Unga Feeds Ltd, Agri-Vet Nakuru"
                    value={form.supplier}
                    onChange={e => set('supplier', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Purchase Quantity & Amount (NEW) */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Details</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="purchase_quantity" className="text-sm font-medium">Purchase Quantity</Label>
                    <p className="text-[10px] text-gray-400 mb-1">e.g. 1 bottle of 100 ml</p>
                    <Input
                      id="purchase_quantity"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 100"
                      value={form.purchase_quantity}
                      onChange={e => set('purchase_quantity', e.target.value)}
                      className="mt-1"
                    />
                    {errors.purchase_quantity && <p className="text-xs text-red-600 mt-1">{errors.purchase_quantity}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Purchase Unit</Label>
                    <p className="text-[10px] text-gray-400 mb-1">Unit of the above quantity</p>
                    <div className="relative mt-1">
                      <select
                        value={form.purchase_quantity_unit}
                        onChange={e => set('purchase_quantity_unit', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.purchase_quantity_unit && <p className="text-xs text-red-600 mt-1">{errors.purchase_quantity_unit}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="purchase_amount" className="text-sm font-medium">Purchase Amount (KES)</Label>
                    <Input
                      id="purchase_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Current purchase cost"
                      value={form.purchase_amount}
                      onChange={e => set('purchase_amount', e.target.value)}
                      className="mt-1"
                    />
                    {errors.purchase_amount && <p className="text-xs text-red-600 mt-1">{errors.purchase_amount}</p>}
                  </div>
                  <div>
                    <Label htmlFor="cost_per_unit" className="text-sm font-medium">
                      Cost per Unit (KES)
                      {form.purchase_quantity && form.purchase_amount && (
                        <span className="ml-1 text-[10px] text-indigo-500 font-normal bg-indigo-50 px-1 py-0.5 rounded">auto</span>
                      )}
                    </Label>
                    <Input
                      id="cost_per_unit"
                      type="number"
                      min="0"
                      step="0.0001"
                      placeholder="0.00"
                      value={form.cost_per_unit}
                      onChange={e => set('cost_per_unit', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Auto-calculated from quantity & amount, or enter manually.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="storage_location" className="text-sm font-medium">Storage Location</Label>
                <Input
                  id="storage_location"
                  placeholder="e.g. Feed store, Fridge 1, LN₂ Tank A"
                  value={form.storage_location}
                  onChange={e => set('storage_location', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: CATEGORY DETAILS ── */}
          {step === 'details' && (
            <CategoryDetailsStep
              categoryCode={categoryCode}
              subcategoryCode={subcategoryCode}
              categoryName={selectedCategory?.display_name ?? categoryCode}
              subcategoryName={selectedSubcat?.name ?? ''}
              values={categoryMeta}
              onChange={setMeta}
              errors={metaErrors}
            />
          )}

          {/* ── STEP 3: STOCK LEVELS ── */}
          {step === 'stock' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Set the current quantity and thresholds that trigger low-stock alerts and automatic
                reorder suggestions.
              </div>

              {/* Current stock + unit selector */}
              <div>
                <Label className="text-sm font-medium">
                  Current Stock <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-gray-400 mb-1.5">Select the unit and enter the quantity on hand.</p>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      id="current_stock"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={form.current_stock}
                      onChange={e => set('current_stock', e.target.value)}
                    />
                  </div>
                  <div className="w-36 shrink-0">
                    <div className="relative">
                      <select
                        value={form.stock_unit}
                        onChange={e => set('stock_unit', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                      >
                        {STOCK_UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                {errors.current_stock && <p className="text-xs text-red-600 mt-1">{errors.current_stock}</p>}
                {errors.stock_unit && <p className="text-xs text-red-600 mt-1">{errors.stock_unit}</p>}
                {form.stock_unit === 'Other' && (
                  <div className="mt-2">
                    <Input
                      placeholder="Specify unit…"
                      className="text-sm border-dashed border-indigo-300"
                      onChange={e => set('stock_unit', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="minimum_stock" className="text-sm font-medium">
                  Minimum Stock Level
                  <span className="ml-1 text-gray-400 font-normal">({effectiveUnit})</span>
                </Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Alert when below this"
                  value={form.minimum_stock}
                  onChange={e => set('minimum_stock', e.target.value)}
                  className="mt-1"
                />
                {errors.minimum_stock && <p className="text-xs text-red-600 mt-1">{errors.minimum_stock}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  A low-stock alert fires when current stock drops below this level.
                </p>
              </div>

              <div>
                <Label htmlFor="reorder_level" className="text-sm font-medium">
                  Reorder Level
                  <span className="ml-1 text-gray-400 font-normal">({effectiveUnit})</span>
                </Label>
                <Input
                  id="reorder_level"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Trigger reorder at this level"
                  value={form.reorder_level}
                  onChange={e => set('reorder_level', e.target.value)}
                  className="mt-1"
                />
                {errors.reorder_level && <p className="text-xs text-red-600 mt-1">{errors.reorder_level}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Stock level that prompts a purchase order suggestion (usually above minimum).
                </p>
              </div>

              <div>
                <Label htmlFor="reorder_quantity" className="text-sm font-medium">
                  Reorder Quantity
                  <span className="ml-1 text-gray-400 font-normal">({effectiveUnit})</span>
                </Label>
                <Input
                  id="reorder_quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Default quantity to order"
                  value={form.reorder_quantity}
                  onChange={e => set('reorder_quantity', e.target.value)}
                  className="mt-1"
                />
              </div>

              {form.current_stock && form.cost_per_unit && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Estimated Inventory Value</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    KES {(Number(form.current_stock) * Number(form.cost_per_unit)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {form.current_stock} {effectiveUnit} × KES {Number(form.cost_per_unit).toLocaleString(undefined, { maximumFractionDigits: 4 })} / {effectiveUnit}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: TRACKING ── */}
          {step === 'tracking' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                Enable batch tracking for medicines, vaccines, semen, and perishable feed to monitor expiry dates.
              </div>

              <div
                onClick={() => set('is_perishable', !form.is_perishable)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${form.is_perishable ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${form.is_perishable ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <Thermometer className={`h-5 w-5 ${form.is_perishable ? 'text-orange-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Perishable Item</p>
                    <p className="text-xs text-gray-500">This item can spoil, degrade, or has a shelf life</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${form.is_perishable ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                  {form.is_perishable && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>

              <div
                onClick={() => set('requires_batch_tracking', !form.requires_batch_tracking)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${form.requires_batch_tracking ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${form.requires_batch_tracking ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <FlaskConical className={`h-5 w-5 ${form.requires_batch_tracking ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Batch Tracking</p>
                    <p className="text-xs text-gray-500">Track individual batches with lot numbers and expiry</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${form.requires_batch_tracking ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                  {form.requires_batch_tracking && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>

              {errors.requires_batch_tracking && (
                <p className="text-xs text-red-600">{errors.requires_batch_tracking}</p>
              )}

              {(form.is_perishable || form.requires_batch_tracking) && (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label htmlFor="expiry_date" className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      Expiry Date
                    </Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={form.expiry_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => set('expiry_date', e.target.value)}
                      className="mt-1"
                    />
                    {errors.expiry_date && <p className="text-xs text-red-600 mt-1">{errors.expiry_date}</p>}
                  </div>
                  <div>
                    <Label htmlFor="batch_number" className="text-sm font-medium">Batch / Lot Number</Label>
                    <Input
                      id="batch_number"
                      placeholder="e.g. PEN-2026-C4"
                      value={form.batch_number}
                      onChange={e => set('batch_number', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
                <textarea
                  id="notes"
                  placeholder="Storage requirements, handling instructions, etc."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── STEP 5: REVIEW ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-base">{form.name || '—'}</h3>
                  {selectedCategory && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {selectedCategory.emoji} {selectedCategory.display_name}
                    </span>
                  )}
                  {selectedSubcat && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                      {selectedSubcat.name}
                    </span>
                  )}
                </div>
                {form.description && <p className="text-sm text-gray-600">{form.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Current Stock', value: form.current_stock ? `${form.current_stock} ${effectiveUnit}` : '—' },
                  { label: 'Minimum Stock', value: form.minimum_stock ? `${form.minimum_stock} ${effectiveUnit}` : '—' },
                  { label: 'Reorder Level', value: form.reorder_level ? `${form.reorder_level} ${effectiveUnit}` : '—' },
                  { label: 'Reorder Qty', value: form.reorder_quantity ? `${form.reorder_quantity} ${effectiveUnit}` : '—' },
                  { label: 'Purchase Qty', value: form.purchase_quantity ? `${form.purchase_quantity} ${form.purchase_quantity_unit}` : '—' },
                  { label: 'Purchase Amount', value: form.purchase_amount ? `KES ${Number(form.purchase_amount).toLocaleString()}` : '—' },
                  { label: 'Cost per Unit', value: form.cost_per_unit ? `KES ${Number(form.cost_per_unit).toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '—' },
                  { label: 'Supplier', value: form.supplier || '—' },
                  { label: 'Storage', value: form.storage_location || '—' },
                  { label: 'Department', value: departments.find(d => d.id === form.department_id)?.name || 'Not assigned' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white border rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Category metadata summary */}
              {Object.keys(categoryMeta).length > 0 && (() => {
                const catFields = (CATEGORY_FIELDS[categoryCode] ?? []).filter(f => isFieldVisible(f, subcategoryCode))
                const subKey = subcategoryCode ? `${categoryCode}:${subcategoryCode}` : ''
                const subFields = subKey ? (SUBCATEGORY_FIELDS[subKey] ?? []) : []
                const seen = new Set(catFields.map(f => f.key))
                const allFields = [...catFields, ...subFields.filter(f => !seen.has(f.key))].filter(f => {
                  const v = categoryMeta[f.key]
                  return v !== undefined && v !== null && v !== '' && v !== false
                })
                if (allFields.length === 0) return null
                return (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {selectedCategory?.display_name} Details{selectedSubcat ? ` — ${selectedSubcat.name}` : ''}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {allFields.map(f => {
                        const rawVal = categoryMeta[f.key]
                        const displayVal = f.type === 'toggle'
                          ? (rawVal ? 'Yes' : 'No')
                          : `${rawVal}${f.unit ? ` ${f.unit}` : ''}`
                        return (
                          <div key={f.key} className="bg-white border rounded-lg p-3">
                            <p className="text-xs text-gray-500">{f.label}</p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{displayVal}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-2 flex-wrap">
                {form.is_perishable && <Badge className="bg-orange-100 text-orange-800">Perishable</Badge>}
                {form.requires_batch_tracking && <Badge className="bg-indigo-100 text-indigo-800">Batch Tracked</Badge>}
                {form.expiry_date && <Badge className="bg-red-100 text-red-800">Expires {form.expiry_date}</Badge>}
                {form.batch_number && <Badge className="bg-gray-100 text-gray-700 font-mono">{form.batch_number}</Badge>}
              </div>

              {form.current_stock && form.cost_per_unit && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs text-green-700">Total Inventory Value</p>
                  <p className="text-xl font-bold text-green-800 mt-1">
                    KES {(Number(form.current_stock) * Number(form.cost_per_unit)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl shrink-0">
          <Button variant="outline" onClick={stepIdx === 0 ? handleClose : back} disabled={isSubmitting}>
            {stepIdx === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step !== 'review' ? (
            <Button onClick={next}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Add Item</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}