import { supabase } from '@/integrations/supabase/client';

export interface ImportProductItem {
  title: string;
  description: string;
  price: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  photo_url: string;
  photo_urls: string[];
}

export type ImportStatus = 'idle' | 'processing' | 'success' | 'error';

export interface ImportState {
  status: ImportStatus;
  progress: number;
  processed: number;
  total: number;
  errorMsg?: string;
}

type Subscriber = (state: ImportState) => void;

class BulkImportService {
  private state: ImportState = {
    status: 'idle',
    progress: 0,
    processed: 0,
    total: 0,
  };

  private subscribers = new Set<Subscriber>();
  private activePromise: Promise<void> | null = null;

  public subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb(this.state));
  }

  public getState(): ImportState {
    return this.state;
  }

  public async startImport(
    items: ImportProductItem[],
    userId: string,
    orgId: string | undefined,
    onFinished?: (insertedCount: number, errorCount: number) => void
  ): Promise<void> {
    if (this.state.status === 'processing') {
      throw new Error('Já existe uma importação em andamento.');
    }

    this.state = {
      status: 'processing',
      progress: 0,
      processed: 0,
      total: items.length,
    };
    this.notify();

    this.activePromise = (async () => {
      const batchSize = 20; // Lotes de 20 para evitar sobrecarga e ter feedback fluido de progresso
      let insertedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const payload = batch.map((item) => ({
          name: item.title,
          description: item.description,
          price: item.price,
          weight: item.weight,
          height: item.height,
          width: item.width,
          length: item.length,
          main_image_url: item.photo_url,
          image_url: item.photo_url,
          images: item.photo_urls,
          supplier_id: userId,
          supplier_organization_id: orgId,
          stage: 'stage_1_basic',
          active: false,
          approval_status: 'draft',
        }));

        try {
          const { error } = await supabase.from('products').insert(payload);
          if (error) throw error;
          insertedCount += batch.length;
        } catch (err) {
          console.error('Erro ao inserir lote de importação:', err);
          errorCount += batch.length;
        }

        this.state.processed = Math.min(i + batch.length, items.length);
        this.state.progress = Math.round((this.state.processed / this.state.total) * 100);
        this.notify();
      }

      this.state.status = errorCount === items.length ? 'error' : 'success';
      if (this.state.status === 'error') {
        this.state.errorMsg = 'Falha ao importar todos os lotes de produtos.';
      }
      this.notify();

      if (onFinished) {
        onFinished(insertedCount, errorCount);
      }

      // Voltar ao estado idle após um breve delay
      setTimeout(() => {
        this.state = {
          status: 'idle',
          progress: 0,
          processed: 0,
          total: 0,
        };
        this.notify();
      }, 5000);
    })();
  }
}

export const bulkImportService = new BulkImportService();
