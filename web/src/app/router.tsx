import { createBrowserHistory, createRouter } from "@tanstack/react-router";

import { NotFoundPage, RouteErrorPage } from "@/app/RouteFallbacks";
import { routeTree } from "@/app/routeTree.gen";

export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  scrollRestoration: true,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: RouteErrorPage,
  getScrollRestorationKey: (location: { pathname: string }) =>
    location.pathname,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
