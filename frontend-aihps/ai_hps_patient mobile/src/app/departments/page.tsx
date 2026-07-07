import React from 'react';
import MobileShell from '@/components/MobileShell';
import DepartmentsScreen from './components/DepartmentsScreen';

export default function DepartmentsPage() {
  return (
    <MobileShell>
      <DepartmentsScreen />
    </MobileShell>
  );
}