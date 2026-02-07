import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DegradationStage, STAGE_ORDER, STAGE_COLORS, STAGE_LABELS } from '@/types/archive';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

interface StageData {
  stage: DegradationStage;
  count: number;
  size: number;
}

export function StageDistributionChart() {
  const { user } = useAuth();
  const [data, setData] = useState<StageData[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: items } = await supabase
        .from('archive_items')
        .select('stage, current_size_kb')
        .eq('owner_id', user.id);

      if (items) {
        const stageCounts: Record<DegradationStage, { count: number; size: number }> = {
          FULL: { count: 0, size: 0 },
          COMPRESSED: { count: 0, size: 0 },
          SUMMARIZED: { count: 0, size: 0 },
          MINIMAL: { count: 0, size: 0 },
          DELETED: { count: 0, size: 0 },
        };

        items.forEach((item) => {
          const stage = item.stage as DegradationStage;
          stageCounts[stage].count++;
          stageCounts[stage].size += item.current_size_kb || 0;
        });

        const chartData = STAGE_ORDER.map((stage) => ({
          stage,
          count: stageCounts[stage].count,
          size: stageCounts[stage].size,
        }));

        setData(chartData);
      }
    };

    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel('archive_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_items' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const totalItems = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="terminal-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Items by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="stage"
                tickFormatter={(value) => STAGE_LABELS[value as DegradationStage]}
                width={80}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 8%)',
                  border: '1px solid hsl(217, 33%, 18%)',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: 'hsl(210, 40%, 92%)' }}
                formatter={(value: number, name: string) => [
                  name === 'count' ? `${value} items` : `${value.toLocaleString()} KB`,
                  name === 'count' ? 'Count' : 'Size'
                ]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center">
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-mono font-medium text-foreground">{totalItems}</span> items
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
