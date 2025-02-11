/**
 * @description Animated server icon showing two stacked server units with status indicators and connecting lines
 * Features pulsing animations on the top server and dashed connection line
 * @returns {JSX.Element} Animated server SVG icon
 */
export const Server = () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 140">
            <rect x="5" y="15" width="70" height="25" rx="8"
                  fill="transparent"
                  stroke="#fff"
                  strokeWidth="3">
                  <animate attributeName="opacity"
                        values="1;0.4;1"
                        dur="2s"
                        repeatCount="indefinite" />
            </rect>
            <circle cx="20" cy="27" r="3.5" fill="#fff">
                  <animate attributeName="fill-opacity"
                        values="1;0.4;1"
                        dur="2s"
                        repeatCount="indefinite" />
            </circle>
            <line x1="40" y1="40" x2="40" y2="55"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeDasharray="4,4">
                  <animate attributeName="stroke-dashoffset"
                        values="0;8"
                        dur="1s"
                        repeatCount="indefinite" />
            </line>

            <rect x="5" y="55" width="70" height="25" rx="8"
                  fill="transparent"
                  stroke="#fff"
                  strokeWidth="3" />
            <circle cx="20" cy="67" r="3.5" fill="#fff" />

            <circle cx="65" cy="27" r="2.5" fill="#4ade80" />
            <circle cx="65" cy="67" r="2.5" fill="#4ade80" />

            <line x1="32" y1="27" x2="52" y2="27"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round" />
            <line x1="32" y1="67" x2="52" y2="67"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round" />
      </svg>
);
