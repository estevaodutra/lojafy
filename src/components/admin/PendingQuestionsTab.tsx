import { useState, useMemo } from 'react';
import { usePendingQuestions } from '@/hooks/usePendingQuestions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AnswerQuestionModal from './AnswerQuestionModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function PendingQuestionsTab() {
  const { questions, loading, answerQuestion, deleteQuestion } = usePendingQuestions();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    if (statusFilter === 'all') return questions;
    return questions.filter(q => q.status === statusFilter);
  }, [questions, statusFilter]);

  const stats = useMemo(() => ({
    total: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    answered: questions.filter(q => q.status === 'answered').length,
    totalAsked: questions.reduce((sum, q) => sum + q.asked_count, 0)
  }), [questions]);

  const handleAnswer = (question: any) => {
    setSelectedQuestion(question);
    setModalOpen(true);
  };

  const handleDelete = (questionId: string) => {
    setQuestionToDelete(questionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (questionToDelete) {
      await deleteQuestion(questionToDelete);
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Perguntas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aguardando Resposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <Badge variant="warning" className="bg-yellow-500">Pendente</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Respondidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{stats.answered}</div>
                <Badge variant="success" className="bg-green-500">Válidas</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Perguntado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAsked}x</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Perguntas dos Usuários</CardTitle>
                <CardDescription>
                  Gerencie as perguntas feitas ao suporte e cadastre respostas válidas
                </CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="answered">Respondidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Pergunta</TableHead>
                  <TableHead className="w-[100px] text-center">Vezes</TableHead>
                  <TableHead className="w-[150px]">Primeira Vez</TableHead>
                  <TableHead className="w-[150px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Nenhuma pergunta {statusFilter !== 'all' ? `com status "${statusFilter}"` : ''} encontrada</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        {question.status === 'pending' ? (
                          <Badge variant="warning" className="bg-yellow-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Aguardando
                          </Badge>
                        ) : (
                          <Badge variant="success" className="bg-green-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Válida
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{question.question}</p>
                          {question.keywords && question.keywords.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {question.keywords.slice(0, 3).map((keyword, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{question.asked_count}x</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(question.first_asked_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant={question.status === 'pending' ? 'default' : 'outline'}
                            onClick={() => handleAnswer(question)}
                          >
                            {question.status === 'pending' ? 'Responder' : 'Editar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(question.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AnswerQuestionModal
        question={selectedQuestion}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedQuestion(null);
        }}
        onSave={answerQuestion}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta pergunta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
