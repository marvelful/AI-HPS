import React from 'react';
import Image from 'next/image';
import StaffLoginForm from './components/StaffLoginForm';
import { CheckCircle } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#004A8F' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <AppLogo size={36} className="brightness-0 invert" />
          <div>
            <p className="text-white font-bold" style={{ fontSize: '22px' }}>
              <span style={{ color: '#E8620A' }}>AI</span>-HPS
            </p>
            <p className="text-white/60" style={{ fontSize: '12px' }}>Hôpital Général de Douala</p>
          </div>
        </div>

        {/* Center content */}
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-white font-bold leading-tight mb-3" style={{ fontSize: '36px', lineHeight: 1.2 }}>
              Clinical knowledge,<br />AI-powered,<br />always available.
            </p>
            <p className="text-white/70 italic" style={{ fontSize: '16px' }}>
              "Clinical intelligence, delivered safely."
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              'Multi-agent AI assistant (Stream A & B)',
              'Procedure approval workflows',
              'HMAC-verified audit trails',
              'Role-based access control',
              'Real-time AI monitoring',
              'Analytics & content gap analysis',
            ]?.map((feature) => (
              <div key={`feat-${feature}`} className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-white/70 flex-shrink-0" />
                <span className="text-white/90" style={{ fontSize: '14px' }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="text-white/10 text-center" style={{ fontSize: '11px' }}>
          AI-HPS v2.4.1 · HGD Douala, Cameroon
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full border border-white/5" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full border border-white/5" />
      </div>
      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-sm my-auto py-6">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <AppLogo size={32} />
            <span className="font-bold text-primary" style={{ fontSize: '20px' }}>
              <span style={{ color: '#E8620A' }}>AI</span>-HPS
            </span>
          </div>

          {/* Hospital image */}
          <div className="mb-5 w-full rounded-xl overflow-hidden" style={{ height: 200 }}>
            <Image
              src="/assets/images/HGD.jpeg"
              width={1451}
              height={676}
              alt="Hôpital Général de Douala"
              className="w-full h-full object-cover object-top"
              quality={100}
              priority
            />
          </div>

          <div className="text-center mb-6">
            <h1 className="font-bold text-foreground mb-1.5" style={{ fontSize: '24px' }}>Staff Sign In</h1>
            <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Internal portal — authorized personnel only</p>
          </div>

          <StaffLoginForm />
        </div>
      </div>
    </div>
  );
}