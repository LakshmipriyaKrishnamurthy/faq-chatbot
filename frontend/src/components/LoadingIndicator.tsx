import React from 'react';
import { Bot } from 'lucide-react';

export const LoadingIndicator: React.FC = () => {
  return (
    <div 
      className="flex items-start gap-3 max-w-3xl mr-auto animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div 
        className="w-8 h-8 rounded-full bg-bank-100 text-bank-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-bank-200 shadow-sm"
        aria-hidden="true"
      >
        <Bot size={18} />
      </div>

      <div className="bg-white text-gray-700 border border-gray-200/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Assistant is typing</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-bank-600 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-bank-600 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-bank-600 animate-bounce"></span>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
