/* =========================================================
   体育祭しおり
   ・js/content.js(CONTENT)の中身でページを組み立てる
   ・タイムテーブル + 「いまここ」
   ・応援ボタン(キャラの反応つき)
   ・隠れキャラ探し、謎解きの答え合わせ
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

/* ---------- このブラウザに保存(隠れキャラ・謎解き) ----------
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

    const illust = el('div', 'ph event__illust', '挿絵');
    renderImage(illust, ev.image);

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

/* ---------- おたのしみ ---------- */
function renderFun() {
  const { spotImages, spotText } = CONTENT.fun;
  renderImage($('spot-a'), spotImages[0]);
  renderImage($('spot-b'), spotImages[1]);
  setOptionalText($('spot-text'), spotText);
}

/* ---------- 隠れキャラ探し ---------- */
const hiddenFound = new Set(loadList('hidden-chars'));
let hiddenPlaced = [];   // 実際に置けたキャラの番号
let hiddenUnplaced = []; // 置き場所のセクションが無い・非表示で置けなかったもの(?check で出す)
let bubbleTimer;

function closeBubbles(except) {
  document.querySelectorAll('.hide__bubble').forEach((b) => {
    if (b !== except) b.hidden = true;
  });
}

function showBubble(bubble, text) {
  closeBubbles(bubble);
  bubble.hidden = !text;
  if (text) setText(bubble, text);
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 4000);
}

function markFound(btn, i) {
  btn.parentElement.classList.add('is-found');
  btn.setAttribute('aria-label', `隠れキャラ ${i + 1}(見つけた)`);
  const face = btn.firstChild;
  if (!face.querySelector('img')) face.textContent = '✓';
}

function renderHiddenChars() {
  hiddenPlaced = [];
  hiddenUnplaced = [];
  CONTENT.hiddenChars.forEach((c, i) => {
    const section = document.getElementById(c.section);
    if (!section || !section.classList.contains('section') || section.hidden) {
      hiddenUnplaced.push(i);
      return;
    }
    const where = c.where === 'bottom' ? 'bottom' : 'head';
    const box = el('span', `hide hide--${where}`);

    const btn = el('button', 'hide__btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', `隠れキャラ ${i + 1}`);
    const face = el('span', 'hide__face', '?');
    renderImage(face, c.image);
    btn.append(face);

    const bubble = el('span', 'bubble hide__bubble');
    bubble.setAttribute('aria-live', 'polite');
    bubble.hidden = true;

    btn.addEventListener('click', () => {
      showBubble(bubble, c.line);
      if (hiddenFound.has(i)) return;
      hiddenFound.add(i);
      saveList('hidden-chars', [...hiddenFound]);
      markFound(btn, i);
      updateHunt(true);
    });

    box.append(btn, bubble);
    if (where === 'head') section.querySelector('.section__head').append(box);
    else section.append(box);
    if (hiddenFound.has(i)) markFound(btn, i);
    hiddenPlaced.push(i);
  });
  updateHunt(false);
}

// 吹き出しの外をタップしたら閉じる
document.addEventListener('click', (e) => {
  if (!e.target.closest('.hide')) closeBubbles();
});

// おたのしみの「隠れキャラ 1 / 3 見つけた」。celebrate = 今ちょうど全部そろった時は紙吹雪
function updateHunt(celebrate) {
  const total = hiddenPlaced.length;
  const count = hiddenPlaced.filter((i) => hiddenFound.has(i)).length;
  const done = total > 0 && count === total;
  $('hunt').hidden = total === 0;
  $('hunt').classList.toggle('is-done', done);
  setText($('hunt-count'), `隠れキャラ ${count} / ${total} 見つけた`);
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

/* ---------- 謎解きの答え合わせ ---------- */

// 前後の空白・全角半角・カタカナ/ひらがな・大文字小文字の違いをなくしてから比べる
// (途中の空白も無視する)
function normalizeAnswer(text) {
  return String(text)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function button(className, text) {
  const btn = el('button', className, text);
  btn.type = 'button';
  return btn;
}

function renderPuzzles() {
  const puzzles = CONTENT.puzzles;
  const solved = new Set(loadList('puzzles'));
  $('puzzles').hidden = puzzles.length === 0;

  $('puzzles-list').replaceChildren(...puzzles.map((pz, i) => {
    const answers = [].concat(pz.answers).map(normalizeAnswer);
    const item = el('article', 'puzzle');

    const head = el('div', 'puzzle__head');
    head.append(el('span', 'puzzle__no', `Q${i + 1}`), el('strong', 'puzzle__title', pz.title),
      el('span', 'puzzle__badge', '正解済み'));
    item.append(head);
    if (pz.note) item.append(el('p', 'note', pz.note));

    // 入力欄 + 答え合わせ(Enter でも答え合わせできるよう form にする)
    const form = el('form', 'puzzle__form');
    const input = el('input', 'puzzle__input');
    input.type = 'text';
    input.id = `puzzle-${i}`;
    input.autocomplete = 'off';
    input.placeholder = '答えを入力';
    const label = el('label', 'visually-hidden', `Q${i + 1} の答え`);
    label.htmlFor = input.id;
    form.append(label, input, el('button', 'puzzle__submit', '答え合わせ'));

    const result = el('div', 'puzzle__result');
    result.setAttribute('aria-live', 'polite');

    const showResult = (ok) => {
      if (ok) {
        result.replaceChildren(el('p', 'puzzle__ok', pz.correct));
        if (pz.explain) result.append(el('p', 'puzzle__explain', pz.explain));
      } else {
        result.replaceChildren(el('p', 'puzzle__ng', CONTENT.puzzleWrong));
      }
    };
    const setSolved = () => {
      item.classList.add('is-solved');
      solved.add(i);
      saveList('puzzles', [...solved]);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = normalizeAnswer(input.value);
      if (!value) {
        result.replaceChildren(el('p', 'puzzle__ng', '答えを入れてね'));
        return;
      }
      const ok = answers.includes(value);
      showResult(ok);
      if (ok) setSolved();
    });

    // ヒント・答えを見る(答えは一度確認をはさむ)
    const tools = el('div', 'puzzle__tools');
    const hint = el('p', 'puzzle__hint', `ヒント:${pz.hint}`);
    hint.hidden = true;
    if (pz.hint) {
      const hintBtn = button('btn-sub', 'ヒントを見る');
      hintBtn.addEventListener('click', () => {
        hint.hidden = false;
        hintBtn.hidden = true;
      });
      tools.append(hintBtn);
    }
    const revealBtn = button('btn-sub', '答えを見る');
    tools.append(revealBtn);

    const confirmBox = el('div', 'puzzle__confirm');
    confirmBox.hidden = true;
    const yesBtn = button('btn-sub btn-sub--ink', '見る');
    const noBtn = button('btn-sub', 'やめる');
    const confirmBtns = el('div', 'puzzle__tools');
    confirmBtns.append(yesBtn, noBtn);
    confirmBox.append(el('p', '', '答えを見ちゃう？自分で解きたい人は「やめる」を押してね'), confirmBtns);

    const answerBox = el('div', 'puzzle__answer');
    answerBox.hidden = true;
    answerBox.tabIndex = -1;
    answerBox.append(el('p', '', `答え:${[].concat(pz.answers)[0] || ''}`));
    if (pz.explain) answerBox.append(el('p', 'puzzle__explain', pz.explain));

    revealBtn.addEventListener('click', () => {
      confirmBox.hidden = false;
      revealBtn.hidden = true;
      noBtn.focus();
    });
    noBtn.addEventListener('click', () => {
      confirmBox.hidden = true;
      revealBtn.hidden = false;
      revealBtn.focus();
    });
    yesBtn.addEventListener('click', () => {
      confirmBox.hidden = true;
      answerBox.hidden = false;
      answerBox.focus();
    });

    item.append(form, result, tools, hint, confirmBox, answerBox);

    // 前に正解していたら、正解の表示から始める
    if (solved.has(i)) {
      item.classList.add('is-solved');
      showResult(true);
    }
    return item;
  }));
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
  title: '見出し', fun: 'おたのしみ', spotImages: '間違い探しの絵', spotText: '間違い探しの説明',
  notices: '注意事項',
  cheer: '応援ボタン', charImage: 'キャラ', lines: '回数ごとのセリフ', line: 'セリフ',
  hiddenChars: '隠れキャラ', section: '置く場所', hiddenCharsDone: '全部見つけた時のメッセージ',
  puzzles: '謎解き', note: '補足', answers: '正解', correct: '正解のメッセージ',
  hint: 'ヒント', explain: '解説', puzzleWrong: '不正解の一言',
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
  // 置き場所のセクションが無い(または空で非表示の)隠れキャラ。ある時だけ出す
  if (hiddenUnplaced.length > 0) {
    addList('置き場所が見つからない隠れキャラ',
      hiddenUnplaced.map((i) => ({ path: ['hiddenChars', i, 'section'], value: CONTENT.hiddenChars[i].section })),
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
renderFun();
renderNotices();
renderImage($('runner'), CONTENT.timetable.runnerImage);
$('timetable').hidden = CONTENT.timetable.program.length === 0;
renderNumbers();
renderHiddenChars();
renderPuzzles();
renderCheck();

if (CONTENT.timetable.program.length > 0) {
  renderTimetable();
  setInterval(renderTimetable, 60 * 1000);
}

/* ---------- 応援ボタン(保存・集計はしない) ---------- */
let cheers = 0;
const cheerCount = $('cheer-count');
const cheerChar = $('cheer-char');
renderImage(cheerChar, CONTENT.cheer.charImage);

// 押した回数に合うセリフ(from が回数以下のうち、一番大きいもの)
function updateCheerLine() {
  let best = null;
  CONTENT.cheer.lines.forEach((l) => {
    if (cheers >= l.from && (!best || l.from >= best.from)) best = l;
  });
  const line = best ? best.line : '';
  const bubble = $('cheer-line');
  if (bubble.textContent !== line || !line) setOptionalText(bubble, line);
}
updateCheerLine();

$('cheer-btn').addEventListener('click', () => {
  cheers += 1;
  cheerCount.textContent = pad(cheers, 3);
  updateCheerLine();
  // ぴょんと跳ねる(連打しても毎回最初から)
  cheerChar.classList.remove('is-jump');
  void cheerChar.offsetWidth;
  cheerChar.classList.add('is-jump');
});
