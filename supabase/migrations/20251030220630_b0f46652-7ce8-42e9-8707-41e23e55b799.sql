-- Atualizar keywords de escalação no ai_support_config
UPDATE ai_support_config
SET escalation_keywords = ARRAY[
  'não sei', 'preciso falar com humano', 'urgente', 'reclamação',
  'quero falar com', 'falar com atendente', 'falar com alguém',
  'preciso de ajuda humana', 'transferir para humano',
  'não está resolvendo', 'não me ajudou', 'não entendeu',
  'isso não funciona', 'continua com problema',
  'é urgente', 'preciso agora', 'estou esperando há dias',
  'quero meu dinheiro de volta', 'reembolso', 'estorno', 'devolução',
  'desisto', 'isso não adianta', 'já tentei', 'não resolve'
];
