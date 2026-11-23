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

function parseJsonText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

function findGroupPayload(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6) return null;
  const parsed = parseJsonText(value);
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findGroupPayload(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const object = record(parsed);
  if (!object) return null;
  if ('groupName' in object || 'inviteLink' in object || 'invite_url' in object || 'title' in object) return object;
  for (const key of ['group', 'responseBody', 'body', 'data', 'result', 'output', 'response']) {
    if (key in object) {
      const found = findGroupPayload(object[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function httpsUrl(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} ausente na resposta da Qualify`);
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label} inválida na resposta da Qualify`); }
  if (url.protocol !== 'https:') throw new Error(`${label} inválida na resposta da Qualify`);
  return url.toString();
}

export function normalizeQualifyResponse(value: unknown): QualifyResult {
  const parsed = parseJsonText(value);
  const envelope = record(parsed);
  if (!envelope && !Array.isArray(parsed)) throw new Error('A Qualify não retornou um objeto JSON');

  const body = parseJsonText(envelope?.responseBody ?? envelope?.body ?? parsed);
  const bodyRecord = record(body);
  const statusCode = typeof envelope?.statusCode === 'number' ? envelope.statusCode :
    typeof bodyRecord?.statusCode === 'number' ? bodyRecord.statusCode : undefined;
  if (statusCode === 202 || envelope?.status === 'pending' || bodyRecord?.status === 'pending') return { status: 'pending' };
  if (statusCode && statusCode >= 400) {
    throw new Error(typeof bodyRecord?.message === 'string' ? bodyRecord.message :
      typeof bodyRecord?.error === 'string' ? bodyRecord.error : `A Qualify retornou status ${statusCode}`);
  }

  const source = findGroupPayload(parsed);
  if (!source) throw new Error('A Qualify não retornou os dados do grupo');
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
