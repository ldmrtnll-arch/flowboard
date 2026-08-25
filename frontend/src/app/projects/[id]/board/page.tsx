import { AppHeader } from "@/components/layout/app-header";
import { ProjectBoardView } from "@/components/projects/project-board";


type ProjectBoardPageProps = { params: Promise<{ id: string }> };

export default async function ProjectBoardPage({ params }: ProjectBoardPageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-[100rem]">
        <AppHeader />
        <section className="py-12">
          <ProjectBoardView projectId={id} />
        </section>
      </div>
    </main>
  );
}
