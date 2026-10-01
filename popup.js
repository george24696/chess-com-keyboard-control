(function () {
  var $ = function (id) { return document.getElementById(id); };
  var settings;

  function matchId(keys) {
    var hit = CK.PRESETS.filter(function (p) {
      return CK.ACTIONS.every(function (a) {
        return (p.keys[a] || []).slice().sort().join() === (keys[a] || []).slice().sort().join();
      });
    })[0];
    return hit ? hit.id : 'custom';
  }

  var sel = $('layout');
  CK.PRESETS.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.name;
    sel.appendChild(o);
  });
  var custom = document.createElement('option');
  custom.value = 'custom';
  custom.textContent = 'Custom';
  sel.appendChild(custom);

  CK.load(function (s) {
    settings = s;
    $('enabled').checked = s.enabled;
    sel.value = matchId(s.keys);
  });

  $('enabled').onchange = function () {
    settings.enabled = $('enabled').checked;
    CK.save(settings);
  };
  sel.onchange = function () {
    var p = CK.PRESETS.filter(function (x) { return x.id === sel.value; })[0];
    if (!p) return;
    settings.keys = JSON.parse(JSON.stringify(p.keys));
    CK.save(settings);
  };
  $('open').onclick = function () {
    chrome.runtime.openOptionsPage();
    window.close();
  };
})();
