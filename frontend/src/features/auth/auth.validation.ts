export interface FormValues {
  name: string;
  email: string;
  password: string;
}

export function validateAuth(values: FormValues, mode: 'login' | 'register') {
  const errors: Record<string, string[]> = {};
  const nameLength = Array.from(values.name.trim()).length;
  const passwordLength = Array.from(values.password).length;
  const email = values.email.trim();
  if (mode === 'register' && (nameLength < 2 || nameLength > 80))
    errors.name = ['Ad 2–80 karakter arasında olmalıdır.'];
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = [
      'Geçerli bir e-posta adresi girin (en fazla 254 karakter).',
    ];
  if (passwordLength < 8 || passwordLength > 128)
    errors.password = ['Şifre 8–128 karakter arasında olmalıdır.'];
  return errors;
}
