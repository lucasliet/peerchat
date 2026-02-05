import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8 text-white" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor" fillOpacity="0.2"></path>
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none"></circle>
      <circle cx="15.5" cy="10" r="1.5" fill="currentColor" stroke="none"></circle>
      <line x1="10" y1="10" x2="14" y2="10"></line>
    </svg>
  );
};
