import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import AdminCourses from "./Courses";
import CourseEnrollments from "./CourseEnrollments";
import { AcademyDashboard } from "@/components/admin/AcademyDashboard";
import { AcademyProgress } from "@/components/admin/AcademyProgress";
import { AcademySettings } from "@/components/admin/AcademySettings";

const Academy = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="w-8 h-8" />
          Lojify Academy
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie cursos, matrículas, progresso dos alunos e configurações da plataforma de ensino
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
          <TabsTrigger value="progress">Progresso dos Alunos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <AcademyDashboard />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <AdminCourses />
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Selecione um curso na aba "Cursos" para gerenciar suas matrículas
            </p>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <AcademyProgress />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AcademySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Academy;
