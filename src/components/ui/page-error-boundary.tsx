import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type State = { hasError: boolean; error: Error | null };

export class PageErrorBoundary extends React.Component<
  { children: React.ReactNode; pageName?: string },
  State
> {
  constructor(props: { children: React.ReactNode; pageName?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <p className="font-semibold text-lg">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {this.props.pageName
              ? `The ${this.props.pageName} page encountered an error.`
              : "This page encountered an error."}
            {" "}Please refresh to try again.
          </p>
          {this.state.error && (
            <details className="text-xs text-muted-foreground max-w-md text-left">
              <summary className="cursor-pointer hover:text-foreground">Show error details</summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto">{this.state.error.message}</pre>
            </details>
          )}
          <Button size="sm" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
