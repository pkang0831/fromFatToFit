import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export interface FaceBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceMeasurements {
  eyeSpan: number;
  faceHeight: number;
  faceWidth: number;
  foreheadWidth: number;
  interocularDistance: number;
  jawWidth: number;
  mouthWidth: number;
  noseLength: number;
  noseWidth: number;
}

export interface ShapeProbability {
  shape: string;
  probability: number;
}

export interface FaceDetectionResult {
  bbox: FaceBBox;
  landmarks: faceapi.FaceLandmarks68;
  measurements: FaceMeasurements;
  shapeProbs: ShapeProbability[];
}

function dist(a: faceapi.Point, b: faceapi.Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function midpoint(a: faceapi.Point, b: faceapi.Point): faceapi.Point {
  return new faceapi.Point((a.x + b.x) / 2, (a.y + b.y) / 2);
}

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export function calculateMeasurements(lm: faceapi.FaceLandmarks68): FaceMeasurements {
  const pts = lm.positions;

  const leftEyeOuter = pts[36];
  const rightEyeOuter = pts[45];
  const leftEyeInner = pts[39];
  const rightEyeInner = pts[42];

  const jawLeft = pts[0];
  const jawRight = pts[16];
  const jawBottom = pts[8];

  const noseBridge = pts[27];
  const noseBottom = pts[30];
  const noseLeft = pts[31];
  const noseRight = pts[35];

  const mouthLeft = pts[48];
  const mouthRight = pts[54];

  const browLeft = pts[17];
  const browRight = pts[26];
  const browMidLeft = pts[19];
  const browMidRight = pts[24];
  const foreheadCenter = midpoint(browMidLeft, browMidRight);

  const faceTop = new faceapi.Point(
    foreheadCenter.x,
    foreheadCenter.y - dist(foreheadCenter, noseBridge) * 0.5,
  );

  return {
    eyeSpan: Math.round(dist(leftEyeOuter, rightEyeOuter) * 10) / 10,
    faceHeight: Math.round(dist(faceTop, jawBottom) * 10) / 10,
    faceWidth: Math.round(dist(jawLeft, jawRight) * 10) / 10,
    foreheadWidth: Math.round(dist(browLeft, browRight) * 10) / 10,
    interocularDistance: Math.round(dist(leftEyeInner, rightEyeInner) * 10) / 10,
    jawWidth: Math.round(dist(pts[4], pts[12]) * 10) / 10,
    mouthWidth: Math.round(dist(mouthLeft, mouthRight) * 10) / 10,
    noseLength: Math.round(dist(noseBridge, noseBottom) * 10) / 10,
    noseWidth: Math.round(dist(noseLeft, noseRight) * 10) / 10,
  };
}

export function determineFaceShape(m: FaceMeasurements): ShapeProbability[] {
  const hwRatio = m.faceHeight / m.faceWidth;
  const jawFaceRatio = m.jawWidth / m.faceWidth;
  const foreheadFaceRatio = m.foreheadWidth / m.faceWidth;

  const scores: Record<string, number> = {
    Oval: 0,
    Round: 0,
    Square: 0,
    Heart: 0,
    Oblong: 0,
    Diamond: 0,
    Rectangle: 0,
  };

  if (hwRatio > 1.3 && hwRatio < 1.6) scores.Oval += 30;
  if (hwRatio >= 1.0 && hwRatio <= 1.3) scores.Round += 30;
  if (hwRatio >= 1.0 && hwRatio <= 1.35) scores.Square += 25;
  if (hwRatio > 1.3 && hwRatio < 1.6) scores.Heart += 20;
  if (hwRatio > 1.5) scores.Oblong += 35;
  if (hwRatio > 1.2 && hwRatio < 1.5) scores.Diamond += 20;
  if (hwRatio > 1.4) scores.Rectangle += 25;

  if (jawFaceRatio < 0.7) scores.Heart += 20;
  if (jawFaceRatio >= 0.7 && jawFaceRatio <= 0.85) scores.Oval += 15;
  if (jawFaceRatio > 0.8) scores.Square += 20;
  if (jawFaceRatio > 0.8) scores.Round += 15;
  if (jawFaceRatio > 0.8) scores.Rectangle += 15;

  if (foreheadFaceRatio > 0.75) scores.Heart += 15;
  if (foreheadFaceRatio > 0.65 && foreheadFaceRatio <= 0.75) scores.Oval += 15;
  if (foreheadFaceRatio < 0.65) scores.Diamond += 25;

  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

  return Object.entries(scores)
    .map(([shape, score]) => ({
      shape,
      probability: Math.round((score / total) * 100),
    }))
    .sort((a, b) => b.probability - a.probability);
}

export async function detectFace(
  input: HTMLImageElement | HTMLCanvasElement,
): Promise<FaceDetectionResult | null> {
  await loadModels();

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
    .withFaceLandmarks();

  if (!detection) return null;

  const box = detection.detection.box;
  const bbox: FaceBBox = {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };

  const landmarks = detection.landmarks;
  const measurements = calculateMeasurements(landmarks);
  const shapeProbs = determineFaceShape(measurements);

  return { bbox, landmarks, measurements, shapeProbs };
}
