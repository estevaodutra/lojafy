import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 space-y-4">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="flex flex-row items-center space-x-3 pb-2">
              <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-destructive">
                  {this.props.fallbackTitle || 'Ocorreu um erro ao carregar esta tela'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Não se preocupe, seus dados estão salvos. Você pode tentar recarregar a página.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-background rounded-md border text-xs font-mono text-destructive overflow-x-auto max-h-40">
                  <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={this.handleReset}
                  className="bg-primary text-primary-foreground"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
