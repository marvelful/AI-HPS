'use client';
import React from 'react';
import Link from 'next/link';
import { BarChart2, Sparkles, Shield, Users, Activity, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const features = [
  {
    id: 'f1',
    icon: BarChart2,
    iconColor: '#004A8F',
    iconBg: '#E8F0FA',
    title: 'Procedure Management',
    description: 'Version-controlled, approval-gated procedures across all departments with full audit trails.',
    span: 'col-span-1',
  },
  {
    id: 'f2',
    icon: Sparkles,
    iconColor: '#5B21B6',
    iconBg: '#EDE9FE',
    title: 'Multi-Agent AI',
    description: '6 specialized LangGraph agents powered by Groq LLaMA 70B — retrieval, classification, navigation, procedure, emergency, and output.',
    span: 'col-span-1 sm:col-span-2',
  },
  {
    id: 'f3',
    icon: Shield,
    iconColor: '#2E7D32',
    iconBg: '#E8F5E9',
    title: 'Audit & Compliance',
    description: 'HMAC-verified append-only audit trails for every action taken in the system.',
    span: 'col-span-1',
  },
  {
    id: 'f4',
    icon: Users,
    iconColor: '#E8620A',
    iconBg: '#FEF0E6',
    title: 'Role-Based Access',
    description: '13 role types from super admin to nurse with fine-grained permission control per department.',
    span: 'col-span-1',
  },
  {
    id: 'f5',
    icon: Activity,
    iconColor: '#5B21B6',
    iconBg: '#EDE9FE',
    title: 'Live AI Monitoring',
    description: 'Real-time confidence scores, agent status, throughput metrics, and activity feeds.',
    span: 'col-span-1',
  },
  {
    id: 'f6',
    icon: AlertTriangle,
    iconColor: '#E65100',
    iconBg: '#FFF3E0',
    title: 'Content Gap Analytics',
    description: 'Identify unanswered queries and expand your knowledge base with targeted procedure creation.',
    span: 'col-span-1',
  },
];

const stats = [
  { value: '142', label: 'Active Procedures' },
  { value: '6', label: 'AI Agents' },
  { value: '847', label: 'Daily Queries' },
  { value: '99%', label: 'Emergency Accuracy' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold" style={{ fontSize: '18px' }}>
            <span style={{ color: '#E8620A' }}>AI</span>
            <span style={{ color: '#004A8F' }}>-HPS</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden sm:block" style={{ fontSize: '13px' }}>Hôpital Général de Douala</span>
            <Link
              href="/staff-login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-all active:scale-[0.97]"
              style={{ fontSize: '13px' }}
            >
              Sign In <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-12">
        {/* Left */}
        <div className="flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light border border-primary/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-semibold" style={{ fontSize: '12px' }}>Now live at HGD Douala</span>
          </div>
          <h1 className="font-bold text-foreground leading-tight mb-4" style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: '1.15' }}>
            Clinical knowledge,<br />
            <span style={{ color: '#004A8F' }}>AI-powered</span>,<br />
            always available.
          </h1>
          <p className="text-muted-foreground mb-8" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            HGD Douala's next-generation procedure management and AI assistant platform — built for clinical staff, grounded in safety.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/staff-login"
              className="flex items-center gap-2 px-6 py-3 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-all active:scale-[0.97] shadow-card-md"
              style={{ fontSize: '15px' }}
            >
              Sign In to Portal <ArrowRight size={15} />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3 rounded-sm border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              style={{ fontSize: '15px' }}
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Right — Dashboard mockup */}
        <div className="flex-shrink-0 w-full lg:w-[440px]">
          <div className="rounded-lg shadow-card-lg overflow-hidden border border-border">
            {/* Mockup topbar */}
            <div className="h-10 flex items-center px-4 gap-2" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #004A8F 100%)' }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              </div>
              <span className="text-white/70 ml-2 font-mono" style={{ fontSize: '11px' }}>ai-hps.hgd-douala.cm/dashboard</span>
            </div>
            {/* Mockup content */}
            <div className="bg-background p-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Procedures', value: '142', color: '#004A8F' },
                  { label: 'AI Queries', value: '847', color: '#5B21B6' },
                  { label: 'Alerts', value: '3', color: '#C62828' },
                ]?.map((kpi) => (
                  <div key={kpi?.label} className="bg-card rounded p-2.5 border-l-2" style={{ borderLeftColor: kpi?.color }}>
                    <p className="text-muted-foreground" style={{ fontSize: '9px' }}>{kpi?.label}</p>
                    <p className="font-bold text-foreground" style={{ fontSize: '18px', color: kpi?.color }}>{kpi?.value}</p>
                  </div>
                ))}
              </div>
              {/* Mini table */}
              <div className="bg-card rounded border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-surface-alt">
                  <span className="font-semibold text-foreground" style={{ fontSize: '11px' }}>Recent Procedures</span>
                </div>
                {['Central Venous Line', 'Sepsis Protocol', 'Blood Pressure Guide']?.map((proc, i) => (
                  <div key={proc} className={`flex items-center justify-between px-3 py-1.5 ${i < 2 ? 'border-b border-border' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i === 0 ? '#C62828' : i === 1 ? '#E65100' : '#2E7D32' }} />
                      <span style={{ fontSize: '10px' }}>{proc}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-white" style={{ fontSize: '8px', backgroundColor: i === 1 ? '#E65100' : '#2E7D32' }}>
                      {i === 1 ? 'Pending' : 'Published'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Stats */}
      <section className="border-y border-border bg-surface-alt py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats?.map((stat) => (
            <div key={stat?.label} className="text-center">
              <p className="font-bold text-primary" style={{ fontSize: '32px' }}>{stat?.value}</p>
              <p className="text-muted-foreground mt-1" style={{ fontSize: '13px' }}>{stat?.label}</p>
            </div>
          ))}
        </div>
      </section>
      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-bold text-foreground mb-3" style={{ fontSize: '32px' }}>Built for clinical environments</h2>
          <p className="text-muted-foreground max-w-xl mx-auto" style={{ fontSize: '16px' }}>
            Every feature designed with patient safety and clinical workflow in mind.
          </p>
        </div>

        {/* Bento grid — varied sizes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features?.map((feat) => {
            const Icon = feat?.icon;
            return (
              <div
                key={feat?.id}
                className={`${feat?.span} bg-card rounded-md shadow-card p-6 hover:shadow-card-md transition-shadow border border-border`}
              >
                <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4" style={{ backgroundColor: feat?.iconBg }}>
                  <Icon size={20} style={{ color: feat?.iconColor }} />
                </div>
                <h3 className="font-semibold text-foreground mb-2" style={{ fontSize: '16px' }}>{feat?.title}</h3>
                <p className="text-muted-foreground" style={{ fontSize: '14px', lineHeight: '1.5' }}>{feat?.description}</p>
              </div>
            );
          })}
        </div>
      </section>
      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-lg p-10 text-center" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #004A8F 100%)' }}>
          <h2 className="font-bold text-white mb-3" style={{ fontSize: '28px' }}>Ready to get started?</h2>
          <p className="text-white/70 mb-6" style={{ fontSize: '15px' }}>Sign in with your staff credentials to access the clinical portal.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/staff-login"
              className="flex items-center gap-2 px-6 py-3 rounded-sm bg-white text-primary font-semibold hover:bg-white/90 transition-all active:scale-[0.97]"
              style={{ fontSize: '14px' }}
            >
              Staff Sign In <ArrowRight size={14} />
            </Link>
            <div className="flex items-center gap-2 text-white/70" style={{ fontSize: '13px' }}>
              <CheckCircle size={14} className="text-white/50" />
              Authorized personnel only
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>
            AI-HPS · Hôpital Général de Douala · Douala, Cameroon
          </p>
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Built with clinical safety in mind.</p>
        </div>
      </footer>
    </div>
  );
}
