import { motion } from 'framer-motion';

import { Server } from '@/components/assets/icons';
import '@/styles/connection-Toast.css';

const ConnectionToast = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="connection-toast"
    >
      <motion.div
        animate={{
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="server-icon"
      >
        <Server />
      </motion.div>
      <span className="status-text">Connection Lost ...</span>
    </motion.div>
  );
};

export default ConnectionToast;
