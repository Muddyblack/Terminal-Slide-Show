import { frontendConfig } from '@config/frontend.config';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { MediaCanvasProps, VideoPlayerProps, ImageCanvasProps, Dimensions } from '@/components/slideshow/types';

/**
 * Constants for animation and styling
 */
const ANIMATION_CONFIG = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.5 }
};

const BLUR_AMOUNT = '20px';
const MEDIA_PATH = '/media';

/**
 * Determines media type from filename
 * @param {string} filename - Name of the media file
 * @returns {'image'|'gif'|'video'} Media type
 */
const getMediaType = (filename: string): 'image' | 'gif' | 'video' => {
  if (!filename) return 'image';
  const extension = filename.toLowerCase().split('.').pop() || '';
  if (extension === 'gif') return 'gif';
  if (frontendConfig.mediaTypes.videoTypes.some((type: string) => type.includes(extension))) return 'video';
  return 'image';
};

/**
 * Canvas-based image renderer with blur effect background
 * @component
 * @param {Object} props
 * @param {Object} props.media - Media object containing image details
 * @param {'image'|'gif'} props.mediaType - Type of image media
 */
const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(({ media }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnd = useCallback(() => {
    if (!frontendConfig.mediaTypes.loop && videoRef.current) {
      videoRef.current.currentTime = videoRef.current.duration;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('ended', handleVideoEnd);
      return () => video.removeEventListener('ended', handleVideoEnd);
    }
  }, [handleVideoEnd]);

  return (
    <motion.video
      {...ANIMATION_CONFIG}
      key={`${media.name}-video`}
      ref={videoRef}
      className="w-full h-full object-contain"
      playsInline
      muted={frontendConfig.mediaTypes.muted}
      autoPlay={frontendConfig.mediaTypes.autoplay}
      loop={frontendConfig.mediaTypes.loop}
      onEnded={handleVideoEnd}
      src={`${MEDIA_PATH}/${media.name}`}
    />
  );
});

/**
 * Canvas-based image renderer with blur effect background
 * @component
 * @param {Object} props
 * @param {Object} props.media - Media object containing image details
 * @param {'image'|'gif'} props.mediaType - Type of image media
 */
const ImageCanvas: React.FC<ImageCanvasProps> = React.memo(({ media, mediaType }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const resizeTimeoutRef = useRef<number | null>(null);

  /**
 * Calculates scaled dimensions maintaining aspect ratio
 * @param {number} mediaWidth - Original media width
 * @param {number} mediaHeight - Original media height
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {Object} Scaled dimensions and position
 */
  const calculateDimensions = useCallback((
    mediaWidth: number,
    mediaHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ): Dimensions => {
    const scale = Math.min(
      canvasWidth / mediaWidth,
      canvasHeight / mediaHeight
    );

    return {
      scaledWidth: mediaWidth * scale,
      scaledHeight: mediaHeight * scale,
      x: (canvasWidth - mediaWidth * scale) / 2,
      y: (canvasHeight - mediaHeight * scale) / 2
    };
  }, []);

  /**
 * Creates blurred background effect using canvas
 * @param {HTMLImageElement} image - Source image element
 * @param {Object} dimensions - Calculated dimensions
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {HTMLCanvasElement} Canvas with blurred background
 */
  const createBlurredBackground = useCallback((
    image: HTMLImageElement,
    dimensions: Dimensions,
    canvasWidth: number,
    canvasHeight: number
  ): HTMLCanvasElement => {
    const { scaledWidth, scaledHeight, x, y } = dimensions;
    const { width: imgWidth, height: imgHeight } = image;
  
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) throw new Error('Failed to get canvas context');
  
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
  
    // Draw main image
    tempCtx.imageSmoothingQuality = 'medium';
    tempCtx.drawImage(image, x, y, scaledWidth, scaledHeight);
    tempCtx.filter = `blur(${BLUR_AMOUNT})`;
  
    // Draw edges for blur effect
    const edges = [
      { sx: 0, sy: 0, sw: 1, sh: imgHeight, dx: 0, dy: 0, dw: x, dh: canvasHeight },
      { sx: imgWidth - 1, sy: 0, sw: 1, sh: imgHeight, dx: x + scaledWidth, dy: 0, dw: canvasWidth - (x + scaledWidth), dh: canvasHeight },
      { sx: 0, sy: 0, sw: imgWidth, sh: 1, dx: x, dy: 0, dw: scaledWidth, dh: y },
      { sx: 0, sy: imgHeight - 1, sw: imgWidth, sh: 1, dx: x, dy: y + scaledHeight, dw: scaledWidth, dh: canvasHeight - (y + scaledHeight) }
    ];
  
    edges.forEach(edge => {
      tempCtx.drawImage(image, edge.sx, edge.sy, edge.sw, edge.sh, edge.dx, edge.dy, edge.dw, edge.dh);
    });
  
    // Add darkness overlay
    tempCtx.fillStyle = 'rgba(0, 0, 0, 0.25)'; 
    tempCtx.fillRect(0, 0, canvasWidth+50, canvasHeight+50);
  
    return tempCanvas;
  }, []);

  /**
 * Updates canvas with current image and blur effect
 * @param {HTMLImageElement} image - Image to render
 */
  const updateCanvas = useCallback((image: HTMLImageElement) => {
    if (!image?.complete || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d'); // use { alpha: false } for more optimization
    
    if (!ctx) throw new Error('Failed to get canvas context');

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const dims = calculateDimensions(
      image.width,
      image.height,
      canvas.width,
      canvas.height
    );

    const blurredBackground = createBlurredBackground(
      image,
      dims,
      canvas.width,
      canvas.height
    );

    ctx.filter = 'none';
    ctx.drawImage(blurredBackground, 0, 0);

    if (mediaType !== 'gif') {
      ctx.drawImage(image, dims.x, dims.y, dims.scaledWidth, dims.scaledHeight);
    }

    setDimensions(dims);
    setIsLoading(false);
  }, [mediaType, calculateDimensions, createBlurredBackground]);

  /**
 * Handles window resize events with debouncing
 */
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      window.cancelAnimationFrame(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = window.requestAnimationFrame(() => {
      if (imageRef.current?.complete) {
        updateCanvas(imageRef.current);
      }
    });
  }, [updateCanvas]);

  useEffect(() => {
    if (!media) return;

    setIsLoading(true);
    setDimensions(null);

    imageRef.current = new Image();
    imageRef.current.onload = () => {
      if (imageRef.current) {
        updateCanvas(imageRef.current);
      }
    };
    imageRef.current.src = `${MEDIA_PATH}/${media.name}`; +

      window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        window.cancelAnimationFrame(resizeTimeoutRef.current);
      }
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.src = '';
      }
    };
  }, [media, handleResize, updateCanvas]);

  return (
    <motion.div
      className="fixed inset-0 bg-transparent"
      key={`${media.name}-image`}
      {...ANIMATION_CONFIG}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      {mediaType === 'gif' && dimensions && !isLoading && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <img
            src={`${MEDIA_PATH}/${media.name}`}
            alt="Animated GIF"
            style={{
              position: 'absolute',
              left: dimensions.x,
              top: dimensions.y,
              width: dimensions.scaledWidth,
              height: dimensions.scaledHeight,
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </motion.div>
  );
});

/**
 * Main media canvas component that renders either video or image
 * @component
 * @param {Object} props
 * @param {Object} props.media - Media object to render
 * @param {string} props.media.id - Unique identifier
 * @param {string} props.media.name - Filename of media
 * @param {string} props.media.url - URL of media resource
 */
const MediaCanvas: React.FC<MediaCanvasProps> = React.memo(({ media }) => {
  // Memoize media type calculation
  const mediaType = useMemo(() =>
    media?.name ? getMediaType(media.name) : 'image',
    [media?.name]
  );

  if (!media) return null;

  return (
    <AnimatePresence mode="sync">
      {mediaType === 'video' ? (
        // Give a unique key so that on change the exit/enter transitions run
        <VideoPlayer media={media} key={`video-${media.id || media.name}`} />
      ) : (
        <ImageCanvas media={media} mediaType={mediaType} key={`image-${media.id || media.name}`} />
      )}
    </AnimatePresence>
  );
},
// Custom comparison function
(prevProps, nextProps) => {
  return (
    prevProps.media?.id === nextProps.media?.id &&
    prevProps.media?.name === nextProps.media?.name &&
    prevProps.media?.url === nextProps.media?.url
  );
});

// PropTypes for type checking
MediaCanvas.propTypes = {
  media: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string
  })
};

export default MediaCanvas;