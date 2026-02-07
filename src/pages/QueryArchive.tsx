import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StageBadge } from '@/components/archive/StageBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, AlertCircle, CheckCircle, Info, Loader2, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DegradationStage, UncertaintyLevel } from '@/types/archive';

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
  stage: string;
  semantic_score: number;
  similarity: number;
}

interface QueryResult {
  query: string;
  response: string;
  uncertainty: UncertaintyLevel;
  usedDegradedData: boolean;
  searchMethod: 'semantic' | 'keyword';
  sources: {
    id: string;
    title: string;
    stage: DegradationStage;
    score: number;
    similarity?: number;
  }[];
}

export default function QueryArchive() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !query.trim()) return;

    setLoading(true);

    try {
      let searchResults: SearchResult[] = [];
      let searchMethod: 'semantic' | 'keyword' = 'keyword';

      // Try semantic search first if enabled
      if (useSemanticSearch) {
        try {
          const { data, error } = await supabase.functions.invoke('semantic-search', {
            body: { query, matchCount: 5, threshold: 0.3 },
          });

          if (!error && data?.results?.length > 0) {
            searchResults = data.results;
            searchMethod = data.method || 'semantic';
          }
        } catch (err) {
          console.log('Semantic search failed, falling back to keyword search');
        }
      }

      // Fall back to keyword search
      if (searchResults.length === 0) {
        const { data: items } = await supabase
          .from('archive_items')
          .select('id, title, content, summary, stage, semantic_score')
          .eq('owner_id', user.id)
          .neq('stage', 'DELETED')
          .order('semantic_score', { ascending: false })
          .limit(10);

        if (items) {
          const queryWords = query.toLowerCase().split(' ');
          searchResults = items
            .map((item) => {
              const titleMatch = queryWords.filter(w => item.title.toLowerCase().includes(w)).length;
              const contentMatch = queryWords.filter(w => 
                (item.content?.toLowerCase() || '').includes(w) ||
                (item.summary?.toLowerCase() || '').includes(w)
              ).length;
              return {
                ...item,
                similarity: (titleMatch * 3 + contentMatch) / (queryWords.length * 4),
              };
            })
            .filter(item => item.similarity > 0)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);
          searchMethod = 'keyword';
        }
      }

      // Determine uncertainty based on data quality
      const usedDegraded = searchResults.some(item => item.stage !== 'FULL');
      let uncertainty: UncertaintyLevel = 'LOW';
      
      if (searchResults.length === 0) {
        uncertainty = 'HIGH';
      } else if (usedDegraded || searchMethod === 'keyword') {
        uncertainty = 'MEDIUM';
      } else if (searchResults[0]?.similarity && searchResults[0].similarity > 0.7) {
        uncertainty = 'LOW';
      }

      // Generate response
      let response = '';
      if (searchResults.length === 0) {
        response = `No relevant information found for query: "${query}". Items may have been deleted or degraded.`;
        uncertainty = 'HIGH';
      } else {
        const topItem = searchResults[0];
        const contentSource = topItem.stage === 'SUMMARIZED' ? topItem.summary : topItem.content;
        const similarityNote = topItem.similarity ? ` (${(topItem.similarity * 100).toFixed(0)}% match)` : '';
        
        response = `Found ${searchResults.length} relevant item${searchResults.length > 1 ? 's' : ''} using ${searchMethod} search${similarityNote}.\n\n`;
        response += `**${topItem.title}** (${topItem.stage} stage, score: ${topItem.semantic_score?.toFixed(1)})\n\n`;
        
        if (contentSource) {
          response += `"${contentSource.slice(0, 400)}${contentSource.length > 400 ? '...' : ''}"`;
        }
        
        if (usedDegraded) {
          response += '\n\n⚠️ Some results are from degraded items with reduced fidelity.';
        }
      }

      const queryResult: QueryResult = {
        query,
        response,
        uncertainty,
        usedDegradedData: usedDegraded,
        searchMethod,
        sources: searchResults.map(item => ({
          id: item.id,
          title: item.title,
          stage: item.stage as DegradationStage,
          score: item.semantic_score || 0,
          similarity: item.similarity,
        })),
      };

      setResult(queryResult);
      setHistory(prev => [queryResult, ...prev.slice(0, 9)]);

      // Log the query
      await supabase.from('query_logs').insert({
        owner_id: user.id,
        query,
        response,
        uncertainty,
        used_degraded_data: usedDegraded,
        sources_used: searchResults.map(i => ({ id: i.id, title: i.title, similarity: i.similarity })),
      });

    } catch (error) {
      console.error('Query error:', error);
      toast.error('Failed to process query');
    }

    setLoading(false);
  };

  const uncertaintyConfig = {
    LOW: { color: 'text-stage-full', bg: 'bg-stage-full/10', icon: CheckCircle, label: 'High Confidence' },
    MEDIUM: { color: 'text-stage-summarized', bg: 'bg-stage-summarized/10', icon: Info, label: 'Medium Confidence' },
    HIGH: { color: 'text-stage-deleted', bg: 'bg-stage-deleted/10', icon: AlertCircle, label: 'Low Confidence' },
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-glow">Query Archive</h1>
          <p className="text-muted-foreground">Search your archive with semantic understanding</p>
        </div>

        {/* Query Input */}
        <Card className="terminal-card-glow">
          <CardContent className="p-6">
            <form onSubmit={handleQuery} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your archived data..."
                  className="pl-12 py-6 text-lg"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="semantic-search"
                      checked={useSemanticSearch}
                      onCheckedChange={setUseSemanticSearch}
                    />
                    <Label htmlFor="semantic-search" className="text-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Semantic Search
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {useSemanticSearch ? 'Using vector similarity' : 'Using keyword matching'}
                  </p>
                </div>
                <Button type="submit" disabled={loading || !query.trim()} className="gap-2">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className="terminal-card animate-fade-up">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Query Result</CardTitle>
                  <Badge variant="outline" className="text-xs gap-1">
                    {result.searchMethod === 'semantic' ? (
                      <><Sparkles className="w-3 h-3" /> Semantic</>
                    ) : (
                      <><Zap className="w-3 h-3" /> Keyword</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {result.usedDegradedData && (
                    <Badge variant="outline" className="text-stage-summarized border-stage-summarized/40">
                      Uses Degraded Data
                    </Badge>
                  )}
                  {(() => {
                    const config = uncertaintyConfig[result.uncertainty];
                    const Icon = config.icon;
                    return (
                      <Badge className={cn('gap-1', config.bg, config.color)}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              <CardDescription className="font-mono">"{result.query}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="whitespace-pre-wrap">{result.response}</p>
              </div>

              {/* Sources with similarity scores */}
              {result.sources.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sources Used</h4>
                  <div className="space-y-2">
                    {result.sources.map((source) => (
                      <div 
                        key={source.id}
                        className="flex items-center justify-between p-2 bg-muted/20 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <StageBadge stage={source.stage} size="sm" showLabel={false} />
                          <span className="text-sm truncate">{source.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          {source.similarity !== undefined && (
                            <span className="text-primary">
                              {(source.similarity * 100).toFixed(0)}% match
                            </span>
                          )}
                          <span>Score: {source.score.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Query History */}
        {history.length > 1 && (
          <Card className="terminal-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.slice(1).map((h, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-md cursor-pointer transition-colors"
                    onClick={() => {
                      setQuery(h.query);
                      setResult(h);
                    }}
                  >
                    <span className="text-sm truncate flex-1">{h.query}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {h.searchMethod}
                      </Badge>
                      {(() => {
                        const config = uncertaintyConfig[h.uncertainty];
                        const Icon = config.icon;
                        return <Icon className={cn('w-4 h-4', config.color)} />;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
