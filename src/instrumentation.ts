import type { Instrumentation } from 'next';

// Next.js calls this for every unhandled error in server code (route
// handlers, server components, middleware). One structured console.error
// line per failure -- Vercel captures function console output, so this
// makes production errors searchable in the Vercel Logs dashboard without
// adding an external service. Swap the console call for a Sentry capture
// when a Sentry account exists (tracked in PROJECT_SCOPE.md gaps).
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const detail = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
  console.error(
    JSON.stringify({
      source: 'server-error',
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routeType: context.routeType,
      ...detail,
    })
  );
};
