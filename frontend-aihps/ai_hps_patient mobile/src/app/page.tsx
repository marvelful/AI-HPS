'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, MessageSquare, Globe, BookOpen, Phone, Mail, Clock, Menu, X, Cross } from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Hospital Navigation',
    subtitle: 'Navigation hospitalière',
    desc: 'Find any department, ward, or service within HGD instantly. Step-by-step directions from any point in the hospital.',
  },
  {
    icon: MessageSquare,
    title: 'AI-Powered Assistance',
    subtitle: 'Assistance intelligente',
    desc: 'Ask any question about procedures, waiting times, required documents, or hospital services and receive clear, accurate answers.',
  },
  {
    icon: Globe,
    title: 'Bilingual Support',
    subtitle: 'Support bilingue',
    desc: 'Fully available in English and French. Switch languages at any time. Guidance that respects your preference.',
  },
  {
    icon: BookOpen,
    title: 'Hospital Information',
    subtitle: 'Informations hospitalières',
    desc: 'Access department hours, contact numbers, admission requirements, emergency protocols, and pharmacy information.',
  },
];

const contacts = [
  { icon: Phone, label: 'Emergency (24/7)', values: ['(+237) 233 500 101', '(+237) 699 871 424'] },
  { icon: Mail, label: 'Email', values: ['hgd@hgd.cm'] },
  { icon: Clock, label: 'Emergency Services', values: ['24 hours / 7 days'] },
  { icon: MapPin, label: 'Location', values: ['Douala, Cameroon'] },
];

const departments = [
  ['Blood Bank', 'Transfusion Medicine'],
  ['Infection Care Unit', 'Infectious Diseases'],
  ['Infection Control Department', 'Hospital Hygiene'],
  ['Maternity', 'Gynécologie & Obstétrique'],
  ['Surgery', 'Bloc Opératoire'],
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-screen-xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Cross size={28} className="text-primary flex-shrink-0" strokeWidth={2} />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-foreground tracking-tight">AI-HPS</span>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-2">
            <Link href="/sign-in" className="border border-primary text-primary font-semibold rounded-xl px-5 py-2 text-sm hover:bg-primary-light transition-all">Sign In</Link>
            <Link href="/sign-up" className="btn-primary text-sm px-5 py-2.5 w-auto">Get Started</Link>
          </nav>
          <div className="sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border bg-background px-5 py-4 flex flex-row gap-2 justify-center">
            <Link href="/sign-in" className="border border-primary text-primary font-semibold rounded-xl px-5 py-2 text-sm hover:bg-primary-light transition-all" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            <Link href="/sign-up" className="btn-primary text-sm py-2 px-5 w-auto" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-5 pt-16 pb-14 max-w-screen-xl mx-auto">
          <div className="max-w-lg mx-auto sm:max-w-2xl text-center fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">Hôpital Général de Douala</span>
            </div>
            <h1 className="text-[2.25rem] sm:text-5xl font-bold text-foreground leading-[1.15] tracking-tight mb-5">
              Your intelligent guide<br />
              <span className="text-primary">inside the hospital</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-10 max-w-md mx-auto">
              Navigate HGD with confidence. Ask questions in English or French, find departments instantly, and receive personalized guidance — powered by AI.
            </p>
            <div className="flex flex-row gap-3 justify-center items-center">
              <Link href="/sign-up" className="btn-primary px-8 py-3.5 text-base w-auto">Get Started</Link>
              <Link href="/sign-in" className="border border-primary text-primary font-semibold rounded-xl px-8 py-3.5 text-base bg-white hover:bg-primary-light transition-all active:scale-95">Sign In</Link>
            </div>
            <p className="mt-8 text-xs text-muted-foreground">Free for all HGD patients · Available in English &amp; Français</p>
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-14 border-t border-border">
          <div className="max-w-screen-xl mx-auto">
            <p className="section-label text-center mb-3">What AI-HPS does</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10 tracking-tight">
              Everything you need during your visit
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:max-w-4xl lg:grid-cols-4">
              {features.map(({ icon: Icon, title, subtitle, desc }) => (
                <div key={title} className="card-base flex flex-col gap-4 p-5 hover:shadow-md transition-shadow duration-200">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-primary" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-auto">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About HGD */}
        <section className="px-5 py-14 border-t border-border" style={{ background: '#F8FAFF' }}>
          <div className="max-w-screen-xl mx-auto">
            <div className="max-w-2xl mx-auto lg:max-w-4xl">
              <div className="mb-10">
                <p className="section-label mb-3">About HGD</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-3">
                  Hôpital Général de Douala
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                  Category 1 hospital in Central Africa, serving patients for over 35 years.{' '}
                  <em className="not-italic text-foreground/70">
                    &ldquo;L&apos;Hôpital Général de Douala à l&apos;écoute du patient.&rdquo;
                  </em>
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-base flex flex-col gap-5 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Contact &amp; Hours</h3>
                  <div className="flex flex-col gap-4">
                    {contacts.map(({ icon: Icon, label, values }) => (
                      <div key={label} className="flex items-start gap-3">
                        <Icon size={15} className="text-primary mt-0.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                          {values.map(v => (
                            <p key={v} className="text-sm font-medium text-foreground">{v}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-base flex flex-col gap-5 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Key Departments</h3>
                  <div className="flex flex-col gap-2.5">
                    {departments.map(([dept, div]) => (
                      <div key={dept} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                        <span className="text-sm text-foreground">{dept}</span>
                        <span className="text-xs text-muted-foreground text-right max-w-[120px] leading-tight">{div}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
