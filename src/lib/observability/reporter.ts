type ErrorReporter = (error: unknown, context?: Record<string, unknown>) => void;

let reporter: ErrorReporter | null = null;

export function setErrorReporter(next: ErrorReporter | null): void {
  reporter = next;
}

export const reportError: ErrorReporter = (error, context) => {
  reporter?.(error, context);
};
