import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertBanner } from '@kit/components/feedback/alert-banner';
import { Button } from '@kit/components/forms/button';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erro não tratado no admin-dashboard', error, info);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <AlertBanner tone="danger" message="A interface encontrou um erro inesperado">
          <div className="space-y-3">
            <p className="text-sm">{this.state.error.message}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Recarregar aplicação
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }
}
