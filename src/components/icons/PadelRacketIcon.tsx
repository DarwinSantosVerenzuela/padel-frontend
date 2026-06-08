import React from 'react';

interface PadelRacketIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

/**
 * Minimal padel racket icon with rounded, soft design.
 * Matches the smooth aesthetic of modern nav bars.
 */
export default function PadelRacketIcon({
  size = 24,
  strokeWidth = 1.6,
  className,
  color = 'currentColor',
}: PadelRacketIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Racket head — soft rounded pill shape */}
      <ellipse cx="12" cy="8.5" rx="5.5" ry="6.5" />
      {/* Handle — smooth rounded line */}
      <path d="M12 15v6" />
      {/* Handle grip — subtle detail */}
      <path d="M10.5 18.5h3" />
      {/* Holes — soft small dots */}
      <circle cx="10.5" cy="7" r="0.8" fill={color} stroke="none" />
      <circle cx="13.5" cy="7" r="0.8" fill={color} stroke="none" />
      <circle cx="12" cy="10" r="0.8" fill={color} stroke="none" />
    </svg>
  );
}
