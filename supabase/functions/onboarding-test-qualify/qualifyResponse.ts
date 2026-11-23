export type QualifyGroup = {
  id: string;
  title: string;
  description: string;
  photo_url: string;
  invite_url: string;
};

type QualifyResult = { status: 'pending' } | { status: 'ready'; group: QualifyGroup };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function httpsUrl(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} ausente na resposta da Qualify`);
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label} inválida na resposta da Qualify`); }
  if (url.protocol !== 'https:') throw new Error(`${label} inválida na resposta da Qualify`);
  return url.toString();
}

export function normalizeQualifyResponse(value: unknown): QualifyResult {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { throw new Error('A Qualify não retornou um objeto JSON'); }
  }
  const envelope = record(parsed);
  if (!envelope) throw new Error('A Qualify não retornou um objeto JSON');

  let body: unknown = envelope.responseBody ?? envelope;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { throw new Error('A Qualify retornou responseBody inválido'); }
  }
  const payload = record(body);
  if (!payload) throw new Error('A Qualify não retornou os dados do grupo');

  const statusCode = typeof envelope.statusCode === 'number' ? envelope.statusCode : undefined;
  if (statusCode === 202 || envelope.status === 'pending' || payload.status === 'pending') return { status: 'pending' };
  if (statusCode && statusCode >= 400) {
    throw new Error(typeof payload.message === 'string' ? payload.message :
      typeof payload.error === 'string' ? payload.error : `A Qualify retornou status ${statusCode}`);
  }

  const legacyGroup = record(payload.group);
  const source = legacyGroup ?? payload;
  const title = source.groupName ?? source.title;
  if (typeof title !== 'string' || !title.trim()) throw new Error('Nome do grupo ausente na resposta da Qualify');

  const inviteUrl = httpsUrl(source.inviteLink ?? source.invite_url, 'URL de convite');
  const photo = source.photoUrl ?? source.photo_url;

  return {
    status: 'ready',
    group: {
      id: typeof source.id === 'string' ? source.id : '',
      title: title.trim(),
      description: typeof source.description === 'string' ? source.description : '',
      photo_url: photo == null || photo === '' ? '' : httpsUrl(photo, 'URL da foto'),
      invite_url: inviteUrl,
    },
  };
}
