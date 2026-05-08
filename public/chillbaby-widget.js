(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  var API_URL     = 'https://ai-backend-v0.onrender.com/chat';
  var BOT_ID      = 'chillbaby';
  var WELCOME_MSG = "Hi! 👋 I'm the Chill Baby assistant. Looking for safe nail polish for your little one, or need a gift idea? I'm here to help!";
  var QUICK_REPLIES = [
    'Shop all products',
    'Gift box ideas',
    'Is it safe for kids?'
  ];

  // ── Styles ────────────────────────────────────────────────────────────────
  var css = [
    ':root {',
    '  --cb-pink:       #ff8fab;',
    '  --cb-pink-dark:  #e8738f;',
    '  --cb-pink-light: #fff0f4;',
    '  --cb-text:       #3a2a2e;',
    '  --cb-text-muted: #9e8289;',
    '  --cb-bg:         #ffffff;',
    '  --cb-border:     #f5dde3;',
    '  --cb-radius:     16px;',
    '  --cb-shadow:     0 8px 32px rgba(255,143,171,0.22), 0 2px 8px rgba(0,0,0,0.08);',
    '  --cb-font:       -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '}',

    // Bubble
    '#cb-bubble {',
    '  position: fixed;',
    '  bottom: 94px;',
    '  right: 24px;',
    '  width: 56px;',
    '  height: 56px;',
    '  background: var(--cb-pink);',
    '  border-radius: 50%;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  box-shadow: var(--cb-shadow);',
    '  z-index: 99999;',
    '  transition: transform 0.2s ease, background 0.2s ease;',
    '  border: none;',
    '  outline: none;',
    '}',
    '#cb-bubble:hover { background: var(--cb-pink-dark); transform: scale(1.08); }',
    '#cb-bubble svg { width: 26px; height: 26px; fill: #fff; display: block; }',

    // Unread dot
    '#cb-unread {',
    '  position: absolute;',
    '  top: 2px;',
    '  right: 2px;',
    '  width: 12px;',
    '  height: 12px;',
    '  background: #ff4d6d;',
    '  border-radius: 50%;',
    '  border: 2px solid #fff;',
    '  display: none;',
    '}',

    // Window
    '#cb-window {',
    '  position: fixed;',
    '  bottom: 160px;',
    '  right: 24px;',
    '  width: 360px;',
    '  max-height: 560px;',
    '  background: var(--cb-bg);',
    '  border-radius: var(--cb-radius);',
    '  box-shadow: var(--cb-shadow);',
    '  display: flex;',
    '  flex-direction: column;',
    '  z-index: 99998;',
    '  overflow: hidden;',
    '  font-family: var(--cb-font);',
    '  border: 1px solid var(--cb-border);',
    '  transform: scale(0.92) translateY(12px);',
    '  opacity: 0;',
    '  pointer-events: none;',
    '  transition: transform 0.22s ease, opacity 0.22s ease;',
    '  transform-origin: bottom right;',
    '}',
    '#cb-window.cb-open {',
    '  transform: scale(1) translateY(0);',
    '  opacity: 1;',
    '  pointer-events: auto;',
    '}',

    // Header
    '#cb-header {',
    '  background: var(--cb-pink);',
    '  padding: 14px 16px;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  flex-shrink: 0;',
    '}',
    '#cb-header-avatar {',
    '  width: 34px;',
    '  height: 34px;',
    '  background: rgba(255,255,255,0.3);',
    '  border-radius: 50%;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-size: 18px;',
    '  flex-shrink: 0;',
    '}',
    '#cb-header-info { flex: 1; }',
    '#cb-header-name {',
    '  font-size: 0.92rem;',
    '  font-weight: 700;',
    '  color: #fff;',
    '  line-height: 1.2;',
    '}',
    '#cb-header-status {',
    '  font-size: 0.72rem;',
    '  color: rgba(255,255,255,0.82);',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '}',
    '#cb-header-status::before {',
    '  content: "";',
    '  display: inline-block;',
    '  width: 6px;',
    '  height: 6px;',
    '  background: #b7f7c8;',
    '  border-radius: 50%;',
    '}',
    '#cb-close {',
    '  background: rgba(255,255,255,0.2);',
    '  border: none;',
    '  border-radius: 50%;',
    '  width: 28px;',
    '  height: 28px;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  color: #fff;',
    '  font-size: 16px;',
    '  line-height: 1;',
    '  flex-shrink: 0;',
    '  transition: background 0.15s;',
    '}',
    '#cb-close:hover { background: rgba(255,255,255,0.35); }',

    // Messages
    '#cb-messages {',
    '  flex: 1;',
    '  overflow-y: auto;',
    '  padding: 16px 14px;',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '  scroll-behavior: smooth;',
    '}',
    '#cb-messages::-webkit-scrollbar { width: 4px; }',
    '#cb-messages::-webkit-scrollbar-track { background: transparent; }',
    '#cb-messages::-webkit-scrollbar-thumb { background: var(--cb-border); border-radius: 4px; }',

    // Message bubbles
    '.cb-msg {',
    '  max-width: 82%;',
    '  line-height: 1.5;',
    '  font-size: 0.88rem;',
    '  word-break: break-word;',
    '}',
    '.cb-msg-bot {',
    '  align-self: flex-start;',
    '  background: var(--cb-pink-light);',
    '  color: var(--cb-text);',
    '  border-radius: 4px 16px 16px 16px;',
    '  padding: 10px 13px;',
    '}',
    '.cb-msg-user {',
    '  align-self: flex-end;',
    '  background: var(--cb-pink);',
    '  color: #fff;',
    '  border-radius: 16px 4px 16px 16px;',
    '  padding: 10px 13px;',
    '}',
    '.cb-msg-bot a { color: #c2185b; text-decoration: underline; }',

    // Typing indicator
    '#cb-typing {',
    '  align-self: flex-start;',
    '  background: var(--cb-pink-light);',
    '  border-radius: 4px 16px 16px 16px;',
    '  padding: 11px 14px;',
    '  display: none;',
    '}',
    '#cb-typing.cb-visible { display: flex; gap: 4px; align-items: center; }',
    '.cb-dot {',
    '  width: 7px;',
    '  height: 7px;',
    '  background: var(--cb-pink);',
    '  border-radius: 50%;',
    '  animation: cb-bounce 1.2s infinite ease-in-out;',
    '}',
    '.cb-dot:nth-child(2) { animation-delay: 0.2s; }',
    '.cb-dot:nth-child(3) { animation-delay: 0.4s; }',
    '@keyframes cb-bounce {',
    '  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }',
    '  40% { transform: scale(1); opacity: 1; }',
    '}',

    // Quick replies
    '#cb-quick-replies {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 7px;',
    '  padding: 0 14px 12px;',
    '  flex-shrink: 0;',
    '}',
    '.cb-qr {',
    '  background: var(--cb-bg);',
    '  border: 1.5px solid var(--cb-pink);',
    '  color: var(--cb-pink-dark);',
    '  border-radius: 999px;',
    '  padding: 6px 13px;',
    '  font-size: 0.80rem;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  font-family: var(--cb-font);',
    '  transition: background 0.15s, color 0.15s;',
    '  white-space: nowrap;',
    '}',
    '.cb-qr:hover { background: var(--cb-pink); color: #fff; }',

    // Input area
    '#cb-input-row {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 10px 12px;',
    '  border-top: 1px solid var(--cb-border);',
    '  flex-shrink: 0;',
    '  background: var(--cb-bg);',
    '}',
    '#cb-input {',
    '  flex: 1;',
    '  border: 1.5px solid var(--cb-border);',
    '  border-radius: 999px;',
    '  padding: 9px 14px;',
    '  font-size: 0.86rem;',
    '  font-family: var(--cb-font);',
    '  color: var(--cb-text);',
    '  outline: none;',
    '  background: var(--cb-bg);',
    '  transition: border-color 0.15s;',
    '}',
    '#cb-input:focus { border-color: var(--cb-pink); }',
    '#cb-input::placeholder { color: var(--cb-text-muted); }',
    '#cb-send {',
    '  background: var(--cb-pink);',
    '  border: none;',
    '  border-radius: 50%;',
    '  width: 36px;',
    '  height: 36px;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  flex-shrink: 0;',
    '  transition: background 0.15s, transform 0.15s;',
    '}',
    '#cb-send:hover { background: var(--cb-pink-dark); transform: scale(1.08); }',
    '#cb-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }',
    '#cb-send svg { width: 16px; height: 16px; fill: #fff; display: block; }',

    // Mobile
    '@media (max-width: 480px) {',
    '  #cb-window {',
    '    right: 0;',
    '    bottom: 0;',
    '    width: 100%;',
    '    max-height: 85vh;',
    '    border-radius: var(--cb-radius) var(--cb-radius) 0 0;',
    '    border-left: none;',
    '    border-right: none;',
    '    border-bottom: none;',
    '  }',
    '  #cb-bubble { bottom: 86px; right: 16px; }',
    '}',
  ].join('\n');

  // ── Inject styles ─────────────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Build HTML ────────────────────────────────────────────────────────────
  // Bubble
  var bubble = document.createElement('button');
  bubble.id = 'cb-bubble';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 2C6.477 2 2 6.12 2 11.2c0 2.7 1.2 5.13 3.14 6.84L4 22l4.36-1.4A10.7 10.7 0 0012 21.4c5.523 0 10-4.12 10-9.2S17.523 2 12 2z"/>' +
    '</svg>' +
    '<span id="cb-unread"></span>';
  document.body.appendChild(bubble);

  // Chat window
  var win = document.createElement('div');
  win.id = 'cb-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Chill Baby Assistant chat');
  win.innerHTML =
    '<div id="cb-header">' +
      '<div id="cb-header-avatar">🌸</div>' +
      '<div id="cb-header-info">' +
        '<div id="cb-header-name">Chill Baby Assistant</div>' +
        '<div id="cb-header-status">Online</div>' +
      '</div>' +
      '<button id="cb-close" aria-label="Close chat">&#x2715;</button>' +
    '</div>' +
    '<div id="cb-messages">' +
      '<div id="cb-typing"><span class="cb-dot"></span><span class="cb-dot"></span><span class="cb-dot"></span></div>' +
    '</div>' +
    '<div id="cb-quick-replies"></div>' +
    '<div id="cb-input-row">' +
      '<input id="cb-input" type="text" placeholder="Type a message..." autocomplete="off" />' +
      '<button id="cb-send" aria-label="Send">' +
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
      '</button>' +
    '</div>';
  document.body.appendChild(win);

  // ── Element refs ──────────────────────────────────────────────────────────
  var messagesEl   = document.getElementById('cb-messages');
  var typingEl     = document.getElementById('cb-typing');
  var inputEl      = document.getElementById('cb-input');
  var sendEl       = document.getElementById('cb-send');
  var quickReplies = document.getElementById('cb-quick-replies');
  var unreadDot    = document.getElementById('cb-unread');

  // ── State ─────────────────────────────────────────────────────────────────
  var isOpen              = false;
  var isWaiting           = false;
  var quickUsed           = false;
  var conversationHistory = [];

  // ── Helpers ───────────────────────────────────────────────────────────────
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function parseMarkdownLinks(text) {
    var escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    // Pass 1 — markdown links: [text](url)
    var result = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, function (_, linkText, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a>';
    });
    // Pass 2 — bare https:// URLs not already inside an <a href="...">
    return result.replace(/(?<!href=")https?:\/\/[^\s<>"]+/g, function (url) {
      var clean = url.replace(/[.,;:!?]+$/, '');
      var trail = url.slice(clean.length);
      return '<a href="' + clean + '" target="_blank" rel="noopener noreferrer">' + clean + '</a>' + trail;
    });
  }

  function addMessage(text, role) {
    var el = document.createElement('div');
    el.className = 'cb-msg cb-msg-' + role;
    el.innerHTML = parseMarkdownLinks(text);
    // Insert before typing indicator so typing dot stays at bottom
    messagesEl.insertBefore(el, typingEl);
    scrollToBottom();
    return el;
  }

  function showTyping() {
    typingEl.classList.add('cb-visible');
    scrollToBottom();
  }

  function hideTyping() {
    typingEl.classList.remove('cb-visible');
  }

  function setWaiting(val) {
    isWaiting      = val;
    sendEl.disabled = val;
    inputEl.disabled = val;
  }

  function removeQuickReplies() {
    if (quickUsed) return;
    quickUsed = true;
    quickReplies.innerHTML = '';
  }

  function buildQuickReplies() {
    quickReplies.innerHTML = '';
    QUICK_REPLIES.forEach(function (label) {
      var btn = document.createElement('button');
      btn.className = 'cb-qr';
      btn.textContent = label;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeQuickReplies();
        sendMessage(label);
      });
      quickReplies.appendChild(btn);
    });
  }

  // ── API call ──────────────────────────────────────────────────────────────
  function sendMessage(text) {
    text = text.trim();
    if (!text || isWaiting) return;

    addMessage(text, 'user');
    conversationHistory.push({ role: 'user', content: text });
    inputEl.value = '';
    setWaiting(true);
    showTyping();

    fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: text, bot: BOT_ID, history: conversationHistory }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        var reply = (data && (data.reply || data.message || data.response)) || 'Sorry, I didn\'t catch that. Try again?';
        addMessage(reply, 'bot');
        conversationHistory.push({ role: 'assistant', content: reply });
      })
      .catch(function () {
        hideTyping();
        addMessage('Oops — something went wrong. Please try again in a moment! 💕', 'bot');
      })
      .finally(function () {
        setWaiting(false);
        scrollToBottom();
      });
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('cb-open');
    unreadDot.style.display = 'none';
    bubble.setAttribute('aria-label', 'Close chat');
    setTimeout(function () { inputEl.focus(); }, 250);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('cb-open');
    bubble.setAttribute('aria-label', 'Open chat');
  }

  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  // ── Welcome message on load ───────────────────────────────────────────────
  function showWelcome() {
    addMessage(WELCOME_MSG, 'bot');
    buildQuickReplies();
    // Show unread dot while closed
    if (!isOpen) {
      unreadDot.style.display = 'block';
    }
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  bubble.addEventListener('click', toggleChat);
  document.getElementById('cb-close').addEventListener('click', closeChat);

  sendEl.addEventListener('click', function () {
    removeQuickReplies();
    sendMessage(inputEl.value);
  });

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      removeQuickReplies();
      sendMessage(inputEl.value);
    }
  });

  // Close on overlay click (outside window)
  document.addEventListener('click', function (e) {
    if (isOpen && !win.contains(e.target) && !bubble.contains(e.target)) {
      closeChat();
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  showWelcome();

})();
