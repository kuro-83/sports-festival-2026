/* =========================================================
   体育祭しおり
   ・js/content.js(CONTENT)の中身でページを組み立てる
   ・タイムテーブル + 「いまここ」
   ・おたのしみ(隠れキャラ探し、間違い探しの答え)
   ・ハンバーガーメニュー
   ・入れ忘れチェック
   中身を変えたい時は js/content.js だけ書き換える。このファイルは触らなくていい
   テスト: URL の末尾に ?time=10:30 を付けると、当日のその時刻として表示する
           URL の末尾に ?check を付けると、［］のままの項目と未設定の画像の一覧を出す
           (両方使う時は ?time=10:30&check)
   ========================================================= */

const params = new URLSearchParams(location.search);

const toMinutes = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
const pad = (n, len = 2) => String(n).padStart(len, '0');
const $ = (id) => document.getElementById(id);

// 文字は必ずここを通して入れる(textContent なのでタグは効かない)。\n は改行になる
function setText(node, text) {
  node.textContent = text;
  node.classList.toggle('pre-line', String(text).includes('\n'));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) setText(node, text);
  return node;
}

// 画像が設定されていれば枠の中身を <img> にする。src が空なら斜線の仮の枠のまま
function renderImage(box, image) {
  if (!image || !image.src) return;
  const img = document.createElement('img');
  img.src = image.src;
  img.alt = image.alt || '';
  box.replaceChildren(img);
}

// 空の文字なら隠す
function setOptionalText(node, text) {
  node.hidden = !text;
  if (text) setText(node, text);
}

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- このブラウザに保存(隠れキャラ) ----------
   localStorage が使えない環境(プライベートモードなど)でもエラーにせず、保存なしで遊べるようにする */
const STORE_PREFIX = 'sports-festival-2026:';

function loadList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_PREFIX + key));
    return Array.isArray(value) ? value : [];
  } catch (e) {
    return [];
  }
}

function saveList(key, list) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(list));
  } catch (e) {
    // 保存できなくても、そのページを開いている間は遊べる
  }
}

/* ---------- 日付 ---------- */
const [YEAR, MONTH, DAY] = CONTENT.site.date.split('-').map(Number);
const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY = new Date(YEAR, MONTH - 1, DAY).getDay();
const MD = `${MONTH}/${DAY}`;

/* ---------- 表紙・サイト全体 ---------- */
function renderSite() {
  const site = CONTENT.site;
  document.title = `${site.name} しおり | SPORTS DAY ${YEAR}`;
  document.querySelector('meta[name="description"]').content =
    `${MONTH}月${DAY}日(${WEEKDAYS_JA[WEEKDAY]}) ${site.name}のしおり。施設案内・タイムテーブル・競技説明など。`;

  setText($('site-brand'), `SPORTS DAY ${YEAR}`);
  setText($('site-day'), `${MONTH}.${pad(DAY)}`);
  setText($('site-weekday'), WEEKDAYS_EN[WEEKDAY]);
  setText($('site-name'), site.name);
  setOptionalText($('site-slogan'), site.slogan);
  setOptionalText($('site-venue'), site.venue && `会場　${site.venue}`);
  renderImage($('cover-image'), site.coverImage);
  setText($('footer-name'), `${site.name}　しおり班`);
}

/* ---------- 施設案内 ---------- */
function renderPlaces() {
  const { mapImage, list } = CONTENT.places;
  $('map').hidden = list.length === 0 && !mapImage.src;
  renderImage($('map-image'), mapImage);

  const box = $('places-list');
  box.hidden = list.length === 0;
  box.replaceChildren(...list.map((p) => {
    const item = el('div', 'place');
    item.append(el('strong', '', p.name));
    if (p.text) item.append(el('span', '', p.text));
    return item;
  }));
}

/* ---------- 競技説明 ---------- */
function renderEvents() {
  const events = CONTENT.events;
  $('events').hidden = events.length === 0;

  $('events-list').replaceChildren(...events.map((ev, i) => {
    const article = el('article', 'event');

    // 枠(.ph)を .frame で包む。隠れキャラは 'event-1' のような名前でこの枠の後ろに入る
    const illust = el('div', 'frame event__illust');
    illust.id = `frame-event-${i + 1}`;
    const box = el('div', 'ph', '挿絵');
    renderImage(box, ev.image);
    illust.append(box);

    const body = el('div', 'event__body');
    body.append(el('span', 'event__no', `EVENT ${pad(i + 1)}`), el('h3', '', ev.name));
    if (ev.rule) {
      const p = el('p', '', `　${ev.rule}`);
      p.prepend(el('strong', '', 'ルール'));
      body.append(p);
    }
    if (ev.highlight) {
      const p = el('p', '', `　${ev.highlight}`);
      p.prepend(el('strong', 'accent', 'みどころ'));
      body.append(p);
    }

    article.append(illust, body);
    return article;
  }));
}

/* ---------- ほかの企画 ---------- */
function renderOthers() {
  const others = CONTENT.others;
  $('others').hidden = others.length === 0;
  $('others-list').replaceChildren(...others.map((o) => {
    const item = el('div', 'other');
    if (o.title) item.append(el('strong', '', o.title));
    if (o.text) item.append(el('p', '', o.text));
    return item;
  }));
}

/* ---------- おたのしみ:間違い探しの答え ---------- */
// 説明も答えの画像も空なら欄ごと隠す
function renderSpot() {
  const { spotText, spotAnswerImage } = CONTENT.fun;
  $('spot').hidden = !spotText && !spotAnswerImage.src;
  setOptionalText($('spot-text'), spotText);
}

// 「答えを見る」で答えの画像を出す。もう一度押すと隠れる
// ネタバレしないよう、画像は最初に押した時に読み込む
const spotBtn = $('spot-btn');
const spotAnswer = $('spot-answer');
spotBtn.addEventListener('click', () => {
  const open = spotAnswer.hidden;
  if (open && !spotAnswer.querySelector('img')) renderImage(spotAnswer, CONTENT.fun.spotAnswerImage);
  spotAnswer.hidden = !open;
  spotBtn.setAttribute('aria-expanded', String(open));
  setText(spotBtn, open ? '答えをかくす' : '答えを見る');
});

/* ---------- おたのしみ:隠れキャラ探し ----------
   イラストの枠(.frame)の中で、枠(.ph)の後ろに隠れて、ふちから顔だけ出す
   タップすると前に出てきてセリフを言い、数秒で元に戻る */
const HIDDEN_KEY = 'hidden-chars-v6'; // v5(見出しの横に置く形)の保存データは使わない
const PEEK_SIDES = ['top', 'left', 'right'];
const PEEK_AT = { start: '18%', center: '50%', end: '82%' };
const hiddenFound = new Set(loadList(HIDDEN_KEY));
let hiddenPlaced = [];   // 実際に隠せたキャラの番号
let hiddenUnplaced = []; // 隠れる枠が無い・非表示で隠せなかったもの(?check で出す)

function markFound(peek, btn, i) {
  peek.classList.add('is-found');
  btn.setAttribute('aria-label', `隠れキャラ ${i + 1}(見つけた)`);
  if (!peek.querySelector('img')) peek.textContent = '✓';
}

function renderHiddenChars() {
  hiddenPlaced = [];
  hiddenUnplaced = [];
  CONTENT.hiddenChars.forEach((c, i) => {
    const frame = document.getElementById(`frame-${c.frame}`);
    if (!frame || frame.closest('[hidden]')) {
      hiddenUnplaced.push(i);
      return;
    }
    const side = PEEK_SIDES.includes(c.side) ? c.side : 'top';
    const pos = PEEK_AT[c.pos] ? c.pos : 'center';

    // キャラ本体(枠の後ろ)
    const peek = el('span', `peek peek--${side}`, '?');
    peek.setAttribute('aria-hidden', 'true');
    renderImage(peek, c.image);

    // タップする所(枠の前。見えている所＋枠の内側まで広げた透明なボタン)
    const btn = el('button', `peek__hit peek__hit--${side}`);
    btn.type = 'button';
    btn.setAttribute('aria-label', `隠れキャラ ${i + 1}`);

    const bubble = el('span', `peek__bubble peek__bubble--${side} peek__bubble--${pos}`);
    bubble.setAttribute('aria-live', 'polite');
    bubble.hidden = true;

    [peek, btn, bubble].forEach((node) => node.style.setProperty('--at', PEEK_AT[pos]));

    let timer;
    btn.addEventListener('click', () => {
      peek.classList.add('is-out');
      setOptionalText(bubble, c.line);
      clearTimeout(timer);
      timer = setTimeout(() => {
        peek.classList.remove('is-out');
        bubble.hidden = true;
      }, 2800);
      if (hiddenFound.has(i)) return;
      hiddenFound.add(i);
      saveList(HIDDEN_KEY, [...hiddenFound]);
      markFound(peek, btn, i);
      updateHunt(true);
    });

    frame.append(peek, btn, bubble);
    if (hiddenFound.has(i)) markFound(peek, btn, i);
    hiddenPlaced.push(i);
  });
  setOptionalText($('hunt-text'), CONTENT.hiddenCharsText);
  updateHunt(false);
}

// 「●●○ 2 / 3」。celebrate = 今ちょうど全部そろった時は紙吹雪
function updateHunt(celebrate) {
  const total = hiddenPlaced.length;
  const count = hiddenPlaced.filter((i) => hiddenFound.has(i)).length;
  const done = total > 0 && count === total;
  $('hunt').hidden = total === 0;
  $('hunt-dots').replaceChildren(...hiddenPlaced.map((_, n) => el('span', n < count ? 'is-on' : '')));
  setText($('hunt-count'), `${count} / ${total}`);
  setOptionalText($('hunt-done'), done ? CONTENT.hiddenCharsDone : '');
  if (done && celebrate) confetti();
}

// 軽い紙吹雪(動きを減らす設定の時は出さない)
function confetti() {
  if (REDUCED_MOTION) return;
  const colors = ['var(--c-accent)', 'var(--c-ink)', 'var(--c-now-bg)', 'var(--c-rule)'];
  const box = el('div', 'confetti');
  box.setAttribute('aria-hidden', 'true');
  for (let n = 0; n < 40; n += 1) {
    const piece = el('span');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[n % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 1}s`;
    piece.style.setProperty('--spin', `${Math.round(Math.random() * 720 - 360)}deg`);
    box.append(piece);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3500);
}

/* ---------- 注意事項 ---------- */
function renderNotices() {
  const { notices } = CONTENT;
  $('notice').hidden = notices.length === 0;
  $('notices-list').replaceChildren(...notices.map((text) => el('p', '', text)));
}

/* ---------- 目次・メニューと番号 ----------
   表示されているセクションだけで 01 から振り直す。ハンバーガーメニューにも同じ項目を並べる */
function renderNumbers() {
  let count = 0;
  let last = null;
  const menuItems = [];
  document.querySelectorAll('.toc__list a').forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    section.classList.remove('section--last');
    link.hidden = section.hidden;
    if (section.hidden) return;

    count += 1;
    const num = pad(count);
    setText(link.querySelector('.num'), num);
    setText(section.querySelector('.section__num'), num);
    last = section;

    const item = el('a', '', link.lastChild.textContent);
    item.href = link.getAttribute('href');
    item.prepend(el('span', 'num', num));
    menuItems.push(item);
  });
  if (last) last.classList.add('section--last');
  $('menu-list').replaceChildren(...menuItems);
}

/* ---------- ハンバーガーメニュー ---------- */
const menu = $('menu');
const menuBtn = $('menu-btn');

function setMenuOpen(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  document.documentElement.classList.toggle('is-menu-open', open);
}

menuBtn.addEventListener('click', () => {
  const open = menu.hidden;
  setMenuOpen(open);
  if (open) menu.querySelector('a')?.focus({ preventScroll: true });
});

// 項目をタップしたら閉じる(移動はリンクのふつうの動きにまかせる)
menu.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenuOpen(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) {
    setMenuOpen(false);
    menuBtn.focus({ preventScroll: true });
  }
});

/* ---------- タイムテーブル + 「いまここ」 ---------- */

// 今の状態を返す。phase: 'before'(当日より前) / 'day'(当日) / 'after'(翌日以降)
function getNow() {
  const testTime = params.get('time');
  if (testTime && /^\d{1,2}:\d{2}$/.test(testTime)) {
    return { phase: 'day', minutes: toMinutes(testTime), isTest: true };
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const eventDate = `${YEAR}-${pad(MONTH)}-${pad(DAY)}`;
  if (today < eventDate) return { phase: 'before' };
  if (today > eventDate) return { phase: 'after' };
  return { phase: 'day', minutes: now.getHours() * 60 + now.getMinutes() };
}

function renderTimetable() {
  const { program } = CONTENT.timetable;
  const now = getNow();
  const start = toMinutes(CONTENT.timetable.start);
  const end = toMinutes(CONTENT.timetable.end);

  let nowIndex = -1;
  let label;
  let progress = 0;

  if (now.phase === 'before') {
    label = `${MD}当日、ここでキャラが走るよ`;
  } else if (now.phase === 'after' || now.minutes >= end) {
    label = 'おつかれさま！全プログラム終了';
    progress = 1;
  } else {
    program.forEach((p, i) => {
      if (now.minutes >= toMinutes(p.start)) nowIndex = i;
    });
    label = nowIndex >= 0 ? `いまは「${program[nowIndex].label}」` : 'まだ始まってないよ';
    progress = Math.min(1, Math.max(0, (now.minutes - start) / (end - start)));
  }

  setText($('now-label'), label);

  const runner = $('runner');
  runner.style.setProperty('--progress', progress.toFixed(3));
  runner.classList.toggle('is-waiting', now.phase === 'before');

  if (now.isTest) {
    setText($('now-note'),
      `※テスト表示中:${MD} ${Math.floor(now.minutes / 60)}:${pad(now.minutes % 60)} として表示しています`);
  }

  $('program').replaceChildren(...program.map((p, i) => {
    const li = el('li', 'program__row' + (i === nowIndex ? ' is-now' : ''));
    li.append(el('span', 'program__time', p.start), el('span', 'program__name', p.label));
    if (i === nowIndex) {
      li.setAttribute('aria-current', 'step');
      li.append(el('span', 'program__badge', 'NOW'));
    }
    return li;
  }));
}

/* ---------- 入れ忘れチェック(?check の時だけ) ---------- */
const CHECK_LABELS = {
  site: '表紙', name: '名前', slogan: 'スローガン', venue: '会場', date: '日付',
  coverImage: '表紙イラスト', places: '施設案内', mapImage: '簡易マップ', list: '場所',
  text: '説明', timetable: 'タイムテーブル', start: '開始時刻', end: '終了時刻',
  program: 'プログラム', label: '名前', runnerImage: '走るキャラ', events: '競技',
  rule: 'ルール', highlight: 'みどころ', image: '画像', others: 'ほかの企画',
  title: '見出し', fun: 'おたのしみ', spotText: '間違い探しの説明', spotAnswerImage: '間違い探しの答え',
  notices: '注意事項',
  hiddenChars: '隠れキャラ', frame: '隠れる枠', line: 'セリフ',
  hiddenCharsText: '隠れキャラ探しの説明', hiddenCharsDone: '全部見つけた時のメッセージ',
};

// 「競技 2 › ルール」のような読める名前と、「events[1].rule」のようなファイル上の場所
function describePath(path) {
  const words = [];
  let code = '';
  path.forEach((key) => {
    if (typeof key === 'number') {
      words[words.length - 1] += ` ${key + 1}`;
      code += `[${key}]`;
    } else {
      words.push(CHECK_LABELS[key] || key);
      code += code ? `.${key}` : key;
    }
  });
  return { words: words.join(' › '), code };
}

function collectMissing(value, path, found) {
  if (typeof value === 'string') {
    if (/［[^］]*］/.test(value)) found.placeholders.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectMissing(v, [...path, i], found));
  } else if (value && typeof value === 'object') {
    if ('src' in value && !value.src) found.images.push({ path });
    Object.entries(value).forEach(([k, v]) => collectMissing(v, [...path, k], found));
  }
  return found;
}

function renderCheck() {
  if (!params.has('check')) return;
  const found = collectMissing(CONTENT, [], { placeholders: [], images: [] });

  const box = $('check');
  const inner = el('div', 'check__inner wrap');
  inner.append(el('p', 'check__title', '入れ忘れチェック(js/content.js)'));

  const addList = (heading, items, toText) => {
    inner.append(el('p', 'check__heading', `${heading}:${items.length}件`));
    if (items.length === 0) return;
    const ul = el('ul', 'check__list');
    items.forEach((item) => {
      const { words, code } = describePath(item.path);
      const li = el('li', '', words);
      if (toText) li.append(el('span', 'check__value', toText(item)));
      li.append(el('code', '', code));
      ul.append(li);
    });
    inner.append(ul);
  };
  addList('まだ［］のまま残っている項目', found.placeholders, (item) => item.value);
  addList('画像が未設定の場所', found.images);
  // 隠れる枠が無い(またはセクションが空で非表示の)隠れキャラ。ある時だけ出す
  if (hiddenUnplaced.length > 0) {
    addList('隠れる枠が見つからない隠れキャラ',
      hiddenUnplaced.map((i) => ({ path: ['hiddenChars', i, 'frame'], value: CONTENT.hiddenChars[i].frame })),
      (item) => `'${item.value}'`);
  }

  box.replaceChildren(inner);
  box.className = 'check';
  box.hidden = false;
}

/* ---------- 組み立て ---------- */
renderSite();
renderPlaces();
renderEvents();
renderOthers();
renderNotices();
renderImage($('runner'), CONTENT.timetable.runnerImage);
$('timetable').hidden = CONTENT.timetable.program.length === 0;
renderSpot();
renderHiddenChars();
// 隠れキャラ探しも間違い探しも出ないなら、おたのしみごと隠す
$('fun').hidden = $('hunt').hidden && $('spot').hidden;
renderNumbers();
renderCheck();

if (CONTENT.timetable.program.length > 0) {
  renderTimetable();
  setInterval(renderTimetable, 60 * 1000);
}
