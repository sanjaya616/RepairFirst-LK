import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImageBuffer,
  validateUploadedImages,
  applySafetyInvariants,
  decodeBase64Image,
} from '../src/lib/imageValidator.ts';

// Helper to create synthetic valid test buffers
function createMockJpegBuffer(): Buffer {
  // JPEG starts with FF D8 FF
  const buf = Buffer.alloc(100);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xe0;
  return buf;
}

function createMockPngBuffer(): Buffer {
  // PNG starts with 89 50 4E 47
  const buf = Buffer.alloc(100);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  return buf;
}

function createMockWebpBuffer(): Buffer {
  // WebP starts with 'RIFF' at 0..4 and 'WEBP' at 8..12
  const buf = Buffer.alloc(100);
  buf.write('RIFF', 0, 4, 'ascii');
  buf.write('WEBP', 8, 4, 'ascii');
  return buf;
}

// ---------------- 1. MAGIC BYTES VERIFICATION ----------------

test('1. Magic Bytes: Valid JPEG buffer recognized', () => {
  const buf = createMockJpegBuffer();
  const res = validateImageBuffer(buf);
  assert.equal(res.isValid, true);
  assert.equal(res.mimeType, 'image/jpeg');
});

test('2. Magic Bytes: Valid PNG buffer recognized', () => {
  const buf = createMockPngBuffer();
  const res = validateImageBuffer(buf);
  assert.equal(res.isValid, true);
  assert.equal(res.mimeType, 'image/png');
});

test('3. Magic Bytes: Valid WebP buffer recognized', () => {
  const buf = createMockWebpBuffer();
  const res = validateImageBuffer(buf);
  assert.equal(res.isValid, true);
  assert.equal(res.mimeType, 'image/webp');
});

test('4. Magic Bytes: Reject text/executable disguised with image extension', () => {
  const fakePng = Buffer.from('Plain text file masquerading as a PNG picture');
  const res = validateImageBuffer(fakePng);
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /unsupported image format/i);
});

// ---------------- 2. FILE SIZE CONSTRAINTS ----------------

test('5. Image Size Limit: Rejects buffers larger than 5 MB', () => {
  const oversizeBuf = Buffer.alloc(5 * 1024 * 1024 + 10);
  oversizeBuf[0] = 0xff;
  oversizeBuf[1] = 0xd8;
  oversizeBuf[2] = 0xff;

  const res = validateImageBuffer(oversizeBuf);
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /exceeds maximum allowed size/i);
});

// ---------------- 3. IMAGE COUNT CONSTRAINTS ----------------

test('6. Max Photos: Accepts up to 4 device photos', () => {
  const jpegBase64 = createMockJpegBuffer().toString('base64');
  const images = [
    { id: '1', base64: jpegBase64 },
    { id: '2', base64: jpegBase64 },
    { id: '3', base64: jpegBase64 },
    { id: '4', base64: jpegBase64 },
  ];

  const validation = validateUploadedImages(images);
  assert.equal(validation.valid, true);
  assert.equal(validation.validatedImages.length, 4);
});

test('7. Max Photos: Rejects more than 4 device photos', () => {
  const jpegBase64 = createMockJpegBuffer().toString('base64');
  const images = [
    { id: '1', base64: jpegBase64 },
    { id: '2', base64: jpegBase64 },
    { id: '3', base64: jpegBase64 },
    { id: '4', base64: jpegBase64 },
    { id: '5', base64: jpegBase64 },
  ];

  const validation = validateUploadedImages(images);
  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /maximum 4 device photos allowed/i);
});

// ---------------- 4. SAFETY INVARIANT ENFORCEMENT ----------------

test('8. Safety Invariant: Deterministic text hazard CANNOT be downgraded by image', () => {
  const textSafety = {
    hasDanger: true,
    warningTitle: 'CRITICAL BATTERY SWELLING DETECTED',
    warningMessage: 'Device battery shows dangerous expansion.',
    instructions: ['Disconnect power immediately', 'Place on fireproof surface'],
  };

  // AI multimodal response attempting to claim the device looks pristine
  const aiVisionResult = {
    analysisType: 'multimodal',
    issueCategory: 'OTHER',
    categoryLabel: 'Cosmetic wear',
    summary: 'The laptop chassis looks normal in the picture.',
    visualObservations: ['No visible dents or scratches'],
    dangerWarning: false,
    hazardDetected: false,
  };

  const finalized = applySafetyInvariants(textSafety, aiVisionResult);
  assert.equal(finalized.dangerWarning, true, 'Danger warning MUST remain true');
  assert.equal(finalized.hazardDetected, true);
  assert.equal(finalized.issueCategory, 'PHYSICAL_DAMAGE');
  assert.match(finalized.categoryLabel, /CRITICAL BATTERY SWELLING/i);
  assert.match(finalized.disclaimer, /CRITICAL SAFETY NOTICE/i);
});

test('9. Safety Invariant: Visual observations ESCALATE hazard warning even when text was benign', () => {
  const benignText = {
    hasDanger: false,
  };

  // AI vision detects bloated chassis or melted port in photos
  const aiVisionResult = {
    analysisType: 'multimodal',
    issueCategory: 'OVERHEATING',
    categoryLabel: 'Heat Issue',
    summary: 'Photo reveals the bottom casing is bulging and warped from an expanding battery cell.',
    visualObservations: ['Bottom panel is swollen and lifting away from keyboard'],
    possibleVisibleDamage: ['Swollen battery expansion', 'Separated chassis seam'],
    dangerWarning: false,
  };

  const finalized = applySafetyInvariants(benignText, aiVisionResult);
  assert.equal(finalized.dangerWarning, true, 'Visual swelling MUST escalate to dangerWarning true');
  assert.equal(finalized.hazardDetected, true);
  assert.equal(finalized.issueCategory, 'PHYSICAL_DAMAGE');
  assert.match(finalized.categoryLabel, /Visual Hazard/i);
  assert.equal(finalized.safeChecks.length >= 3, true);
});

// ---------------- 5. ENDPOINT INTEGRATION TESTS ----------------

test('10. REST Endpoint: /api/assessments/analyze rejects corrupted image payload', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'laptop',
      brand: 'Dell',
      model: 'Inspiron 15',
      problemDescription: 'My laptop screen is cracked and flickering',
      images: [
        {
          name: 'malicious.png',
          base64: Buffer.from('NOT_A_VALID_IMAGE_HEADER_AT_ALL').toString('base64'),
        },
      ],
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error || '', /invalid|unsupported/i);
});

test('11. REST Endpoint: /api/assessments/analyze with valid photo returns structured analysis', async () => {
  const validPngBase64 = createMockPngBuffer().toString('base64');

  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'smartphone',
      brand: 'Samsung',
      model: 'Galaxy A52',
      problemDescription: 'Screen glass is cracked after dropping on asphalt',
      images: [
        {
          id: 'test-img-1',
          name: 'phone_screen.png',
          base64: validPngBase64,
        },
      ],
    }),
  });

  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(typeof data.issueCategory, 'string');
  assert.equal(data.dangerWarning, false);
  assert.equal(Array.isArray(data.safeChecks), true);
});

test('12. REST Endpoint: Private Image Storage Lifecycle (POST -> GET -> DELETE)', async () => {
  const validJpegBase64 = createMockJpegBuffer().toString('base64');
  const testAssessmentId = `test_assess_${Date.now()}`;
  const testImageId = `img_${Date.now()}`;

  // 1. Upload image to private storage
  const uploadRes = await fetch(`http://localhost:3000/api/assessments/${testAssessmentId}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user-123',
    },
    body: JSON.stringify({
      images: [
        {
          id: testImageId,
          name: 'laptop_chassis.jpg',
          base64: validJpegBase64,
        },
      ],
    }),
  });

  assert.equal(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.equal(uploadData.success, true);
  assert.equal(uploadData.count, 1);
  assert.equal(uploadData.images[0].url, `/api/assessments/${testAssessmentId}/images/${testImageId}`);

  // 2. Retrieve image
  const getRes = await fetch(`http://localhost:3000/api/assessments/${testAssessmentId}/images/${testImageId}`);
  assert.equal(getRes.ok, true);
  assert.equal(getRes.headers.get('content-type'), 'image/jpeg');
  assert.match(getRes.headers.get('cache-control') || '', /private/);

  // 3. Delete image
  const delRes = await fetch(`http://localhost:3000/api/assessments/${testAssessmentId}/images/${testImageId}`, {
    method: 'DELETE',
  });
  assert.equal(delRes.ok, true);

  // 4. Confirm 404 after deletion
  const getAfterDel = await fetch(`http://localhost:3000/api/assessments/${testAssessmentId}/images/${testImageId}`);
  assert.equal(getAfterDel.status, 404);
});
