import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Play, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingConfig {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_provider: string;
  video_aspect_ratio: string;
  is_active: boolean;
  redirect_after: string;
}

export const OnboardingSettings = () => {
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoProvider, setVideoProvider] = useState('youtube');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isActive, setIsActive] = useState(false);
  const [redirectAfter, setRedirectAfter] = useState('/reseller/dashboard');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('reseller_onboarding_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setVideoUrl(data.video_url || '');
        setVideoProvider(data.video_provider);
        setAspectRatio(data.video_aspect_ratio);
        setIsActive(data.is_active);
        setRedirectAfter(data.redirect_after);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        title,
        description: description || null,
        video_url: videoUrl || null,
        video_provider: videoProvider,
        video_aspect_ratio: aspectRatio,
        is_active: isActive,
        redirect_after: redirectAfter,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase
          .from('reseller_onboarding_config')
          .update(updates)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reseller_onboarding_config')
          .insert(updates);

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Configurações do Onboarding de Revendedores
          </CardTitle>
          <CardDescription>
            Configure a página de boas-vindas que os revendedores verão no primeiro acesso.
            Esta página exibe um vídeo obrigatório antes de permitir o acesso ao painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Onboarding Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, novos revendedores verão a página de onboarding no primeiro acesso
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da Página</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bem-vindo à Lojafy!"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Assista ao vídeo de boas-vindas para conhecer a plataforma..."
              rows={3}
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">URL do Vídeo</Label>
            <Input
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              Suporta links do YouTube, Vimeo ou Google Drive
            </p>
          </div>

          {/* Video Provider */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Provedor do Vídeo</Label>
              <Select value={videoProvider} onValueChange={setVideoProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                  <SelectItem value="google_drive">Google Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label>Proporção do Vídeo</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">Horizontal (16:9)</SelectItem>
                  <SelectItem value="9:16">Vertical (9:16)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Redirect After */}
          <div className="space-y-2">
            <Label htmlFor="redirectAfter">URL de Redirecionamento</Label>
            <Input
              id="redirectAfter"
              value={redirectAfter}
              onChange={(e) => setRedirectAfter(e.target.value)}
              placeholder="/reseller/dashboard"
            />
            <p className="text-xs text-muted-foreground">
              Para onde o usuário será redirecionado após concluir o onboarding
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong>1.</strong> Configure o título, descrição e vídeo acima.
          </p>
          <p>
            <strong>2.</strong> Ative o onboarding usando o switch.
          </p>
          <p>
            <strong>3.</strong> Quando um revendedor acessar pela primeira vez (ou via link de acesso único), 
            ele verá esta página e precisará assistir o vídeo antes de continuar.
          </p>
          <p>
            <strong>4.</strong> Após assistir, o usuário é redirecionado para o painel e não verá 
            esta página novamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
