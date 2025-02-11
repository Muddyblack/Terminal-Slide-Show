import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import {JSX} from 'react';
import { useEffect } from 'react';
import '@/styles/errorToast.css';

/**
 * ErrorToast component displays an animated error message overlay
 * @component
 * @param {Object} props
 * @param {string} props.message - The error message to display
 * @returns {JSX.Element} Animated error toast with message and icon
 */
const ErrorToast = ({ message }: { message: string; }): JSX.Element => {
  /**
   * Adds and removes body class for toast visibility management
   * Handles document body class on mount/unmount for overlay effects
   */
  useEffect(() => {
    document.body.classList.add('error-toast-active');

    return () => {
      document.body.classList.remove('error-toast-active');
    };
  }, []);

  return (
    <>
      {/* Semi-transparent background overlay */}
      <div className="overlay"></div>

      {/* Animated toast container with slide and fade effects */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="error-toast"
      >
        <AlertCircle className="icon" />
        <p className="message">{message}</p>
      </motion.div>
    </>
  );
};

export default ErrorToast;