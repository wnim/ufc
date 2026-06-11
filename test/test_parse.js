const assert = require('assert');
const { parseFightCard } = require('../lib/parseFightCard');

const sample = [
  { weightClass: 'Light Heavyweight', fighterA: 'Carlos Ulberg',   fighterB: 'Jiří Procházka',   method: 'KO (punches)',                                    round: '1', time: '3:45', notes: '[a]' },
  { weightClass: 'Light Heavyweight', fighterA: 'Paulo Costa',     fighterB: 'Azamat Murzakanov', method: 'TKO (head kick)',                                  round: '3', time: '1:23', notes: '' },
  { weightClass: 'Heavyweight',       fighterA: 'Josh Hokit',      fighterB: 'Curtis Blaydes',    method: 'Decision (unanimous) (29–28, 29–28, 29–28)',       round: '3', time: '5:00', notes: '' },
  { weightClass: 'Light Heavyweight', fighterA: 'Dominick Reyes',  fighterB: 'Johnny Walker',     method: 'Decision (split) (29–28, 28–29, 29–28)',           round: '3', time: '5:00', notes: '' },
  { weightClass: 'Featherweight',     fighterA: 'Cub Swanson',     fighterB: 'Nate Landwehr',     method: 'TKO (punches)',                                    round: '1', time: '4:06', notes: '' },
];

const fights = parseFightCard(sample);

console.log('Parsed fights:', fights);

// Expect only the non-decision finishes: Ulberg, Costa, Swanson => 3 fights
assert.strictEqual(fights.length, 3, `expected 3 finishes, got ${fights.length}`);

const names = fights.map(f => `${f.fighterA} vs ${f.fighterB}`);
assert(names.includes('Carlos Ulberg vs Jiří Procházka'));
assert(names.includes('Paulo Costa vs Azamat Murzakanov'));
assert(names.includes('Cub Swanson vs Nate Landwehr'));

console.log('parseFightCard test passed — filtered decisions/draws as expected');
