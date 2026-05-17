import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";

type MoveDirection = "up" | "down";

function computeToIndex(
  direction: MoveDirection,
  fromIndex: number,
  length: number,
): number {
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

  if (toIndex < 0 || toIndex >= length) {
    return fromIndex;
  }

  return toIndex;
}

export function moveArrayItem<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

export function moveModuleInCourse(
  course: ApiCoursePayload,
  moduleId: string,
  direction: MoveDirection,
): ApiCoursePayload {
  const fromIndex = course.modules.findIndex(
    (module) => module.id === moduleId,
  );

  if (fromIndex === -1) {
    return course;
  }

  const toIndex = computeToIndex(direction, fromIndex, course.modules.length);
  if (toIndex === fromIndex) {
    return course;
  }

  return {
    ...course,
    modules: moveArrayItem(course.modules, fromIndex, toIndex),
  };
}

export function moveLessonInModule(
  course: ApiCoursePayload,
  moduleId: string,
  lessonId: string,
  direction: MoveDirection,
): ApiCoursePayload {
  const moduleIndex = course.modules.findIndex(
    (module) => module.id === moduleId,
  );
  if (moduleIndex === -1) {
    return course;
  }

  const targetModule = course.modules[moduleIndex];
  const fromIndex = targetModule.lessons.findIndex(
    (lesson) => lesson.id === lessonId,
  );

  if (fromIndex === -1) {
    return course;
  }

  const toIndex = computeToIndex(
    direction,
    fromIndex,
    targetModule.lessons.length,
  );
  if (toIndex === fromIndex) {
    return course;
  }

  return {
    ...course,
    modules: course.modules.map((module) => {
      if (module.id !== moduleId) {
        return module;
      }

      return {
        ...module,
        lessons: moveArrayItem(module.lessons, fromIndex, toIndex),
      };
    }),
  };
}

export function moveBlockInLesson(
  course: ApiCoursePayload,
  moduleId: string,
  lessonId: string,
  blockId: string,
  direction: MoveDirection,
): ApiCoursePayload {
  const targetModule = course.modules.find((module) => module.id === moduleId);
  if (!targetModule) {
    return course;
  }

  const targetLesson = targetModule.lessons.find(
    (lesson) => lesson.id === lessonId,
  );
  if (!targetLesson) {
    return course;
  }

  const fromIndex = targetLesson.blocks.findIndex(
    (block) => block.id === blockId,
  );
  if (fromIndex === -1) {
    return course;
  }

  const toIndex = computeToIndex(
    direction,
    fromIndex,
    targetLesson.blocks.length,
  );
  if (toIndex === fromIndex) {
    return course;
  }

  return {
    ...course,
    modules: course.modules.map((module) => {
      if (module.id !== moduleId) {
        return module;
      }

      return {
        ...module,
        lessons: module.lessons.map((lesson) => {
          if (lesson.id !== lessonId) {
            return lesson;
          }

          return {
            ...lesson,
            blocks: moveArrayItem(lesson.blocks, fromIndex, toIndex),
          };
        }),
      };
    }),
  };
}
