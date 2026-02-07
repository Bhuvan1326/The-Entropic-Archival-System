import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface CapacityData {
  year: number;
  capacity: number;
  storage: number;
}

export function CapacityTimelineChart() {
  const { user } = useAuth();
  const [data, setData] = useState<CapacityData[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: events } = await supabase
        .from('decay_events')
        .select('simulated_year, capacity_after_kb, storage_after_kb')
        .eq('owner_id', user.id)
        .order('simulated_year', { ascending: true });

      if (events) {
        // Start with initial data point
        const { data: settings } = await supabase
          .from('simulation_settings')
          .select('start_capacity_kb')
          .eq('owner_id', user.id)
          .maybeSingle();

        const startCapacity = settings?.start_capacity_kb || 1000000;

        const chartData: CapacityData[] = [
          { year: 0, capacity: 100, storage: 0 },
          ...events.map((e) => ({
            year: e.simulated_year,
            capacity: Math.round((e.capacity_after_kb / startCapacity) * 100),
            storage: Math.round((e.storage_after_kb / startCapacity) * 100),
          })),
        ];

        setData(chartData);
      }
    };

    fetchData();

    const channel = supabase
      .channel('decay_events_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'decay_events' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <Card className="terminal-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Capacity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="capacityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(175, 72%, 46%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(175, 72%, 46%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="year" 
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(217, 33%, 18%)' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 8%)',
                  border: '1px solid hsl(217, 33%, 18%)',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: 'hsl(210, 40%, 92%)' }}
                formatter={(value: number) => [`${value}%`]}
              />
              <Area
                type="monotone"
                dataKey="capacity"
                stroke="hsl(175, 72%, 46%)"
                fill="url(#capacityGradient)"
                strokeWidth={2}
                name="Capacity"
              />
              <Area
                type="monotone"
                dataKey="storage"
                stroke="hsl(38, 92%, 50%)"
                fill="url(#storageGradient)"
                strokeWidth={2}
                name="Storage Used"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Capacity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-muted-foreground">Storage Used</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
