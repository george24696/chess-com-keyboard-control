// Shared by the content script, the settings page and the popup.
var CK = (function () {
  var ACTIONS = ['up', 'down', 'left', 'right', 'select'];

  var ACTION_LABELS = {
    up: 'Move up',
    down: 'Move down',
    left: 'Move left',
    right: 'Move right',
    select: 'Click square'
  };

  // Keys are stored as KeyboardEvent.code so layouts like WASD stay on the same
  // physical keys on non-QWERTY keyboards.
  var PRESETS = [
    {
      id: 'wasd',
      name: 'WASD + Space',
      desc: 'Left hand moves, thumb clicks. Enter also clicks.',
      keys: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], select: ['Space', 'Enter'] }
    },
    {
      id: 'arrows',
      name: 'Arrows + Enter',
      desc: 'Classic arrow keys, Enter or Space to click.',
      keys: {
        up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
        select: ['Enter', 'Space']
      }
    },
    {
      id: 'both',
      name: 'WASD and arrows',
      desc: 'Both sets work at once. Space, Enter or E click.',
      keys: {
        up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
        left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
        select: ['Space', 'Enter', 'KeyE']
      }
    },
    {
      id: 'vim',
      name: 'Vim (HJKL)',
      desc: 'Right hand home row. Space or Enter clicks.',
      keys: { up: ['KeyK'], down: ['KeyJ'], left: ['KeyH'], right: ['KeyL'], select: ['Space', 'Enter'] }
    },
    {
      id: 'ijkl',
      name: 'IJKL',
      desc: 'Inverted T on the right hand. Space clicks.',
      keys: { up: ['KeyI'], down: ['KeyK'], left: ['KeyJ'], right: ['KeyL'], select: ['Space', 'Enter'] }
    },
    {
      id: 'esdf',
      name: 'ESDF',
      desc: 'WASD shifted one key right, keeps pinky on Shift/Ctrl row.',
      keys: { up: ['KeyE'], down: ['KeyD'], left: ['KeyS'], right: ['KeyF'], select: ['Space', 'KeyG'] }
    },
    {
      id: 'numpad',
      name: 'Numpad',
      desc: '8, 4, 6, 2 to move and 5 or Enter to click.',
      keys: {
        up: ['Numpad8'], down: ['Numpad2'], left: ['Numpad4'], right: ['Numpad6'],
        select: ['Numpad5', 'NumpadEnter', 'Enter']
      }
    }
  ];

  var DEFAULTS = {
    enabled: true,
    keys: JSON.parse(JSON.stringify(PRESETS[2].keys)),
    wrap: false,
    cursorColor: '#f5c518',
    cursorStyle: 'outline', // outline | fill | dot
    cursorOpacity: 0.9,
    showLabel: true
  };

  var FRIENDLY = {
    Space: 'Space', Enter: 'Enter', NumpadEnter: 'Num Enter', Escape: 'Esc', Tab: 'Tab',
    Backspace: 'Backspace', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    ShiftLeft: 'L Shift', ShiftRight: 'R Shift', ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl',
    AltLeft: 'L Alt', AltRight: 'R Alt', CapsLock: 'Caps', Backquote: '`', Minus: '-', Equal: '=',
    BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',',
    Period: '.', Slash: '/', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End',
    PageUp: 'PgUp', PageDown: 'PgDn'
  };

  function keyLabel(code) {
    if (FRIENDLY[code]) return FRIENDLY[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad/.test(code)) return 'Num ' + code.slice(6);
    return code;
  }

  function actionForCode(keys, code) {
    for (var i = 0; i < ACTIONS.length; i++) {
      if ((keys[ACTIONS[i]] || []).indexOf(code) !== -1) return ACTIONS[i];
    }
    return null;
  }

  // Cursor lives in screen space: c = column 0..7 from the left, r = row 0..7 from the top.
  function move(cur, action, wrap) {
    var dc = action === 'left' ? -1 : action === 'right' ? 1 : 0;
    var dr = action === 'up' ? -1 : action === 'down' ? 1 : 0;
    var c = cur.c + dc;
    var r = cur.r + dr;
    if (wrap) {
      c = (c + 8) % 8;
      r = (r + 8) % 8;
    } else {
      c = Math.max(0, Math.min(7, c));
      r = Math.max(0, Math.min(7, r));
    }
    return { c: c, r: r };
  }

  function squareName(cur, flipped) {
    var file = flipped ? 'hgfedcba'[cur.c] : 'abcdefgh'[cur.c];
    var rank = flipped ? cur.r + 1 : 8 - cur.r;
    return file + rank;
  }

  function applyCursorStyle(el, s) {
    el.style.boxShadow = 'none';
    el.style.background = 'transparent';
    el.style.opacity = String(s.cursorOpacity);
    if (s.cursorStyle === 'fill') {
      el.style.background = s.cursorColor;
      el.style.opacity = String(Math.min(s.cursorOpacity, 0.6));
    } else if (s.cursorStyle === 'dot') {
      el.style.background = 'radial-gradient(circle, ' + s.cursorColor + ' 0 20%, transparent 22%)';
    } else {
      el.style.boxShadow = 'inset 0 0 0 4px ' + s.cursorColor;
    }
  }

  // ---- storage (falls back to localStorage so the settings page works when opened as a plain file) ----
  var hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

  function merge(saved) {
    var out = JSON.parse(JSON.stringify(DEFAULTS));
    if (!saved) return out;
    Object.keys(DEFAULTS).forEach(function (k) {
      if (saved[k] !== undefined) out[k] = saved[k];
    });
    ACTIONS.forEach(function (a) {
      if (!Array.isArray(out.keys[a])) out.keys[a] = [];
    });
    return out;
  }

  function load(cb) {
    if (hasChrome) {
      chrome.storage.sync.get('settings', function (r) { cb(merge(r && r.settings)); });
    } else {
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem('ck-settings')); } catch (e) { /* ignore */ }
      cb(merge(raw));
    }
  }

  function save(settings, cb) {
    if (hasChrome) {
      chrome.storage.sync.set({ settings: settings }, cb);
    } else {
      try { localStorage.setItem('ck-settings', JSON.stringify(settings)); } catch (e) { /* ignore */ }
      if (cb) cb();
    }
  }

  function onChange(cb) {
    if (!hasChrome) return;
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'sync' && changes.settings) cb(merge(changes.settings.newValue));
    });
  }

  return {
    ACTIONS: ACTIONS, ACTION_LABELS: ACTION_LABELS, PRESETS: PRESETS, DEFAULTS: DEFAULTS,
    keyLabel: keyLabel, actionForCode: actionForCode, move: move, squareName: squareName,
    applyCursorStyle: applyCursorStyle, load: load, save: save, onChange: onChange
  };
})();
