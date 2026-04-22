import * as React from "react";

const LS_FAVORITES = "favorites";
const LS_PURCHASED = "purchasedCourses";

function readIdList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIdList(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(ids));
}

type CourseUserContextValue = {
  favoriteIds: string[];
  purchasedIds: string[];
  isFavorite: (courseId: string) => boolean;
  toggleFavorite: (courseId: string) => void;
  isPurchased: (courseId: string) => boolean;
  addPurchase: (courseId: string) => void;
};

const CourseUserContext = React.createContext<CourseUserContextValue | null>(
  null,
);

export function CourseUserProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = React.useState<string[]>(() =>
    readIdList(LS_FAVORITES),
  );
  const [purchasedIds, setPurchasedIds] = React.useState<string[]>(() =>
    readIdList(LS_PURCHASED),
  );

  React.useEffect(() => {
    writeIdList(LS_FAVORITES, favoriteIds);
  }, [favoriteIds]);

  React.useEffect(() => {
    writeIdList(LS_PURCHASED, purchasedIds);
  }, [purchasedIds]);

  const isFavorite = React.useCallback(
    (courseId: string) => favoriteIds.includes(courseId),
    [favoriteIds],
  );

  const toggleFavorite = React.useCallback((courseId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  }, []);

  const isPurchased = React.useCallback(
    (courseId: string) => purchasedIds.includes(courseId),
    [purchasedIds],
  );

  const addPurchase = React.useCallback((courseId: string) => {
    setPurchasedIds((prev) => [...new Set([...prev, courseId])]);
  }, []);

  const value = React.useMemo(
    () => ({
      favoriteIds,
      purchasedIds,
      isFavorite,
      toggleFavorite,
      isPurchased,
      addPurchase,
    }),
    [
      favoriteIds,
      purchasedIds,
      isFavorite,
      toggleFavorite,
      isPurchased,
      addPurchase,
    ],
  );

  return (
    <CourseUserContext.Provider value={value}>
      {children}
    </CourseUserContext.Provider>
  );
}

export function useCourseUser(): CourseUserContextValue {
  const ctx = React.useContext(CourseUserContext);
  if (!ctx) {
    throw new Error("useCourseUser must be used within CourseUserProvider");
  }
  return ctx;
}
