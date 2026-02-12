import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, 
  Key, 
  Settings, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Zap,
  ScrollText,
  Plug,
  CreditCard
} from 'lucide-react';
import { apiEndpointsData } from '@/data/apiEndpointsData';

interface ApiDocsSidebarProps {
  selectedSection: string;
  onSectionChange: (sectionId: string) => void;
  expandedCategories: Set<string>;
  onCategoryToggle: (categoryId: string) => void;
}

const staticItems = [
  { id: 'intro', label: 'Introdução', icon: FileText },
  { id: 'auth', label: 'Autenticação', icon: Key },
  { id: 'keys', label: 'Chaves de API', icon: Settings },
  { id: 'webhooks', label: 'Webhooks', icon: Zap },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

const categoryIcons: Record<string, React.ElementType> = {
  catalog: Package,
  orders: ShoppingCart,
  ranking: BarChart3,
  academy: GraduationCap,
  integra: Plug,
  payments: CreditCard,
};

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'POST': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'PUT': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const ApiDocsSidebar: React.FC<ApiDocsSidebarProps> = ({
  selectedSection,
  onSectionChange,
  expandedCategories,
  onCategoryToggle,
}) => {
  return (
    <div className="bg-card border rounded-lg sticky top-6">
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="p-4 space-y-1">
          {/* Static Items */}
          {staticItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                selectedSection === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}

          {/* Separator */}
          <div className="h-px bg-border my-3" />
          
          {/* Endpoints Label */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Endpoints
          </div>

          {/* Category Items */}
          {apiEndpointsData.map((category) => {
            const Icon = categoryIcons[category.id] || Package;
            const isExpanded = expandedCategories.has(category.id);
            const isSelected = selectedSection === category.id;
            
            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => onCategoryToggle(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors text-left',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{category.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs py-0 px-1.5">
                        {category.endpoints?.length || 
                         category.subcategories?.reduce((acc, sub) => acc + sub.endpoints.length, 0) || 0}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="pl-4 border-l border-border/50 ml-5 mt-1 space-y-0.5">
                    {/* Direct endpoints */}
                    {category.endpoints?.map((endpoint, index) => (
                      <button
                        key={`${category.id}-${index}`}
                        onClick={() => onSectionChange(category.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded text-left"
                      >
                        <Badge className={cn('text-[10px] px-1 py-0 font-mono', getMethodColor(endpoint.method))}>
                          {endpoint.method}
                        </Badge>
                        <span className="truncate text-muted-foreground">
                          {endpoint.title}
                        </span>
                      </button>
                    ))}
                    
                    {/* Subcategories */}
                    {category.subcategories?.map((sub) => (
                      <div key={sub.id} className="mt-2">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                          {sub.title}
                        </div>
                        {sub.endpoints.map((endpoint, index) => (
                          <button
                            key={`${sub.id}-${index}`}
                            onClick={() => onSectionChange(category.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded text-left"
                          >
                            <Badge className={cn('text-[10px] px-1 py-0 font-mono', getMethodColor(endpoint.method))}>
                              {endpoint.method}
                            </Badge>
                            <span className="truncate text-muted-foreground">
                              {endpoint.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
