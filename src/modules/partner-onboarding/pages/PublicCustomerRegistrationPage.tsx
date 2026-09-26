/**
 * /register/customer — the public customer registration form (no login).
 * SAP Portal's /register.
 */
import { RegistrationForm } from '../components/RegistrationForm';

export default function PublicCustomerRegistrationPage() {
  return <RegistrationForm family="customer" />;
}
