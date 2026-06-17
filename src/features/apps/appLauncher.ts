export interface LauncherApp {
  id: number;
  name: string;
  path: string;
  icon?: string;
  gridIndex?: number;
}

export interface ScreenRecorderApp {
  name: string;
  path: string;
  icon?: string;
}

export const APP_GRID_SLOTS = [0, 1, 2, 3, 5, 6, 7, 8] as const;

const isValidGridSlot = (gridIndex: number | undefined): gridIndex is (typeof APP_GRID_SLOTS)[number] =>
  gridIndex !== undefined && APP_GRID_SLOTS.includes(gridIndex as (typeof APP_GRID_SLOTS)[number]);

const getAvailableSlot = (apps: LauncherApp[]): number | undefined => {
  const occupied = new Set(apps.map((app) => app.gridIndex).filter((gridIndex): gridIndex is number => gridIndex !== undefined));
  return APP_GRID_SLOTS.find((slot) => !occupied.has(slot));
};

export const getAppNameFromPath = (path: string) => path.split(/[\\/]/).pop()?.split(".")[0] ?? "未知";

export const normalizeApps = (apps: LauncherApp[]): LauncherApp[] => {
  const normalized: LauncherApp[] = [];

  for (const app of apps) {
    if (isValidGridSlot(app.gridIndex) && !normalized.some((item) => item.gridIndex === app.gridIndex)) {
      normalized.push(app);
      continue;
    }

    const slot = getAvailableSlot(normalized);
    normalized.push(slot === undefined ? app : { ...app, gridIndex: slot });
  }

  return normalized;
};

export const assignAppsToGrid = (
  existingApps: LauncherApp[],
  incomingApps: LauncherApp[],
  targetIndex?: number,
): LauncherApp[] => {
  const updatedApps = [...existingApps];
  let preferredSlot = targetIndex === 4 ? undefined : targetIndex;

  for (const app of incomingApps) {
    if (
      preferredSlot !== undefined &&
      isValidGridSlot(preferredSlot) &&
      !updatedApps.some((item) => item.gridIndex === preferredSlot)
    ) {
      updatedApps.push({ ...app, gridIndex: preferredSlot });
      preferredSlot = undefined;
      continue;
    }

    const slot = getAvailableSlot(updatedApps);
    if (slot !== undefined) {
      updatedApps.push({ ...app, gridIndex: slot });
    }
  }

  return updatedApps;
};

export const moveAppToGrid = (apps: LauncherApp[], draggedId: number, targetIndex: number): LauncherApp[] => {
  if (!isValidGridSlot(targetIndex)) {
    return apps;
  }

  const draggedApp = apps.find((app) => app.id === draggedId);
  if (!draggedApp || draggedApp.gridIndex === targetIndex) {
    return apps;
  }

  return apps.map((app) => {
    if (app.id === draggedId) {
      return { ...app, gridIndex: targetIndex };
    }
    if (app.gridIndex === targetIndex) {
      return { ...app, gridIndex: draggedApp.gridIndex };
    }
    return app;
  });
};

export const buildLauncherApps = async (
  paths: string[],
  resolveIcon: (path: string) => Promise<string | undefined>,
  createIdBase: () => number = Date.now,
): Promise<LauncherApp[]> => {
  const idBase = createIdBase();

  return Promise.all(
    paths.map(async (path, index) => ({
      id: idBase + index,
      name: getAppNameFromPath(path),
      path,
      icon: await resolveIcon(path),
    })),
  );
};
