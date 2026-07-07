'use client';
import React, { useState } from 'react';
import Step1Form from './Step1Form';
import Step2OTP from './Step2OTP';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

export interface RegistrationData {
  email: string;
  fullName: string;
  phone: string;
  dob: string;
  password: string;
  language: 'fr' | 'en';
}

export default function RegistrationFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<RegistrationData | null>(null);

  return (
    <div className="mobile-container min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Gradient Header */}
      <div
        className="px-5 pt-12 pb-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #004A8F 60%, #0062B8 100%)' }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E8620A, transparent)' }}
        />

        {/* Back + Logo row */}
        <div className="flex items-center gap-3 mb-6 relative">
          <Link
            href="/sign-in"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <ArrowLeft size={18} color="white" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles size={18} color="#E8620A" />
            <span className="text-white font-extrabold text-lg">AI-HPS Patient</span>
          </div>
        </div>

        <h1 className="text-white text-2xl font-extrabold relative mb-1">Create Account</h1>
        <p className="text-sm relative mb-6" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Hôpital Général de Douala
        </p>

        {/* Step Progress */}
        <div className="flex items-center gap-3 relative">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step >= 1 ? 'white' : 'rgba(255,255,255,0.2)',
                color: step >= 1 ? 'var(--primary)' : 'white',
              }}
            >
              {step > 1 ? '✓' : '1'}
            </div>
            <span className="text-white text-xs font-medium">Your Info</span>
          </div>
          <div
            className="flex-1 h-0.5 rounded-full"
            style={{ background: step > 1 ? 'white' : 'rgba(255,255,255,0.3)' }}
          />
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 2 ? 'white' : 'rgba(255,255,255,0.2)',
                color: step === 2 ? 'var(--primary)' : 'white',
              }}
            >
              2
            </div>
            <span className="text-white text-xs font-medium">Verify Email</span>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10 pb-8">
        {step === 1 ? (
          <Step1Form onNext={(data) => { setFormData(data); setStep(2); }} />
        ) : (
          <Step2OTP formData={formData!} onBack={() => setStep(1)} />
        )}
      </div>
    </div>
  );
}
