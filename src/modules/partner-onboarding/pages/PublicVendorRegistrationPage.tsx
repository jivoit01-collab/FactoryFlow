/**
 * /register/vendor — the public vendor registration form (no login).
 * SAP Portal's /vendor-register.
 */
import { RegistrationForm } from '../components/RegistrationForm';

export default function PublicVendorRegistrationPage() {
  return <RegistrationForm family="vendor" />;
}
