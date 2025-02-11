import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';
import { useState, useCallback } from 'react';
import { useSwipeable, SwipeableProps } from 'react-swipeable';

import '@/styles/controls.css';
import { ControlsProps } from '@/components/slideshow/types';


/**
 * Controls component for navigation with buttons and swipe gestures
 * @component
 * @param {ControlsProps} props - Component properties
 * @returns {JSX.Element} Navigation controls with animation
 */
const Controls: React.FC<ControlsProps> = ({ show, onPrevious, onNext, disabled }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(0);
  const debounceDelay = 500; // Minimum time between actions in ms

  /**
   * Handles previous navigation with debouncing and loading state
   * @function
   */
  const handlePrevious = useCallback(async () => {
    const now = Date.now();
    if (disabled || isLoading || now - lastActionTime < debounceDelay) return;
    setIsLoading(true);
    setLastActionTime(now);
    await onPrevious();
    setIsLoading(false);
  }, [disabled, isLoading, lastActionTime, onPrevious]);

  /**
   * Handles next navigation with debouncing and loading state
   * @function
   */
  const handleNext = useCallback(async () => {
    const now = Date.now();
    if (disabled || isLoading || now - lastActionTime < debounceDelay) return;
    setIsLoading(true);
    setLastActionTime(now);
    await onNext();
    setIsLoading(false);
  }, [disabled, isLoading, lastActionTime, onNext]);

  // Configure swipe gesture handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => !disabled && handleNext(),
    onSwipedRight: () => !disabled && handlePrevious(),
    trackMouse: true,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
  } as SwipeableProps);

  return (
    <div {...handlers} className="swipe-container">
      <AnimatePresence>
        {show && (
          <>
            {/* Previous button with slide animation */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onClick={handlePrevious}
              disabled={disabled || isLoading}
              className="nav-button nav-button-left"
              aria-label="Previous"
            >
              <ChevronLeft className="w-8 h-8 text-white/90" />
            </motion.button>

            {/* Next button with slide animation */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onClick={handleNext}
              disabled={disabled || isLoading}
              className="nav-button nav-button-right"
              aria-label="Next"
            >
              <ChevronRight className="w-8 h-8 text-white/90" />
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Controls;