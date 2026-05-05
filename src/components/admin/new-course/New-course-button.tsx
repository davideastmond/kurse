"use client";

import { createCourse } from "@/app/actions/courses";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function NewCourseButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openModal = () => {
    setIsOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleCreate = () => {
    startTransition(async () => {
      setError(null);

      const result = await createCourse({
        title,
        description,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      closeModal();
      router.push(`/admin/storyboard/${result.slug}`);
      router.refresh();
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [isOpen, isPending]);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Admin Dashboard
        </h1>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          New Course
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-5 shadow-lg">
            <h2 className="text-xl font-semibold text-foreground">
              Create New Course
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter a title and description to start with an empty storyboard.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="new-course-title"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Title
                </label>
                <input
                  id="new-course-title"
                  type="text"
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (!isPending) {
                        handleCreate();
                      }
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Course title"
                />
              </div>

              <div>
                <label
                  htmlFor="new-course-description"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Description
                </label>
                <textarea
                  id="new-course-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      (event.ctrlKey || event.metaKey) &&
                      event.key === "Enter"
                    ) {
                      event.preventDefault();
                      if (!isPending) {
                        handleCreate();
                      }
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Briefly describe this course"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Creating..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
