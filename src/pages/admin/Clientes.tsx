import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminCustomers from "./Customers";
import GestaoUsuarios from "./GestaoUsuarios";
import AdminCourses from "./Courses";
import CourseEnrollments from "./CourseEnrollments";

const Clientes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes & Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie clientes, usuários da plataforma e cursos
        </p>
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="users">Gestão de Usuários</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <AdminCustomers />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <GestaoUsuarios />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <AdminCourses />
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          <CourseEnrollments />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clientes;
