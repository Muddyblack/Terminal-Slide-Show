import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import {
  configuredTransition,
  configuredTransitionDuration,
  fadeStyleOf,
  fadeVariants,
  FadeStyle,
} from '@/components/slideshow/transitions';
import { MediaCanvasProps, MediaItem, VideoPlayerProps, ImageCanvasProps, Dimensions } from '@/components/slideshow/types';
import { frontendConfig } from '@/config';
import { demoMediaUrl } from '@/demo/media';
import { getMediaType } from '@/utils/mediaType';
import { isMorphSupported, runMorph } from '@/utils/morph';
import { calculateDimensions, composeSlide, createBlurredBackground } from '@/utils/slideCompose';

const MEDIA_PATH = '/media';

/**
 * Encodes a media filename for use in URLs
 * @param {string} name - The raw filename
 * @returns {string} URL-encoded filename
 */
const getMediaUrl = (name: string): string => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return demoMediaUrl(name);
  return `${MEDIA_PATH}/${encodeURIComponent(name)}`;
};

/**
 * Canvas-based image renderer with blur effect background
 * @component
 * @param {Object} props
 * @param {Object} props.media - Media object containing image details
 * @param {'image'|'gif'} props.mediaType - Type of image media
 */
const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(({ media, onEnded, fade }) => {
  const variants = useMemo(() => fadeVariants(fade, configuredTransitionDuration()), [fade]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const handleVideoEnd = useCallback(() => {
    if (!frontendConfig.mediaTypes.loop && videoRef.current) {
      videoRef.current.currentTime = videoRef.current.duration;
    }
    onEndedRef.current?.();
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
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      key={`${media.name}-video`}
      ref={videoRef}
      className="w-full h-full object-contain"
      playsInline
      muted={frontendConfig.mediaTypes.muted}
      autoPlay={frontendConfig.mediaTypes.autoplay}
      loop={frontendConfig.mediaTypes.loop}
      onEnded={handleVideoEnd}
      onError={() => onEndedRef.current?.()}
      src={getMediaUrl(media.name)}
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
const ImageCanvas: React.FC<ImageCanvasProps> = React.memo(({ media, mediaType, fade, onReady }) => {
  const variants = useMemo(() => fadeVariants(fade, configuredTransitionDuration()), [fade]);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const resizeTimeoutRef = useRef<number | null>(null);

  /**
 * Updates canvas with current image and blur effect
 * @param {HTMLImageElement} image - Image to render
 */
  const updateCanvas = useCallback((image: HTMLImageElement) => {
    if (!image?.complete || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Failed to get canvas context');

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    // Set canvas size accounting for device pixel ratio
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Scale context to account for device pixel ratio
    ctx.scale(dpr, dpr);

    // Enable high quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const dims = calculateDimensions(
      image.width,
      image.height,
      displayWidth,
      displayHeight
    );

    // Rest of the existing blur and edge drawing code
    const blurredBackground = createBlurredBackground(
      image,
      dims,
      displayWidth,
      displayHeight
    );

    ctx.filter = 'none';
    ctx.drawImage(blurredBackground, 0, 0, displayWidth, displayHeight);

    if (mediaType !== 'gif') {
      ctx.drawImage(image, dims.x, dims.y, dims.scaledWidth, dims.scaledHeight);
    }

    setDimensions(dims);
    setIsLoading(false);
    onReadyRef.current?.();
  }, [mediaType]);

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
    imageRef.current.src = getMediaUrl(media.name);

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
      initial={variants.initial}
      // The fade starts once the picture is drawn, so a slide never fades in blank
      animate={isLoading ? variants.initial : variants.animate}
      exit={variants.exit}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      {mediaType === 'gif' && dimensions && !isLoading && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <img
            src={getMediaUrl(media.name)}
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

/** Loads an image into the browser cache; resolves with null if it cannot be loaded */
const loadImage = (name: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = getMediaUrl(name);
  });

const morphStrength = 0.9;

interface MorphLayerProps {
  from: MediaItem;
  to: MediaItem;
  soft: number;
  onDone: () => void;
}

/**
 * Draws the morph between two images on top of the slideshow. When it ends it keeps
 * showing the last frame (exactly the new slide) until the layer is removed.
 */
const MorphLayer: React.FC<MorphLayerProps> = ({ from, to, soft, onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;

    void Promise.all([loadImage(from.name), loadImage(to.name)]).then(([a, b]) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      if (!a || !b) {
        onDoneRef.current();
        return;
      }

      // Same pixel size the still slide is drawn at, capped to keep slow devices smooth
      const width = Math.min(Math.round(window.innerWidth * (window.devicePixelRatio || 1)), 1920);
      const height = Math.round((width * window.innerHeight) / window.innerWidth);
      canvas.width = width;
      canvas.height = height;

      stop = runMorph(canvas, composeSlide(a, width, height), composeSlide(b, width, height), {
        duration: configuredTransitionDuration() * 1.15,
        strength: morphStrength,
        soft,
        onDone: () => onDoneRef.current(),
      });
      if (!stop) onDoneRef.current();
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [from, to, soft]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-20 w-full h-full" />;
};


interface Shown {
  item: MediaItem;
  fade: FadeStyle;
}

/**
 * Main media canvas component that renders either video or image.
 * The next image is loaded before the change starts, and the slide that leaves stays solid
 * underneath the one that comes in, so the screen never goes dark between slides.
 * @component
 * @param {Object} props
 * @param {Object} props.media - Media object to render
 * @param {string} props.media.id - Unique identifier
 * @param {string} props.media.name - Filename of media
 * @param {string} props.media.url - URL of media resource
 * @param {string} [props.transition] - Overrides `slideshow.transition` (used by the /test page)
 */
const MediaCanvas: React.FC<MediaCanvasProps> = React.memo(({ media, onVideoEnd, transition }) => {
  const kind = transition ?? configuredTransition();
  const isMorph = kind === 'morph' || kind === 'morphBlur';

  const [shown, setShown] = useState<Shown | null>(media ? { item: media, fade: fadeStyleOf(kind) } : null);
  const [morph, setMorph] = useState<{ from: MediaItem; to: MediaItem } | null>(null);
  const shownRef = useRef<MediaItem | null>(media);
  const targetRef = useRef<MediaItem | null>(media);

  useEffect(() => {
    if (!media) return undefined;
    const target = targetRef.current;
    if (target && target.id === media.id && target.name === media.name) return undefined;
    targetRef.current = media;

    let cancelled = false;
    const previous = shownRef.current;

    const show = (fade: FadeStyle) => {
      shownRef.current = media;
      setShown({ item: media, fade });
    };

    if (getMediaType(media.name) === 'video') {
      setMorph(null);
      show(fadeStyleOf(kind));
      return () => { cancelled = true; };
    }

    void loadImage(media.name).then(() => {
      if (cancelled) return;
      const canMorph = isMorph && isMorphSupported() && previous && !shownIsNotStill(previous) && getMediaType(media.name) === 'image';
      if (canMorph && previous) {
        // The old slide stays on screen while the morph plays; the new one is swapped in at the end
        setMorph({ from: previous, to: media });
      } else {
        setMorph(null);
        show(fadeStyleOf(kind));
      }
    });

    return () => { cancelled = true; };
     
  }, [media?.id, media?.name]);

  const handleMorphDone = useCallback((to: MediaItem) => {
    if (targetRef.current?.id !== to.id) return;
    shownRef.current = to;
    setShown({ item: to, fade: 'instant' });
  }, []);

  // The morph layer is removed once the new slide is drawn underneath it
  const handleReady = useCallback(() => {
    setMorph((current) => (current && shownRef.current?.id === current.to.id ? null : current));
  }, []);

  const mediaType = useMemo(
    () => (shown?.item.name ? getMediaType(shown.item.name) : 'image'),
    [shown?.item.name]
  );

  if (!media || !shown) return null;
  const item = shown.item;

  return (
    <>
      <AnimatePresence mode="sync">
        {mediaType === 'video' ? (
          // Give a unique key so that on change the exit/enter transitions run
          <VideoPlayer media={item} onEnded={onVideoEnd} fade={shown.fade} key={`video-${item.id || item.name}`} />
        ) : (
          <ImageCanvas
            media={item}
            mediaType={mediaType}
            fade={shown.fade}
            onReady={handleReady}
            key={`image-${item.id || item.name}`}
          />
        )}
      </AnimatePresence>
      {morph && (
        <MorphLayer
          key={`${morph.from.id}>${morph.to.id}`}
          from={morph.from}
          to={morph.to}
          soft={kind === 'morphBlur' ? 1 : 0}
          onDone={() => handleMorphDone(morph.to)}
        />
      )}
    </>
  );
},
  // Custom comparison function
  (prevProps, nextProps) => {
    return (
      prevProps.media?.id === nextProps.media?.id &&
      prevProps.media?.name === nextProps.media?.name &&
      prevProps.media?.url === nextProps.media?.url &&
      prevProps.onVideoEnd === nextProps.onVideoEnd &&
      prevProps.transition === nextProps.transition
    );
  });

/** Only still images morph; videos and GIFs keep moving, so they fade instead */
function shownIsNotStill(item: MediaItem): boolean {
  return getMediaType(item.name) !== 'image';
}

// PropTypes for type checking
MediaCanvas.propTypes = {
  media: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string
  }),
  transition: PropTypes.oneOf(['crossfade', 'blur', 'zoom', 'morph', 'morphBlur'])
};

export default MediaCanvas;
