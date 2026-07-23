import type { Metadata } from 'next';
import { LoginPage } from '../../../modules/login/components/login-page';

export const metadata: Metadata = {
  title: 'Login to Kinetic HRMS',
  description: 'Login to your Kinetic HRMS account',
};

export default function LoginPageRoute() {
  return <LoginPage />;
}
