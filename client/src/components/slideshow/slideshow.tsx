import { AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';

import MediaCanvas from '@/components/slideshow/mediaCanvas';
import { NavigationDirection, LocalMediaManagerReturn } from '@/components/slideshow/types';
import { frontendConfig } from '@/config';

import ConnectionToast from '@/components/connectionToast';
import DynamicDailyView from '@/components/dynamic_daily_view/dynamicDailyView';
import ErrorToast from '@/components/errorToast';
import Loading from '@/components/loading';
import Controls from '@/components/slideshow/controls';
import { useControlsVisibility } from '@/hooks/useControlsVisibility';
import { useLocalMediaManager } from '@/hooks/useLocalMediaManager';
import { useSchedule } from '@/hooks/useSchedule';
import { useServerStatus } from '@/contexts/ServerStatusContext';
import { isRaspberryPi } from '@/utils/deviceDetection';
import { getMediaType } from '@/utils/mediaType';

/**
 * @component Slideshow
 * @description A media slideshow component that handles automatic playback, navigation,
 * loading states, and error handling. Only active when schedule is enabled.
 * 
 * @returns {JSX.Element} The rendered slideshow component
 */
const Slideshow = () => {
  // The schedule is only enforced on the kiosk device; other browsers always show the slideshow.
  // Hooks must run unconditionally, so the result is ignored instead of skipping the call.
  const scheduleActive = useSchedule();
  const isScheduleActive = isRaspberryPi() ? scheduleActive : true;

  // Cast to unknown first, then to LocalMediaManagerReturn to handle type mismatch
  const mediaManager = useLocalMediaManager(isScheduleActive) as unknown as LocalMediaManagerReturn;
  const { media, loading, error, serverReady, navigateMedia } = mediaManager;
  const showControls = useControlsVisibility();
  const isServerConnected = useServerStatus();

  // State for managing playback
  const [paused, setPaused] = useState(false);
  const autoContinueTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cleanup effect when schedule becomes inactive
  useEffect(() => {
    if (!isScheduleActive) {
      if (autoContinueTimer.current) {
        clearTimeout(autoContinueTimer.current);
      }
      setPaused(true);
    } else {
      setPaused(false);
    }
  }, [isScheduleActive]);

  // Clear media when schedule becomes inactive
  useEffect(() => {
    if (!isScheduleActive) {
      // Force clear the media display
      if (mediaManager.media) {
        navigateMedia('next');
        setPaused(true);
      }
    }
  }, [isScheduleActive]);

  const handleNavigate = useCallback(async (direction: NavigationDirection): Promise<void> => {
    if (!isScheduleActive) return;
    setPaused(true);
    await navigateMedia(direction);
    setTimeout(() => setPaused(false), 200);
  }, [isScheduleActive, navigateMedia]);

  // Videos without an explicit duration (_Xs_ in the filename) play to their end
  const playsToEnd = Boolean(
    media && !media.isDynamicView && !media.duration &&
    !frontendConfig.mediaTypes.loop && getMediaType(media.name) === 'video'
  );

  // Auto-advance timer effect
  useEffect(() => {
    if (paused || !media || loading || !isScheduleActive || playsToEnd) return;

    const duration = media.duration || frontendConfig.slideshow.defaultSlideDuration;

    const timer = setTimeout(() => {
      handleNavigate('next');
    }, duration);

    autoContinueTimer.current = timer;

    return () => {
      if (autoContinueTimer.current) {
        clearTimeout(autoContinueTimer.current);
      }
    };
  }, [paused, media, loading, isScheduleActive, playsToEnd, handleNavigate]);

  // Add isScheduleActive check to the main render logic
  if (!isScheduleActive) {
    return (
      <div className="slideshow-container">
        <div className="fixed inset-0 bg-black" />
      </div>
    );
  }

  // Only show loading states if schedule is active and no cached media
  if (!isServerConnected && !media && isScheduleActive) {
    return <Loading key="loading" isServerConnecting={!isServerConnected} />;
  }

  if (loading && !media && isScheduleActive) {
    return <Loading key="loading" isServerConnecting={false} />;
  }

  return (
    <div className="slideshow-container">
      {/* Main content wrapper with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="wait">
        {!loading && (media ? (
          <>
            {media.isDynamicView ? (
              <DynamicDailyView key="dynamic-view" />
            ) : (
              <MediaCanvas key="media" media={media} onVideoEnd={playsToEnd ? () => handleNavigate('next') : undefined} />
            )}
            {!isServerConnected && <ConnectionToast />}
          </>
        ) : isScheduleActive ? (
          <DynamicDailyView key="dynamic-view" />
        ) : null)}
      </AnimatePresence>

      {/* Navigation controls */}
      {media && (
        <Controls
          show={showControls}
          onPrevious={() => handleNavigate('previous')}
          onNext={() => handleNavigate('next')}
          disabled={loading || !serverReady || paused}
        />
      )}

      {/* Error toast */}
      <AnimatePresence>
        {error && !loading && isScheduleActive && !media?.isDynamicView && (
          <ErrorToast message={error} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Slideshow;