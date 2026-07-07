import React from 'react';
import BottomNav from './BottomNav';

interface MobileShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function MobileShell({ children, hideNav = false }: MobileShellProps) {
  return (
    <div className="mobile-container">
      <main
        className="w-full"
        style={{ paddingBottom: hideNav ? 0 : '80px' }}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}