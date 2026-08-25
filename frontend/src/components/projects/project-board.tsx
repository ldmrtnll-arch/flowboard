"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { projectBoardSchema } from "@/lib/kanban/schemas";
import {
  KANBAN_COLUMNS,
  type KanbanStatus,
  type ProjectBoard,
} from "@/lib/types/kanban";
import {
  TASK_PRIORITY_LABELS,
  type Task,
} from "@/lib/types/task";


const taskDragId = (id: number) => `task:${id}`;
const columnDragId = (status: KanbanStatus) => `column:${status}`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function TaskCardContent({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  return (
    <div className={overlay ? "w-72 rotate-2 rounded-xl border border-indigo-200 bg-white p-4 shadow-xl" : ""}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-950">{task.title}</h3>
        {!overlay ? (
          <Link
            href={`/tasks/${task.id}/edit`}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-500"
          >
            Edit
          </Link>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        <span className="text-slate-500">
          {task.assignee ? "Assigned to me" : "Unassigned"}
        </span>
      </div>
      {task.due_date ? (
        <p className="mt-3 text-xs text-slate-500">Due {formatDate(task.due_date)}</p>
      ) : null}
    </div>
  );
}

function SortableTaskCard({ task, disabled }: { task: Task; disabled: boolean }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskDragId(task.id), disabled });

  return (
    <article
      ref={setNodeRef}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${isDragging ? "opacity-30" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="mb-3 w-full cursor-grab rounded-lg border border-dashed border-slate-300 px-3 py-1 text-left text-xs font-medium text-slate-500 active:cursor-grabbing disabled:cursor-not-allowed"
        disabled={disabled}
        aria-label={`Move ${task.title}`}
        {...attributes}
        {...listeners}
      >
        Drag or use keyboard
      </button>
      <TaskCardContent task={task} />
    </article>
  );
}

function BoardColumn({
  status,
  label,
  tasks,
  disabled,
}: {
  status: KanbanStatus;
  label: string;
  tasks: Task[];
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDragId(status),
    disabled,
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[28rem] w-72 shrink-0 flex-col rounded-2xl border p-3 transition ${isOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-100/80"}`}
      aria-label={`${label} column`}
    >
      <h2 className="px-1 py-2 text-sm font-semibold text-slate-800">
        {label} <span className="text-slate-400">&middot; {tasks.length}</span>
      </h2>
      <SortableContext
        items={tasks.map((task) => taskDragId(task.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-2 flex flex-1 flex-col gap-3">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} disabled={disabled} />
          ))}
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No tasks
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function findTask(board: ProjectBoard, id: number) {
  for (const column of KANBAN_COLUMNS) {
    const index = board.columns[column.id].findIndex((task) => task.id === id);
    if (index >= 0) return { status: column.id, index };
  }
  return null;
}

function parseTaskId(value: string) {
  if (!value.startsWith("task:")) return null;
  const id = Number(value.slice(5));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseColumnId(value: string): KanbanStatus | null {
  if (!value.startsWith("column:")) return null;
  const status = value.slice(7);
  return KANBAN_COLUMNS.some((column) => column.id === status)
    ? status as KanbanStatus
    : null;
}

function normalize(tasks: Task[], status: KanbanStatus) {
  return tasks.map((task, position) => ({ ...task, status, position }));
}

export function ProjectBoardView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [board, setBoard] = useState<ProjectBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadBoard = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/board`, {
        cache: "no-store",
        signal,
      });
      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return false;
      }
      if (response.status === 404) {
        setError("Project not found or you do not have access.");
        return false;
      }
      if (!response.ok) {
        setError("Unable to load this board. Please try again.");
        return false;
      }
      const result = projectBoardSchema.safeParse(await response.json());
      if (!result.success) {
        setError("Unable to load this board. Please try again.");
        return false;
      }
      setBoard(result.data);
      return true;
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return false;
      }
      setError("Unable to connect to the server. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadInitialBoard() {
      await loadBoard(controller.signal);
    }
    void loadInitialBoard();
    return () => controller.abort();
  }, [loadBoard]);

  function handleDragStart(event: DragStartEvent) {
    if (!board || saving) return;
    const id = parseTaskId(String(event.active.id));
    const location = id === null ? null : findTask(board, id);
    setActiveTask(location ? board.columns[location.status][location.index] : null);
    setMoveError(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    if (!board || saving || !event.over) return;
    const activeId = parseTaskId(String(event.active.id));
    if (activeId === null) return;
    const source = findTask(board, activeId);
    if (!source) return;

    const overValue = String(event.over.id);
    const overTaskId = parseTaskId(overValue);
    const overTask = overTaskId === null ? null : findTask(board, overTaskId);
    const destinationStatus = overTask?.status ?? parseColumnId(overValue);
    if (!destinationStatus) return;

    let destinationPosition = overTask?.index ?? board.columns[destinationStatus].length;
    const nextColumns = { ...board.columns };
    if (source.status === destinationStatus) {
      if (overTaskId === activeId) return;
      destinationPosition = Math.min(destinationPosition, board.columns[source.status].length - 1);
      nextColumns[source.status] = normalize(
        arrayMove(board.columns[source.status], source.index, destinationPosition),
        source.status,
      );
    } else {
      const sourceTasks = [...board.columns[source.status]];
      const [moving] = sourceTasks.splice(source.index, 1);
      const destinationTasks = [...board.columns[destinationStatus]];
      destinationPosition = Math.min(destinationPosition, destinationTasks.length);
      destinationTasks.splice(destinationPosition, 0, moving);
      nextColumns[source.status] = normalize(sourceTasks, source.status);
      nextColumns[destinationStatus] = normalize(destinationTasks, destinationStatus);
    }

    const snapshot = board;
    setBoard({ ...board, columns: nextColumns });
    setSaving(true);
    setMoveError(null);
    try {
      const response = await fetch(`/api/tasks/${activeId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: destinationStatus,
          position: destinationPosition,
        }),
      });
      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!response.ok) {
        setBoard(snapshot);
        setMoveError(
          response.status === 404
            ? "This task is no longer available. The board was refreshed."
            : "The move could not be saved. The board was refreshed.",
        );
        await loadBoard();
      }
    } catch {
      setBoard(snapshot);
      setMoveError("The move could not be saved. The board was refreshed.");
      await loadBoard();
    } finally {
      setSaving(false);
    }
  }

  if (loading && !board) {
    return <p className="mt-10 text-sm text-slate-500" role="status">Loading board...</p>;
  }
  if (error && !board) {
    return (
      <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">
        <p>{error}</p>
        <button type="button" className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold" onClick={() => void loadBoard()}>
          Try again
        </button>
      </div>
    );
  }
  if (!board) return null;

  return (
    <>
      <div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-700">{board.project.client_name}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{board.project.name}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/projects" className="text-slate-600 hover:text-slate-950">Back to projects</Link>
            <Link href={`/projects/${board.project.id}/edit`} className="text-indigo-700 hover:text-indigo-500">Edit project</Link>
          </div>
        </div>
        <Link href={`/tasks/new?project=${board.project.id}`} className="rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white hover:bg-indigo-500">
          New task
        </Link>
      </div>

      {moveError ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{moveError}</p> : null}
      {saving ? <p className="mt-4 text-sm text-slate-500" role="status">Saving board order...</p> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveTask(null)}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <div className="mt-8 overflow-x-auto pb-6">
          <div className="flex min-w-max gap-4">
            {KANBAN_COLUMNS.map((column) => (
              <BoardColumn
                key={column.id}
                status={column.id}
                label={column.label}
                tasks={board.columns[column.id]}
                disabled={saving}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeTask ? <TaskCardContent task={activeTask} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
