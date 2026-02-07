import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Plus, FileJson, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { ItemType } from '@/types/archive';
import { useGenerateEmbeddings } from '@/hooks/useGenerateEmbeddings';

const ITEM_TYPES: ItemType[] = ['article', 'research', 'document', 'image', 'video'];

interface ItemForm {
  title: string;
  content: string;
  item_type: ItemType;
  source_url: string;
  tags: string;
  original_date: string;
  size_kb: string;
}

const initialForm: ItemForm = {
  title: '',
  content: '',
  item_type: 'article',
  source_url: '',
  tags: '',
  original_date: '',
  size_kb: '',
};

export default function IngestData() {
  const { user } = useAuth();
  const [form, setForm] = useState<ItemForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const { generateEmbeddingsForItems, isGenerating, progress } = useGenerateEmbeddings();

  const calculateSemanticScore = (item: Partial<ItemForm>) => {
    // Simple heuristic-based scoring
    const relevance = Math.random() * 30 + 50; // 50-80
    const uniqueness = Math.random() * 40 + 40; // 40-80
    const reconstructability = item.item_type === 'article' || item.item_type === 'research' 
      ? Math.random() * 30 + 60 // Text content is more reconstructable
      : Math.random() * 30 + 30; // Media is less reconstructable
    
    return {
      val_relevance: Math.round(relevance * 100) / 100,
      val_uniqueness: Math.round(uniqueness * 100) / 100,
      val_reconstructability: Math.round(reconstructability * 100) / 100,
      semantic_score: Math.round((relevance * 0.4 + uniqueness * 0.35 + reconstructability * 0.25) * 100) / 100,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const sizeKb = parseInt(form.size_kb) || Math.floor(Math.random() * 500) + 50;
    const scores = calculateSemanticScore(form);

    const { error } = await supabase.from('archive_items').insert({
      owner_id: user.id,
      title: form.title,
      content: form.content,
      item_type: form.item_type,
      source_url: form.source_url || null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
      original_date: form.original_date || null,
      size_kb: sizeKb,
      current_size_kb: sizeKb,
      ...scores,
    });

    if (error) {
      toast.error('Failed to ingest item: ' + error.message);
    } else {
      toast.success('Item ingested successfully');
      setForm(initialForm);
    }

    setLoading(false);
  };

  const handleBulkUpload = async () => {
    if (!user || !bulkJson.trim()) return;

    setBulkLoading(true);

    try {
      const items = JSON.parse(bulkJson);
      
      if (!Array.isArray(items)) {
        toast.error('JSON must be an array of items');
        setBulkLoading(false);
        return;
      }

      const processedItems = items.map((item: Record<string, unknown>) => {
        const sizeKb = (item.size_kb as number) || Math.floor(Math.random() * 500) + 50;
        const scores = calculateSemanticScore(item as Partial<ItemForm>);

        return {
          owner_id: user.id,
          title: item.title as string,
          content: (item.content as string) || null,
          item_type: (item.item_type as ItemType) || 'article',
          source_url: (item.source_url as string) || null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          original_date: (item.original_date as string) || null,
          size_kb: sizeKb,
          current_size_kb: sizeKb,
          ...scores,
        };
      });

      const { error } = await supabase.from('archive_items').insert(processedItems);

      if (error) {
        toast.error('Failed to ingest items: ' + error.message);
      } else {
        toast.success(`Successfully ingested ${processedItems.length} items`);
        setBulkJson('');
      }
    } catch (e) {
      toast.error('Invalid JSON format');
    }

    setBulkLoading(false);
  };

  const generateSeedData = async () => {
    if (!user) return;

    setBulkLoading(true);

    const types: ItemType[] = ['article', 'research', 'document', 'image', 'video'];
    const topics = [
      'Climate Change', 'Artificial Intelligence', 'Quantum Computing', 'Space Exploration',
      'Renewable Energy', 'Biotechnology', 'Cybersecurity', 'Machine Learning',
      'Blockchain', 'Nanotechnology', 'Robotics', 'Genetics', 'Virtual Reality',
      'Autonomous Vehicles', 'Internet of Things', 'Data Science', 'Neural Networks',
      'Cloud Computing', 'Edge Computing', 'Digital Transformation'
    ];

    const seedItems = Array.from({ length: 200 }, (_, i) => {
      const type = types[Math.floor(Math.random() * types.length)];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const sizeKb = Math.floor(Math.random() * 800) + 100;
      const scores = calculateSemanticScore({ item_type: type });

      return {
        owner_id: user.id,
        title: `${topic} ${type.charAt(0).toUpperCase() + type.slice(1)} #${i + 1}`,
        content: `This is sample content about ${topic}. It contains important information that may be valuable for future reference and research purposes. The content explores various aspects and implications of ${topic} in modern context.`,
        item_type: type,
        source_url: `https://example.com/${topic.toLowerCase().replace(/\s/g, '-')}/${i + 1}`,
        tags: [topic.toLowerCase(), type, 'seed-data'],
        original_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 5).toISOString(),
        size_kb: sizeKb,
        current_size_kb: sizeKb,
        ...scores,
      };
    });

    const { error } = await supabase.from('archive_items').insert(seedItems);

    if (error) {
      toast.error('Failed to generate seed data: ' + error.message);
    } else {
      toast.success('Successfully generated 200 seed items');
    }

    setBulkLoading(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-glow">Ingest Data</h1>
          <p className="text-muted-foreground">Add new items to your archive</p>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList>
            <TabsTrigger value="single" className="gap-2">
              <Plus className="w-4 h-4" />
              Single Item
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-6">
            <Card className="terminal-card">
              <CardHeader>
                <CardTitle className="text-lg">Add New Item</CardTitle>
                <CardDescription>
                  Enter the details of the item you want to archive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Enter item title"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Type *</Label>
                      <Select
                        value={form.item_type}
                        onValueChange={(value) => setForm({ ...form, item_type: value as ItemType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="Enter item content..."
                        rows={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="source_url">Source URL</Label>
                      <Input
                        id="source_url"
                        type="url"
                        value={form.source_url}
                        onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="size_kb">Size (KB)</Label>
                      <Input
                        id="size_kb"
                        type="number"
                        value={form.size_kb}
                        onChange={(e) => setForm({ ...form, size_kb: e.target.value })}
                        placeholder="Auto-generated if empty"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={form.tags}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder="ai, research, important"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="original_date">Original Date</Label>
                      <Input
                        id="original_date"
                        type="date"
                        value={form.original_date}
                        onChange={(e) => setForm({ ...form, original_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add to Archive
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="terminal-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileJson className="w-5 h-5" />
                    JSON Upload
                  </CardTitle>
                  <CardDescription>
                    Paste JSON array of items to bulk import
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={bulkJson}
                    onChange={(e) => setBulkJson(e.target.value)}
                    placeholder={`[
  {
    "title": "Item Title",
    "content": "Item content...",
    "item_type": "article",
    "tags": ["tag1", "tag2"],
    "size_kb": 100
  }
]`}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <Button 
                    onClick={handleBulkUpload} 
                    disabled={bulkLoading || !bulkJson.trim()}
                    className="gap-2"
                  >
                    {bulkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Items
                  </Button>
                </CardContent>
              </Card>

              <Card className="terminal-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-stage-full" />
                    Generate Seed Data
                  </CardTitle>
                  <CardDescription>
                    Automatically generate 200 sample items for testing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-4">
                      This will generate 200 diverse items including:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Articles, research papers, documents</li>
                      <li>• Images and video references</li>
                      <li>• Various topics: AI, Climate, Tech, Science</li>
                      <li>• Randomized semantic scores</li>
                      <li>• Varying file sizes (100-900 KB)</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={generateSeedData}
                    disabled={bulkLoading}
                    variant="outline"
                    className="gap-2 w-full"
                  >
                    {bulkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Generate 200 Seed Items
                  </Button>
                </CardContent>
              </Card>

              <Card className="terminal-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Generate Embeddings
                  </CardTitle>
                  <CardDescription>
                    Generate vector embeddings for semantic search
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-4">
                      This will generate embeddings for items that don't have them:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Uses AI to create semantic vectors</li>
                      <li>• Enables similarity search in Query Archive</li>
                      <li>• Works with degraded items using summaries</li>
                      <li>• Processes up to 100 items at a time</li>
                    </ul>
                  </div>
                  {isGenerating && (
                    <div className="space-y-2">
                      <Progress value={(progress.current / progress.total) * 100} />
                      <p className="text-xs text-muted-foreground text-center">
                        Processing {progress.current} of {progress.total} items...
                      </p>
                    </div>
                  )}
                  <Button 
                    onClick={() => user && generateEmbeddingsForItems(user.id)}
                    disabled={isGenerating || !user}
                    variant="outline"
                    className="gap-2 w-full"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate Embeddings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
