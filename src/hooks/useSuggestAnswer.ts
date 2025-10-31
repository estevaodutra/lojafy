import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SuggestionConfidence = 'high' | 'medium' | 'low';

export interface SuggestionResponse {
  suggestedAnswer: string;
  relatedContent?: {
    type: 'course' | 'module' | 'lesson';
    id: string;
    title: string;
  } | null;
  confidence: SuggestionConfidence;
}

export const useSuggestAnswer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestion = async (question: string, keywords: string[] = []): Promise<SuggestionResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('suggest-answer', {
        body: { question, keywords }
      });

      if (functionError) {
        throw functionError;
      }

      if (!data) {
        throw new Error('No response from suggestion service');
      }

      return data as SuggestionResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get suggestion';
      setError(errorMessage);
      console.error('Error getting suggestion:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getSuggestion,
    loading,
    error,
  };
};
