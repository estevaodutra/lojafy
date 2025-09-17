import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStoreVisits, DateFilter, DateRange } from '@/hooks/useStoreVisits';


export const StoreVisitsSection = () => {
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>('7days');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: visitsResult, isLoading } = useStoreVisits(selectedFilter, customDateRange);
  
  const visitsData = visitsResult?.data || [];
  const totalVisits = visitsResult?.total || 0;

  const handleDateRangeSelect = (range: any) => {
    if (range?.from && range?.to) {
      setCustomDateRange({ from: range.from, to: range.to });
      setSelectedFilter('custom');
      setIsCalendarOpen(false);
    }
  };

  const getFilterLabel = () => {
    switch (selectedFilter) {
      case 'today':
        return 'Hoje';
      case 'yesterday':
        return 'Ontem';
      case '7days':
        return 'Últimos 7 Dias';
      case '30days':
        return 'Últimos 30 Dias';
      case 'custom':
        return `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`;
      default:
        return 'Últimos 7 Dias';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Visitas na Loja
            </CardTitle>
            <CardDescription>
              Acompanhe o tráfego da sua loja online
            </CardDescription>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={selectedFilter === 'today' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedFilter('today')}
                className="text-xs"
              >
                Hoje
              </Button>
              <Button
                variant={selectedFilter === 'yesterday' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedFilter('yesterday')}
                className="text-xs"
              >
                Ontem
              </Button>
              <Button
                variant={selectedFilter === '7days' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedFilter('7days')}
                className="text-xs"
              >
                7 Dias
              </Button>
              <Button
                variant={selectedFilter === '30days' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedFilter('30days')}
                className="text-xs"
              >
                30 Dias
              </Button>
            </div>
            
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Personalizado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={customDateRange.from}
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Visits Counter */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {totalVisits.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm text-muted-foreground">
              Visitas em {getFilterLabel()}
            </p>
          </div>
          
          {/* Visits Chart */}
          <div className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-2 text-sm">Carregando dados de visitas...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visitsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Visitas']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};