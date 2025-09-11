// CPF validation and formatting utilities

export const formatCPF = (value: string): string => {
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 11 digits
  const limitedNumbers = numbers.substring(0, 11);
  
  // Apply CPF mask
  return limitedNumbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const validateCPF = (cpf: string): boolean => {
  // Remove formatting
  const numbers = cpf.replace(/\D/g, '');
  
  // Check if it has 11 digits
  if (numbers.length !== 11) return false;
  
  // Check if all digits are the same
  if (numbers.split('').every(digit => digit === numbers[0])) return false;
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit1 = ((sum * 10) % 11) % 10;
  
  if (digit1 !== parseInt(numbers[9])) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  let digit2 = ((sum * 10) % 11) % 10;
  
  if (digit2 !== parseInt(numbers[10])) return false;
  
  return true;
};

export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};