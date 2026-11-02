import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 lg:p-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center max-w-md mx-auto">
            <AlertTriangle size={24} className="text-rose-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-rose-800">Trang bi loi</p>
            <p className="text-xs text-rose-600 mt-1 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Tai lai trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
