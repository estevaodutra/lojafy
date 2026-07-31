import { describe, expect, it } from 'vitest';
import { buildCsv, csvRowsToObjects, detectDelimiter, normalizeHeader, parseCsv } from '../csv';

describe('csv', () => {
  it('detecta delimitador por frequência na primeira linha', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a;b,c;d\n')).toBe(';');
  });

  it('parseia aspas, aspas escapadas e delimitador embutido', () => {
    const rows = parseCsv('nome;desc\n"Produto ""Top"";azul";"linha1\nlinha2"');
    expect(rows).toEqual([
      ['nome', 'desc'],
      ['Produto "Top";azul', 'linha1\nlinha2'],
    ]);
  });

  it('lida com \\r\\n e ignora linhas vazias', () => {
    const rows = parseCsv('a;b\r\n1;2\r\n\r\n3;4\r\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('converte para objetos com cabeçalhos normalizados', () => {
    const objects = csvRowsToObjects(parseCsv('Preço Venda;DESCRIÇÃO\n10;abc'));
    expect(objects).toEqual([{ preco_venda: '10', descricao: 'abc' }]);
  });

  it('normalizeHeader remove acentos e espaços', () => {
    expect(normalizeHeader('Código de Rastreio')).toBe('codigo_de_rastreio');
  });

  it('buildCsv escapa o necessário e faz round-trip', () => {
    const csv = buildCsv(['a', 'b'], [['x;y', 'com "aspas"'], ['simples', null]]);
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['x;y', 'com "aspas"'],
      ['simples', ''],
    ]);
  });
});
