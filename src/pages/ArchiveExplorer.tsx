import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/archive/StageBadge';
import { ItemHistoryTimeline } from '@/components/archive/ItemHistoryTimeline';
import { supabase } from '@/integrations/supabase/client';
import { ArchiveItem, DegradationStage, ItemType, STAGE_ORDER } from '@/types/archive';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  FileText,
  Image,
  Video,
  BookOpen,
  File,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const TYPE_ICONS: Record<ItemType, typeof FileText> = {
  article: FileText,
  research: BookOpen,
  document: File,
  image: Image,
  video: Video,
};

export default function ArchiveExplorer() {
  const { user } = useAuth();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'semantic_score' | 'ingested_at' | 'current_size_kb'>('semantic_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('archive_items')
        .select('*')
        .eq('owner_id', user.id)
        .order(sortField, { ascending: sortDir === 'asc' });

      if (!error && data) {
        setItems(data as ArchiveItem[]);
      }
      setLoading(false);
    };

    fetchItems();

    const channel = supabase
      .channel('explorer_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sortField, sortDir]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search || 
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      const matchesStage = stageFilter === 'all' || item.stage === stageFilter;
      const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
      return matchesSearch && matchesStage && matchesType;
    });
  }, [items, search, stageFilter, typeFilter]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const formatSize = (kb: number) => {
    if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-glow">Archive Explorer</h1>
          <p className="text-muted-foreground">Browse and search your archived items with full history</p>
        </div>

        {/* Filters */}
        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or tags..."
                  className="pl-10"
                />
              </div>

              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGE_ORDER.map((stage) => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 border border-border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort('semantic_score')}
                  className={cn(sortField === 'semantic_score' && 'bg-muted')}
                >
                  Score
                  {sortField === 'semantic_score' && (
                    sortDir === 'desc' ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort('current_size_kb')}
                  className={cn(sortField === 'current_size_kb' && 'bg-muted')}
                >
                  Size
                  {sortField === 'current_size_kb' && (
                    sortDir === 'desc' ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort('ingested_at')}
                  className={cn(sortField === 'ingested_at' && 'bg-muted')}
                >
                  Date
                  {sortField === 'ingested_at' && (
                    sortDir === 'desc' ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filteredItems.length} items found</span>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const TypeIcon = TYPE_ICONS[item.item_type];
            const isExpanded = expandedId === item.id;

            return (
              <Card 
                key={item.id} 
                className={cn(
                  "terminal-card transition-all duration-200",
                  isExpanded && "ring-1 ring-primary/30"
                )}
              >
                <CardContent className="p-4">
                  <div 
                    className="flex items-start gap-4 cursor-pointer"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : item.id);
                      setShowHistoryFor(null);
                    }}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <TypeIcon className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium truncate">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <StageBadge stage={item.stage as DegradationStage} size="sm" />
                            <span className="text-xs text-muted-foreground capitalize">{item.item_type}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground font-mono">{formatSize(item.current_size_kb)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-mono font-medium text-primary">
                            {item.semantic_score?.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.slice(0, 5).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" size="icon" className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-up">
                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant={showHistoryFor === item.id ? "secondary" : "outline"} 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHistoryFor(showHistoryFor === item.id ? null : item.id);
                          }}
                          className="gap-1"
                        >
                          <History className="w-3 h-3" />
                          View History
                        </Button>
                      </div>

                      {/* Item History Timeline */}
                      {showHistoryFor === item.id && (
                        <ItemHistoryTimeline itemId={item.id} itemTitle={item.title} />
                      )}

                      {/* Semantic Scores */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Semantic Valuation</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Relevance</div>
                            <div className="font-mono text-lg">{item.val_relevance?.toFixed(1)}</div>
                            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${item.val_relevance}%` }}
                              />
                            </div>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Uniqueness</div>
                            <div className="font-mono text-lg">{item.val_uniqueness?.toFixed(1)}</div>
                            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                              <div 
                                className="h-full bg-accent transition-all"
                                style={{ width: `${item.val_uniqueness}%` }}
                              />
                            </div>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Reconstructability</div>
                            <div className="font-mono text-lg">{item.val_reconstructability?.toFixed(1)}</div>
                            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                              <div 
                                className="h-full bg-stage-full transition-all"
                                style={{ width: `${item.val_reconstructability}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Original Size</div>
                          <div className="font-mono">{formatSize(item.size_kb)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Current Size</div>
                          <div className="font-mono">{formatSize(item.current_size_kb)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Ingested</div>
                          <div>{format(new Date(item.ingested_at), 'MMM d, yyyy')}</div>
                        </div>
                        {item.original_date && (
                          <div>
                            <div className="text-xs text-muted-foreground">Original Date</div>
                            <div>{format(new Date(item.original_date), 'MMM d, yyyy')}</div>
                          </div>
                        )}
                      </div>

                      {/* Content Preview */}
                      {item.content && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Content Preview</div>
                          <p className="text-sm text-foreground/80 line-clamp-3">
                            {item.stage === 'SUMMARIZED' && item.summary ? item.summary : item.content}
                          </p>
                        </div>
                      )}

                      {/* Source URL */}
                      {item.source_url && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          <a 
                            href={item.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate"
                          >
                            {item.source_url}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredItems.length === 0 && !loading && (
            <Card className="terminal-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No items found matching your criteria</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
