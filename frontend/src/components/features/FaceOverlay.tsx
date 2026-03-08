'use client';

import { useEffect, useRef } from 'react';
import type { FaceBBox } from '@/lib/utils/faceDetection';
import type * as faceapi from 'face-api.js';

interface FaceOverlayProps {
  imageSrc: string;
  bbox: FaceBBox | null;
  landmarks: faceapi.FaceLandmarks68 | null;
  width?: number;
  height?: number;
}

export function FaceOverlay({ imageSrc, bbox, landmarks, width, height }: FaceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.drawImage(img, 0, 0);

      if (bbox) {
        const pad = 12;
        const bx = bbox.x - pad;
        const by = bbox.y - pad;
        const bw = bbox.width + pad * 2;
        const bh = bbox.height + pad * 2;
        const cornerLen = 20;

        const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-hex').trim() || '#06b6d4';
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);

        ctx.setLineDash([]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = themeColor;

        ctx.beginPath();
        ctx.moveTo(bx, by + cornerLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cornerLen, by);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx + bw - cornerLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cornerLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx + bw, by + bh - cornerLen); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - cornerLen, by + bh);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx + cornerLen, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - cornerLen);
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.font = 'bold 14px system-ui';
        ctx.fillText('Face 1', bx + 4, by - 6);
      }
    };

    if (img.complete) {
      draw();
    } else {
      img.onload = draw;
    }
  }, [bbox, landmarks, imageSrc]);

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Face"
        className="hidden"
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-2xl"
        style={{ maxHeight: width ? undefined : '420px', objectFit: 'contain' }}
      />
    </div>
  );
}
