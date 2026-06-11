// Filters a structured fight array to finishes only (no decisions, draws).
// Exports: parseFightCard(fights) -> [{weightClass,fighterA,fighterB,method,round,time,notes}]

function isDecision(method) {
  if (!method) return false;
  const t = method.toLowerCase();
  return t.includes('decision') || t.includes('draw');
}

function parseFightCard(fights) {
  return fights.filter(f => f.fighterA && f.fighterB && f.method && !isDecision(f.method));
}

module.exports = { parseFightCard };
