'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #004A8F 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full opacity-5 border-[40px] border-white" />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full opacity-5 border-[30px] border-white" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="font-bold text-white" style={{ fontSize: '32px' }}>
                <span style={{ color: '#E8620A' }}>AI</span>-HPS
              </span>
            </div>
            <p className="text-white/70" style={{ fontSize: '14px' }}>Hôpital Général de Douala</p>
          </div>
          <p className="text-white italic mb-10" style={{ fontSize: '18px' }}>"Clinical intelligence, delivered safely."</p>
          <div className="flex flex-col gap-3 text-left w-full">
            {[
              'Multi-agent AI assistant (Stream A & B)',
              'Procedure approval workflows',
              'HMAC-verified audit trails',
              'Role-based access control',
              'Real-time AI monitoring',
              'Analytics & content gap analysis',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white" style={{ fontSize: '9px' }}>✓</span>
                </div>
                <span className="text-white/90" style={{ fontSize: '14px' }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="font-bold" style={{ fontSize: '28px', color: '#004A8F' }}>
              <span style={{ color: '#E8620A' }}>AI</span>-HPS
            </span>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-clinical-green-bg flex items-center justify-center">
                <CheckCircle size={36} className="text-clinical-green" />
              </div>
              <div>
                <h2 className="font-bold text-foreground" style={{ fontSize: '22px' }}>Check your email</h2>
                <p className="text-muted-foreground mt-2" style={{ fontSize: '14px' }}>
                  A reset link was sent to{' '}
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '13px' }}>
                Didn't receive it? Check your spam folder or contact IT support.
              </p>
              <Link
                href="/staff-login"
                className="flex items-center gap-2 text-primary hover:text-primary-hover font-medium transition-colors mt-2"
                style={{ fontSize: '14px' }}
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-bold text-foreground" style={{ fontSize: '24px' }}>Reset Password</h1>
                <p className="text-muted-foreground mt-1.5" style={{ fontSize: '13px' }}>
                  Enter your staff email to receive a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.name@hgd-douala.cm"
                      required
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                      style={{ fontSize: '14px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-2.5 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ fontSize: '14px', height: '44px' }}
                >
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>

                <div className="text-center">
                  <Link
                    href="/staff-login"
                    className="flex items-center justify-center gap-1.5 text-primary hover:text-primary-hover font-medium transition-colors"
                    style={{ fontSize: '13px' }}
                  >
                    <ArrowLeft size={13} />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
