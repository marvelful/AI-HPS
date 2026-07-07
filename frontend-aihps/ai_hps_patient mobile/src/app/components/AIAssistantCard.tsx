'use client';
import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function AIAssistantCard() {
  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden shadow-card"
      style={{ background: 'linear-gradient(135deg, #E8620A 0%, #F47D2C 60%, #FB923C 100%)' }}
    >
      {/* Decorative blob */}
      <div
        className="absolute -top-4 -right-4 w-28 h-28 rounded-full opacity-20"
        style={{ background: 'rgba(255,255,255,0.3)' }}
      />
      <div
        className="absolute bottom-0 right-8 w-16 h-16 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.4)' }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} color="rgba(255,255,255,0.9)" />
            <span className="text-orange-100 text-xs font-semibold uppercase tracking-wider">
              AI Assistant
            </span>
          </div>
          <h2 className="text-white text-lg font-bold leading-snug">
            Une question sur votre santé?
          </h2>
          <p className="text-orange-100 text-xs mt-1">
            Disponible 24h/24 — Français &amp; English
          </p>
        </div>
        <Link
          href="/ai-assistant"
          className="flex items-center gap-1.5 bg-white text-secondary font-bold text-sm px-4 py-2.5 rounded-xl ml-3 transition-all duration-150 active:scale-95 whitespace-nowrap shadow"
        >
          Ask Now
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}