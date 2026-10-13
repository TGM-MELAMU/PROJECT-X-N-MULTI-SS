/**
 * Development sample catalogue: the single source for both `prisma/seed.ts` and the
 * no-database preview (`USE_MOCK_DATA=true`).
 *
 * ALL names, prices, specs and stock are PLACEHOLDERS. Replace with real client data before launch.
 * Prices are VAT-inclusive ZAR (whole rands).
 */

export type SampleProduct = {
  name: string;
  brand: string;
  category: string; // category slug
  variant: string;
  sku: string;
  model?: string;
  price: number;
  was?: number; // compare-at price => SALE badge (and counts as a special offer)
  stock: number;
  featured?: boolean;
  desc: string;
  specs?: Array<[name: string, value: string]>;
};

export const SAMPLE_CATEGORIES = [
  ["Laboratory Equipment", "laboratory-equipment"],
  ["Medical Equipment", "medical-equipment"],
  ["Chemicals & Reagents", "chemicals-reagents"],
  ["Consumables", "consumables"],
  ["Safety & Protection", "safety-protection"],
  ["Glassware", "glassware"],
  ["Furniture", "furniture"],
  ["Special Offers", "special-offers"],
] as const;

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  // Laboratory Equipment
  { name: "Binocular Microscope", brand: "OptiLab", category: "laboratory-equipment", variant: "40x–1000x", sku: "LAB-MIC-001", model: "BM-1000", price: 7500, stock: 8, featured: true, desc: "Binocular compound microscope with LED illumination for teaching and clinical labs.", specs: [["Magnification", "40x–1000x"], ["Illumination", "LED, adjustable"], ["Eyepieces", "WF10x, binocular"], ["Power", "230 V"]] },
  { name: "Hot Plate Magnetic Stirrer", brand: "OptiLab", category: "laboratory-equipment", variant: "Standard", sku: "LAB-STR-001", model: "HS-200", price: 4200, stock: 12, featured: true, desc: "Heated magnetic stirrer with digital temperature control.", specs: [["Plate material", "Ceramic coated"], ["Max temperature", "280 °C"], ["Max stirring volume", "5 L"]] },
  { name: "Centrifuge Machine", brand: "SpinPro", category: "laboratory-equipment", variant: "Benchtop 12-place", sku: "LAB-CEN-001", model: "CF-12", price: 12800, was: 14500, stock: 5, featured: true, desc: "Benchtop centrifuge with 12-place rotor and speed control.", specs: [["Capacity", "12 x 15 mL"], ["Max speed", "4 000 rpm"], ["Timer", "1–99 min"]] },
  { name: "pH Meter (Digital)", brand: "AquaCheck", category: "laboratory-equipment", variant: "Bench", sku: "LAB-PHM-001", model: "PH-90", price: 2950, stock: 15, featured: true, desc: "Digital pH meter with automatic temperature compensation.", specs: [["Range", "0.00–14.00 pH"], ["Accuracy", "±0.01 pH"], ["Calibration", "Up to 3 points"]] },
  // Medical Equipment
  { name: "Digital Blood Pressure Monitor", brand: "CareTech", category: "medical-equipment", variant: "Upper arm", sku: "MED-BPM-001", price: 1250, stock: 25, desc: "Automatic upper-arm blood pressure monitor with memory." },
  { name: "Pulse Oximeter", brand: "CareTech", category: "medical-equipment", variant: "Fingertip", sku: "MED-OXI-001", price: 650, was: 799, stock: 40, desc: "Fingertip pulse oximeter with OLED display." },
  { name: "Infrared Thermometer", brand: "CareTech", category: "medical-equipment", variant: "Non-contact", sku: "MED-THM-001", price: 480, stock: 60, desc: "Non-contact infrared forehead thermometer." },
  { name: "Stethoscope", brand: "ClinicPro", category: "medical-equipment", variant: "Dual head", sku: "MED-STE-001", price: 890, stock: 30, desc: "Dual-head stainless steel stethoscope." },
  // Chemicals & Reagents
  { name: "Ethanol 96%", brand: "ChemPure", category: "chemicals-reagents", variant: "2.5 L", sku: "CHM-ETH-025", price: 420, stock: 50, desc: "Laboratory-grade ethanol, 2.5 litre bottle." },
  { name: "Sodium Hydroxide Pellets", brand: "ChemPure", category: "chemicals-reagents", variant: "500 g", sku: "CHM-NAOH-500", price: 260, stock: 35, desc: "Analytical-grade sodium hydroxide pellets." },
  { name: "pH Buffer Solution Set", brand: "AquaCheck", category: "chemicals-reagents", variant: "pH 4 / 7 / 10", sku: "CHM-BUF-003", price: 340, stock: 45, desc: "Calibration buffer set for pH meters." },
  // Consumables
  { name: "Nitrile Examination Gloves", brand: "SafeHands", category: "consumables", variant: "Box of 100 (M)", sku: "CON-GLV-M100", price: 185, stock: 200, featured: true, desc: "Powder-free nitrile examination gloves." },
  { name: "Disposable Pipette Tips", brand: "PipetPro", category: "consumables", variant: "Pack of 1000 (200 µL)", sku: "CON-TIP-200", price: 320, stock: 80, desc: "Universal-fit 200 µL pipette tips." },
  { name: "Petri Dishes (Sterile)", brand: "PipetPro", category: "consumables", variant: "Pack of 20 (90 mm)", sku: "CON-PET-090", price: 150, was: 185, stock: 90, desc: "Sterile polystyrene petri dishes." },
  // Safety & Protection
  { name: "Safety Goggles", brand: "SafeHands", category: "safety-protection", variant: "Anti-fog", sku: "SAF-GOG-001", price: 120, stock: 100, desc: "Anti-fog, chemical-splash safety goggles." },
  { name: "Lab Coat", brand: "SafeHands", category: "safety-protection", variant: "Unisex L", sku: "SAF-COA-L", price: 380, stock: 40, desc: "Cotton-blend laboratory coat." },
  { name: "Face Shield", brand: "SafeHands", category: "safety-protection", variant: "Standard", sku: "SAF-FSH-001", price: 95, stock: 0, desc: "Reusable full-face protective shield." },
  // Glassware
  { name: "Laboratory Glassware Set", brand: "ClearLab", category: "glassware", variant: "10-piece", sku: "GLS-SET-010", price: 950, was: 1190, stock: 22, featured: true, desc: "Borosilicate beakers and flasks, 10-piece starter set.", specs: [["Material", "Borosilicate 3.3"], ["Pieces", "10"]] },
  { name: "Erlenmeyer Flask 500 mL", brand: "ClearLab", category: "glassware", variant: "500 mL", sku: "GLS-ERL-500", price: 110, stock: 60, desc: "Borosilicate conical flask with graduations." },
  { name: "Measuring Cylinder 250 mL", brand: "ClearLab", category: "glassware", variant: "250 mL", sku: "GLS-CYL-250", price: 135, stock: 45, desc: "Class B graduated measuring cylinder." },
  { name: "Beaker Set", brand: "ClearLab", category: "glassware", variant: "5-piece", sku: "GLS-BKR-005", price: 280, stock: 3, desc: "Low-form borosilicate beakers, 5-piece set." },
  // Furniture
  { name: "Laboratory Workbench", brand: "LabSpace", category: "furniture", variant: "1.8 m", sku: "FUR-BEN-180", price: 9800, stock: 4, desc: "Chemical-resistant laboratory workbench." },
  { name: "Laboratory Stool", brand: "LabSpace", category: "furniture", variant: "Adjustable", sku: "FUR-STL-001", price: 1450, stock: 14, desc: "Height-adjustable lab stool with footring." },
  { name: "Reagent Storage Cabinet", brand: "LabSpace", category: "furniture", variant: "2-door", sku: "FUR-CAB-002", price: 6400, was: 7200, stock: 3, desc: "Lockable two-door storage cabinet." },
];

/** URL slug for a product name (shared so seed and preview agree). */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
