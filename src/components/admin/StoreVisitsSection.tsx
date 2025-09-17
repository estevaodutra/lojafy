import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DateFilter = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

// Mock visits data - in real app, this would come from analytics
const generateVisitsData = (days: number) => {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    data.push({
      date: format(date, 'dd/MM', { locale: ptBR }),
      visits: Math.floor(Math.random() * 500) + 100,
      fullDate: date
    });
  }
  
  return data;
};

export const StoreVisitsSection = () => {
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>('7days');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getVisitsData = () => {
    switch (selectedFilter) {
      case 'today':
        return generateVisitsData(1);
      case 'yesterday':
        return generateVisitsData(2).slice(0, 1);
      case '7days':
        return generateVisitsData(7);
      case '30days':
        return generateVisitsData(30);
      case 'custom':
        const diffTime = Math.abs(customDateRange.to.getTime() - customDateRange.from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return generateVisitsData(Math.min(diffDays, 90)); // Limit to 90 days
      default:
        return generateVisitsData(7);
    }
  };

  const visitsData = getVisitsData();
  const totalVisits = visitsData.reduce((sum, item) => sum + item.visits, 0);

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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};