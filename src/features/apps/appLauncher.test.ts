import assert from "node:assert/strict";
import test from "node:test";
import { assignAppsToGrid, buildLauncherApps, moveAppToGrid, normalizeApps, type LauncherApp } from "./appLauncher.ts";

const createApp = (id: number, gridIndex?: number): LauncherApp => ({
  id,
  name: `App ${id}`,
  path: `C:/Apps/${id}.exe`,
  gridIndex,
});

test("normalizeApps fills missing grid indexes with the first available slots", () => {
  const apps = [
    createApp(1, 3),
    createApp(2),
    createApp(3, 8),
    createApp(4),
  ];

  const normalized = normalizeApps(apps);

  assert.deepEqual(
    normalized.map((app) => ({ id: app.id, gridIndex: app.gridIndex })),
    [
      { id: 1, gridIndex: 3 },
      { id: 2, gridIndex: 0 },
      { id: 3, gridIndex: 8 },
      { id: 4, gridIndex: 1 },
    ],
  );
});

test("assignAppsToGrid prefers the requested slot and then the next available slots", () => {
  const existing = [createApp(1, 0), createApp(2, 6)];
  const incoming = [createApp(3), createApp(4)];

  const updated = assignAppsToGrid(existing, incoming, 5);

  assert.deepEqual(
    updated.map((app) => ({ id: app.id, gridIndex: app.gridIndex })),
    [
      { id: 1, gridIndex: 0 },
      { id: 2, gridIndex: 6 },
      { id: 3, gridIndex: 5 },
      { id: 4, gridIndex: 1 },
    ],
  );
});

test("moveAppToGrid swaps positions with the existing occupant", () => {
  const apps = [createApp(1, 0), createApp(2, 3), createApp(3, 7)];

  const moved = moveAppToGrid(apps, 2, 7);

  assert.deepEqual(
    moved.map((app) => ({ id: app.id, gridIndex: app.gridIndex })),
    [
      { id: 1, gridIndex: 0 },
      { id: 2, gridIndex: 7 },
      { id: 3, gridIndex: 3 },
    ],
  );
});

test("buildLauncherApps derives app names and icons from selected paths", async () => {
  const apps = await buildLauncherApps(
    ["C:/Apps/ScreenToGif.exe", "C:/Apps/Notion.lnk"],
    async (path) => (path.endsWith(".exe") ? "icon-data" : undefined),
    () => 42,
  );

  assert.deepEqual(apps, [
    {
      id: 42,
      name: "ScreenToGif",
      path: "C:/Apps/ScreenToGif.exe",
      icon: "icon-data",
    },
    {
      id: 43,
      name: "Notion",
      path: "C:/Apps/Notion.lnk",
      icon: undefined,
    },
  ]);
});
