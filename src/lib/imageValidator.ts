/**
 * Image verification and multimodal safety validation utilities for RepairFirst LK.
 * Validates magic bytes, file size constraints, and enforces safety invariants.
 */

export const MAX_IMAGE_COUNT = 4;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ImageValidationResult {
  isValid: boolean;
  mimeType: SupportedMimeType | null;
  sizeBytes: number;
  error?: string;
}

/**
 * Validates image binary data against strict magic bytes signatures.
 * Rejects renamed files, corrupted payloads, and unsupported formats.
 */
export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      isValid: false,
      mimeType: null,
      sizeBytes: 0,
      error: 'Invalid buffer provided.',
    };
  }

  const sizeBytes = buffer.length;

  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      mimeType: null,
      sizeBytes,
      error: `Image exceeds maximum allowed size of 5 MB (actual: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (sizeBytes < 12) {
    return {
      isValid: false,
      mimeType: null,
      sizeBytes,
      error: 'Image file is too small or truncated.',
    };
  }

  // 1. JPEG / JPG: Starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      isValid: true,
      mimeType: 'image/jpeg',
      sizeBytes,
    };
  }

  // 2. PNG: Starts with 89 50 4E 47 (ASCII: .PNG)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      isValid: true,
      mimeType: 'image/png',
      sizeBytes,
    };
  }

  // 3. WebP: Starts with 'RIFF' (0x52 0x49 0x46 0x46) and offset 8 has 'WEBP' (0x57 0x45 0x42 0x50)
  const header = buffer.toString('ascii', 0, 4);
  const webpHeader = buffer.toString('ascii', 8, 12);
  if (header === 'RIFF' && webpHeader === 'WEBP') {
    return {
      isValid: true,
      mimeType: 'image/webp',
      sizeBytes,
    };
  }

  return {
    isValid: false,
    mimeType: null,
    sizeBytes,
    error: 'Unsupported image format. Only JPEG, PNG, and WebP are allowed.',
  };
}

/**
 * Strips data URL scheme prefix if present (e.g. "data:image/png;base64,...") and decodes to Buffer
 */
export function decodeBase64Image(dataString: string): Buffer {
  if (!dataString || typeof dataString !== 'string') {
    throw new Error('Base64 image string is required.');
  }

  const clean = dataString.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

/**
 * Validates a list of uploaded images:
 * - Ensures count <= 4
 * - Verifies each image buffer & magic bytes
 */
export function validateUploadedImages(
  images: Array<{ id?: string; name?: string; base64?: string; dataUrl?: string }>
): {
  valid: boolean;
  validatedImages: Array<{
    id: string;
    name: string;
    mimeType: SupportedMimeType;
    buffer: Buffer;
    cleanBase64: string;
    sizeBytes: number;
  }>;
  error?: string;
} {
  if (!Array.isArray(images)) {
    return { valid: true, validatedImages: [] };
  }

  if (images.length > MAX_IMAGE_COUNT) {
    return {
      valid: false,
      validatedImages: [],
      error: `Maximum ${MAX_IMAGE_COUNT} device photos allowed (received ${images.length}).`,
    };
  }

  const validated: Array<{
    id: string;
    name: string;
    mimeType: SupportedMimeType;
    buffer: Buffer;
    cleanBase64: string;
    sizeBytes: number;
  }> = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const rawStr = item.base64 || item.dataUrl || '';
    if (!rawStr) {
      return {
        valid: false,
        validatedImages: [],
        error: `Image #${i + 1} is missing image data.`,
      };
    }

    try {
      const buffer = decodeBase64Image(rawStr);
      const check = validateImageBuffer(buffer);
      if (!check.isValid || !check.mimeType) {
        return {
          valid: false,
          validatedImages: [],
          error: `Image #${i + 1} ("${item.name || 'photo'}") is invalid: ${check.error || 'Magic byte check failed.'}`,
        };
      }

      const cleanBase64 = buffer.toString('base64');
      validated.push({
        id: item.id || `img_${Date.now()}_${i}`,
        name: item.name || `photo_${i + 1}.${check.mimeType === 'image/jpeg' ? 'jpg' : check.mimeType === 'image/png' ? 'png' : 'webp'}`,
        mimeType: check.mimeType,
        buffer,
        cleanBase64,
        sizeBytes: buffer.length,
      });
    } catch (err: any) {
      return {
        valid: false,
        validatedImages: [],
        error: `Image #${i + 1} could not be decoded: ${err.message}`,
      };
    }
  }

  return { valid: true, validatedImages: validated };
}

/**
 * Enforces the core safety invariant:
 * "Visual observations can escalate hazard warnings, but can never downgrade existing deterministic text-based hazard warnings."
 */
export function applySafetyInvariants(
  textSafetyCheck: { hasDanger: boolean; warningTitle?: string; warningMessage?: string; instructions?: string[] },
  aiAssessment: any
) {
  const result = { ...aiAssessment };

  // Rule 1: Text hazard warning is IMMUTABLE.
  if (textSafetyCheck.hasDanger) {
    result.dangerWarning = true;
    result.hazardDetected = true;
    result.issueCategory = 'PHYSICAL_DAMAGE';
    result.categoryLabel = textSafetyCheck.warningTitle || 'Physical Safety Hazard';
    result.dangerDetails = `${textSafetyCheck.warningTitle}: ${textSafetyCheck.warningMessage}`;
    result.disclaimer =
      'CRITICAL SAFETY NOTICE: This device exhibits hazardous symptoms. Do not attempt self-repair or continue charging.';
    if (textSafetyCheck.instructions && textSafetyCheck.instructions.length > 0) {
      result.safeChecks = textSafetyCheck.instructions;
    }
    return result;
  }

  // Rule 2: Visual hazard escalation.
  // If the visual observations reveal dangerous conditions (bulging, swelling, melted plastic, scorched pins, smoking)
  const visualText = [
    ...(Array.isArray(result.visualObservations) ? result.visualObservations : []),
    ...(Array.isArray(result.possibleVisibleDamage) ? result.possibleVisibleDamage : []),
    result.summary || '',
  ].join(' ').toLowerCase();

  const isVisualHazard =
    result.hazardDetected === true ||
    visualText.includes('swollen') ||
    visualText.includes('bulging battery') ||
    visualText.includes('bloated') ||
    visualText.includes('melted') ||
    visualText.includes('charred') ||
    visualText.includes('scorched') ||
    visualText.includes('burnt pin') ||
    visualText.includes('smoke');

  if (isVisualHazard) {
    result.dangerWarning = true;
    result.hazardDetected = true;
    result.issueCategory = 'PHYSICAL_DAMAGE';
    result.categoryLabel = 'Visual Hazard: Potential Physical / Thermal Danger';
    result.dangerDetails =
      'Visual inspection indicates evidence of physical compromise, chassis bulging, thermal discoloration, or scorched connections. Disconnect power immediately and consult a certified technician.';
    result.safeChecks = [
      'Immediately disconnect device from charger and wall outlet.',
      'Place device on a non-flammable, well-ventilated surface.',
      'Do not apply pressure or attempt to push back bulging panels.',
      'Take device to a certified repair center equipped for battery safety.',
    ];
    result.disclaimer =
      'CRITICAL SAFETY NOTICE: Visual analysis detected hazardous symptoms. Do not attempt self-repair or continue charging.';
  }

  return result;
}
