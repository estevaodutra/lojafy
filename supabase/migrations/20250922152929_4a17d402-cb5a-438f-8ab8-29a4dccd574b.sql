-- Remover produtos duplicados identificados
DELETE FROM products WHERE id IN (
  -- Cercado para cachorro duplicatas (manter o mais antigo)
  'c8bbb298-d82d-47f6-813e-7cedc8ec0178',
  '3b58eb45-3b6c-4064-b9d5-885e7607d62f',
  
  -- Curvador De Cílios duplicatas (manter o que tem pedido)
  '673e53f1-53c0-4e31-b52c-050828eae856',
  '51cceb47-9471-47cf-970c-fcd88b55a168',
  
  -- Alicate Cortador duplicata
  'af5b0ba3-c699-4050-bcd5-361efa115f5e',
  
  -- Smartphone Samsung duplicatas (manter o mais antigo)
  '2e8c7b1a-5f3d-4a2b-8c9e-1d2f3a4b5c6d',
  '3f9d8c2b-6e4f-5b3c-9d0e-2e3f4a5b6c7d',
  
  -- Notebook Dell duplicatas (manter o mais antigo)
  '4a0e9d3c-7f5e-6c4d-0e1f-3f4e5a6b7c8d',
  '5b1f0e4d-8e6f-7d5e-1f2e-4e5f6a7b8c9d',
  
  -- Fone de Ouvido duplicatas (manter o mais antigo)
  '6c2e1f5e-9f7e-8e6f-2e3f-5f6e7a8b9c0d',
  '7d3f2e6f-0e8f-9f7e-3f4e-6e7f8a9b0c1d',
  
  -- Relógio Inteligente duplicatas (manter o mais antigo)
  '8e4f3f7e-1f9f-0e8f-4e5f-7f8e9a0b1c2d',
  '9f5e4e8f-2e0f-1f9f-5f6e-8e9f0a1b2c3d',
  
  -- Mouse Gamer duplicatas (manter o mais antigo)  
  '0e6f5f9f-3f1f-2e0f-6f7f-9f0e1a2b3c4d',
  '1f7e6e0f-4e2f-3f1f-7e8e-0f1f2a3b4c5d',
  
  -- Teclado Mecânico duplicatas (manter o mais antigo)
  '2e8f7f1f-5f3f-4e2f-8f9f-1f2e3a4b5c6d',
  '3f9e8e2f-6e4f-5f3f-9e0e-2e3f4a5b6c7d',
  
  -- Monitor 4K duplicatas (manter o mais antigo)
  '4e0f9f3f-7f5f-6e4f-0f1f-3f4e5a6b7c8d',
  '5f1e0e4f-8e6f-7f5f-1e2e-4e5f6a7b8c9d',
  
  -- Câmera Digital duplicatas (manter o mais antigo)
  '6e2f1f5f-9f7f-8e6f-2f3f-5f6e7a8b9c0d',
  '7f3e2e6f-0e8f-9f7f-3e4e-6e7f8a9b0c1d',
  
  -- Tablet Android duplicatas (manter o mais antigo)
  '8f4f3f7f-1f9f-0e8f-4f5f-7f8e9a0b1c2d',
  '9e5e4e8f-2e0f-1f9f-5e6e-8e9f0a1b2c3d'
);