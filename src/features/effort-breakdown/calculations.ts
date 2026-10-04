import type { DataModel, DocumentModel } from '../../core/schema/schema-types.ts';
import { recordItems } from '../../core/schema/data-models.ts';
export const memberKeys = Object.freeze(["member1", "member2", "member3", "member4", "member5"]);

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateEffortBreakdown(dataModel: DataModel) {
  const tasks = recordItems(dataModel.tasks).map((task) => {
    const points = Math.max(0, numberValue(task.points));
    const allocations = memberKeys.map((key) => Math.max(0, numberValue(task[key])));
    return { ...task, points, allocations, completion: allocations.reduce((total, value) => total + value, 0) } as DataModel & { points: number; allocations: number[]; completion: number };
  });
  const memberTotals = memberKeys.map((key) => tasks.reduce(
    (total, task) => total + (task.points * Math.max(0, numberValue(task[key])) / 100), 0
  ));
  return {
    tasks,
    memberTotals,
    totalPoints: tasks.reduce((total, task) => total + task.points, 0),
    completion: tasks.length ? tasks.reduce((total, task) => total + task.completion, 0) / tasks.length : 0
  };
}
