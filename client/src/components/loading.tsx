import { motion } from 'framer-motion';
import React from 'react';

import {Server} from '@/components/assets/icons';
import '@/styles/loading.css';
import BBLoader from '@/components/loader';

interface LoadingProps {
  isServerConnecting: boolean;
}

/**
 * Loading component that displays either a server connection or media loading animation
 * @component
 * @param {LoadingProps} props - Component properties
 * @returns {React.ReactElement} Animated loading overlay with status message
 */
const Loading: React.FC<LoadingProps> = ({ isServerConnecting }): React.ReactElement => (
  // Main container with fade in/out animation
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="loading-overlay"
  >
    <div className="loading-overlay-background" />

    {/* Animated container for loading icon */}
    <motion.div
      animate={
        isServerConnecting ? {
          // Server connecting animation: pulsing scale effect
          scale: [1, 1.15, 0.95, 1.1, 1],
        } : {
          // Media loading animation: subtle scale with glow effect
          scale: [1, 1.1, 1],
          filter: [
            "drop-shadow(0 0 0px rgba(255,255,255,0)) drop-shadow(0 0 0px rgba(0,123,255,0))",
            "drop-shadow(0 0 30px rgba(255,255,255,1)) drop-shadow(0 0 60px rgba(0,123,255,0.8))",
            "drop-shadow(0 0 20px rgba(255,255,255,0.6)) drop-shadow(0 0 40px rgba(0,123,255,0.5))",
            "drop-shadow(0 0 0px rgba(255,255,255,0)) drop-shadow(0 0 0px rgba(0,123,255,0))"
          ]
        }
      }
    >
      {isServerConnecting ? (
        // Server icon with continuous pulse and glow animation
        <motion.div
          initial={{ scale: 1 }}
          animate={{
            scale: [1, 1.05, 0.95, 1],
            filter: [
              "drop-shadow(0 0 0px rgba(255,255,255,0)) drop-shadow(0 0 0px rgba(0,123,255,0))",
              "drop-shadow(0 0 30px rgba(255,255,255,1)) drop-shadow(0 0 60px rgba(0,123,255,0.8))",
              "drop-shadow(0 0 20px rgba(255,255,255,0.6)) drop-shadow(0 0 40px rgba(0,123,255,0.5))",
              "drop-shadow(0 0 0px rgba(255,255,255,0)) drop-shadow(0 0 0px rgba(0,123,255,0))"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: 100,
            height: 100,
            transformStyle: "preserve-3d",
            transformOrigin: "center center"
          }}
        >
          <Server/>
        </motion.div>
      ) : (
        // Custom loader component for media loading state
        <BBLoader loading={true} color="#FFFFFF" size={100} />
      )}
    </motion.div>

    {/* Status message with fade and bounce animation */}
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={isServerConnecting ? {
        // Server connecting message animation
        opacity: [0.4, 1, 0.4],
        y: [0, -5, 0],
        filter: [
          "drop-shadow(0 0 0px rgba(255,255,255,0))",
          "drop-shadow(0 0 20px rgba(255,255,255,1))",
          "drop-shadow(0 0 0px rgba(255,255,255,0))"
        ]
      } : {
        // Media loading message animation
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="loading-text"
    >
      {isServerConnecting ? 'Connecting to server...' : 'Loading media...'}
    </motion.p>
  </motion.div>
);

export default Loading;