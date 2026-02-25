import { SchoolsExplorer } from "@/app/[locale]/schools/schools-explorer";

export default async function SchoolsPage() {
  return (
    <div className="grid gap-4">
      <SchoolsExplorer />
    </div>
  );
}
