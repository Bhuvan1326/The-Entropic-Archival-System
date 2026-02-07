import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SemanticScores {
  relevance: number;
  uniqueness: number;
  reconstructability: number;
  semanticScore: number;
  reasoning: string;
  summary?: string;
}

export function useAIScoring() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const analyzeItem = useCallback(async (
    itemId: string,
    title: string,
    content: string | null,
    itemType: string,
    tags: string[],
    generateSummary = false
  ): Promise<SemanticScores | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-semantic', {
        body: { itemId, title, content, itemType, tags, generateSummary },
      });

      if (error) {
        console.error('AI scoring error:', error);
        return null;
      }

      return data.scores as SemanticScores;
    } catch (error) {
      console.error('AI scoring failed:', error);
      return null;
    }
  }, [user]);

  const generateDegradedContent = useCallback(async (
    itemId: string,
    title: string,
    content: string,
    targetStage: 'SUMMARIZED' | 'MINIMAL'
  ): Promise<{ summary?: string; minimalJson?: object } | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { itemId, title, content, targetStage },
      });

      if (error) {
        console.error('Summary generation error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Summary generation failed:', error);
      return null;
    }
  }, [user]);

  const batchAnalyzeItems = useCallback(async (
    items: Array<{ id: string; title: string; content: string | null; item_type: string; tags: string[] }>
  ) => {
    if (!user || items.length === 0) return;

    setLoading(true);
    let successCount = 0;

    for (const item of items) {
      try {
        const scores = await analyzeItem(item.id, item.title, item.content, item.item_type, item.tags || []);
        
        if (scores) {
          await supabase
            .from('archive_items')
            .update({
              val_relevance: scores.relevance,
              val_uniqueness: scores.uniqueness,
              val_reconstructability: scores.reconstructability,
              semantic_score: scores.semanticScore,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          successCount++;
        }
      } catch (error) {
        console.error(`Failed to analyze item ${item.id}:`, error);
      }
    }

    setLoading(false);
    toast.success(`AI scored ${successCount} of ${items.length} items`);
    return successCount;
  }, [user, analyzeItem]);

  return {
    loading,
    analyzeItem,
    generateDegradedContent,
    batchAnalyzeItems,
  };
}
