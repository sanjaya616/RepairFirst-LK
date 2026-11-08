export interface CalculationInput {
  repairCostLKR: number;
  additionalRepairCostLKR?: number;
  replacementPriceLKR: number;
  replacementAdditionalCostLKR?: number;
  deviceAgeYears?: number;
  warrantyStatus?: string;
}

export interface CalculationResult {
  isValid: boolean;
  errorMessage?: string;
  totalRepairCostLKR: number;
  replacementPriceLKR: number;
  costDifferenceLKR: number;
  repairCostRatio: number; // percentage, e.g. 15.5
  recommendationBand: 'strongly_repair' | 'consider_repair' | 'weigh_carefully' | 'consider_replacement';
  bandTitle: string;
  bandDescription: string;
  keyConsiderations: string[];
}

/**
 * Deterministic cost comparison between repair and replacement.
 * Uses Sri Lankan Rupee (LKR) standard.
 */
export function calculateRepairVsReplacement(input: CalculationInput): CalculationResult {
  const repair = Number(input.repairCostLKR) || 0;
  const additionalRepair = Number(input.additionalRepairCostLKR) || 0;
  const replacement = Number(input.replacementPriceLKR) || 0;
  const replacementAdditional = Number(input.replacementAdditionalCostLKR) || 0;

  if (repair < 0 || additionalRepair < 0) {
    return {
      isValid: false,
      errorMessage: 'Repair costs cannot be negative numbers.',
      totalRepairCostLKR: 0,
      replacementPriceLKR: 0,
      costDifferenceLKR: 0,
      repairCostRatio: 0,
      recommendationBand: 'weigh_carefully',
      bandTitle: 'Invalid Input',
      bandDescription: 'Please enter valid non-negative figures.',
      keyConsiderations: [],
    };
  }

  if (replacement <= 0) {
    return {
      isValid: false,
      errorMessage: 'Replacement device price must be greater than zero LKR.',
      totalRepairCostLKR: 0,
      replacementPriceLKR: 0,
      costDifferenceLKR: 0,
      repairCostRatio: 0,
      recommendationBand: 'weigh_carefully',
      bandTitle: 'Invalid Input',
      bandDescription: 'Replacement device estimate is required for ratio calculation.',
      keyConsiderations: [],
    };
  }

  const totalRepair = repair + additionalRepair;
  const totalReplacement = replacement + replacementAdditional;
  const costDiff = totalReplacement - totalRepair;
  const ratio = (totalRepair / totalReplacement) * 100;
  const roundedRatio = Math.round(ratio * 100) / 100;

  let band: CalculationResult['recommendationBand'];
  let bandTitle: string;
  let bandDesc: string;
  const considerations: string[] = [];

  // Transparent explanatory guidance bands (clearly stated as heuristic guidelines, not absolute diagnosis)
  if (roundedRatio <= 25) {
    band = 'strongly_repair';
    bandTitle = 'Repair strongly favored economically';
    bandDesc = `Repair cost is only ${roundedRatio}% of buying a replacement. You would retain approximately LKR ${costDiff.toLocaleString()} in capital.`;
    considerations.push('Repairing offers substantial direct savings compared to purchasing brand new.');
    considerations.push('Ensures your current setup, files, and installed software remain uninterrupted.');
    considerations.push('Reduces urgent e-waste generation by extending the functional lifecycle.');
  } else if (roundedRatio <= 50) {
    band = 'consider_repair';
    bandTitle = 'Repair typically reasonable';
    bandDesc = `Repair cost is ${roundedRatio}% of a comparable replacement. Repair preserves significant value if the device is otherwise sound.`;
    considerations.push('Verify whether the repairer provides at least a 30-90 day service warranty on the replacement part.');
    considerations.push('Check if any other components (battery, hinges, storage) are showing signs of wear.');
    considerations.push('If the laptop or phone is under 3 years old, repair is generally the most sustainable path.');
  } else if (roundedRatio <= 70) {
    band = 'weigh_carefully';
    bandTitle = 'Borderline decision – weigh age & condition';
    bandDesc = `Repair cost is ${roundedRatio}% of replacement. Factors like overall age, software update support, and battery health should dictate your choice.`;
    considerations.push('Consider the expected remaining device lifespan after the repair is completed.');
    considerations.push('Check if your operating system version will continue receiving security updates.');
    considerations.push('Ask the technician if parts are original manufacturer grade or third-party compatible.');
  } else {
    band = 'consider_replacement';
    bandTitle = 'Replacement may offer higher long-term value';
    bandDesc = `Repair cost is ${roundedRatio}% of a comparable replacement (LKR ${costDiff.toLocaleString()} difference).`;
    considerations.push('A new device typically includes a 1-year to 2-year warranty and a fresh battery.');
    considerations.push('If choosing replacement, please responsibly recycle or trade in the old unit (see our E-waste section).');
    considerations.push('Do not discard the broken unit in regular household waste; electronic components require certified handling.');
  }

  if (input.deviceAgeYears && input.deviceAgeYears >= 4) {
    considerations.push(`Note: At ${input.deviceAgeYears} years of age, check if key software or security patches will soon be phased out.`);
  }

  return {
    isValid: true,
    totalRepairCostLKR: totalRepair,
    replacementPriceLKR: totalReplacement,
    costDifferenceLKR: costDiff,
    repairCostRatio: roundedRatio,
    recommendationBand: band,
    bandTitle,
    bandDescription: bandDesc,
    keyConsiderations: considerations,
  };
}
