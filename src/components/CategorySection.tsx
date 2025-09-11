import { Card, CardContent } from "@/components/ui/card";
import { 
  Smartphone, 
  Headphones, 
  Home, 
  Sparkles, 
  Baby,
  Shirt,
  Gamepad2,
  Book
} from "lucide-react";

const categories = [
  {
    id: 1,
    name: "Eletrônicos",
    icon: Smartphone,
    color: "bg-blue-500",
  },
  {
    id: 2,
    name: "Áudio & TV",
    icon: Headphones,
    color: "bg-purple-500",
  },
  {
    id: 3,
    name: "Casa & Jardim",
    icon: Home,
    color: "bg-green-500",
  },
  {
    id: 4,
    name: "Beleza",
    icon: Sparkles,
    color: "bg-pink-500",
  },
  {
    id: 5,
    name: "Infantil",
    icon: Baby,
    color: "bg-yellow-500",
  },
  {
    id: 6,
    name: "Moda",
    icon: Shirt,
    color: "bg-red-500",
  },
  {
    id: 7,
    name: "Games",
    icon: Gamepad2,
    color: "bg-indigo-500",
  },
  {
    id: 8,
    name: "Livros",
    icon: Book,
    color: "bg-orange-500",
  },
];

const CategorySection = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Explore por Categoria
          </h2>
          <p className="text-lg text-muted-foreground">
            Encontre exatamente o que você procura
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id}
                className="group hover:shadow-card-hover transition-all duration-300 cursor-pointer border-border bg-card"
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                  <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-medium text-foreground text-sm">
                    {category.name}
                  </h3>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;