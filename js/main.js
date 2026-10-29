/* =========================================================
   体育祭しおり
   ・タイムテーブル + 「いまここ」
   ・応援ボタン
   テスト: URL の末尾に ?time=10:30 を付けると、当日のその時刻として表示する
   ========================================================= */

/* ---------- ここを書き換える ---------- */
const EVENT_DATE = '2026-11-27'; // 体育祭の日付
const DAY_START = '9:00';        // キャラがSTARTにいる時刻
const DAY_END = '15:30';         // キャラがGOALに着く時刻(全プログラム終了)

// 時刻順に並べる。start は 'H:MM'
const PROGRAM = [
  { start: '9:00', label: '［プログラム1］' },
  { start: '10:00', label: '［プログラム2］' },
  { start: '11:00', label: '［プログラム3］' },
  { start: '13:00', label: '［プログラム4］' },
  { start: '14:30', label: '［プログラム5］' },
];
/* ------------------------------------- */

const toMinutes = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
const pad = (n, len = 2) => String(n).padStart(len, '0');

// 今の状態を返す。phase: 'before'(当日より前) / 'day'(当日) / 'after'(翌日以降)
function getNow() {
  const testTime = new URLSearchParams(location.search).get('time');
  if (testTime && /^\d{1,2}:\d{2}$/.test(testTime)) {
    return { phase: 'day', minutes: toMinutes(testTime), isTest: true };
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (today < EVENT_DATE) return { phase: 'before' };
  if (today > EVENT_DATE) return { phase: 'after' };
  return { phase: 'day', minutes: now.getHours() * 60 + now.getMinutes() };
}

function renderTimetable() {
  const now = getNow();
  const start = toMinutes(DAY_START);
  const end = toMinutes(DAY_END);

  let nowIndex = -1;
  let label;
  let progress = 0;

  if (now.phase === 'before') {
    label = '11/27当日、ここでキャラが走るよ';
  } else if (now.phase === 'after' || now.minutes >= end) {
    label = 'おつかれさま！全プログラム終了';
    progress = 1;
  } else {
    PROGRAM.forEach((p, i) => {
      if (now.minutes >= toMinutes(p.start)) nowIndex = i;
    });
    label = nowIndex >= 0 ? `いまは「${PROGRAM[nowIndex].label}」` : 'まだ始まってないよ';
    progress = Math.min(1, Math.max(0, (now.minutes - start) / (end - start)));
  }

  document.getElementById('now-label').textContent = label;

  const runner = document.getElementById('runner');
  runner.style.setProperty('--progress', progress.toFixed(3));
  runner.classList.toggle('is-waiting', now.phase === 'before');

  if (now.isTest) {
    document.getElementById('now-note').textContent =
      `※テスト表示中:11/27 ${Math.floor(now.minutes / 60)}:${pad(now.minutes % 60)} として表示しています`;
  }

  const list = document.getElementById('program');
  list.replaceChildren(...PROGRAM.map((p, i) => {
    const li = document.createElement('li');
    li.className = 'program__row' + (i === nowIndex ? ' is-now' : '');

    const time = document.createElement('span');
    time.className = 'program__time';
    time.textContent = p.start;

    const name = document.createElement('span');
    name.className = 'program__name';
    name.textContent = p.label;

    li.append(time, name);
    if (i === nowIndex) {
      li.setAttribute('aria-current', 'step');
      const badge = document.createElement('span');
      badge.className = 'program__badge';
      badge.textContent = 'NOW';
      li.append(badge);
    }
    return li;
  }));
}

renderTimetable();
setInterval(renderTimetable, 60 * 1000);

/* ---------- 応援ボタン(保存・集計はしない) ---------- */
let cheers = 0;
const cheerCount = document.getElementById('cheer-count');
document.getElementById('cheer-btn').addEventListener('click', () => {
  cheers += 1;
  cheerCount.textContent = pad(cheers, 3);
});
