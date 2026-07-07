import React from 'react';
import MobileShell from '@/components/MobileShell';
import LoginForm from './components/LoginForm';

export default function LoginPage() {
  return (
    <MobileShell hideNav>
      <LoginForm />
    </MobileShell>
  );
}