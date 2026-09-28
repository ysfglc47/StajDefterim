export function validateTextFields(values: {
  title: string;
  description: string;
}) {
  const errors: Record<string, string[]> = {};
  const titleLength = Array.from(values.title.trim()).length;
  if (!titleLength || titleLength > 120)
    errors.title = ['Başlık 1–120 karakter arasında olmalıdır.'];
  if (Array.from(values.description).length > 2000)
    errors.description = ['Açıklama en fazla 2000 karakter olabilir.'];
  return errors;
}
