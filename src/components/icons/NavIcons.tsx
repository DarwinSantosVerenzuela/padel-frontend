import React from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

/**
 * Soft rounded home icon — no pointed roof, all curves.
 * A cozy rounded house with an arch door.
 */
export function SoftHomeIcon({
  size = 24,
  strokeWidth = 1.5,
  className,
  color = 'currentColor',
}: IconProps) {
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
      {/* House body — rounded rect */}
      <rect x="4" y="10" width="16" height="11" rx="3" ry="3" />
      {/* Roof — smooth curve instead of pointed triangle */}
      <path d="M3 11.5C3 11.5 7 4 12 4s9 7.5 9 7.5" />
      {/* Door — soft arch */}
      <path d="M10 21v-5a2 2 0 1 1 4 0v5" />
    </svg>
  );
}

/**
 * Soft location icon — rounded bubble, no sharp pin point.
 * Like a soft drop with a dot inside.
 */
export function SoftLocationIcon({
  size = 24,
  strokeWidth = 1.5,
  className,
  color = 'currentColor',
}: IconProps) {
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
      {/* Rounded location bubble — soft teardrop with no sharp point */}
      <path d="M12 22c0 0-7-5.75-7-11a7 7 0 1 1 14 0c0 5.25-7 11-7 11z" />
      {/* Inner dot */}
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

/**
 * Soft shopping bag — fully rounded, no sharp corners.
 * Oval body with curved handles.
 */
export function SoftShopIcon({
  size = 24,
  strokeWidth = 1.5,
  className,
  color = 'currentColor',
}: IconProps) {
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
      {/* Bag body — very rounded */}
      <path d="M5 9h14l-1.2 9.6a2 2 0 0 1-2 1.4H8.2a2 2 0 0 1-2-1.4L5 9z" />
      {/* Rounded top rim */}
      <path d="M4.5 9a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1" />
      {/* Handles — soft curves */}
      <path d="M9 8V6a3 3 0 1 1 6 0v2" />
    </svg>
  );
}
