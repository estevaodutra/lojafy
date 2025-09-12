export interface CepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export const formatCep = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) {
    return numbers;
  }
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

export const validateCep = (cep: string): boolean => {
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8 && /^\d{8}$/.test(cleanCep);
};

export const fetchAddressByCep = async (cep: string): Promise<CepResponse> => {
  const cleanCep = cep.replace(/\D/g, '');
  
  if (!validateCep(cleanCep)) {
    throw new Error('CEP inválido');
  }

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar CEP');
  }

  const data: CepResponse = await response.json();
  
  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  return data;
};