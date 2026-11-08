export interface SafetyCheckResult {
  hasDanger: boolean;
  dangerLevel: 'none' | 'urgent';
  dangerType?: 'battery_hazard' | 'smoke_fire' | 'sparks_electrical' | 'severe_overheating' | 'liquid_exposure';
  warningTitle: string;
  warningMessage: string;
  instructions: string[];
}

const DANGER_PATTERNS = [
  {
    regex: /(swollen|bulging|expanded|puffed|bloated)\s*(battery|back|case|trackpad|screen)?/i,
    type: 'battery_hazard' as const,
    title: 'Urgent: Suspected Swollen Battery Hazard',
    message: 'A swollen or bulging lithium-ion battery is a potential fire and puncture hazard.',
    instructions: [
      'Stop using and stop charging the device immediately.',
      'Do NOT attempt to press down, puncture, open, or squeeze the battery or enclosure.',
      'If plugged in, safely turn off the wall outlet switch before unplugging.',
      'Place the device on a non-flammable surface away from combustible materials.',
      'Seek qualified professional electronic repair assistance or an authorized hazardous waste drop-off.',
    ],
  },
  {
    regex: /(smoke|smoking|fuming|burning smell|smell of burning|melted|melting)/i,
    type: 'smoke_fire' as const,
    title: 'Critical Safety Alert: Smoke or Burning Detected',
    message: 'Active smoke, burning odors, or melting plastic indicate an ongoing thermal runaway or electrical failure.',
    instructions: [
      'Immediately disconnect power only if safe to do so without touching exposed or burning areas.',
      'Do not power on the device again.',
      'Move the device to a well-ventilated, non-combustible space.',
      'Never inhale smoke from electronic hardware or lithium batteries.',
      'Consult a certified hardware specialist.',
    ],
  },
  {
    regex: /(spark|sparks|sparking|electric shock|shocking|popping sound)/i,
    type: 'sparks_electrical' as const,
    title: 'Electrical Safety Warning: Sparks or Shock Risk',
    message: 'Sparks or shocks indicate short circuits or damaged internal power delivery components.',
    instructions: [
      'Do not touch exposed metal or frayed cables while connected to mains electricity.',
      'Unplug the charger from the wall switch immediately.',
      'Do not plug the device into any power source again until inspected by a professional.',
    ],
  },
  {
    regex: /(extremely hot|scalding|burning hot|cannot hold|too hot to touch)/i,
    type: 'severe_overheating' as const,
    title: 'Thermal Hazard: Severe Abnormal Overheating',
    message: 'Temperatures that are too hot to safely touch suggest internal component stress or cooling fan failure.',
    instructions: [
      'Power down the device immediately and allow it to cool down on a flat, hard, non-fabric surface.',
      'Do not charge the device while hot.',
      'Check that exterior air vents are not obstructed by dust or soft bedding.',
      'If high heat persists even when idle or turned off, seek professional hardware inspection.',
    ],
  },
];

export function inspectDangerousSymptoms(description: string): SafetyCheckResult {
  if (!description || typeof description !== 'string') {
    return {
      hasDanger: false,
      dangerLevel: 'none',
      warningTitle: '',
      warningMessage: '',
      instructions: [],
    };
  }

  for (const pattern of DANGER_PATTERNS) {
    if (pattern.regex.test(description)) {
      return {
        hasDanger: true,
        dangerLevel: 'urgent',
        dangerType: pattern.type,
        warningTitle: pattern.title,
        warningMessage: pattern.message,
        instructions: pattern.instructions,
      };
    }
  }

  return {
    hasDanger: false,
    dangerLevel: 'none',
    warningTitle: '',
    warningMessage: '',
    instructions: [],
  };
}
