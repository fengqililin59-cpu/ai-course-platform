import * as React from "react";
import type { Course } from "@/data/courses";
import {
  ADMIN_COURSES_STORAGE_KEY,
  loadCatalogCourses,
  saveCatalogCourses,
} from "@/data/courseRuntime";

type CoursesCatalogContextValue = {
  courses: Course[];
  reloadCourses: () => void;
  setCoursesCatalog: (next: Course[]) => void;
  getCourseById: (id: string) => Course | undefined;
};

const CoursesCatalogContext = React.createContext<CoursesCatalogContextValue | null>(
  null,
);

export function CoursesCatalogProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = React.useState<Course[]>(() => loadCatalogCourses());

  const reloadCourses = React.useCallback(() => {
    setCourses(loadCatalogCourses());
  }, []);

  const setCoursesCatalog = React.useCallback((next: Course[]) => {
    saveCatalogCourses(next);
    setCourses([...next]);
  }, []);

  const getCourseById = React.useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses],
  );

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_COURSES_STORAGE_KEY) reloadCourses();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reloadCourses]);

  const value = React.useMemo(
    () => ({
      courses,
      reloadCourses,
      setCoursesCatalog,
      getCourseById,
    }),
    [courses, reloadCourses, setCoursesCatalog, getCourseById],
  );

  return (
    <CoursesCatalogContext.Provider value={value}>
      {children}
    </CoursesCatalogContext.Provider>
  );
}

export function useCoursesCatalog() {
  const ctx = React.useContext(CoursesCatalogContext);
  if (!ctx) {
    throw new Error("useCoursesCatalog must be used within CoursesCatalogProvider");
  }
  return ctx;
}
