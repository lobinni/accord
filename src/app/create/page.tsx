import { CreateFlow } from "@/components/accord/create-flow";
import { ConfigProblem } from "@/components/ui/config-problem";
import { readServerConfig } from "@/lib/genlayer/server-config";

export const metadata = { title: "Create accord — ACCORD" };

export default function CreatePage() {
  const result = readServerConfig();
  if (!result.ok) return <ConfigProblem action="Creating a request" />;
  return <CreateFlow />;
}
