export type DeviceCategory = 'smartphone' | 'laptop';

export type WarrantyStatus = 'in_warranty' | 'out_of_warranty' | 'unknown';

export interface Device {
  id: string;
  userId: string;
  deviceType: DeviceCategory;
  brand: string;
  model: string;
  purchaseYear: number;
  warrantyStatus: WarrantyStatus;
  notes?: string;
  createdAt?: string;
}

export type IssueCategory =
  | 'BATTERY_POWER'
  | 'DISPLAY_SCREEN'
  | 'CHARGING'
  | 'OVERHEATING'
  | 'PERFORMANCE'
  | 'PHYSICAL_DAMAGE'
  | 'CONNECTIVITY'
  | 'OTHER'
  | 'INSUFFICIENT_INFORMATION';

export type PhotoQuality = 'clear' | 'partially_clear' | 'blurry_or_low_light' | 'not_applicable';

export interface AttachedPhoto {
  id: string;
  name: string;
  size: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  dataUrl?: string; // Client preview
  url?: string; // Private storage endpoint
  uploadedAt?: string;
}

export interface AIAssessmentResponse {
  analysisType?: 'multimodal' | 'text_only';
  issueCategory: IssueCategory;
  categoryLabel: string;
  summary: string;
  visualObservations?: string[];
  possibleVisibleDamage?: string[];
  cannotDetermineFromImage?: string[];
  photoQuality?: PhotoQuality;
  possibleCauses: string[];
  clarifyingQuestions: string[];
  safeChecks: string[];
  professionalHelpRecommended: boolean;
  hazardDetected?: boolean;
  dangerWarning: boolean;
  dangerDetails?: string;
  disclaimer: string;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  deviceId?: string;
  deviceSnapshot?: {
    deviceType: DeviceCategory;
    brand: string;
    model: string;
    purchaseYear?: number;
    warrantyStatus?: WarrantyStatus;
  };
  problemDescription: string;
  symptomDuration?: string;
  symptomFrequency?: string;
  images?: Array<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    url: string;
  }>;
  aiResult: AIAssessmentResponse;
  createdAt: string;
  updatedAt?: string;
}

export interface RepairComparison {
  id: string;
  userId: string;
  assessmentId?: string;
  repairQuotationLKR: number;
  additionalRepairCostLKR: number;
  totalRepairCostLKR: number;
  replacementPriceLKR: number;
  replacementAdditionalCostLKR: number;
  repairCostRatio: number;
  costDifferenceLKR: number;
  deviceAgeYears?: number;
  warrantyStatus?: WarrantyStatus;
  repairWarrantyNotes?: string;
  recommendationGuidance: string;
  recommendationBand: 'strongly_repair' | 'consider_repair' | 'weigh_carefully' | 'consider_replacement';
  createdAt: string;
}

export type ProviderVerificationStatus = 'verified' | 'unverified' | 'disabled';

export interface RepairProvider {
  id: string;
  name: string;
  deviceCategories: DeviceCategory[];
  services: string[];
  district: string;
  town: string;
  address: string;
  contact: string;
  website?: string;
  operatingHours?: string;
  isDemo: boolean;
  verificationStatus: ProviderVerificationStatus;
  verifiedAt?: string;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

export interface PlatformFeedback {
  id: string;
  userId: string;
  userEmail?: string;
  assessmentId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'guide';
  text: string;
  timestamp: string;
  images?: Array<{
    id: string;
    name: string;
    dataUrl?: string;
    url?: string;
  }>;
  visualObservations?: string[];
  suggestedActions?: string[];
  isWarning?: boolean;
}
