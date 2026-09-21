import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, MessageSquareQuote } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans selection:bg-bank-100 selection:text-bank-800">
      {/* Top Header */}
      <header className="border-b border-gray-100 px-6 py-4 sm:px-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bank-600 text-white flex items-center justify-center shadow-sm">
              <Building2 size={22} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900 block leading-tight">XYZ Bank</span>
              <span className="text-xs uppercase tracking-wider font-semibold text-bank-600">Digital Banking</span>
            </div>
          </div>

          
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-20">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Text Content */}
          <div className="text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bank-50 border border-bank-100 text-bank-700 text-xs font-semibold tracking-wide">
              <MessageSquareQuote size={14} />
              <span>AI FAQ Assistant</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
              Banking made <span className="text-bank-600">simpler</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              Get instant answers to your questions with our AI-powered FAQ assistant.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white bg-bank-600 hover:bg-bank-700 active:bg-bank-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bank-500 focus:ring-offset-2 group"
                aria-label="Need Help? Open FAQ Assistant"
              >
                <span>Need Help?</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Simple Modern Banking / AI Illustration */}
          <div className="flex justify-center items-center">
            <div className="relative w-full max-w-md p-6">
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-bank-100 to-sky-50 rounded-3xl -rotate-2 scale-95 opacity-70 filter blur-xl"></div>
              
              {/* Clean Vector Graphic Illustration */}
              <div className="relative bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-bank-900/5">
                <svg
                  viewBox="0 0 400 320"
                  className="w-full h-auto text-bank-600"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-label="Banking and AI assistance illustration"
                >
                  {/* Decorative background grid */}
                  <circle cx="200" cy="160" r="140" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="6 6" />
                  <circle cx="200" cy="160" r="100" stroke="#e2e8f0" strokeWidth="1.5" />

                  {/* Bank Pillar Icon Graphic */}
                  <rect x="130" y="110" width="140" height="90" rx="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                  <path d="M145 110L200 80L255 110" stroke="#006cc9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="165" y1="122" x2="165" y2="168" stroke="#006cc9" strokeWidth="3" strokeLinecap="round" />
                  <line x1="200" y1="122" x2="200" y2="168" stroke="#006cc9" strokeWidth="3" strokeLinecap="round" />
                  <line x1="235" y1="122" x2="235" y2="168" stroke="#006cc9" strokeWidth="3" strokeLinecap="round" />
                  <rect x="150" y="172" width="100" height="8" rx="2" fill="#006cc9" />

                  {/* Conversational AI Chat Bubbles Floating */}
                  <g className="animate-pulse">
                    {/* User Question Bubble */}
                    <rect x="230" y="50" width="130" height="42" rx="14" fill="#006cc9" />
                    <path d="M245 92L238 98V92H245Z" fill="#006cc9" />
                    <rect x="245" y="64" width="70" height="6" rx="3" fill="#ffffff" />
                    <rect x="245" y="75" width="45" height="6" rx="3" fill="#bae0fd" />
                  </g>

                  <g>
                    {/* Assistant Response Bubble */}
                    <rect x="40" y="195" width="145" height="46" rx="14" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                    <path d="M165 241L172 247V241H165Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                    <circle cx="62" cy="218" r="10" fill="#e0effe" />
                    <path d="M59 218L61 220L65 216" stroke="#006cc9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="80" y="211" width="85" height="6" rx="3" fill="#64748b" />
                    <rect x="80" y="222" width="60" height="6" rx="3" fill="#94a3b8" />
                  </g>

                  {/* Shield / Security node */}
                  <g>
                    <circle cx="200" cy="245" r="22" fill="#f0fdf4" stroke="#86efac" strokeWidth="2" />
                    <path d="M200 235L208 238V244C208 249 204.5 253.5 200 255C195.5 253.5 192 249 192 244V238L200 235Z" fill="#16a34a" />
                  </g>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Fast, reliable answers to your policy and account queries.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
