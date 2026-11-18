import { createFileRoute } from "@tanstack/react-router";
import { RepoTreePage } from "@/features/repos/ui/RepoDetailPage";

export const Route = createFileRoute("/repos/$repoId/tree/$")({
  component: RepoTreePage,
});
