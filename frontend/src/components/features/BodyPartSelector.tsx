'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2, Paintbrush, Eraser, Undo2, RotateCcw,
  ZoomIn, ZoomOut, Loader2,
} from 'lucide-react';

interface BodyPartSelectorProps {
  imageBase64: string;
  onSegmentClick: (clickX: number, clickY: number) => Promise<{
    mask_base64: string;
    body_part_guess: string;
    mask_area_pct: number;
  }>;
  onMaskFinalized: (maskBase64: string, bodyPart: string) => void;
  loading?: boolean;
}

type Mode = 'select' | 'add' | 'erase';

interface HistoryEntry {
  maskData: ImageData;
}

const BRUSH_SIZES = [8, 16, 24, 40, 60];
const DEFAULT_BRUSH_IDX = 2;
const MASK_COLOR = 'rgba(0, 180, 255, 0.45)';
const MASK_STROKE_COLOR = 'rgba(0, 180, 255, 0.9)';

export default function BodyPartSelector({
  imageBase64,
  onSegmentClick,
  onMaskFinalized,
  loading = false,
}: BodyPartSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<Mode>('select');
  const [brushSizeIdx, setBrushSizeIdx] = useState(DEFAULT_BRUSH_IDX);
  const [bodyPartGuess, setBodyPartGuess] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [segLoading, setSegLoading] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const historyRef = useRef<HistoryEntry[]>([]);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const brushSize = BRUSH_SIZES[brushSizeIdx];

  // ---------------------------------------------------------------------------
  // Load image onto base canvas
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth;
      const scale = Math.min(maxW / img.width, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      setCanvasSize({ w, h });

      [baseCanvasRef, maskCanvasRef, interactionCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = w;
          ref.current.height = h;
        }
      });

      const ctx = baseCanvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
      }
    };
    img.src = `data:image/jpeg;base64,${imageBase64}`;
  }, [imageBase64]);

  // ---------------------------------------------------------------------------
  // Coordinate helpers
  // ---------------------------------------------------------------------------
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = interactionCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: ((clientX - rect.left) / rect.width) * canvas.width,
        y: ((clientY - rect.top) / rect.height) * canvas.height,
      };
    },
    [],
  );

  const getNormCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = interactionCanvasRef.current;
      if (!canvas) return { nx: 0, ny: 0 };
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        nx: (clientX - rect.left) / rect.width,
        ny: (clientY - rect.top) / rect.height,
      };
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Mask rendering helpers
  // ---------------------------------------------------------------------------
  const applyMaskFromBase64 = useCallback(
    (maskB64: string) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

        // Draw mask as a temporary layer to read pixel data
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = maskCanvas.width;
        tmpCanvas.height = maskCanvas.height;
        const tmpCtx = tmpCanvas.getContext('2d')!;
        tmpCtx.drawImage(img, 0, 0, maskCanvas.width, maskCanvas.height);
        const maskPixels = tmpCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

        // Convert grayscale mask to colored overlay
        const overlay = ctx.createImageData(maskCanvas.width, maskCanvas.height);
        for (let i = 0; i < maskPixels.data.length; i += 4) {
          const brightness = maskPixels.data[i];
          if (brightness > 128) {
            overlay.data[i] = 0;       // R
            overlay.data[i + 1] = 180; // G
            overlay.data[i + 2] = 255; // B
            overlay.data[i + 3] = 115; // A
          }
        }
        ctx.putImageData(overlay, 0, 0);

        pushHistory();
        setHasMask(true);
      };
      img.src = `data:image/png;base64,${maskB64}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pushHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    historyRef.current.push({ maskData: data });
    if (historyRef.current.length > 30) {
      historyRef.current.shift();
    }
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length < 2) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !prev) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(prev.maskData, 0, 0);
  }, []);

  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    historyRef.current = [];
    setHasMask(false);
    setBodyPartGuess(null);
    setMode('select');
  }, []);

  // ---------------------------------------------------------------------------
  // Export mask as grayscale base64 PNG
  // ---------------------------------------------------------------------------
  const exportMask = useCallback((): string => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return '';
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return '';

    const pixels = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const outCanvas = document.createElement('canvas');
    outCanvas.width = maskCanvas.width;
    outCanvas.height = maskCanvas.height;
    const outCtx = outCanvas.getContext('2d')!;
    const outData = outCtx.createImageData(maskCanvas.width, maskCanvas.height);

    for (let i = 0; i < pixels.data.length; i += 4) {
      const alpha = pixels.data[i + 3];
      const val = alpha > 30 ? 255 : 0;
      outData.data[i] = val;
      outData.data[i + 1] = val;
      outData.data[i + 2] = val;
      outData.data[i + 3] = 255;
    }
    outCtx.putImageData(outData, 0, 0);

    return outCanvas.toDataURL('image/png').split(',')[1];
  }, []);

  // ---------------------------------------------------------------------------
  // Click handler — SAM segmentation
  // ---------------------------------------------------------------------------
  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent) => {
      if (mode !== 'select' || segLoading) return;

      const { nx, ny } = getNormCoords(e);
      setSegLoading(true);
      try {
        const result = await onSegmentClick(nx, ny);
        applyMaskFromBase64(result.mask_base64);
        setBodyPartGuess(result.body_part_guess);
        setMode('add');
      } catch (err) {
        console.error('Segmentation failed:', err);
      } finally {
        setSegLoading(false);
      }
    },
    [mode, segLoading, getNormCoords, onSegmentClick, applyMaskFromBase64],
  );

  // ---------------------------------------------------------------------------
  // Brush drawing (add / erase)
  // ---------------------------------------------------------------------------
  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (mode === 'select') return;
      e.preventDefault();
      isDrawingRef.current = true;
      const { x, y } = getCanvasCoords(e);
      lastPosRef.current = { x, y };
      pushHistory();
    },
    [mode, getCanvasCoords, pushHistory],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current || mode === 'select') return;
      e.preventDefault();
      const { x, y } = getCanvasCoords(e);
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      const last = lastPosRef.current || { x, y };

      if (mode === 'add') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = MASK_COLOR;
        ctx.fillStyle = MASK_COLOR;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle = 'rgba(0,0,0,1)';
      }

      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      lastPosRef.current = { x, y };
    },
    [mode, brushSize, getCanvasCoords],
  );

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Cursor preview on interaction canvas
  // ---------------------------------------------------------------------------
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'select') return;
      const intCanvas = interactionCanvasRef.current;
      if (!intCanvas) return;
      const ctx = intCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, intCanvas.width, intCanvas.height);

      const { x, y } = getCanvasCoords(e);
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = mode === 'add' ? MASK_STROKE_COLOR : 'rgba(255,80,80,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isDrawingRef.current) {
        draw(e);
      }
    },
    [mode, brushSize, getCanvasCoords, draw],
  );

  const handleMouseLeave = useCallback(() => {
    const intCanvas = interactionCanvasRef.current;
    if (!intCanvas) return;
    const ctx = intCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, intCanvas.width, intCanvas.height);
    endDraw();
  }, [endDraw]);

  // ---------------------------------------------------------------------------
  // Finalize
  // ---------------------------------------------------------------------------
  const handleFinalize = useCallback(() => {
    const maskB64 = exportMask();
    if (!maskB64) return;
    onMaskFinalized(maskB64, bodyPartGuess || 'body');
  }, [exportMask, bodyPartGuess, onMaskFinalized]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };

  return (
    <div className="w-full space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-2 bg-gray-800/60 rounded-lg border border-gray-700">
        {/* Mode buttons */}
        <ToolButton
          active={mode === 'select'}
          onClick={() => setMode('select')}
          title="Select (SAM click)"
          disabled={segLoading}
        >
          <MousePointer2 size={16} />
        </ToolButton>
        <ToolButton
          active={mode === 'add'}
          onClick={() => setMode('add')}
          title="Add brush"
          disabled={!hasMask}
        >
          <Paintbrush size={16} />
        </ToolButton>
        <ToolButton
          active={mode === 'erase'}
          onClick={() => setMode('erase')}
          title="Erase brush"
          disabled={!hasMask}
        >
          <Eraser size={16} />
        </ToolButton>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        {/* Brush size */}
        {mode !== 'select' && (
          <>
            <button
              onClick={() => setBrushSizeIdx(Math.max(0, brushSizeIdx - 1))}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-300"
              title="Smaller brush"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-gray-400 w-8 text-center">{brushSize}px</span>
            <button
              onClick={() => setBrushSizeIdx(Math.min(BRUSH_SIZES.length - 1, brushSizeIdx + 1))}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-300"
              title="Bigger brush"
            >
              <ZoomIn size={14} />
            </button>
            <div className="w-px h-6 bg-gray-600 mx-1" />
          </>
        )}

        {/* Actions */}
        <ToolButton onClick={undo} title="Undo" disabled={historyRef.current.length < 2}>
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton onClick={clearMask} title="Clear mask" disabled={!hasMask}>
          <RotateCcw size={16} />
        </ToolButton>

        <div className="flex-1" />

        {/* Body part badge */}
        {bodyPartGuess && (
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-900/50 text-cyan-300 border border-cyan-800">
            {bodyPartGuess}
          </span>
        )}
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden border border-gray-700 bg-black"
        style={{
          height: canvasSize.h || 400,
          cursor:
            segLoading || loading
              ? 'wait'
              : mode === 'select'
              ? 'crosshair'
              : 'none',
        }}
      >
        <canvas ref={baseCanvasRef} style={canvasStyle} />
        <canvas ref={maskCanvasRef} style={canvasStyle} />
        <canvas
          ref={interactionCanvasRef}
          style={{ ...canvasStyle, zIndex: 10 }}
          onClick={mode === 'select' ? handleCanvasClick : undefined}
          onMouseDown={mode !== 'select' ? startDraw : undefined}
          onMouseMove={handleMouseMove}
          onMouseUp={endDraw}
          onMouseLeave={handleMouseLeave}
          onTouchStart={mode !== 'select' ? startDraw : undefined}
          onTouchMove={mode !== 'select' ? draw : undefined}
          onTouchEnd={endDraw}
        />

        {/* Loading overlay */}
        <AnimatePresence>
          {(segLoading || loading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/50"
            >
              <div className="flex items-center gap-3 bg-gray-900/90 px-4 py-3 rounded-xl border border-gray-700">
                <Loader2 className="animate-spin text-cyan-400" size={20} />
                <span className="text-sm text-gray-200">
                  {segLoading ? 'Segmenting body part...' : 'Generating transformation...'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        {!hasMask && !segLoading && (
          <div className="absolute bottom-3 left-0 right-0 text-center z-10">
            <span className="text-xs text-gray-300 bg-black/60 px-3 py-1.5 rounded-full">
              Click on a body part to select it
            </span>
          </div>
        )}
      </div>

      {/* Confirm button */}
      {hasMask && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleFinalize}
          disabled={loading}
          className="w-full py-3 rounded-lg font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Processing...' : 'Confirm Selection & Transform'}
        </motion.button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar button sub-component
// ---------------------------------------------------------------------------
interface ToolButtonProps {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}

function ToolButton({ children, active, onClick, title, disabled }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded-md transition-colors ${
        active
          ? 'bg-cyan-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}
