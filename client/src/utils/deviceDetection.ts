/**
 * Detects if the current device is a Raspberry Pi
 * @returns {boolean} True if running on Raspberry Pi, false otherwise
 * 
 * Note: Detection is based on user agent which the Ansible role's browser launcher sets
 *
 */
export const isRaspberryPi = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('terminal-slide-show');
};