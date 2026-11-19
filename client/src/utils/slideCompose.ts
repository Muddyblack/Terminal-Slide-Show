import { Dimensions } from '@/components/slideshow/types';

/** Blur of the stretched edges behind an image, in CSS pixels */
export const BLUR_AMOUNT = 20;

/** Scales a medium to fit the canvas while keeping its aspect ratio, centred */
export const calculateDimensions = (
  mediaWidth: number,
  mediaHeight: number,
  canvasWidth: number,
  canvasHeight: number
): Dimensions => {
  const scale = Math.min(canvasWidth / mediaWidth, canvasHeight / mediaHeight);

  return {
    scaledWidth: mediaWidth * scale,
    scaledHeight: mediaHeight * scale,
    x: (canvasWidth - mediaWidth * scale) / 2,
    y: (canvasHeight - mediaHeight * scale) / 2,
  };
};

/** Image with its edges stretched, blurred and darkened to fill the screen behind it */
export const createBlurredBackground = (
  image: HTMLImageElement,
  dimensions: Dimensions,
  canvasWidth: number,
  canvasHeight: number,
  blurPx: number = BLUR_AMOUNT
): HTMLCanvasElement => {
  const { scaledWidth, scaledHeight, x, y } = dimensions;
  const { width: imgWidth, height: imgHeight } = image;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) throw new Error('Failed to get canvas context');

  tempCanvas.width = canvasWidth;
  tempCanvas.height = canvasHeight;

  tempCtx.imageSmoothingQuality = 'medium';
  tempCtx.drawImage(image, x, y, scaledWidth, scaledHeight);
  tempCtx.filter = `blur(${blurPx}px)`;

  const edges = [
    { sx: 0, sy: 0, sw: 1, sh: imgHeight, dx: 0, dy: 0, dw: x, dh: canvasHeight },
    { sx: imgWidth - 1, sy: 0, sw: 1, sh: imgHeight, dx: x + scaledWidth, dy: 0, dw: canvasWidth - (x + scaledWidth), dh: canvasHeight },
    { sx: 0, sy: 0, sw: imgWidth, sh: 1, dx: x, dy: 0, dw: scaledWidth, dh: y },
    { sx: 0, sy: imgHeight - 1, sw: imgWidth, sh: 1, dx: x, dy: y + scaledHeight, dw: scaledWidth, dh: canvasHeight - (y + scaledHeight) },
  ];

  edges.forEach((edge) => {
    tempCtx.drawImage(image, edge.sx, edge.sy, edge.sw, edge.sh, edge.dx, edge.dy, edge.dw, edge.dh);
  });

  tempCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  tempCtx.fillRect(0, 0, canvasWidth + 50, canvasHeight + 50);

  return tempCanvas;
};

/**
 * A finished slide as it appears on screen: blurred background plus the crisp image.
 * `width` and `height` are the canvas pixels to render at.
 */
export const composeSlide = (image: HTMLImageElement, width: number, height: number): HTMLCanvasElement => {
  const dims = calculateDimensions(image.width, image.height, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(createBlurredBackground(image, dims, width, height, (BLUR_AMOUNT * width) / window.innerWidth), 0, 0);
  ctx.drawImage(image, dims.x, dims.y, dims.scaledWidth, dims.scaledHeight);
  return canvas;
};
