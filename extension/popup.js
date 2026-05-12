(function () {
  const inputEl   = document.getElementById('input');
  const outputEl  = document.getElementById('output');
  const statusDot = document.getElementById('status-dot');
  const statusMsg = document.getElementById('status-msg');
  const foldBtns  = document.getElementById('fold-btns');
  const openFull  = document.getElementById('open-full');
  const paneInput = document.getElementById('pane-input');
  const divider   = document.getElementById('divider');
  const mainEl    = document.getElementById('main');

  let lastParsed;
  let toastTimer;

  // ── Toast ──────────────────────────────────────────────────
  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (type === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, 2000);
  }

  // ── Status ─────────────────────────────────────────────────
  function setStatus(ok, msg) {
    statusDot.className = 'status-dot' + (ok === true ? ' ok' : ok === false ? ' err' : '');
    statusMsg.textContent = msg;
  }

  // ── Divider drag to resize panes ───────────────────────────
  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    divider.classList.add('dragging');
    const startX    = e.clientX;
    const startW    = paneInput.offsetWidth;
    const mainW     = mainEl.offsetWidth;

    function onMove(e) {
      const delta   = e.clientX - startX;
      const newW    = Math.max(80, Math.min(mainW * 0.7, startW + delta));
      paneInput.style.width = newW + 'px';
    }
    function onUp() {
      divider.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── tryParse ───────────────────────────────────────────────
  function tryParse(str) {
    // Pass 1: direct parse
    // If result is a string, try to parse it again (handles "{\"a\":1}" — JSON string whose value is JSON)
    try {
      const r = JSON.parse(str);
      if (typeof r !== 'string') return { parsed: r, unescaped: false };
      try { return { parsed: JSON.parse(r), unescaped: true }; } catch (_) {}
      return { parsed: r, unescaped: false };
    } catch (_) {}
    // Pass 2: escaped JSON without outer quotes — e.g. {\"a\":1}
    try {
      const inner = JSON.parse('"' + str + '"');
      if (typeof inner === 'string') return { parsed: JSON.parse(inner), unescaped: true };
    } catch (_) {}
    // Pass 3: outer quotes wrapping unescaped JSON — e.g. "{"a":1}"
    if (str.length >= 2 && str[0] === '"' && str[str.length - 1] === '"') {
      const stripped = str.slice(1, -1);
      try { return { parsed: JSON.parse(stripped), unescaped: true }; } catch (_) {}
      try {
        const inner = JSON.parse('"' + stripped + '"');
        if (typeof inner === 'string') return { parsed: JSON.parse(inner), unescaped: true };
      } catch (_) {}
    }
    throw new SyntaxError('Invalid JSON');
  }

  // ── Tree renderer ──────────────────────────────────────────
  function renderNode(key, val, comma, depth) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-node';

    const line = document.createElement('span');
    line.className = 'node-line';

    if (key !== null) {
      const k = document.createElement('span');
      k.className = 'key';
      k.textContent = '"' + key + '"';
      line.appendChild(k);
      const c = document.createElement('span');
      c.className = 'colon';
      c.textContent = ':';
      line.appendChild(c);
    }

    if (val !== null && typeof val === 'object') {
      const isArr  = Array.isArray(val);
      const keys   = isArr ? null : Object.keys(val);
      const count  = isArr ? val.length : keys.length;
      const open   = isArr ? '[' : '{';
      const close  = isArr ? ']' : '}';

      if (count === 0) {
        const s = document.createElement('span');
        s.className = 'bracket';
        s.textContent = open + close + (comma ? ',' : '');
        line.appendChild(s);
        // copy button for empty obj/arr
        line.appendChild(makeCopyBtn(val));
        wrap.appendChild(line);
        return wrap;
      }

      const toggle = document.createElement('span');
      toggle.className = 'toggle';

      const openBracket = document.createElement('span');
      openBracket.className = 'bracket';
      openBracket.textContent = open;

      const preview = document.createElement('span');
      preview.className = 'inline-preview';
      preview.textContent = isArr ? count + ' items' : count + ' keys';

      // copy button on the opening line
      const copyBtn = makeCopyBtn(val);

      const children = document.createElement('div');
      children.className = 'children';

      const closeLine = document.createElement('div');
      const closeBracket = document.createElement('span');
      closeBracket.className = 'bracket';
      closeBracket.textContent = close + (comma ? ',' : '');
      closeLine.appendChild(closeBracket);

      const startCollapsed = depth >= 1;
      if (startCollapsed) {
        toggle.textContent = '▸';
        children.classList.add('collapsed');
        preview.style.display = '';
        closeLine.style.display = 'none';
      } else {
        toggle.textContent = '▾';
        preview.style.display = 'none';
      }

      const items = isArr ? val : keys;
      items.forEach((item, i) => {
        const childKey = isArr ? null : item;
        const childVal = isArr ? item : val[item];
        children.appendChild(renderNode(childKey, childVal, i < items.length - 1, depth + 1));
      });

      toggle.addEventListener('click', () => {
        const collapsed = children.classList.toggle('collapsed');
        toggle.textContent = collapsed ? '▸' : '▾';
        preview.style.display = collapsed ? '' : 'none';
        closeLine.style.display = collapsed ? 'none' : '';
      });

      line.prepend(toggle);
      line.appendChild(openBracket);
      line.appendChild(preview);
      line.appendChild(copyBtn);
      wrap.appendChild(line);
      wrap.appendChild(children);
      wrap.appendChild(closeLine);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'toggle';
      spacer.style.cursor = 'default';
      line.prepend(spacer);

      const v = document.createElement('span');
      if (val === null)                  { v.className = 'null';    v.textContent = 'null'; }
      else if (typeof val === 'boolean') { v.className = 'boolean'; v.textContent = String(val); }
      else if (typeof val === 'number')  { v.className = 'number';  v.textContent = String(val); }
      else {
        v.className = 'string';
        v.textContent = '"' + String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      }
      line.appendChild(v);
      if (comma) {
        const cm = document.createElement('span');
        cm.className = 'comma';
        cm.textContent = ',';
        line.appendChild(cm);
      }
      line.appendChild(makeCopyBtn(val));
      wrap.appendChild(line);
    }

    return wrap;
  }

  function makeCopyBtn(val) {
    const btn = document.createElement('button');
    btn.className = 'node-copy';
    btn.textContent = 'copy';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = 'copy'; }, 1200);
      });
    });
    return btn;
  }

  function buildTree(parsed) {
    const root = document.createElement('div');
    root.className = 'tree-node root-node';
    root.appendChild(renderNode(null, parsed, false, 0));
    return root;
  }

  // ── Expand / Collapse All ──────────────────────────────────
  function setAllCollapsed(collapsed) {
    outputEl.querySelectorAll('.children').forEach(el => {
      el.classList.toggle('collapsed', collapsed);
      const closeLine = el.nextElementSibling;
      if (closeLine) closeLine.style.display = collapsed ? 'none' : '';
    });
    outputEl.querySelectorAll('.toggle').forEach(el => {
      if (el.style.cursor === 'default') return;
      el.textContent = collapsed ? '▸' : '▾';
    });
    outputEl.querySelectorAll('.inline-preview').forEach(el => {
      el.style.display = collapsed ? '' : 'none';
    });
  }

  document.getElementById('btn-expand').addEventListener('click', () => setAllCollapsed(false));
  document.getElementById('btn-collapse').addEventListener('click', () => setAllCollapsed(true));

  // ── Format ─────────────────────────────────────────────────
  function doFormat() {
    const raw = inputEl.value.trim();
    if (!raw) {
      outputEl.innerHTML = '';
      outputEl.className = 'output-area';
      foldBtns.style.display = 'none';
      setStatus(null, 'Ready');
      lastParsed = undefined;
      return;
    }

    let parsed, unescaped;
    try {
      ({ parsed, unescaped } = tryParse(raw));
    } catch (e) {
      outputEl.className = 'output-area has-error';
      outputEl.textContent = e.message;
      foldBtns.style.display = 'none';
      setStatus(false, '✗ ' + e.message);
      lastParsed = undefined;
      return;
    }

    lastParsed = parsed;
    outputEl.innerHTML = '';
    outputEl.className = 'output-area';

    const formatted = JSON.stringify(parsed, null, 2);
    const lines = formatted.split('\n').length;
    const bytes = new Blob([formatted]).size;
    const size  = bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
    const hint  = unescaped ? ' · auto-unescaped' : '';

    outputEl.appendChild(buildTree(parsed));
    foldBtns.style.display = '';
    setStatus(true, '✓ Valid' + hint + ' · ' + lines + ' lines · ' + size);
  }

  let timer;
  inputEl.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(doFormat, 300);
  });

  // ── Buttons ────────────────────────────────────────────────
  document.getElementById('btn-format').addEventListener('click', doFormat);

  document.getElementById('btn-clear').addEventListener('click', () => {
    inputEl.value = '';
    outputEl.innerHTML = '';
    outputEl.className = 'output-area';
    foldBtns.style.display = 'none';
    setStatus(null, 'Ready');
    lastParsed = undefined;
    openFull.href = 'https://jsonopen.com';
    openFull.textContent = 'Open full site ↗';
  });

  document.getElementById('btn-copy').addEventListener('click', () => {
    if (lastParsed === undefined) { showToast('Nothing to copy', 'error'); return; }
    navigator.clipboard.writeText(JSON.stringify(lastParsed, null, 2)).then(() => {
      showToast('Copied!');
    });
  });

  // ── Share ──────────────────────────────────────────────────
  document.getElementById('btn-share').addEventListener('click', () => {
    const raw = inputEl.value.trim();
    if (!raw) { showToast('Paste some JSON first', 'error'); return; }
    try {
      const compressed = pako.deflate(raw);
      let binary = '';
      compressed.forEach(b => { binary += String.fromCharCode(b); });
      const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const url = 'https://jsonopen.com/?d=' + b64;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Share link copied!');
        openFull.href = url;
        openFull.textContent = 'Open shared link ↗';
      }).catch(() => { prompt('Copy this link:', url); });
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
  });

  // ── Open full site: carry JSON via ?d= ────────────────────
  openFull.addEventListener('click', (e) => {
    const raw = inputEl.value.trim();
    if (!raw) return;
    e.preventDefault();
    try {
      const compressed = pako.deflate(raw);
      let binary = '';
      compressed.forEach(b => { binary += String.fromCharCode(b); });
      const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      chrome.tabs.create({ url: 'https://jsonopen.com/?d=' + b64 });
    } catch (_) {
      chrome.tabs.create({ url: 'https://jsonopen.com' });
    }
  });

  // ── Paste anywhere → input ─────────────────────────────────
  document.addEventListener('paste', (e) => {
    if (document.activeElement === inputEl) return;
    const text = e.clipboardData.getData('text');
    if (!text) return;
    inputEl.value = text;
    doFormat();
    inputEl.focus();
  });
})();
