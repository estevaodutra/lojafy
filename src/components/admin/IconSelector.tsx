import { useState } from "react";
import {
  Truck,
  Shield,
  RefreshCw,
  CreditCard,
  Gift,
  Award,
  Star,
  Heart,
  Package,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Tag,
  TrendingUp,
  Zap,
  ShoppingBag,
  BadgeCheck,
  Sparkles,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const iconOptions: { name: string; Icon: LucideIcon }[] = [
  { name: "Truck", Icon: Truck },
  { name: "Shield", Icon: Shield },
  { name: "RefreshCw", Icon: RefreshCw },
  { name: "CreditCard", Icon: CreditCard },
  { name: "Gift", Icon: Gift },
  { name: "Award", Icon: Award },
  { name: "Star", Icon: Star },
  { name: "Heart", Icon: Heart },
  { name: "Package", Icon: Package },
  { name: "Clock", Icon: Clock },
  { name: "CheckCircle", Icon: CheckCircle },
  { name: "Phone", Icon: Phone },
  { name: "Mail", Icon: Mail },
  { name: "MapPin", Icon: MapPin },
  { name: "Tag", Icon: Tag },
  { name: "TrendingUp", Icon: TrendingUp },
  { name: "Zap", Icon: Zap },
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "BadgeCheck", Icon: BadgeCheck },
  { name: "Sparkles", Icon: Sparkles },
];

interface IconSelectorProps {
  value: string;
  onChange: (iconName: string) => void;
}

export const IconSelector = ({ value, onChange }: IconSelectorProps) => {
  const [open, setOpen] = useState(false);
  
  const selectedIcon = iconOptions.find(opt => opt.name === value);
  const SelectedIconComponent = selectedIcon?.Icon || Truck;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <SelectedIconComponent className="mr-2 h-4 w-4" />
          {value || "Selecione um ícone"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-background z-50" align="start">
        <ScrollArea className="h-72">
          <div className="grid grid-cols-4 gap-2 p-4">
            {iconOptions.map((option) => {
              const IconComponent = option.Icon;
              return (
                <Button
                  key={option.name}
                  variant={value === option.name ? "default" : "ghost"}
                  className="h-16 flex flex-col gap-1"
                  onClick={() => {
                    onChange(option.name);
                    setOpen(false);
                  }}
                >
                  <IconComponent className="h-6 w-6" />
                  <span className="text-xs">{option.name}</span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
