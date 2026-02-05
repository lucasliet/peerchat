import React, { useState } from 'react';
import { Users, LogIn, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';

interface LandingProps {
  onCreate: () => void;
  onJoin: (code: string) => void;
  status: string;
  error: string | null;
}

const Landing: React.FC<LandingProps> = ({ onCreate, onJoin, status, error }) => {
  const [code, setCode] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4) {
      onJoin(code);
    }
  };

  const isBusy = status === 'connecting' || status === 'generating_code';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 py-8 md:py-4 bg-gray-900 text-white overflow-y-auto">
      <div className="w-full max-w-md space-y-6 md:space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 mb-2 md:mb-4 shadow-lg shadow-emerald-500/20">
            <Logo className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            PeerChat
          </h1>
          <p className="text-gray-400 text-base md:text-lg">
            Serverless, private, ephemeral.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 md:mt-8">
          {/* Join Room Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 transition-all hover:border-gray-600">
            <div className="flex items-center space-x-3 mb-4">
              <LogIn className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold">Join a Room</h2>
            </div>
            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div>
                <label htmlFor="room-code" className="sr-only">Room Code</label>
                <input
                  id="room-code"
                  type="text"
                  maxLength={4}
                  placeholder="Enter 4-digit code"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder-gray-500 text-center text-lg tracking-widest font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  disabled={isBusy}
                />
              </div>
              <button
                type="submit"
                disabled={code.length !== 4 || isBusy}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {status === 'connecting' ? <span>Connecting...</span> : <span>Join Room</span>}
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-500">or</span>
            </div>
          </div>

          {/* Create Room Card */}
          <button
            onClick={onCreate}
            disabled={isBusy}
            className="w-full group bg-gray-800/30 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50 rounded-2xl p-6 transition-all text-left flex items-center justify-between"
          >
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold group-hover:text-blue-400 transition-colors">Host a Room</h2>
              </div>
              <p className="text-gray-400 text-sm">Generate a code and invite others.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors shadow-lg">
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
            </div>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center animate-in fade-in slide-in-from-bottom-2">
            {error}
          </div>
        )}
      </div>
      
      <div className="fixed bottom-4 text-center text-xs text-gray-600">
        <p>Powered by PeerJS • End-to-End Client Side</p>
      </div>
    </div>
  );
};

export default Landing;