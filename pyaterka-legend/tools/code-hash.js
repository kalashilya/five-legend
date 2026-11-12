/* Отпечаток кода бомбы C4 (6 цифр) для таблицы C4_CODES в meta.js.
   Запуск: node tools/code-hash.js 123456 [654321 ...] — печатает строки для C4_CODES (награду дописать вручную).
   Сами коды в репозиторий и в игру не записываются: в игре только отпечатки. */
const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const c4Hash = d => hsh('C4|' + d + '|5L').toString(36) + hsh(d.split('').reverse().join('') + '#PL').toString(36);
if (require.main === module) for (const c of process.argv.slice(2)) { if (!/^\d{6}$/.test(c)) { console.error('нужно ровно 6 цифр: ' + c); continue; } console.log(`  '${c4Hash(c)}': { r: { coins: 0 } },`); }
module.exports = { c4Hash };
