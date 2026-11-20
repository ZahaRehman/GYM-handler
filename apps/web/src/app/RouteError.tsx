import { RefreshCw, TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

/** Shown when a page crashes or (after a new deploy) an old page file can't be loaded. */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : 'Unknown error'
  const staleBuild = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(message)

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><TriangleAlert className="size-6" /></div>
      <div>
        <h1 className="text-lg font-semibold">{staleBuild ? 'A new version is available' : 'Something went wrong'}</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {staleBuild ? 'Reload to get the latest version of the app.' : 'Your data is safe. Try reloading the page. If it keeps happening, note what you were doing.'}
        </p>
        {!staleBuild && <p className="mt-2 font-mono text-xs text-muted-foreground">{message}</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}><RefreshCw /> Reload</Button>
        <Button variant="outline" render={<Link to="/" />}>Dashboard</Button>
      </div>
    </div>
  )
}
