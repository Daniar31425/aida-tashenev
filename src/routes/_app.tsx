import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/aida/Shell";

export const Route = createFileRoute("/_app")({
  component: Shell,
});
