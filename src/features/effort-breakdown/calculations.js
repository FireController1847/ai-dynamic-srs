export const memberKeys = Object.freeze(["member1", "member2", "member3", "member4", "member5"]);

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateEffortBreakdown(dataModel) {
  const tasks = (dataModel.tasks || []).map((task) => {
    const points = Math.max(0, numberValue(task.points));
    const allocations = memberKeys.map((key) => Math.max(0, numberValue(task[key])));
    return { ...task, points, allocations, completion: allocations.reduce((total, value) => total + value, 0) };
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
