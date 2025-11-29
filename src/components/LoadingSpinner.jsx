import React from 'react';

export default function LoadingSpinner({ size = 12 }) {
  return (
    <div
      className={`w-${size} h-${size} border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto`}
    ></div>
  );
}
