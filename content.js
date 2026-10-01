// Runs on chess.com. Draws a keyboard cursor over the board and turns the "select"
// key into a real click on the square under the cursor.
(function () {
  var settings = CK.DEFAULTS;
  var cur = { c: 4, r: 6 };
  var active = true; // cursor hides after a real mouse click, returns on the next key press
  var overlay = null;
  var cursorEl = null;
  var labelEl = null;

  function getBoard() {
    return document.querySelector('wc-chess-board, chess-board');
  }

  function isFlipped(board) {
    return board.classList.contains('flipped');
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
    overlay.style.display = active ? 'block' : 'none';
    var s = rect.width / 8;
    cursorEl.style.left = rect.left + cur.c * s + 'px';
    cursorEl.style.top = rect.top + cur.r * s + 'px';
    cursorEl.style.width = s + 'px';
    cursorEl.style.height = s + 'px';
    CK.applyCursorStyle(cursorEl, settings);
    labelEl.style.display = settings.showLabel ? 'block' : 'none';
    labelEl.textContent = CK.squareName(cur, isFlipped(board));
  }

  function fire(target, Ctor, type, x, y, buttons) {
    var init = {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: x, clientY: y, screenX: x + window.screenX, screenY: y + window.screenY,
      button: 0, buttons: buttons
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

  function clickAtCursor() {
    var board = getBoard();
    if (!board) return;
    var rect = board.getBoundingClientRect();
    var s = rect.width / 8;
    var x = rect.left + (cur.c + 0.5) * s;
    var y = rect.top + (cur.r + 0.5) * s;
    var target = document.elementFromPoint(x, y) || board;

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
    if (action === 'select') {
      if (!e.repeat) clickAtCursor();
    } else {
      cur = CK.move(cur, action, settings.wrap);
    }
    render();
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
  window.addEventListener('mousedown', onMouseDown, true);
  window.addEventListener('resize', render);
  window.addEventListener('scroll', render, true);
  setInterval(render, 200); // board can flip, resize, or be re-created between games
})();
