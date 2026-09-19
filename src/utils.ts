export const normalizePhone = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
};

export const isValidPhone = (phone: string) => /^\d{11,12}$/.test(phone);

export const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
