import { describe, expect, it } from 'vitest';
import { normalizeQualifyResponse } from '../../../supabase/functions/onboarding-test-qualify/qualifyResponse';

describe('resposta de criação de grupo da Qualify', () => {
  const sample = {
    statusCode: 200,
    responseBody: {
      photoUrl: 'https://qualify-supabase.d2x.site/storage/v1/object/public/sequence-media/foto.jpg',
      groupName: 'SUPORTE VIP | Estevão Dutra',
      inviteLink: 'https://chat.whatsapp.com/CBZERICFgdNCQ6mtj1WlWk',
    },
  };

  it('aceita a resposta real sem ID nem descrição', () => {
    expect(normalizeQualifyResponse(sample)).toEqual({
      status: 'ready',
      group: {
        id: '',
        title: sample.responseBody.groupName,
        description: '',
        photo_url: sample.responseBody.photoUrl,
        invite_url: sample.responseBody.inviteLink,
      },
    });
  });

  it('aceita responseBody serializado e foto ausente', () => {
    expect(normalizeQualifyResponse({
      statusCode: 200,
      responseBody: JSON.stringify({ groupName: 'Grupo teste', inviteLink: 'https://chat.whatsapp.com/teste' }),
    })).toMatchObject({ status: 'ready', group: { title: 'Grupo teste', photo_url: '' } });
  });

  it('aceita a resposta inteira serializada como texto', () => {
    expect(normalizeQualifyResponse(JSON.stringify(sample))).toMatchObject({
      status: 'ready',
      group: { title: sample.responseBody.groupName },
    });
  });

  it('encontra o grupo dentro de envelopes adicionais', () => {
    expect(normalizeQualifyResponse({
      statusCode: 200,
      responseBody: { data: [{ body: { responseBody: sample.responseBody } }] },
    })).toMatchObject({ status: 'ready', group: { title: sample.responseBody.groupName } });
  });

  it('não mostra convite inválido como sucesso', () => {
    expect(() => normalizeQualifyResponse({
      statusCode: 200,
      responseBody: { groupName: 'Grupo teste', inviteLink: 'http://inseguro.example' },
    })).toThrow('URL de convite inválida');
  });

  it('mantém o estado pendente', () => {
    expect(normalizeQualifyResponse({ statusCode: 202, responseBody: {} })).toEqual({ status: 'pending' });
  });
});
