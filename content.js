// Runs on chess.com. Draws a keyboard cursor over the board and turns the "select"
// key into a real click on the square under the cursor.
(function () {
  var settings = CK.DEFAULTS;
  var cur = { c: 4, r: 6 };
  var active = true; // cursor hides after a real mouse click, returns on the next key press
  var overlay = null;
  var cursorEl = null;
  var labelEl = null;
  var hintEl = null;
  var markCode = null; // key currently held for highlight/arrow marking

  function getBoard() {
    return document.querySelector('wc-chess-board, chess-board');
  }

  function isFlipped(board) {
    return board.classList.contains('flipped');
  }

  function median(list) {
    var a = list.slice().sort(function (x, y) { return x - y; });
    return a[Math.floor(a.length / 2)];
  }

  // The board element's own box is not always the 8x8 grid (some game modes add padding or
  // extra chrome), so derive the grid from the pieces, whose classes (square-FR) tell us
  // exactly which cell each one sits in. Median over all pieces ignores one that is mid-drag.
  function getGrid(board) {
    var flipped = isFlipped(board);
    var els = board.querySelectorAll('.piece, .highlight, .hint');
    var lefts = [];
    var tops = [];
    var sizes = [];
    for (var i = 0; i < els.length; i++) {
      var m = /(?:^|\s)square-(\d)(\d)(?:\s|$)/.exec(els[i].className);
      if (!m) continue;
      var rect = els[i].getBoundingClientRect();
      if (rect.width < 10) continue;
      var file = +m[1];
      var rank = +m[2];
      var col = flipped ? 8 - file : file - 1;
      var row = flipped ? rank - 1 : 8 - rank;
      lefts.push(rect.left - col * rect.width);
      tops.push(rect.top - row * rect.width);
      sizes.push(rect.width);
    }
    if (sizes.length) {
      return { left: median(lefts), top: median(tops), size: median(sizes) };
    }
    var r = board.getBoundingClientRect();
    return { left: r.left, top: r.top, size: r.width / 8 };
  }

  function isVisible(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }

  // Game-over detection by button text rather than class names (chess.com renames those often).
  // "Rematch" only exists once a game has ended. The dialog sits on top of the board, so a
  // button whose center is inside the board rect belongs to the dialog.
  function scanGameOver() {
    var board = getBoard();
    var br = board && board.getBoundingClientRect();
    var found = { rematch: null, newGame: null, modal: false, over: false };
    var fallback = null;
    var els = document.querySelectorAll('button, a, [role="button"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 30) continue;
      var isRematch = /^rematch$/i.test(text);
      var isNew = /^new\s*\d/i.test(text) || /^new game$/i.test(text);
      if (!isRematch && !isNew) continue;
      if (!isVisible(el)) continue;
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var inModal = !!br && cx > br.left && cx < br.right && cy > br.top && cy < br.bottom;
      if (isRematch && (!found.rematch || inModal)) found.rematch = el;
      if (isNew) {
        if (inModal) { found.newGame = el; found.modal = true; }
        else if (!fallback && /^new\s*\d/i.test(text)) fallback = el;
      }
    }
    if (!found.newGame) found.newGame = fallback;
    found.over = !!found.rematch || found.modal;
    return found;
  }

  function ensureOverlay() {
    if (overlay && overlay.isConnected) return;
    overlay = document.createElement('div');
    overlay.id = 'ck-overlay';
    overlay.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483000;';
    cursorEl = document.createElement('div');
    cursorEl.style.cssText = 'position:absolute;box-sizing:border-box;pointer-events:none;';
    labelEl = document.createElement('div');
    labelEl.style.cssText =
      'position:absolute;right:3px;bottom:2px;font:700 12px/1 system-ui,sans-serif;color:#111;' +
      'background:rgba(255,255,255,0.85);padding:2px 4px;border-radius:3px;pointer-events:none;';
    cursorEl.appendChild(labelEl);
    overlay.appendChild(cursorEl);
    hintEl = document.createElement('div');
    hintEl.style.cssText =
      'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:none;' +
      'background:#262421;color:#fff;font:600 14px/1.3 system-ui,sans-serif;padding:8px 14px;' +
      'border-radius:8px;border:2px solid #81b64c;box-shadow:0 4px 14px rgba(0,0,0,.5);' +
      'pointer-events:none;white-space:nowrap;';
    overlay.appendChild(hintEl);
    document.documentElement.appendChild(overlay);
  }

  function render() {
    var board = getBoard();
    if (!board || !settings.enabled) {
      if (overlay) overlay.style.display = 'none';
      return;
    }
    var rect = board.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) {
      if (overlay) overlay.style.display = 'none';
      return;
    }
    ensureOverlay();
    var over = scanGameOver();
    overlay.style.display = active || over.modal ? 'block' : 'none';
    cursorEl.style.display = over.modal ? 'none' : 'block';
    hintEl.style.display = over.modal ? 'block' : 'none';
    if (over.modal) hintEl.textContent = gameOverHint();
    var g = getGrid(board);
    var s = g.size;
    cursorEl.style.left = g.left + cur.c * s + 'px';
    cursorEl.style.top = g.top + cur.r * s + 'px';
    cursorEl.style.width = s + 'px';
    cursorEl.style.height = s + 'px';
    CK.applyCursorStyle(cursorEl, markCode ? Object.assign({}, settings, { cursorColor: '#eb6150' }) : settings);
    labelEl.style.display = settings.showLabel ? 'block' : 'none';
    labelEl.textContent = CK.squareName(cur, isFlipped(board));
  }

  function firstKey(action) {
    var k = settings.keys[action] || [];
    return k.length ? CK.keyLabel(k[0]) : null;
  }

  function gameOverHint() {
    var parts = [];
    var n = firstKey('newGame');
    var sel = settings.selectStartsGame ? firstKey('select') : null;
    var r = firstKey('rematch');
    if (n || sel) parts.push([n, sel].filter(Boolean).join(' / ') + ': new game');
    if (r) parts.push(r + ': rematch');
    return parts.join('   |   ');
  }

  function fire(target, Ctor, type, x, y, buttons, button) {
    var init = {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: x, clientY: y, screenX: x + window.screenX, screenY: y + window.screenY,
      button: button || 0, buttons: buttons
    };
    if (Ctor === PointerEvent) {
      init.pointerId = 1;
      init.pointerType = 'mouse';
      init.isPrimary = true;
      init.width = 1;
      init.height = 1;
      init.pressure = buttons ? 0.5 : 0;
    }
    target.dispatchEvent(new Ctor(type, init));
  }

  // Center of the cursor's square in viewport pixels, plus the element under it.
  function cursorPoint() {
    var board = getBoard();
    if (!board) return null;
    var g = getGrid(board);
    var x = g.left + (cur.c + 0.5) * g.size;
    var y = g.top + (cur.r + 0.5) * g.size;
    return { x: x, y: y, target: document.elementFromPoint(x, y) || board };
  }

  function clickAtCursor() {
    var p = cursorPoint();
    if (!p) return;
    var x = p.x, y = p.y, target = p.target;

    fire(target, PointerEvent, 'pointermove', x, y, 0);
    fire(target, MouseEvent, 'mousemove', x, y, 0);
    fire(target, PointerEvent, 'pointerdown', x, y, 1);
    fire(target, MouseEvent, 'mousedown', x, y, 1);
    setTimeout(function () {
      fire(target, PointerEvent, 'pointerup', x, y, 0);
      fire(target, MouseEvent, 'mouseup', x, y, 0);
      fire(target, MouseEvent, 'click', x, y, 0);
    }, 15);
  }

  // Marking mirrors the right mouse button: pressing the key is right-button-down on the
  // cursor square, moving the cursor drags, releasing is right-button-up. Release on the
  // same square and chess.com toggles a red highlight; release elsewhere and it draws an arrow.
  function startMark(code) {
    var p = cursorPoint();
    if (!p) return;
    markCode = code;
    fire(p.target, PointerEvent, 'pointermove', p.x, p.y, 0, -1);
    fire(p.target, MouseEvent, 'mousemove', p.x, p.y, 0, -1);
    fire(p.target, PointerEvent, 'pointerdown', p.x, p.y, 2, 2);
    fire(p.target, MouseEvent, 'mousedown', p.x, p.y, 2, 2);
  }

  function dragMark() {
    var p = cursorPoint();
    if (!p || !markCode) return;
    fire(p.target, PointerEvent, 'pointermove', p.x, p.y, 2, -1);
    fire(p.target, MouseEvent, 'mousemove', p.x, p.y, 2, -1);
  }

  function endMark() {
    if (!markCode) return;
    markCode = null;
    var p = cursorPoint();
    if (!p) return;
    fire(p.target, PointerEvent, 'pointerup', p.x, p.y, 0, 2);
    fire(p.target, MouseEvent, 'mouseup', p.x, p.y, 0, 2);
    fire(p.target, MouseEvent, 'contextmenu', p.x, p.y, 0, 2);
    render();
  }

  function isEditable(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function onKeyDown(e) {
    if (!settings.enabled || !e.isTrusted) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditable(e.target)) return;
    var action = CK.actionForCode(settings.keys, e.code);
    if (!action || !getBoard()) return;

    e.preventDefault();
    e.stopPropagation();

    active = true;
    if (action === 'newGame' || action === 'rematch') {
      if (!e.repeat) {
        var o = scanGameOver();
        var btn = action === 'rematch' ? o.rematch : o.newGame;
        if (o.over && btn) btn.click();
      }
    } else if (action === 'select') {
      var go = settings.selectStartsGame && scanGameOver();
      if (go && go.modal && go.newGame) {
        if (!e.repeat) go.newGame.click();
      } else if (!e.repeat) {
        clickAtCursor();
      }
    } else if (action === 'mark') {
      if (!e.repeat && !markCode) startMark(e.code);
    } else {
      cur = CK.move(cur, action, settings.wrap, e.shiftKey ? settings.jumpSteps : 1);
      dragMark();
    }
    render();
  }

  function onKeyUp(e) {
    if (markCode && e.code === markCode) {
      e.preventDefault();
      endMark();
    }
  }

  // A real mouse click means the player is using the mouse, so get the cursor out of the way.
  function onMouseDown(e) {
    if (e.isTrusted && getBoard() && getBoard().contains(e.target)) {
      active = false;
      render();
    }
  }

  CK.load(function (s) {
    settings = s;
    render();
  });
  CK.onChange(function (s) {
    settings = s;
    render();
  });

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', endMark);
  window.addEventListener('mousedown', onMouseDown, true);
  window.addEventListener('resize', render);
  window.addEventListener('scroll', render, true);
  setInterval(render, 200); // board can flip, resize, or be re-created between games
})();
