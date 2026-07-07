'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, WifiOff } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { pipelineApi } from '@/lib/api';

const AGENTS = [
  { id: 'agent-R', letter: 'R', name: 'Retrieval Agent', role: 'Query classification & language detection', gradient: 'linear-gradient(135deg, #004A8F, #0062B8)' },
  { id: 'agent-C', letter: 'C', name: 'Classification Agent', role: 'Intent routing & department matching', gradient: 'linear-gradient(135deg, #0891B2, #0E7490)' },
  { id: 'agent-P', letter: 'P', name: 'Procedure Agent', role: 'Procedure retrieval & step generation', gradient: 'linear-gradient(135deg, #5B21B6, #7C3AED)' },
  { id: 'agent-E', letter: 'E', name: 'Emergency Agent', role: 'Emergency detection & escalation', gradient: 'linear-gradient(135deg, #C62828, #E53935)' },
  { id: 'agent-O', letter: 'O', name: 'Output Agent', role: 'Response formatting & multi-channel output', gradient: 'linear-gradient(135deg, #E8620A, #F47D2C)' },
];

export default function DashboardAIStatus() {
  const { data: health, isError } = useQuery({
    queryKey: ['pipeline-health'],
    queryFn: () => pipelineApi.health(),
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
  });

  const isOnline = !isError && health?.status === 'ok';

  return (
    <div className="bg-card rounded-md shadow-card border border-border">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Sparkles size={18} className="text-ai-purple" />
        <h2 className="font-semibold text-foreground" style={{ fontSize: '15px' }}>AI System Status</h2>
        <div className="flex items-center gap-1.5 ml-auto">
          {isOnline ? (
            <>
              <div className="w-2 h-2 rounded-full bg-clinical-green live-dot" />
              <span className="text-clinical-green font-medium" style={{ fontSize: '12px' }}>Online · v{health?.version ?? '—'}</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-clinical-red" />
              <span className="text-clinical-red font-medium" style={{ fontSize: '12px' }}>Offline</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 p-5">
        {AGENTS.map((agent) => (
          <div key={agent.id} className="bg-surface-alt rounded-md p-3.5 flex flex-col gap-2.5 hover:shadow-card-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: agent.gradient, fontSize: '14px' }}>
                {agent.letter}
              </div>
              <Badge variant={isOnline ? 'active' : 'degraded'}>
                {isOnline ? 'Active' : 'Offline'}
              </Badge>
            </div>
            <div>
              <p className="font-semibold text-foreground" style={{ fontSize: '13px' }}>{agent.name}</p>
              <p className="text-muted-foreground leading-snug mt-0.5" style={{ fontSize: '11px' }}>{agent.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
