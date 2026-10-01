(function () {
  var $ = function (id) { return document.getElementById(id); };
  var settings = CK.DEFAULTS;
  var capturing = null; // action currently waiting for a key
  var cur = { c: 4, r: 6 };
  var clicks = 0;
  var cursorEl, labelEl;
  var savedTimer;

  var RESERVED = ['Escape', 'Tab', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock'];

  function persist() {
    CK.save(settings, function () {
      $('saved').classList.add('show');
      clearTimeout(savedTimer);
      savedTimer = setTimeout(function () { $('saved').classList.remove('show'); }, 1200);
    });
  }

  function sameKeys(a, b) {
    return CK.ACTIONS.every(function (act) {
      var x = (a[act] || []).slice().sort().join();
      var y = (b[act] || []).slice().sort().join();
      return x === y;
    });
  }

  function renderPresets() {
    var box = $('presets');
    box.innerHTML = '';
    CK.PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'preset' + (sameKeys(settings.keys, p.keys) ? ' on' : '');
      b.innerHTML = '<b></b><span></span>';
      b.firstChild.textContent = p.name;
      b.lastChild.textContent = p.desc;
      b.onclick = function () {
        settings.keys = JSON.parse(JSON.stringify(p.keys));
        capturing = null;
        $('note').textContent = '';
        persist();
        renderAll();
        $('board').focus();
      };
      box.appendChild(b);
    });
  }

  function renderBindings() {
    var box = $('bindings');
    box.innerHTML = '';
    CK.ACTIONS.forEach(function (act) {
      var row = document.createElement('div');
      row.className = 'row';
      var name = document.createElement('div');
      name.className = 'name';
      name.textContent = CK.ACTION_LABELS[act];
      var chips = document.createElement('div');
      chips.className = 'chips';

      (settings.keys[act] || []).forEach(function (code) {
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.appendChild(document.createTextNode(CK.keyLabel(code)));
        var x = document.createElement('button');
        x.title = 'Remove';
        x.textContent = '×';
        x.onclick = function () {
          settings.keys[act] = settings.keys[act].filter(function (k) { return k !== code; });
          persist();
          renderAll();
        };
        chip.appendChild(x);
        chips.appendChild(chip);
      });

      var add = document.createElement('button');
      add.className = 'add' + (capturing === act ? ' capturing' : '');
      add.textContent = capturing === act ? 'Press a key (Esc to cancel)' : '+ Add key';
      add.onclick = function () {
        capturing = capturing === act ? null : act;
        $('note').textContent = '';
        renderBindings();
      };
      chips.appendChild(add);

      row.appendChild(name);
      row.appendChild(chips);
      box.appendChild(row);
    });
  }

  function renderOptions() {
    $('enabled').checked = settings.enabled;
    $('wrap').checked = settings.wrap;
    $('jumpSteps').value = String(settings.jumpSteps);
    $('showLabel').checked = settings.showLabel;
    $('cursorStyle').value = settings.cursorStyle;
    $('cursorColor').value = settings.cursorColor;
    $('cursorOpacity').value = settings.cursorOpacity;
  }

  function buildBoard() {
    var board = $('board');
    board.innerHTML = '';
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var sq = document.createElement('div');
        sq.className = 'sq ' + ((r + c) % 2 === 0 ? 'l' : 'd');
        sq.dataset.c = c;
        sq.dataset.r = r;
        board.appendChild(sq);
      }
    }
    cursorEl = document.createElement('div');
    cursorEl.className = 't-cursor';
    labelEl = document.createElement('div');
    labelEl.className = 't-label';
    cursorEl.appendChild(labelEl);
    board.appendChild(cursorEl);

    board.addEventListener('focus', function () { board.classList.remove('dim'); });
    board.addEventListener('blur', function () { board.classList.add('dim'); });
    board.addEventListener('mousedown', function (e) {
      var sq = e.target.closest('.sq');
      if (sq) {
        cur = { c: +sq.dataset.c, r: +sq.dataset.r };
        renderBoard();
      }
    });
  }

  function renderBoard() {
    var flipped = $('flip').checked;
    cursorEl.style.left = cur.c * 12.5 + '%';
    cursorEl.style.top = cur.r * 12.5 + '%';
    CK.applyCursorStyle(cursorEl, settings);
    labelEl.style.display = settings.showLabel ? 'block' : 'none';
    labelEl.textContent = CK.squareName(cur, flipped);
    var sqs = $('board').querySelectorAll('.sq');
    for (var i = 0; i < sqs.length; i++) {
      var c = +sqs[i].dataset.c, r = +sqs[i].dataset.r;
      // coordinates in the corners, like chess.com
      sqs[i].textContent = (c === 0 || r === 7) ? coordText(c, r, flipped) : '';
    }
  }

  function coordText(c, r, flipped) {
    var t = '';
    if (c === 0) t += flipped ? r + 1 : 8 - r;
    if (r === 7) t += flipped ? 'hgfedcba'[c] : 'abcdefgh'[c];
    return t;
  }

  function renderAll() {
    renderPresets();
    renderBindings();
    renderOptions();
    renderBoard();
  }

  function flash(c, r) {
    var sq = $('board').querySelector('.sq[data-c="' + c + '"][data-r="' + r + '"]');
    if (!sq) return;
    sq.classList.remove('hit');
    void sq.offsetWidth;
    sq.classList.add('hit');
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;

    if (capturing) {
      e.preventDefault();
      if (e.code === 'Escape') {
        capturing = null;
        $('note').textContent = '';
        renderBindings();
        return;
      }
      if (RESERVED.indexOf(e.code) !== -1) {
        $('note').textContent = CK.keyLabel(e.code) + ' cannot be used as a binding.';
        return;
      }
      var stolenFrom = CK.actionForCode(settings.keys, e.code);
      CK.ACTIONS.forEach(function (a) {
        settings.keys[a] = settings.keys[a].filter(function (k) { return k !== e.code; });
      });
      settings.keys[capturing].push(e.code);
      $('note').textContent = stolenFrom && stolenFrom !== capturing
        ? CK.keyLabel(e.code) + ' was moved from "' + CK.ACTION_LABELS[stolenFrom] + '".'
        : '';
      capturing = null;
      persist();
      renderAll();
      return;
    }

    if (tag === 'SELECT' || (tag === 'INPUT' && e.target.type !== 'checkbox')) return;

    var action = CK.actionForCode(settings.keys, e.code);
    $('rKey').textContent = CK.keyLabel(e.code);
    $('rAct').textContent = action ? CK.ACTION_LABELS[action] : 'unbound';
    if (!action) return;

    e.preventDefault();
    if (action === 'select') {
      if (!e.repeat) {
        clicks++;
        $('rClicks').textContent = clicks;
        flash(cur.c, cur.r);
      }
    } else {
      cur = CK.move(cur, action, settings.wrap, e.shiftKey ? settings.jumpSteps : 1);
    }
    renderBoard();
  }

  function bindOptions() {
    ['enabled', 'wrap', 'showLabel'].forEach(function (id) {
      $(id).onchange = function () { settings[id] = $(id).checked; persist(); renderBoard(); };
    });
    $('jumpSteps').onchange = function () { settings.jumpSteps = parseInt($('jumpSteps').value, 10); persist(); };
    $('cursorStyle').onchange = function () { settings.cursorStyle = $('cursorStyle').value; persist(); renderBoard(); };
    $('cursorColor').oninput = function () { settings.cursorColor = $('cursorColor').value; persist(); renderBoard(); };
    $('cursorOpacity').oninput = function () { settings.cursorOpacity = parseFloat($('cursorOpacity').value); persist(); renderBoard(); };
    $('flip').onchange = renderBoard;
    $('reset').onclick = function () {
      settings = JSON.parse(JSON.stringify(CK.DEFAULTS));
      capturing = null;
      $('note').textContent = '';
      persist();
      renderAll();
    };
  }

  buildBoard();
  bindOptions();
  window.addEventListener('keydown', onKeyDown, true);
  CK.load(function (s) {
    settings = s;
    renderAll();
  });
  CK.onChange(function (s) {
    // another page (the popup) changed settings
    if (JSON.stringify(s) !== JSON.stringify(settings)) {
      settings = s;
      renderAll();
    }
  });
})();
