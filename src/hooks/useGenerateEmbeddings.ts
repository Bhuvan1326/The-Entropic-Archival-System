import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGenerateEmbeddings() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const generateEmbeddingsForItems = useCallback(async (ownerId: string) => {
    setIsGenerating(true);
    setProgress({ current: 0, total: 0 });

    try {
      // Get items without embeddings
      const { data: items, error } = await supabase
        .from('archive_items')
        .select('id, title, content, tags, summary, stage')
        .eq('owner_id', ownerId)
        .is('embedding', null)
        .limit(100);

      if (error) throw error;

      if (!items || items.length === 0) {
        toast.info('All items already have embeddings');
        setIsGenerating(false);
        return { success: true, processed: 0 };
      }

      setProgress({ current: 0, total: items.length });

      let processed = 0;
      let failed = 0;

      for (const item of items) {
        try {
          // Create text for embedding based on stage
          let textForEmbedding = item.title || '';
          
          if (item.stage === 'FULL' || item.stage === 'COMPRESSED') {
            textForEmbedding += ' ' + (item.content || '');
          } else if (item.summary) {
            textForEmbedding += ' ' + item.summary;
          }
          
          if (item.tags && item.tags.length > 0) {
            textForEmbedding += ' ' + item.tags.join(' ');
          }

          // Generate embedding via edge function
          const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
            'generate-embedding',
            { body: { text: textForEmbedding.slice(0, 2000) } }
          );

          if (embeddingError || !embeddingData?.embedding) {
            console.error('Failed to generate embedding for', item.id, embeddingError);
            failed++;
            continue;
          }

          // Update item with embedding
          const { error: updateError } = await supabase
            .from('archive_items')
            .update({ embedding: embeddingData.embedding })
            .eq('id', item.id);

          if (updateError) {
            console.error('Failed to update embedding for', item.id, updateError);
            failed++;
          } else {
            processed++;
          }
        } catch (e) {
          console.error('Error processing item', item.id, e);
          failed++;
        }

        setProgress({ current: processed + failed, total: items.length });
      }

      if (processed > 0) {
        toast.success(`Generated embeddings for ${processed} items`);
      }
      if (failed > 0) {
        toast.warning(`Failed to generate embeddings for ${failed} items`);
      }

      return { success: true, processed, failed };
    } catch (error) {
      console.error('Error generating embeddings:', error);
      toast.error('Failed to generate embeddings');
      return { success: false, processed: 0, failed: 0 };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateEmbeddingsForItems,
    isGenerating,
    progress,
  };
}
