// Formata telefone para: +55 (XX) 98123-4567
export const formatPhone = (value: string): string => {
  // Remove tudo que não é dígito
  let numbers = value.replace(/\D/g, '');
  
  // Remove 55 do início se já existir (evita duplicação)
  if (numbers.startsWith('55') && numbers.length > 11) {
    numbers = numbers.substring(2);
  }
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  numbers = numbers.substring(0, 11);
  
  if (numbers.length === 0) return '';
  
  // Aplica a máscara progressivamente
  let formatted = '+55 ';
  
  if (numbers.length <= 2) {
    formatted += `(${numbers}`;
  } else if (numbers.length <= 7) {
    formatted += `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
  } else {
    formatted += `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
  }
  
  return formatted;
};

// Remove formatação para salvar apenas números
export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Valida se tem 10 ou 11 dígitos (fixo ou celular)
export const validatePhone = (phone: string): boolean => {
  const numbers = cleanPhone(phone);
  return numbers.length >= 10 && numbers.length <= 11;
};
