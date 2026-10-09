import React, { useId } from 'react';

interface FolderIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: string | number;
}

/**
 * Premium monochrome folder mark: dark back plate with tab, lighter front
 * plate with a top sheen. Uses currentColor throughout so it follows the
 * app accent in any theme.
 */
export const FolderIcon: React.FC<FolderIconProps> = ({ size = 56, className, style }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sheenId = `pv-folder-sheen-${uid}`;
  const shadeId = `pv-folder-shade-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {/* Back plate with tab */}
      <path
        d="M10 12h15.5l4.5 6H54a5 5 0 0 1 5 5v20a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5Z"
        fill="currentColor"
        opacity="0.34"
      />
      {/* Front plate */}
      <rect x="5" y="25" width="54" height="25" rx="6" fill="currentColor" opacity="0.94" />
      <rect x="5" y="25" width="54" height="25" rx="6" fill={`url(#${sheenId})`} />
      <rect x="5" y="25" width="54" height="25" rx="6" fill={`url(#${shadeId})`} />
      {/* Top edge highlight */}
      <rect x="9" y="26.5" width="46" height="1.6" rx="0.8" fill="#ffffff" opacity="0.35" />
    </svg>
  );
};
