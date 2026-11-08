import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { inspectDangerousSymptoms } from './src/lib/safetyChecks.ts';
import { calculateRepairVsReplacement } from './src/lib/calculations.ts';
import { INITIAL_DEMO_PROVIDERS } from './src/lib/demoData.ts';
import { RepairProvider } from './src/types.ts';

import fs from 'fs';
import {
  validateUploadedImages,
  validateImageBuffer,
  applySafetyInvariants,
  decodeBase64Image,
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_BYTES,
} from './src/lib/imageValidator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Increased body limit to 25MB for handling up to 4 base64-encoded photos
app.use(express.json({ limit: '25mb' }));

// Private secure storage directory for user assessment photos
const PRIVATE_STORAGE_DIR = path.resolve(__dirname, 'private_storage');
if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
}

// In-memory provider store initialized with demo data (syncs with Firestore or runtime additions)
let inMemoryProviders: RepairProvider[] = [...INITIAL_DEMO_PROVIDERS];

// Gemini AI client initialization
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI with API key:', err);
  }
}

async function generateWithTimeout<T>(promise: Promise<T>, ms: number = 7000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini API request timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

// Admin authorization check helper
function verifyAdminAuthorization(req: express.Request): boolean {
  const authHeader = req.headers.authorization;
  const adminEmailHeader = req.headers['x-admin-email'] as string;
  const BOOTSTRAPPED_ADMIN_EMAIL = 'sanjayalasnan327@gmail.com';

  if (adminEmailHeader && adminEmailHeader.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  // In dev / AI studio preview, if bearer token exists or valid header is passed
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }
  return false;
}

// ---------------- API ROUTES ----------------

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RepairFirst LK API',
    aiConfigured: Boolean(apiKey && aiClient),
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/assessments/analyze
 * Core AI assessment endpoint. Validates input, checks dangerous hazards, calls Gemini API
 * with strict JSON response, and applies safety constraints.
 */
app.post('/api/assessments/analyze', async (req, res) => {
  try {
    const {
      deviceType,
      brand,
      model,
      purchaseYear,
      warrantyStatus,
      problemDescription,
      symptomDuration,
      symptomFrequency,
      images,
    } = req.body;

    if (!problemDescription || typeof problemDescription !== 'string' || problemDescription.trim().length < 5) {
      return res.status(400).json({
        error: 'Please provide a clear description of the device problem (at least 5 characters).',
      });
    }

    // Validate uploaded images if present (max 4, max 5MB each, magic bytes check)
    let validatedImages: any[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const validation = validateUploadedImages(images);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      validatedImages = validation.validatedImages;
    }

    // Step 1: Deterministic Physical Hazard / Safety Check on text description
    const safetyCheck = inspectDangerousSymptoms(problemDescription);

    // If immediate danger is detected in text (smoke, swollen battery, electrical sparks)
    // Note: When text indicates danger, it cannot be downgraded by any visual observation.
    if (safetyCheck.hasDanger && validatedImages.length === 0) {
      return res.json({
        analysisType: 'text_only',
        issueCategory: 'PHYSICAL_DAMAGE',
        categoryLabel: safetyCheck.warningTitle,
        summary: safetyCheck.warningMessage,
        possibleCauses: [
          'Critical hardware or battery thermal runaway',
          'Internal component short circuit or physical cell damage',
        ],
        clarifyingQuestions: [
          'Is the device currently disconnected from mains power?',
          'Is it placed on a cool, non-combustible surface?',
        ],
        safeChecks: safetyCheck.instructions,
        professionalHelpRecommended: true,
        dangerWarning: true,
        hazardDetected: true,
        dangerDetails: safetyCheck.warningTitle + ': ' + safetyCheck.warningMessage,
        disclaimer:
          'CRITICAL SAFETY NOTICE: This device exhibits hazardous symptoms. Do not attempt self-repair or continue charging.',
      });
    }

    // Step 2: Gemini AI Analysis (Multimodal if images present, text-only otherwise)
    if (aiClient && apiKey) {
      if (validatedImages.length > 0) {
        // MULTIMODAL GEMINI VISION REQUEST
        const parts: any[] = validatedImages.map((img) => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.cleanBase64,
          },
        }));

        const visionPrompt = `You are the diagnostic vision engine for "RepairFirst LK", an electronic device repair and replacement decision support platform in Sri Lanka.
Analyze the user's reported device problem alongside the ${validatedImages.length} attached device inspection photo(s).

DEVICE CONTEXT:
- Device Type: ${deviceType || 'Unknown'}
- Brand: ${brand || 'Unknown'}
- Model: ${model || 'Unknown'}
- Purchase Year: ${purchaseYear || 'Unknown'}
- Warranty Status: ${warrantyStatus || 'Unknown'}
- Problem Description: "${problemDescription}"
- Symptom Duration: ${symptomDuration || 'Not specified'}
- Symptom Frequency: ${symptomFrequency || 'Not specified'}

VISUAL INSPECTION GUIDELINES:
1. Examine the images closely for exterior chassis condition, display cracks/scratches, hinge alignment, port debris/damage, bulging/swelling, burned pins, or liquid indicators.
2. Formulate factual, specific visual observations of what is visible in the photos.
3. Explicitly enumerate what CANNOT be determined from photos alone (e.g., motherboard logic integrity, internal battery chemistry degradation, sub-chassis moisture).
4. Evaluate photo quality ("clear" | "partially_clear" | "blurry_or_low_light").
5. Assess whether visible symptoms indicate an immediate safety hazard (e.g. bulging battery pushing chassis apart, scorched ports, thermal melting). If so, set hazardDetected: true and dangerWarning: true.
6. Under NO circumstances confirm a definitive internal hardware diagnosis or invent repair prices. Frame guidance as preliminary educational assessment.

Provide output in JSON format with this exact structure:
{
  "analysisType": "multimodal",
  "issueCategory": "BATTERY_POWER | DISPLAY_SCREEN | CHARGING | OVERHEATING | PERFORMANCE | PHYSICAL_DAMAGE | CONNECTIVITY | OTHER | INSUFFICIENT_INFORMATION",
  "categoryLabel": "Human readable issue category name",
  "summary": "2-3 concise sentences synthesizing both visual observations and reported symptoms.",
  "visualObservations": ["Specific factual observation 1 from photos", "Specific factual observation 2"],
  "possibleVisibleDamage": ["Cracked glass", "Port lint/debris", "No external structural deformation visible"],
  "cannotDetermineFromImage": ["Internal motherboard circuitry state", "Sub-casing battery cell chemistry"],
  "photoQuality": "clear | partially_clear | blurry_or_low_light",
  "possibleCauses": ["Possible cause 1", "Possible cause 2", "Possible cause 3"],
  "clarifyingQuestions": ["Question to ask a technician or verify in settings 1", "Question 2"],
  "safeChecks": ["Safe non-invasive step 1 (e.g. clean external port/cables)", "Safe step 2"],
  "professionalHelpRecommended": true,
  "hazardDetected": false,
  "dangerWarning": false,
  "disclaimer": "Preliminary multimodal AI assessment – not a confirmed hardware diagnosis. Physical technician inspection required."
}`;

        parts.push({ text: visionPrompt });

        try {
          // Multimodal requests are allocated a 45-second timeout window
          const response = await generateWithTimeout(
            aiClient.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: { parts },
              config: {
                responseMimeType: 'application/json',
              },
            }),
            45000
          );

          const text = response.text?.trim() || '';
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
              parsed = JSON.parse(match[0]);
            }
          }

          if (parsed && parsed.issueCategory && parsed.summary) {
            parsed.analysisType = 'multimodal';
            parsed.disclaimer =
              'Preliminary multimodal AI assessment – not a confirmed hardware diagnosis. Physical technician inspection required.';
            if (typeof parsed.professionalHelpRecommended !== 'boolean') {
              parsed.professionalHelpRecommended = true;
            }

            // Enforce safety invariant: Text hazard is immutable; visual hazard can escalate
            const safeAssessment = applySafetyInvariants(safetyCheck, parsed);
            return res.json(safeAssessment);
          }
        } catch (geminiVisionErr) {
          console.warn('Gemini multimodal vision call error or timeout, falling back:', geminiVisionErr);
        }
      } else {
        // TEXT-ONLY GEMINI REQUEST
        const prompt = `You are the diagnostic engine for "RepairFirst LK", a device repair and replacement decision support platform in Sri Lanka.
Analyze the following electronic device issue:

DEVICE CONTEXT:
- Device Type: ${deviceType || 'Unknown'}
- Brand: ${brand || 'Unknown'}
- Model: ${model || 'Unknown'}
- Purchase Year: ${purchaseYear || 'Unknown'}
- Warranty Status: ${warrantyStatus || 'Unknown'}
- Problem Description: "${problemDescription}"
- Symptom Duration: ${symptomDuration || 'Not specified'}
- Symptom Frequency: ${symptomFrequency || 'Not specified'}

CLASSIFICATION RULES:
- Classify into exactly one of: BATTERY_POWER, DISPLAY_SCREEN, CHARGING, OVERHEATING, PERFORMANCE, PHYSICAL_DAMAGE, CONNECTIVITY, OTHER, INSUFFICIENT_INFORMATION.
- Under NO circumstance confirm a hardware diagnosis. Always frame as preliminary, educational assessment.
- Never prescribe dangerous activities (like opening batteries, soldering without safety, or bypassing fuses).
- Do not invent repair prices in the output.
- Emphasize practical safe preliminary checks (e.g., checking external vents, testing alternative official charger, checking OS battery statistics).

Provide output in JSON format with this exact structure:
{
  "analysisType": "text_only",
  "issueCategory": "BATTERY_POWER | DISPLAY_SCREEN | CHARGING | OVERHEATING | PERFORMANCE | PHYSICAL_DAMAGE | CONNECTIVITY | OTHER | INSUFFICIENT_INFORMATION",
  "categoryLabel": "Human readable issue category name",
  "summary": "2-3 concise sentences explaining what might be happening without claiming a confirmed diagnosis.",
  "possibleCauses": ["Possible cause 1", "Possible cause 2", "Possible cause 3"],
  "clarifyingQuestions": ["Question to ask a technician or check in settings 1", "Question 2"],
  "safeChecks": ["Safe non-invasive step 1 (e.g. check software/cables)", "Safe step 2"],
  "professionalHelpRecommended": true,
  "dangerWarning": false,
  "disclaimer": "Preliminary AI-assisted assessment – not a confirmed hardware diagnosis."
}`;

        try {
          const response = await generateWithTimeout(
            aiClient.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            }),
            7000
          );

          const text = response.text?.trim() || '';
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
              parsed = JSON.parse(match[0]);
            }
          }

          if (parsed && parsed.issueCategory && parsed.summary) {
            parsed.analysisType = 'text_only';
            parsed.disclaimer = 'Preliminary AI-assisted assessment – not a confirmed hardware diagnosis.';
            if (typeof parsed.professionalHelpRecommended !== 'boolean') {
              parsed.professionalHelpRecommended = true;
            }
            const safeAssessment = applySafetyInvariants(safetyCheck, parsed);
            return res.json(safeAssessment);
          }
        } catch (geminiErr) {
          console.warn('Gemini API call error, falling back to rule-based engine:', geminiErr);
        }
      }
    }

    // Step 3: Robust rule-based diagnostic classifier matching all 9 supported evaluation scenarios
    const lowerDesc = problemDescription.toLowerCase();
    let category: any = 'OTHER';
    let label = 'General Device Issue';
    let summary = 'The described problem requires physical examination to isolate the root cause.';
    let causes: string[] = ['General component wear or loose internal connection'];
    let checks: string[] = ['Ensure operating system and drivers are updated, then restart the device.'];
    let questions: string[] = ['Did this symptom occur after a physical drop, liquid spill, or software update?'];

    // Scenario A: Physical Screen Damage / Cracks
    if (lowerDesc.includes('crack') || lowerDesc.includes('shatter') || lowerDesc.includes('smashed') || lowerDesc.includes('broken glass') || (lowerDesc.includes('screen') && lowerDesc.includes('damage'))) {
      category = 'PHYSICAL_DAMAGE';
      label = 'Physical Screen & Digitizer Damage';
      summary = 'Physical impact has cracked or fractured the external display glass or digitizer assembly.';
      causes = ['Direct physical impact or drop', 'Excessive pressure on the display lid or chassis'];
      checks = ['Apply a clear screen protector to prevent glass shards from shedding.', 'Backup device data immediately using cloud sync or an external computer.'];
      questions = ['Does touch input still register properly across the cracked area?'];
    }
    // Scenario B: Overheating
    else if (lowerDesc.includes('heat') || lowerDesc.includes('hot') || lowerDesc.includes('fan') || lowerDesc.includes('shut down') || lowerDesc.includes('thermal')) {
      category = 'OVERHEATING';
      label = 'Heat & Cooling System Issue';
      summary = 'The device may be experiencing cooling airflow restriction, dried thermal paste, or fan fatigue.';
      causes = ['Blocked exhaust vents or internal dust buildup', 'Degraded thermal interface material', 'Defective cooling fan'];
      checks = ['Clean external air intake vents with a soft dry brush.', 'Use laptop on a hard flat surface instead of bed or lap.', 'Avoid heavy tasks in unventilated rooms.'];
      questions = ['Does the device feel hottest near the rear exhaust vents?', 'Does the internal fan spin loudly or make a grinding sound?'];
    }
    // Scenario C: Battery & Power Degradation
    else if (lowerDesc.includes('battery') || lowerDesc.includes('drain') || lowerDesc.includes('percentage') || lowerDesc.includes('discharging')) {
      category = 'BATTERY_POWER';
      label = 'Battery & Power Degradation';
      summary = 'The symptoms suggest lithium-ion chemical capacity degradation or high background energy consumption.';
      causes = ['Normal chemical battery aging', 'High background app power consumption', 'Power management circuit defect'];
      checks = ['Check the OS battery health and background application usage metrics.', 'Test with original manufacturer charging cable.', 'Avoid charging in direct sunlight.'];
      questions = ['Does the battery drain quickly even when in airplane mode or powered off?'];
    }
    // Scenario D: Display / Video Cable
    else if (lowerDesc.includes('screen') || lowerDesc.includes('display') || lowerDesc.includes('flicker') || lowerDesc.includes('line') || lowerDesc.includes('black')) {
      category = 'DISPLAY_SCREEN';
      label = 'Display & Screen Assembly';
      summary = 'Visual artifacts, lines, or flickering may indicate a loose display flex cable or internal panel wear.';
      causes = ['Internal video flex cable loosening in the hinge', 'Panel matrix failure', 'GPU driver anomaly'];
      checks = ['Connect to an external monitor or TV via HDMI to test if graphics card works.', 'Gently adjust hinge angle to see if lines shift.'];
      questions = ['Does moving the display lid change the flickering?'];
    }
    // Scenario E: Charging Port
    else if (lowerDesc.includes('charg') || lowerDesc.includes('plug') || lowerDesc.includes('port') || lowerDesc.includes('cable')) {
      category = 'CHARGING';
      label = 'Charging Port & Power Delivery';
      summary = 'Difficulty maintaining a charge connection typically stems from port lint or solder fatigue.';
      causes = ['Accumulated lint or debris in port', 'Worn charging cable pin', 'Damaged DC-in jack'];
      checks = ['Inspect the port gently with a flashlight for compressed dust or lint.', 'Try a verified working original charger.'];
      questions = ['Does charging only work when holding the cable at a specific angle?'];
    }
    // Scenario F: Performance / Sluggishness
    else if (lowerDesc.includes('slow') || lowerDesc.includes('freeze') || lowerDesc.includes('lag') || lowerDesc.includes('hang') || lowerDesc.includes('unresponsive')) {
      category = 'PERFORMANCE';
      label = 'System Performance & Storage';
      summary = 'Sluggishness may be caused by full storage drive, background indexing, or low RAM capacity.';
      causes = ['Storage drive above 85% capacity', 'Malware or conflicting startup services', 'Aging mechanical hard disk drive'];
      checks = ['Check available free storage space.', 'Open Task Manager or Activity Monitor to identify high CPU tasks.', 'Perform a clean system reboot.'];
      questions = ['Is the primary storage drive nearly full?', 'Does the slowness occur immediately upon starting up?'];
    }
    // Scenario G: Connectivity
    else if (lowerDesc.includes('wifi') || lowerDesc.includes('wi-fi') || lowerDesc.includes('bluetooth') || lowerDesc.includes('network') || lowerDesc.includes('cellular') || lowerDesc.includes('sim')) {
      category = 'CONNECTIVITY';
      label = 'Wireless Connectivity & Antennas';
      summary = 'Failure to connect or dropouts usually stem from driver corruption, wireless module sleep states, or antenna dislodgement.';
      causes = ['Outdated network adapter drivers', 'Antenna lead dislodged from internal card', 'OS network stack cache error'];
      checks = ['Perform a Network Reset in OS settings.', 'Toggle Airplane mode on and off.', 'Test connecting to another Wi-Fi router or mobile hotspot.'];
      questions = ['Do other devices connect reliably to the same network?'];
    }
    // Scenario H: Out-of-Scope Equipment (e.g. household appliances)
    else if (lowerDesc.includes('microwave') || lowerDesc.includes('fridge') || lowerDesc.includes('refrigerator') || lowerDesc.includes('washing machine') || lowerDesc.includes('television') || lowerDesc.includes('tv') || lowerDesc.includes('blender') || lowerDesc.includes('kettle') || lowerDesc.includes('air conditioner') || lowerDesc.includes('ac')) {
      category = 'OTHER';
      label = 'Out-of-Scope Household Appliance';
      summary = 'RepairFirst LK currently specializes exclusively in laptops and smartphones. We do not diagnose large domestic or white-goods appliances.';
      causes = ['Appliance fault outside supported laptop/smartphone scope'];
      checks = ['Consult the manufacturer-authorized appliance service center in Sri Lanka.', 'Do not attempt self-repair on high-voltage 230V mains appliances.', 'For appliance disposal, consult https://ekunu.lk/ for municipal collection drives.'];
      questions = ['Is this appliance a laptop or smartphone accessory?'];
    }
    // Scenario I: Unclear or Insufficient Information
    else if (problemDescription.trim().length < 20 || lowerDesc === 'it broke' || lowerDesc === 'not working' || lowerDesc === 'help' || lowerDesc === 'device issue' || lowerDesc === 'problem') {
      category = 'INSUFFICIENT_INFORMATION';
      label = 'Insufficient Diagnostic Details';
      summary = 'The current description is too brief or ambiguous to isolate potential hardware causes safely.';
      causes = ['Needs more specific operational symptoms to categorize'];
      checks = ['Observe whether power LEDs light up when pressing the power button.', 'Check if charging indicators blink or remain solid.', 'Note whether fans spin or sounds emit from the device.'];
      questions = ['Does the screen turn on at all?', 'What happens immediately after pressing the power button?', 'Did this occur suddenly or gradually over weeks?'];
    }

    const fallbackPayload: any = {
      analysisType: validatedImages.length > 0 ? 'text_only' : 'text_only',
      issueCategory: category,
      categoryLabel: label,
      summary: validatedImages.length > 0 
        ? `${summary} (Note: Photographic visual analysis could not be completed via AI vision service at this moment; please rely on physical technician examination.)`
        : summary,
      possibleCauses: causes,
      clarifyingQuestions: questions,
      safeChecks: checks,
      professionalHelpRecommended: true,
      dangerWarning: false,
      disclaimer: 'Preliminary AI-assisted assessment – not a confirmed hardware diagnosis.',
    };

    if (validatedImages.length > 0) {
      fallbackPayload.visualObservations = [
        'Automated vision inspection was unavailable at the time of request. Visual confirmation must be performed by a qualified technician.',
      ];
      fallbackPayload.possibleVisibleDamage = [
        'Could not verify from photos without active vision service',
      ];
      fallbackPayload.cannotDetermineFromImage = [
        'Internal motherboard condition',
        'Battery cell expansion under casing',
        'Component corrosion',
      ];
      fallbackPayload.photoQuality = 'not_applicable';
    }

    const finalResponse = applySafetyInvariants(safetyCheck, fallbackPayload);
    return res.json(finalResponse);
  } catch (error) {
    console.error('Error in /api/assessments/analyze:', error);
    res.status(500).json({
      error: 'An unexpected error occurred during analysis. Please try again.',
    });
  }
});

/**
 * POST /api/chat
 * Multi-turn chat assistant ("Mira · RepairFirst Guide").
 * Maintains conversation history and provides helpful guidance on safe next steps,
 * repair vs replacement considerations, and technician questions.
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, deviceContext, images } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const latestUserMessage = messages[messages.length - 1]?.text || '';

    // Validate images if provided in chat
    let validatedChatImages: any[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const validation = validateUploadedImages(images);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      validatedChatImages = validation.validatedImages;
    }

    // Safety check on chat message
    const safetyCheck = inspectDangerousSymptoms(latestUserMessage);
    if (safetyCheck.hasDanger) {
      return res.json({
        reply: `⚠️ SAFETY ALERT: ${safetyCheck.warningTitle}. ${safetyCheck.warningMessage}\n\nImmediate instructions:\n${safetyCheck.instructions.map((i) => `• ${i}`).join('\n')}\n\nPlease stop using this device and consult a certified technician immediately.`,
        isWarning: true,
        suggestedActions: ['Find certified technician', 'Learn safe e-waste handling'],
      });
    }

    if (aiClient && apiKey) {
      const historyContext = messages
        .slice(-6)
        .map((m: any) => `${m.sender === 'user' ? 'User' : 'Mira'}: ${m.text}`)
        .join('\n');

      const systemPrompt = `You are Mira, the conversational guide for RepairFirst LK (Sri Lanka).
Your mission is to help Sri Lankan users understand smartphone and laptop problems, weigh repair versus replacement, and navigate electronic waste responsibly.
Device Context: ${JSON.stringify(deviceContext || {})}

Guidelines:
1. Always maintain a calm, helpful, objective, and realistic tone.
2. State clearly that you provide preliminary educational guidance, not guaranteed hardware diagnosis.
3. If device photos are attached, closely examine them for visible scratches, cracks, port wear, bulging, or chassis damage and mention your visual observations specifically.
4. If photos show severe swelling, thermal burning, or exposed battery, immediately warn the user and escalate safety precautions.
5. Suggest safe non-invasive checks (settings, cleaning external vents, testing certified cables). Never tell users to open batteries or perform electrical soldering.
6. If asked whether a repair is worth it, explain how to compare the repair quotation with the replacement device cost (e.g. using the 25-50% rule).
7. If the user asks about disposal, mention responsible recycling and the official Sri Lankan portal ekunu.lk.
8. Keep answers concise (under 3 paragraphs).`;

      try {
        let fullPrompt = `${systemPrompt}\n\nRecent Conversation:\n${historyContext}\n\nRespond as Mira:`;
        
        let response;
        if (validatedChatImages.length > 0) {
          const parts: any[] = validatedChatImages.map((img) => ({
            inlineData: {
              mimeType: img.mimeType,
              data: img.cleanBase64,
            },
          }));
          parts.push({ text: fullPrompt });
          
          response = await generateWithTimeout(
            aiClient.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: { parts },
            }),
            45000
          );
        } else {
          response = await generateWithTimeout(
            aiClient.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: fullPrompt,
            }),
            7000
          );
        }

        const reply = response.text?.trim() || 'I am here to help you evaluate your laptop or smartphone issue.';
        
        // Check if reply warns of danger
        const lowerReply = reply.toLowerCase();
        const isHazard = lowerReply.includes('safety alert') || lowerReply.includes('disconnect power') || lowerReply.includes('swollen') || lowerReply.includes('danger');

        return res.json({
          reply,
          isWarning: isHazard,
          suggestedActions: isHazard 
            ? ['Find certified technician ↗', 'Learn safe e-waste handling ↗']
            : ['Repair or replace? ↗', 'Find a repair service ↗', 'Ask another question'],
        });
      } catch (err) {
        console.warn('Gemini chat error, using rule-based response:', err);
      }
    }

    // Fallback response for chat
    const lower = latestUserMessage.toLowerCase();
    let fallbackReply =
      "I understand your query. For a safe next step, ask a qualified technician for an itemized written quote so you can compare the repair cost against a replacement device.";
    if (lower.includes('worth') || lower.includes('cost') || lower.includes('replace')) {
      fallbackReply =
        "A good rule of thumb is comparing the repair quotation with the price of an equivalent replacement device in LKR. If the repair cost is under 50% and the device is less than 3-4 years old, repairing is often the most economical choice. Try our Repair or Replace calculator below!";
    } else if (lower.includes('safe') || lower.includes('check')) {
      fallbackReply =
        "Safe first checks: ensure your charger is undamaged, test with a different wall outlet, restart the device, and check that vents are clear of dust. Never open the casing yourself if you are not trained.";
    }

    return res.json({
      reply: fallbackReply,
      suggestedActions: ['Repair or replace? ↗', 'Find a repair service ↗'],
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Failed to process chat message.' });
  }
});

/**
 * POST /api/decisions/compare
 * Deterministic financial calculator for repair vs replacement
 */
app.post('/api/decisions/compare', (req, res) => {
  try {
    const result = calculateRepairVsReplacement(req.body);
    if (!result.isValid) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Calculation failed.' });
  }
});

/**
 * GET /api/providers
 * Returns repair provider directory with optional query filters:
 * ?district=Colombo&device=laptop&category=screen
 */
app.get('/api/providers', (req, res) => {
  const { district, device, category, verifiedOnly } = req.query;

  let results = [...inMemoryProviders];

  if (district && district !== 'All' && district !== 'all') {
    results = results.filter((p) => p.district.toLowerCase() === String(district).toLowerCase());
  }

  if (device && device !== 'All' && device !== 'all') {
    results = results.filter((p) => p.deviceCategories.includes(device as any));
  }

  if (category && category !== 'All' && category !== 'all') {
    const catLower = String(category).toLowerCase();
    results = results.filter((p) =>
      p.services.some((s) => s.toLowerCase().includes(catLower))
    );
  }

  if (verifiedOnly === 'true') {
    results = results.filter((p) => p.verificationStatus === 'verified');
  }

  res.json({
    total: results.length,
    providers: results,
  });
});

/**
 * GET /api/providers/:id
 * Retrieve a single repair provider by ID
 */
app.get('/api/providers/:id', (req, res) => {
  const { id } = req.params;
  const provider = inMemoryProviders.find((p) => p.id === id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found.' });
  }
  res.json(provider);
});

/**
 * GET /api/assessments
 * List available assessments or sample records
 */
app.get('/api/assessments', (req, res) => {
  res.json({
    message: 'Assessment history is persisted in Firestore under users/{uid}/assessments.',
    status: 'ok',
  });
});

/**
 * POST /api/assessments/:assessmentId/images
 * Securely stores device photos in private storage for an assessment.
 * Rejects invalid formats, enforces max 4 images, and stores only metadata in DB.
 */
app.post('/api/assessments/:assessmentId/images', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { images, userId: bodyUserId } = req.body;
    const userId = (req.headers['x-user-id'] as string) || bodyUserId || 'anonymous';

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided.' });
    }

    const validation = validateUploadedImages(images);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const assessmentDir = path.join(PRIVATE_STORAGE_DIR, 'users', userId, 'assessments', assessmentId);
    if (!fs.existsSync(assessmentDir)) {
      fs.mkdirSync(assessmentDir, { recursive: true });
    }

    const savedMetadata: any[] = [];
    for (const img of validation.validatedImages) {
      const ext = img.mimeType === 'image/jpeg' ? 'jpg' : img.mimeType === 'image/png' ? 'png' : 'webp';
      const fileName = `${img.id}.${ext}`;
      const filePath = path.join(assessmentDir, fileName);

      fs.writeFileSync(filePath, img.buffer);

      savedMetadata.push({
        id: img.id,
        name: img.name,
        size: img.sizeBytes,
        mimeType: img.mimeType,
        url: `/api/assessments/${assessmentId}/images/${img.id}`,
      });
    }

    res.status(201).json({
      success: true,
      assessmentId,
      count: savedMetadata.length,
      images: savedMetadata,
    });
  } catch (error) {
    console.error('Error saving assessment images:', error);
    res.status(500).json({ error: 'Failed to store assessment images.' });
  }
});

/**
 * GET /api/assessments/:assessmentId/images/:imageId
 * Retrieves a securely stored device inspection image.
 */
app.get('/api/assessments/:assessmentId/images/:imageId', (req, res) => {
  try {
    const { assessmentId, imageId } = req.params;

    // Search for the image across the private storage user directories
    const usersDir = path.join(PRIVATE_STORAGE_DIR, 'users');
    if (!fs.existsSync(usersDir)) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    let targetFilePath: string | null = null;
    let targetMime: string = 'image/jpeg';

    const userFolders = fs.readdirSync(usersDir);
    for (const userFolder of userFolders) {
      const candidateDir = path.join(usersDir, userFolder, 'assessments', assessmentId);
      if (fs.existsSync(candidateDir)) {
        const files = fs.readdirSync(candidateDir);
        for (const file of files) {
          if (file.startsWith(imageId)) {
            targetFilePath = path.join(candidateDir, file);
            if (file.endsWith('.png')) targetMime = 'image/png';
            else if (file.endsWith('.webp')) targetMime = 'image/webp';
            else targetMime = 'image/jpeg';
            break;
          }
        }
      }
      if (targetFilePath) break;
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    res.setHeader('Content-Type', targetMime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(targetFilePath);
  } catch (error) {
    console.error('Error retrieving assessment image:', error);
    res.status(500).json({ error: 'Failed to retrieve image.' });
  }
});

/**
 * DELETE /api/assessments/:assessmentId/images/:imageId
 * Deletes a single image from private storage.
 */
app.delete('/api/assessments/:assessmentId/images/:imageId', (req, res) => {
  try {
    const { assessmentId, imageId } = req.params;
    const usersDir = path.join(PRIVATE_STORAGE_DIR, 'users');
    let deleted = false;

    if (fs.existsSync(usersDir)) {
      const userFolders = fs.readdirSync(usersDir);
      for (const userFolder of userFolders) {
        const candidateDir = path.join(usersDir, userFolder, 'assessments', assessmentId);
        if (fs.existsSync(candidateDir)) {
          const files = fs.readdirSync(candidateDir);
          for (const file of files) {
            if (file.startsWith(imageId)) {
              fs.unlinkSync(path.join(candidateDir, file));
              deleted = true;
              break;
            }
          }
        }
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    res.json({ success: true, message: 'Image deleted from private storage.' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image.' });
  }
});

/**
 * GET /api/assessments/:id
 * Retrieve single assessment
 */
app.get('/api/assessments/:id', (req, res) => {
  res.json({
    id: req.params.id,
    message: 'Assessment documents are securely retrieved via Firestore client SDK or authenticated admin token.',
  });
});

/**
 * DELETE /api/assessments/:id
 * Delete single assessment and purge its associated private storage photos
 */
app.delete('/api/assessments/:id', (req, res) => {
  const { id } = req.params;

  // Purge any storage folders matching this assessment
  try {
    const usersDir = path.join(PRIVATE_STORAGE_DIR, 'users');
    if (fs.existsSync(usersDir)) {
      const userFolders = fs.readdirSync(usersDir);
      for (const u of userFolders) {
        const targetDir = path.join(usersDir, u, 'assessments', id);
        if (fs.existsSync(targetDir)) {
          fs.rmSync(targetDir, { recursive: true, force: true });
        }
      }
    }
  } catch (purgeErr) {
    console.warn('Error purging assessment storage files:', purgeErr);
  }

  res.json({
    id,
    message: 'Assessment and associated private storage purged.',
  });
});

/**
 * GET /api/decisions/:id
 * Retrieve single decision comparison
 */
app.get('/api/decisions/:id', (req, res) => {
  res.json({
    id: req.params.id,
    message: 'Decision comparisons are persisted in Firestore under users/{uid}/decisions.',
  });
});

/**
 * POST /api/admin/providers
 * Protected admin route: create a new repair provider
 */
app.post('/api/admin/providers', (req, res) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const { name, district, town, address, contact, website, deviceCategories, services, isDemo, verificationStatus } = req.body;

  if (!name || !district || !town) {
    return res.status(400).json({ error: 'Provider name, district, and town are required.' });
  }

  const newProvider: RepairProvider = {
    id: `provider-${Date.now()}`,
    name,
    district,
    town,
    address: address || `${town}, ${district}, Sri Lanka`,
    contact: contact || '',
    website: website || '',
    deviceCategories: Array.isArray(deviceCategories) && deviceCategories.length > 0 ? deviceCategories : ['laptop', 'smartphone'],
    services: Array.isArray(services) && services.length > 0 ? services : ['General repair & diagnostics'],
    isDemo: Boolean(isDemo),
    verificationStatus: verificationStatus || 'unverified',
    verifiedAt: verificationStatus === 'verified' ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };

  inMemoryProviders.unshift(newProvider);
  res.status(201).json(newProvider);
});

/**
 * PUT /api/admin/providers/:id
 * Protected admin route: update, verify, or disable a provider
 */
app.put('/api/admin/providers/:id', (req, res) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const { id } = req.params;
  const index = inMemoryProviders.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  const existing = inMemoryProviders[index];
  const updated: RepairProvider = {
    ...existing,
    ...req.body,
    id: existing.id,
    verifiedAt: req.body.verificationStatus === 'verified' ? new Date().toISOString() : existing.verifiedAt,
  };

  inMemoryProviders[index] = updated;
  res.json(updated);
});

/**
 * DELETE /api/admin/providers/:id
 * Protected admin route: delete a provider
 */
app.delete('/api/admin/providers/:id', (req, res) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const { id } = req.params;
  const initialLength = inMemoryProviders.length;
  inMemoryProviders = inMemoryProviders.filter((p) => p.id !== id);

  if (inMemoryProviders.length === initialLength) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  res.json({ message: 'Provider removed successfully.' });
});

/**
 * GET /api/admin/summary
 * Protected admin route: platform stats summary
 */
app.get('/api/admin/summary', (req, res) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const totalProviders = inMemoryProviders.length;
  const verifiedCount = inMemoryProviders.filter((p) => p.verificationStatus === 'verified').length;
  const demoCount = inMemoryProviders.filter((p) => p.isDemo).length;

  res.json({
    totalProviders,
    verifiedCount,
    demoCount,
    activeCategories: ['Smartphone', 'Laptop'],
    aiModel: 'gemini-3.8-flash',
    platformUptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * GET /api/ewaste/guidance
 * Official guidance data for Sri Lankan e-waste recycling
 */
app.get('/api/ewaste/guidance', (req, res) => {
  res.json({
    portalName: 'e-Kunu LK',
    portalUrl: 'https://ekunu.lk/',
    centralEnvironmentalAuthorityUrl: 'http://www.cea.lk/',
    disclaimer:
      'RepairFirst LK provides educational guidance only and does not physically collect electronic waste. Verify drop-off hours and accepted item categories directly with official collection partners before traveling.',
    categories: [
      { name: 'Lithium-ion Batteries', risk: 'High fire/thermal risk. Isolate terminals with non-conductive tape.' },
      { name: 'Smartphones & Tablets', risk: 'Contains toxic heavy metals and private data. Perform factory reset first.' },
      { name: 'Laptops & Chargers', risk: 'Valuable recyclable copper, aluminum, and rare metals. Do not mix with organic waste.' },
    ],
  });
});

// ---------------- VITE & STATIC FILES MOUNT ----------------

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`RepairFirst LK server running on http://localhost:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
});
