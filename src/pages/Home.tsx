import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <div className="relative min-h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 inset-x-0 h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-200/50 blur-[120px] mix-blend-multiply" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-sky-200/40 blur-[120px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center grow px-6 py-20 text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-indigo-100 shadow-sm backdrop-blur-md mb-8">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-sm font-medium text-indigo-900">Version 1.0</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
          Explore your dream Floor Plan <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            in minutes.
          </span>
        </h1>

        <p className="mt-4 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          An advanced floor plan generator using intelligent optimization algorithms. Simply define
          your land boundaries, configure your room requirements, and explore optimized initial
          sketch layouts as the algorithm works.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
          <Link
            to="/canvas"
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 w-full sm:w-auto"
          >
            <span>Open Workspace</span>
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left" id="features">
          <div className="bg-white/60 backdrop-blur-lg border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Smart Boundaries</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Define your land shape and setback requirements. The system computes buildable areas
              to generate layouts that work within your constraints.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-lg border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 text-purple-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Algorithmic Generation</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Our algorithm intelligently explores different room arrangements based on your
              requirements, considering factors like light exposure, flow, and structural
              feasibility.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-lg border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4 text-sky-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Real-Time Exploration</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              See floor plan options rendered as the algorithm explores layouts. Adjust your
              requirements and generate new sketch variations that fit your constraints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
