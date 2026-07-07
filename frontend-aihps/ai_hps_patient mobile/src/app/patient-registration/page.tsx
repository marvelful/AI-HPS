import React from 'react';
import MobileShell from '@/components/MobileShell';
import RegistrationFlow from './components/RegistrationFlow';

export default function PatientRegistrationPage() {
  return (
    <MobileShell hideNav>
      <RegistrationFlow />
    </MobileShell>
  );
}