'use client';
import React from 'react';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

export default function AppointmentCard() {
  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary-light)' }}
          >
            <Calendar size={16} color="var(--primary)" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Prochain Rendez-vous
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          Confirmé
        </span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-foreground font-bold text-base">Cardiologie</h3>
          <p className="text-muted-foreground text-sm mt-0.5">Dr. Amina Fofana</p>

          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <Clock size={13} color="var(--muted-foreground)" />
              <span className="text-xs text-muted-foreground font-medium">Mar 7 Jul — 9:30</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} color="var(--muted-foreground)" />
              <span className="text-xs text-muted-foreground font-medium">Étage 2, Aile B</span>
            </div>
          </div>
        </div>

        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95"
          style={{ background: 'var(--primary-light)' }}
          aria-label="Voir détails"
        >
          <ChevronRight size={16} color="var(--primary)" />
        </button>
      </div>

      <div
        className="mt-3 pt-3 border-t flex items-center gap-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--muted)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: '68%', background: 'var(--primary)' }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">3 jours</span>
      </div>
    </div>
  );
}