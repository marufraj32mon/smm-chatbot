/**
 * AI Chatbot Widget - Embeddable Script
 * Usage: <script src="https://your-domain.com/chatbot/widget.js" data-key="PUBLIC_KEY"></script>
 */
(function () {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────────
  var script = document.currentScript;
  var PUBLIC_KEY = script && script.dataset.key;
  if (!PUBLIC_KEY) {
    console.error('[Chatbot] Missing data-key attribute on script tag');
    return;
  }

  var API_BASE = script.src.replace(/\/chatbot[-\/]widget\.js.*$/, '');
  var INIT_URL = API_BASE + '/api/chatbot/init?key=' + PUBLIC_KEY;
  var MSG_URL = API_BASE + '/api/chatbot/message';
  var HISTORY_URL = API_BASE + '/api/chatbot/history';
  var SUGGESTIONS_URL = API_BASE + '/api/chatbot/suggestions';
  var FEEDBACK_URL = API_BASE + '/api/chatbot/feedback';
  var STORAGE_KEY = 'smm_chatbot_session_' + PUBLIC_KEY;

  // ─── State ────────────────────────────────────────────────────────────
  var config = null;
  var sessionToken = null;
  var isOpen = false;
  var isExpanded = false;
  var isLoading = false;
  var messages = [];
  var sessionMode = 'bot'; // 'bot' | 'pending' | 'human'
  var pusherChannel = null;
  var pusherInstance = null;
  var historyLoaded = false;
  var pollTimer = null;
  var lastPollMessageCount = 0;

  // Restore session from localStorage
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed.token && parsed.expires > Date.now()) {
        sessionToken = parsed.token;
        // Don't restore mode from localStorage — always start as 'bot'
        // The history API will sync the correct mode from server
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (e) { }

  // ─── Styles ───────────────────────────────────────────────────────────
  function injectStyles(color, shape) {
    var shapeCSS = getButtonShapeCSS(shape || 'circle');
    var css = `
      #smm-chatbot-wrapper * { box-sizing: border-box; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

      /* ── Toggle Button ── */
      #smm-chatbot-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 99998;
        width: 60px; height: 60px; ${shapeCSS} border: none; cursor: pointer;
        background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
        color: #fff;
        box-shadow: 0 4px 16px ${color}44;
        transition: transform 0.3s, box-shadow 0.3s;
        display: flex; align-items: center; justify-content: center;
      }
      #smm-chatbot-btn:hover { transform: scale(1.08); box-shadow: 0 6px 24px ${color}55; }
      #smm-chatbot-btn svg { width: 28px; height: 28px; fill: none; stroke: currentColor; }

      /* ── Greeting Bubble ── */
      #smm-chatbot-greeting {
        position: fixed; bottom: 92px; right: 24px; z-index: 99997;
        background: #fff; color: #1e293b;
        padding: 14px 40px 14px 16px;
        border-radius: 16px 16px 4px 16px; max-width: 280px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03);
        font-size: 14px; line-height: 1.5; cursor: pointer;
        animation: smm-bubble-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: none;
        transition: opacity 0.3s, transform 0.3s;
        border-left: 3px solid ${color};
      }
      #smm-chatbot-greeting::after {
        content: ''; position: absolute; bottom: -8px; right: 24px;
        width: 0; height: 0;
        border-left: 8px solid transparent; border-right: 8px solid transparent;
        border-top: 8px solid #fff;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.06));
      }
      #smm-chatbot-greeting:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 36px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04);
      }
      #smm-chatbot-greeting .smm-greeting-avatar {
        width: 32px; height: 32px; border-radius: 50%;
        background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 16px; color: #fff; flex-shrink: 0;
        margin-right: 10px; vertical-align: middle;
        float: left;
      }
      #smm-chatbot-greeting .smm-greeting-avatar img {
        width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
      }
      #smm-chatbot-greeting .smm-greeting-text {
        font-weight: 500; color: #334155;
      }
      #smm-chatbot-greeting .smm-greeting-close {
        position: absolute; top: 6px; right: 8px;
        background: none; border: none; cursor: pointer;
        color: #cbd5e1; font-size: 16px; padding: 2px 6px; line-height: 1;
        border-radius: 50%; transition: all 0.2s;
      }
      #smm-chatbot-greeting .smm-greeting-close:hover {
        color: #64748b; background: #f1f5f9;
      }
      @keyframes smm-bubble-in {
        0% { opacity: 0; transform: translateY(16px) scale(0.85); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      #smm-chatbot-greeting.smm-bubble-out {
        opacity: 0; transform: translateY(10px) scale(0.9);
        pointer-events: none;
      }

      /* ── Chat Button Pulse (attention) ── */
      #smm-chatbot-btn.smm-pulse::before {
        content: ''; position: absolute; inset: -4px;
        border-radius: 50%; border: 2px solid ${color}55;
        animation: smm-pulse-ring 2s ease-out infinite;
      }
      @keyframes smm-pulse-ring {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.4); opacity: 0; }
      }

      /* ── Chat Window ── */
      #smm-chatbot-window {
        position: fixed; bottom: 96px; right: 24px; z-index: 99999;
        width: 380px; max-width: calc(100vw - 32px); height: 540px; max-height: calc(100vh - 120px);
        background: #fff; border-radius: 20px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04);
        display: none; flex-direction: column; overflow: hidden;
        animation: smm-slide-up 0.3s ease-out;
        transition: width 0.3s ease, height 0.3s ease, max-height 0.3s ease, bottom 0.3s ease, border-radius 0.3s ease;
      }
      #smm-chatbot-window.open { display: flex; }
      @keyframes smm-slide-up {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* ── Expanded Mode ── */
      #smm-chatbot-window.expanded {
        width: 700px !important; max-width: calc(100vw - 48px) !important;
        height: 85vh !important; max-height: calc(100vh - 48px) !important;
        bottom: 24px; right: 24px;
        border-radius: 16px;
      }
      #smm-chatbot-window.expanded .smm-chatbot-msg { max-width: 75%; font-size: 15px; }
      #smm-chatbot-window.expanded .smm-chatbot-input { font-size: 15px; }

      /* ── Header ── */
      .smm-chatbot-header {
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        color: #fff; padding: 18px 20px;
        display: flex; align-items: center; gap: 12px;
        flex-shrink: 0;
      }
      .smm-chatbot-header-avatar {
        width: 42px; height: 42px; border-radius: 50%;
        background: #fff;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; font-size: 20px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .smm-chatbot-header-avatar img {
        width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
      }
      .smm-chatbot-header-info { flex: 1; min-width: 0; }
      .smm-chatbot-header-name { font-weight: 700; font-size: 16px; }
      .smm-chatbot-header-status { font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 6px; margin-top: 2px; }
      .smm-chatbot-close {
        background: rgba(255,255,255,0.2); border: none; color: #fff; cursor: pointer;
        width: 30px; height: 30px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s; flex-shrink: 0;
        font-size: 16px; line-height: 1;
      }
      .smm-chatbot-close:hover { background: rgba(255,255,255,0.35); }
      .smm-chatbot-expand {
        background: rgba(255,255,255,0.2); border: none; color: #fff; cursor: pointer;
        width: 30px; height: 30px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s, transform 0.2s; flex-shrink: 0;
        font-size: 14px; line-height: 1;
      }
      .smm-chatbot-expand:hover { background: rgba(255,255,255,0.35); }
      .smm-chatbot-expand.active { transform: rotate(180deg); }
      .smm-chatbot-newchat {
        background: rgba(255,255,255,0.2); border: none; color: #fff; cursor: pointer;
        width: 30px; height: 30px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s; flex-shrink: 0;
        font-size: 14px; line-height: 1; margin-right: 4px;
      }
      .smm-chatbot-newchat:hover { background: rgba(255,255,255,0.35); }
      .smm-chatbot-header-actions { display: flex; align-items: center; gap: 4px; }

      /* ── Live Badge ── */
      .smm-chatbot-live-badge {
        display: none; align-items: center; gap: 5px; padding: 2px 8px;
        font-size: 10px; font-weight: 600; background: rgba(255,255,255,0.2); color: #fff;
        border-radius: 10px; margin-left: 6px;
      }
      .smm-chatbot-live-badge.active { display: inline-flex; }
      .smm-chatbot-live-badge span { width: 5px; height: 5px; border-radius: 50%; background: #4ade80; animation: smm-pulse 2s infinite; }
      @keyframes smm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

      /* ── Messages ── */
      .smm-chatbot-messages {
        flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px;
        background: #f7f8fa; scroll-behavior: smooth;
      }
      .smm-chatbot-messages::-webkit-scrollbar { width: 4px; }
      .smm-chatbot-messages::-webkit-scrollbar-track { background: transparent; }
      .smm-chatbot-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

      .smm-chatbot-msg {
        max-width: 85%; padding: 12px 16px; font-size: 14px; line-height: 1.6;
        word-wrap: break-word; white-space: pre-wrap;
        animation: smm-msg-in 0.2s ease;
      }
      @keyframes smm-msg-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .smm-chatbot-msg.bot {
        align-self: flex-start;
        background: #fff; color: #1e293b;
        border-radius: 4px 18px 18px 18px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.06);
      }
      .smm-chatbot-msg.bot strong { font-weight: 700; color: #0f172a; }

      .smm-chatbot-msg.user {
        align-self: flex-end;
        background: linear-gradient(135deg, ${color}, ${color}dd);
        color: #fff;
        border-radius: 18px 18px 4px 18px;
      }

      .smm-chatbot-msg.agent {
        align-self: flex-start;
        background: #ecfdf5; color: #064e3b;
        border-radius: 4px 18px 18px 18px;
        border: 1px solid #d1fae5;
      }
      .smm-chatbot-msg.agent .smm-agent-name {
        font-size: 11px; font-weight: 700; color: #059669; margin-bottom: 4px;
        text-transform: uppercase; letter-spacing: 0.3px;
      }

      .smm-chatbot-msg.system {
        align-self: center; background: #f1f5f9; color: #64748b;
        font-size: 12px; font-style: italic; max-width: 90%; text-align: center;
        border-radius: 10px; padding: 8px 14px;
      }

      /* ── Typing (fallback) ── */
      .smm-chatbot-typing {
        align-self: flex-start; background: #fff; padding: 12px 18px;
        border-radius: 4px 18px 18px 18px;
        display: none; gap: 5px; align-items: center;
        box-shadow: 0 1px 6px rgba(0,0,0,0.06);
      }
      .smm-chatbot-typing.active { display: flex; }
      .smm-chatbot-typing span {
        width: 7px; height: 7px; background: #94a3b8; border-radius: 50%;
        animation: smm-bounce 1.4s infinite;
      }
      .smm-chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
      .smm-chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes smm-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-5px); }
      }

      /* ── Processing Steps (Kodee-style) ── */
      .smm-chatbot-steps {
        align-self: flex-start; background: #fff; padding: 14px 18px;
        border-radius: 4px 18px 18px 18px;
        display: none; flex-direction: column; gap: 6px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        min-width: 200px; animation: smm-msg-in 0.2s ease;
      }
      .smm-chatbot-steps.active { display: flex; }
      .smm-chatbot-steps-header {
        font-size: 13px; font-weight: 700; color: #1e293b;
        display: flex; align-items: center; gap: 6px; margin-bottom: 2px;
      }
      .smm-chatbot-step {
        display: flex; align-items: center; gap: 8px;
        font-size: 13px; color: #64748b; line-height: 1.4;
        animation: smm-step-in 0.25s ease;
      }
      @keyframes smm-step-in {
        from { opacity: 0; transform: translateX(-6px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .smm-chatbot-step-icon {
        width: 16px; height: 16px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px;
      }
      .smm-chatbot-step.done .smm-chatbot-step-icon { color: #22c55e; }
      .smm-chatbot-step.done { color: #94a3b8; }
      .smm-chatbot-step.active .smm-chatbot-step-icon {
        animation: smm-spin 1s linear infinite;
      }
      .smm-chatbot-step.active { color: #334155; font-weight: 500; }
      @keyframes smm-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* ── Input Area ── */
      .smm-chatbot-input-area {
        padding: 16px 20px; background: #fff;
        border-top: 1px solid #f0f0f0; display: flex; gap: 12px; align-items: center;
      }
      .smm-chatbot-input {
        flex: 1; border: 1.5px solid #e5e7eb; border-radius: 24px; padding: 10px 18px;
        font-size: 14px; resize: none; outline: none; min-height: 42px; max-height: 100px;
        font-family: inherit; line-height: 1.4; background: #fafafa;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .smm-chatbot-input::placeholder { color: #9ca3af; }
      .smm-chatbot-input:focus { border-color: ${color}; box-shadow: 0 0 0 3px ${color}15; background: #fff; }

      .smm-chatbot-send {
        width: 40px; height: 40px; border-radius: 50%; border: none; cursor: pointer;
        background: ${color}; color: #fff;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.15s, opacity 0.15s; flex-shrink: 0;
      }
      .smm-chatbot-send:hover { transform: scale(1.08); }
      .smm-chatbot-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      .smm-chatbot-send svg { width: 18px; height: 18px; }

      /* ── Footer ── */
      .smm-chatbot-powered {
        padding: 8px; text-align: center; font-size: 11px; color: #b0b0b0;
        background: #fafafa; border-top: 1px solid #f5f5f5;
      }
      .smm-chatbot-powered a { color: #888; text-decoration: none; font-weight: 500; }
      .smm-chatbot-powered a:hover { color: ${color}; }

      /* ── Suggestion Chips ── */
      .smm-chatbot-suggestions {
        display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 20px 12px;
        animation: smm-msg-in 0.3s ease;
      }
      .smm-chatbot-suggestions.greeting {
        padding: 4px 20px 16px;
      }
      .smm-chatbot-chip {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 8px 14px; border-radius: 20px; font-size: 13px;
        background: #f0f4ff; color: #3b5bdb; border: 1px solid #dbe4ff;
        cursor: pointer; transition: all 0.2s; font-family: inherit;
        white-space: nowrap;
      }
      .smm-chatbot-chip:hover { background: #dbe4ff; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(59,91,219,0.15); }
      .smm-chatbot-chip:active { transform: scale(0.97); }
      .smm-chatbot-chip::before { content: '↗'; font-size: 11px; opacity: 0.6; }

      /* ── Feedback Buttons ── */
      .smm-chatbot-feedback {
        display: flex; align-items: center; gap: 8px; margin-top: 8px;
        padding: 4px 0;
      }
      .smm-chatbot-feedback-btn {
        background: none; border: 1px solid #e5e7eb; cursor: pointer;
        padding: 4px 10px; border-radius: 16px; font-size: 14px;
        transition: all 0.2s; color: #6b7280; display: flex; align-items: center; gap: 4px;
      }
      .smm-chatbot-feedback-btn:hover { background: #f9fafb; border-color: #d1d5db; }
      .smm-chatbot-feedback-btn.active-up { background: #ecfdf5; border-color: #86efac; color: #16a34a; }
      .smm-chatbot-feedback-btn.active-down { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
      .smm-chatbot-feedback-btn:disabled { opacity: 0.5; cursor: default; }

      /* ── Mobile Fullscreen ── */
      @media (max-width: 480px) {
        #smm-chatbot-window, #smm-chatbot-window.expanded {
          bottom: 0; right: 0; left: 0; top: 0;
          width: 100%; max-width: 100%;
          height: 100%; max-height: 100%;
          height: 100dvh; max-height: 100dvh;
          border-radius: 0;
          animation: smm-slide-up-mobile 0.25s ease-out;
        }
        @keyframes smm-slide-up-mobile {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        #smm-chatbot-btn { bottom: 16px; right: 16px; width: 54px; height: 54px; }
        #smm-chatbot-btn.hidden { display: none !important; }
        #smm-chatbot-greeting { bottom: 78px; right: 16px; max-width: 220px; font-size: 13px; }
        .smm-chatbot-expand { display: none !important; }
        .smm-chatbot-header { padding: 14px 16px; padding-top: max(14px, env(safe-area-inset-top)); }
        .smm-chatbot-messages { padding: 16px 12px; }
        .smm-chatbot-input-area {
          padding: 12px 12px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
        .smm-chatbot-msg { max-width: 90%; font-size: 14px; }
        .smm-chatbot-powered { padding-bottom: max(8px, env(safe-area-inset-bottom)); }
      }
    `;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── SVG Icons ────────────────────────────────────────────────────────
  var BUTTON_ICONS = {
    chat:    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
    message: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    headset: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 18v-6a9 9 0 0118 0v6M3 18a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5zm16 0a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5z"/></svg>',
    phone:   '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>',
    robot:   '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2" stroke-linecap="round" stroke-linejoin="round"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 11V7m-4 4a4 4 0 018 0M8 15h.01M16 15h.01M9 19h6"/></svg>',
    heart:   '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    zap:     '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    help:    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  };
  var ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
  var ICON_SEND = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/></svg>';

  // ─── Button Shape CSS ─────────────────────────────────────────────────
  function getButtonShapeCSS(shape) {
    switch (shape) {
      case 'rounded':  return 'border-radius: 18px;';
      case 'squircle': return 'border-radius: 30%;';
      case 'hexagon':  return 'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); border-radius: 0;';
      case 'diamond':  return 'clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); border-radius: 0;';
      case 'bubble':   return 'border-radius: 50% 50% 8px 50%;';
      default:         return 'border-radius: 50%;'; // circle
    }
  }

  // ─── Widget i18n ──────────────────────────────────────────────────────
  // Detect language: 1) URL path prefix (/ar/, /vi/) → 2) navbar dropdown → 3) navigator.language → 4) fallback 'en'
  function detectSiteLang() {
    // 1. URL path: /ar/services → "ar"
    var pathMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    if (pathMatch && pathMatch[1] !== 'api') return pathMatch[1];

    // 2. Navbar language dropdown text → map to code
    var dropdownNames = {
      'english': 'en', 'arabic': 'ar', 'vietnamese': 'vi', 'tiếng việt': 'vi',
      'thai': 'th', 'ไทย': 'th', 'chinese': 'zh', '中文': 'zh',
      'japanese': 'ja', '日本語': 'ja', 'korean': 'ko', '한국어': 'ko',
      'spanish': 'es', 'español': 'es', 'french': 'fr', 'français': 'fr',
      'german': 'de', 'deutsch': 'de', 'portuguese': 'pt', 'português': 'pt',
      'russian': 'ru', 'русский': 'ru', 'hindi': 'hi', 'हिन्दी': 'hi',
      'indonesian': 'id', 'malay': 'ms', 'turkish': 'tr', 'türkçe': 'tr',
      'italian': 'it', 'italiano': 'it', 'polish': 'pl', 'polski': 'pl',
      'dutch': 'nl', 'nederlands': 'nl', 'ukrainian': 'uk', 'українська': 'uk',
      'persian': 'fa', 'فارسی': 'fa', 'urdu': 'ur', 'اردو': 'ur',
      'hebrew': 'he', 'עברית': 'he', 'filipino': 'tl', 'bengali': 'bn',
      'swedish': 'sv', 'danish': 'da', 'finnish': 'fi', 'norwegian': 'no',
      'greek': 'el', 'czech': 'cs', 'romanian': 'ro', 'hungarian': 'hu',
    };
    try {
      var ddEl = document.querySelector('.navbar-dropdown__name, .navbar-languages .navbar-dropdown__name');
      if (ddEl) {
        var ddText = ddEl.textContent.trim().toLowerCase();
        if (dropdownNames[ddText]) return dropdownNames[ddText];
      }
    } catch (e) { }

    // 3. html lang attribute
    var htmlLang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
    if (htmlLang && htmlLang !== 'en') return htmlLang;

    // 4. Browser language
    var navLang = (navigator.language || '').slice(0, 2).toLowerCase();
    return navLang || 'en';
  }
  var LANG = detectSiteLang();
  var RTL_LANGS = ['ar', 'he', 'fa', 'ur'];
  var IS_RTL = RTL_LANGS.indexOf(LANG) !== -1;
  var UI_STRINGS = {
    en: { placeholder: 'Type a message...', online: '● Online', liveAgent: 'Live Agent', chatWith: 'Chat with us', powered: 'Powered by', connecting: '⏳ Connecting...', liveStatus: '✍️ Live Agent', errorFallback: 'Sorry, something went wrong. Please try again.' },
    vi: { placeholder: 'Nhập tin nhắn...', online: '● Trực tuyến', liveAgent: 'Nhân viên', chatWith: 'Chat với chúng tôi', powered: 'Cung cấp bởi', connecting: '⏳ Đang kết nối...', liveStatus: '✍️ Nhân viên hỗ trợ', errorFallback: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.' },
    th: { placeholder: 'พิมพ์ข้อความ...', online: '● ออนไลน์', liveAgent: 'เจ้าหน้าที่', chatWith: 'แชทกับเรา', powered: 'ขับเคลื่อนโดย', connecting: '⏳ กำลังเชื่อมต่อ...', liveStatus: '✍️ เจ้าหน้าที่', errorFallback: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่' },
    zh: { placeholder: '输入消息...', online: '● 在线', liveAgent: '在线客服', chatWith: '联系我们', powered: '技术支持', connecting: '⏳ 连接中...', liveStatus: '✍️ 在线客服', errorFallback: '抱歉，出了点问题，请重试。' },
    ja: { placeholder: 'メッセージを入力...', online: '● オンライン', liveAgent: 'サポート', chatWith: 'チャット', powered: '提供', connecting: '⏳ 接続中...', liveStatus: '✍️ サポート', errorFallback: 'エラーが発生しました。もう一度お試しください。' },
    ko: { placeholder: '메시지 입력...', online: '● 온라인', liveAgent: '상담원', chatWith: '채팅하기', powered: '제공', connecting: '⏳ 연결 중...', liveStatus: '✍️ 상담원', errorFallback: '문제가 발생했습니다. 다시 시도해주세요.' },
    es: { placeholder: 'Escribe un mensaje...', online: '● En línea', liveAgent: 'Agente', chatWith: 'Chatea con nosotros', powered: 'Impulsado por', connecting: '⏳ Conectando...', liveStatus: '✍️ Agente', errorFallback: 'Lo sentimos, algo salió mal. Inténtalo de nuevo.' },
    fr: { placeholder: 'Tapez un message...', online: '● En ligne', liveAgent: 'Agent', chatWith: 'Discutez avec nous', powered: 'Propulsé par', connecting: '⏳ Connexion...', liveStatus: '✍️ Agent', errorFallback: 'Désolé, une erreur est survenue. Veuillez réessayer.' },
    de: { placeholder: 'Nachricht eingeben...', online: '● Online', liveAgent: 'Agent', chatWith: 'Chatten Sie mit uns', powered: 'Bereitgestellt von', connecting: '⏳ Verbinden...', liveStatus: '✍️ Agent', errorFallback: 'Entschuldigung, etwas ist schiefgegangen. Bitte versuchen Sie es erneut.' },
    pt: { placeholder: 'Digite uma mensagem...', online: '● Online', liveAgent: 'Agente', chatWith: 'Fale conosco', powered: 'Fornecido por', connecting: '⏳ Conectando...', liveStatus: '✍️ Agente', errorFallback: 'Desculpe, algo deu errado. Tente novamente.' },
    ru: { placeholder: 'Введите сообщение...', online: '● Онлайн', liveAgent: 'Оператор', chatWith: 'Напишите нам', powered: 'Работает на', connecting: '⏳ Подключение...', liveStatus: '✍️ Оператор', errorFallback: 'Произошла ошибка. Попробуйте ещё раз.' },
    ar: { placeholder: '...اكتب رسالة', online: 'متصل ●', liveAgent: 'دعم مباشر', chatWith: 'تحدث معنا', powered: 'مدعوم من', connecting: '...⏳ جاري الاتصال', liveStatus: '✍️ دعم مباشر', errorFallback: 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.' },
    hi: { placeholder: 'संदेश लिखें...', online: '● ऑनलाइन', liveAgent: 'एजेंट', chatWith: 'हमसे चैट करें', powered: 'द्वारा संचालित', connecting: '⏳ कनेक्ट हो रहा है...', liveStatus: '✍️ एजेंट', errorFallback: 'क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।' },
    id: { placeholder: 'Ketik pesan...', online: '● Online', liveAgent: 'Agen', chatWith: 'Chat dengan kami', powered: 'Dipersembahkan oleh', connecting: '⏳ Menghubungkan...', liveStatus: '✍️ Agen', errorFallback: 'Maaf, terjadi kesalahan. Silakan coba lagi.' },
    tr: { placeholder: 'Mesaj yazın...', online: '● Çevrimiçi', liveAgent: 'Temsilci', chatWith: 'Bizimle sohbet edin', powered: 'Tarafından desteklenmektedir', connecting: '⏳ Bağlanıyor...', liveStatus: '✍️ Temsilci', errorFallback: 'Üzgünüz, bir hata oluştu. Lütfen tekrar deneyin.' },
    it: { placeholder: 'Scrivi un messaggio...', online: '● Online', liveAgent: 'Agente', chatWith: 'Chatta con noi', powered: 'Offerto da', connecting: '⏳ Connessione...', liveStatus: '✍️ Agente', errorFallback: 'Spiacenti, si è verificato un errore. Riprova.' },
    ms: { placeholder: 'Taip mesej...', online: '● Dalam talian', liveAgent: 'Ejen', chatWith: 'Sembang dengan kami', powered: 'Dikuasakan oleh', connecting: '⏳ Menyambung...', liveStatus: '✍️ Ejen', errorFallback: 'Maaf, sesuatu tidak kena. Sila cuba lagi.' },
    pl: { placeholder: 'Napisz wiadomość...', online: '● Online', liveAgent: 'Agent', chatWith: 'Porozmawiaj z nami', powered: 'Obsługiwane przez', connecting: '⏳ Łączenie...', liveStatus: '✍️ Agent', errorFallback: 'Przepraszamy, coś poszło nie tak. Spróbuj ponownie.' },
    nl: { placeholder: 'Typ een bericht...', online: '● Online', liveAgent: 'Agent', chatWith: 'Chat met ons', powered: 'Mogelijk gemaakt door', connecting: '⏳ Verbinden...', liveStatus: '✍️ Agent', errorFallback: 'Sorry, er ging iets mis. Probeer het opnieuw.' },
    uk: { placeholder: 'Введіть повідомлення...', online: '● Онлайн', liveAgent: 'Оператор', chatWith: 'Напишіть нам', powered: 'Працює на', connecting: '⏳ Підключення...', liveStatus: '✍️ Оператор', errorFallback: 'Вибачте, сталася помилка. Спробуйте ще раз.' },
  };
  var i18n = UI_STRINGS[LANG] || UI_STRINGS['en'];

  // ─── Build DOM ────────────────────────────────────────────────────────
  function buildWidget() {
    // Wrapper
    var wrapper = document.createElement('div');
    wrapper.id = 'smm-chatbot-wrapper';
    if (IS_RTL) wrapper.style.direction = 'rtl';

    // Toggle button
    var btn = document.createElement('button');
    btn.id = 'smm-chatbot-btn';
    btn.innerHTML = BUTTON_ICONS[config.buttonIcon || 'chat'] || BUTTON_ICONS.chat;
    btn.title = i18n.chatWith;
    btn.onclick = toggleChat;

    // Chat window
    var win = document.createElement('div');
    win.id = 'smm-chatbot-window';
    win.innerHTML = [
      '<div class="smm-chatbot-header">',
      '  <div class="smm-chatbot-header-avatar">' + (config.widgetIconUrl ? '<img src="' + escapeHtml(config.widgetIconUrl) + '" alt="bot">' : '🤖') + '</div>',
      '  <div class="smm-chatbot-header-info">',
      '    <div class="smm-chatbot-header-name">' + escapeHtml(config.botName) + '</div>',
      '    <div class="smm-chatbot-header-status"><span id="smm-chatbot-status-text">' + i18n.online + '</span><div class="smm-chatbot-live-badge" id="smm-chatbot-live-badge"><span></span>' + i18n.liveAgent + '</div></div>',
      '  </div>',
      '  <div class="smm-chatbot-header-actions">',
      '    <button class="smm-chatbot-newchat" onclick="window.__smmChatbotNewChat()" title="New Chat">✚</button>',
      '    <button class="smm-chatbot-expand" id="smm-chatbot-expand" onclick="window.__smmChatbotExpand()" title="Expand">⛶</button>',
      '    <button class="smm-chatbot-close" onclick="window.__smmChatbotToggle()">✕</button>',
      '  </div>',
      '</div>',
      '<div class="smm-chatbot-messages" id="smm-chatbot-messages"></div>',
      '<div class="smm-chatbot-typing" id="smm-chatbot-typing"><span></span><span></span><span></span></div>',
      '<div class="smm-chatbot-input-area">',
      '  <textarea class="smm-chatbot-input" id="smm-chatbot-input" placeholder="' + i18n.placeholder + '" rows="1"></textarea>',
      '  <button class="smm-chatbot-send" id="smm-chatbot-send" onclick="window.__smmChatbotSend()">' + ICON_SEND + '</button>',
      '</div>',
      '<div class="smm-chatbot-powered">' + i18n.powered + ' <a href="' + escapeHtml(safeHttpUrl(config.panelDomain, '/')) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(config.panelName || 'AI Assistant') + '</a></div>',
    ].join('\n');

    // Greeting bubble
    var greetBubble = document.createElement('div');
    greetBubble.id = 'smm-chatbot-greeting';
    // Don't strip emoji — use greeting text as-is (admin controls the message)
    var greetText = config.greetingMessage || i18n.chatWith || 'Hi! How can I help you today?';
    var bubbleText = greetText;
    if (bubbleText.length > 80) bubbleText = bubbleText.slice(0, 77) + '...';
    var avatarHtml = config.widgetIconUrl
      ? '<div class="smm-greeting-avatar"><img src="' + escapeHtml(config.widgetIconUrl) + '" alt=""></div>'
      : '<div class="smm-greeting-avatar">💬</div>';
    greetBubble.innerHTML = avatarHtml + '<span class="smm-greeting-text">' + escapeHtml(bubbleText) + '</span>' + '<button class="smm-greeting-close" onclick="event.stopPropagation(); this.parentElement.classList.add(\'smm-bubble-out\'); setTimeout(function(){document.getElementById(\'smm-chatbot-greeting\').style.display=\'none\'}, 300);">✕</button>';
    greetBubble.onclick = function () { toggleChat(); };

    wrapper.appendChild(win);
    wrapper.appendChild(greetBubble);
    wrapper.appendChild(btn);
    document.body.appendChild(wrapper);

    // Show greeting bubble — respect interval setting (localStorage)
    var GREETING_STORAGE_KEY = 'smm_chatbot_greet_' + PUBLIC_KEY;
    var greetingIntervalMs = ((config.greetingIntervalHours || 24) * 3600000);

    function shouldShowGreeting() {
      try {
        var lastShown = localStorage.getItem(GREETING_STORAGE_KEY);
        if (lastShown && (Date.now() - parseInt(lastShown, 10)) < greetingIntervalMs) {
          return false; // Still within cooldown
        }
      } catch (e) { }
      return true;
    }

    function markGreetingShown() {
      try { localStorage.setItem(GREETING_STORAGE_KEY, String(Date.now())); } catch (e) { }
    }

    function dismissGreeting() {
      markGreetingShown();
      var bubble = document.getElementById('smm-chatbot-greeting');
      if (bubble) {
        bubble.classList.add('smm-bubble-out');
        setTimeout(function () { if (bubble) bubble.style.display = 'none'; }, 300);
      }
    }

    // Override close button to also mark as shown
    var greetClose = greetBubble.querySelector('.smm-greeting-close');
    if (greetClose) {
      greetClose.onclick = function (e) { e.stopPropagation(); dismissGreeting(); };
    }

    setTimeout(function () {
      if (!isOpen && greetBubble && shouldShowGreeting()) {
        greetBubble.style.display = 'block';
        markGreetingShown();
        // Add pulse animation to chat button
        var btn = document.getElementById('smm-chatbot-btn');
        if (btn) btn.classList.add('smm-pulse');

        // Auto-hide after 10 seconds
        setTimeout(function () {
          var bubble = document.getElementById('smm-chatbot-greeting');
          if (bubble && bubble.style.display !== 'none') {
            bubble.classList.add('smm-bubble-out');
            setTimeout(function () { if (bubble) bubble.style.display = 'none'; }, 300);
          }
        }, 10000);
      }
    }, 1500);

    // Input handlers
    var input = document.getElementById('smm-chatbot-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.__smmChatbotSend();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // Add greeting message
    addMessage('bot', config.greetingMessage);
  }

  // ─── Chat Functions ───────────────────────────────────────────────────
  function toggleChat() {
    var win = document.getElementById('smm-chatbot-window');
    var btn = document.getElementById('smm-chatbot-btn');
    var isMobile = window.innerWidth <= 480;
    isOpen = !isOpen;

    if (isOpen) {
      win.classList.add('open');
      btn.innerHTML = ICON_CLOSE;
      // Hide greeting bubble + stop pulse when chat opens
      var bubble = document.getElementById('smm-chatbot-greeting');
      if (bubble) bubble.style.display = 'none';
      btn.classList.remove('smm-pulse');
      // Hide button on mobile (fullscreen mode)
      if (isMobile) btn.classList.add('hidden');
      var input = document.getElementById('smm-chatbot-input');
      if (input) setTimeout(function () { input.focus(); }, 300);

      // Load greeting suggestions
      if (!sessionToken) {
        fetch(SUGGESTIONS_URL + '?key=' + PUBLIC_KEY + '&lang=' + LANG)
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.suggestions) renderSuggestions(d.suggestions, true); })
          .catch(function () { });
      }

      // Load history on first open if we have a saved session
      if (!historyLoaded && sessionToken) {
        historyLoaded = true;
        loadHistory();
      }
    } else {
      win.classList.remove('open');
      btn.innerHTML = BUTTON_ICONS[config.buttonIcon || 'chat'] || BUTTON_ICONS.chat;
      btn.classList.remove('hidden');
    }
  }
  window.__smmChatbotToggle = toggleChat;

  // Expand / Collapse chat window
  window.__smmChatbotExpand = function () {
    var win = document.getElementById('smm-chatbot-window');
    var expandBtn = document.getElementById('smm-chatbot-expand');
    isExpanded = !isExpanded;
    if (isExpanded) {
      win.classList.add('expanded');
      expandBtn.classList.add('active');
      expandBtn.title = 'Collapse';
    } else {
      win.classList.remove('expanded');
      expandBtn.classList.remove('active');
      expandBtn.title = 'Expand';
    }
    // Scroll to bottom after resize
    var container = document.getElementById('smm-chatbot-messages');
    if (container) setTimeout(function () { container.scrollTop = container.scrollHeight; }, 100);
  };

  // New Chat — clear history and start fresh
  window.__smmChatbotNewChat = function () {
    var confirmMsg = LANG === 'vi'
      ? 'Bắt đầu cuộc trò chuyện mới? Lịch sử chat hiện tại sẽ bị xóa.'
      : LANG === 'bn'
        ? 'নতুন চ্যাট শুরু করবেন? বর্তমান চ্যাট ইতিহাস মুছে যাবে।'
        : 'Start a new chat? Current chat history will be cleared.';
    if (!confirm(confirmMsg)) return;

    // Clear storage
    localStorage.removeItem(STORAGE_KEY);

    // Disconnect Pusher
    disconnectPusher();

    // Reset state
    sessionToken = null;
    sessionMode = 'bot';
    messages = [];
    historyLoaded = false;
    isLoading = false;

    // Clear UI
    var container = document.getElementById('smm-chatbot-messages');
    if (container) container.innerHTML = '';
    var suggestions = document.querySelectorAll('.smm-chatbot-suggestions');
    suggestions.forEach(function (el) { el.remove(); });

    // Update badge
    updateLiveBadge();

    // Show greeting
    addMessage('bot', config.greetingMessage);

    // Render greeting suggestions
    if (config.greetingSuggestions && config.greetingSuggestions.length) {
      renderSuggestions(config.greetingSuggestions, true);
    }
  };

  // Load chat history from server
  function loadHistory() {
    fetch(HISTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: sessionToken,
        publicKey: PUBLIC_KEY,
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.messages && data.messages.length > 0) {
          // Clear greeting message first
          var container = document.getElementById('smm-chatbot-messages');
          if (container) container.innerHTML = '';
          messages = [];

          // Re-add all history messages
          data.messages.forEach(function (m) {
            addMessage(m.role, m.content, m.agentName);
          });
        }
        // Always sync session mode from server (fixes stale localStorage)
        if (data.mode) {
          sessionMode = data.mode;
          persistMode();
          updateLiveBadge();
          // Reconnect Pusher if session is in pending/human mode
          if ((data.mode === 'pending' || data.mode === 'human') && !pusherInstance) {
            connectPusher();
          }
          // If server says bot mode, disconnect Pusher
          if (data.mode === 'bot' && pusherInstance) {
            disconnectPusher();
          }
          // startPolling(); // TODO: enable only when Pusher hits rate limit
        }
        // Render suggestions for last bot message (persisted across reload)
        if (data.suggestions && data.suggestions.length > 0) {
          renderSuggestions(data.suggestions, false);
        }
      })
      .catch(function (err) {
        console.error('[Chatbot] Failed to load history:', err.message);
      });
  }

  // ─── Suggestion Chips ───────────────────────────────────────────────
  function renderSuggestions(suggestions, isGreeting) {
    if (!suggestions || suggestions.length === 0) return;
    // Remove any existing chips
    var existing = document.querySelectorAll('.smm-chatbot-suggestions');
    existing.forEach(function (el) { el.remove(); });

    var container = document.getElementById('smm-chatbot-messages');
    var div = document.createElement('div');
    div.className = 'smm-chatbot-suggestions' + (isGreeting ? ' greeting' : '');
    suggestions.forEach(function (s) {
      var chip = document.createElement('button');
      chip.className = 'smm-chatbot-chip';
      chip.textContent = s.text || s;
      chip.onclick = function () {
        // Remove all chips
        document.querySelectorAll('.smm-chatbot-suggestions').forEach(function (el) { el.remove(); });
        // Auto-send the suggestion text
        var input = document.getElementById('smm-chatbot-input');
        input.value = s.text || s;
        window.__smmChatbotSend();
      };
      div.appendChild(chip);
    });
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // ─── Feedback Buttons ──────────────────────────────────────────────
  function addFeedbackButtons(messageEl, messageId) {
    if (!messageId) return;
    var fb = document.createElement('div');
    fb.className = 'smm-chatbot-feedback';
    var btnUp = document.createElement('button');
    btnUp.className = 'smm-chatbot-feedback-btn';
    btnUp.innerHTML = '👍';
    var btnDown = document.createElement('button');
    btnDown.className = 'smm-chatbot-feedback-btn';
    btnDown.innerHTML = '👎';

    function sendFeedback(value, activeBtn, otherBtn) {
      activeBtn.disabled = true;
      otherBtn.disabled = true;
      activeBtn.classList.add(value > 0 ? 'active-up' : 'active-down');
      fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: messageId, feedback: value, sessionToken: sessionToken, publicKey: PUBLIC_KEY }),
      }).catch(function () { });
    }
    btnUp.onclick = function () { sendFeedback(1, btnUp, btnDown); };
    btnDown.onclick = function () { sendFeedback(-1, btnDown, btnUp); };
    fb.appendChild(btnUp);
    fb.appendChild(btnDown);
    messageEl.appendChild(fb);
  }

  function addMessage(role, text, agentName, messageId) {
    var container = document.getElementById('smm-chatbot-messages');
    var div = document.createElement('div');

    if (role === 'system') {
      div.className = 'smm-chatbot-msg system';
      div.textContent = text;
    } else if (role === 'agent') {
      div.className = 'smm-chatbot-msg agent';
      var nameDiv = agentName ? '<div class="smm-agent-name">✍️ ' + escapeHtml(agentName) + '</div>' : '';
      div.innerHTML = nameDiv + formatBotMessage(text);
    } else if (role === 'user') {
      div.className = 'smm-chatbot-msg user';
      div.textContent = text;
    } else {
      // bot
      div.className = 'smm-chatbot-msg bot';
      text = formatBotMessage(text);
      div.innerHTML = text;
    }

    container.appendChild(div);
    // Add feedback buttons to bot messages
    if ((role === 'bot' || role === 'assistant') && messageId) {
      addFeedbackButtons(div, messageId);
    }
    // Remove suggestion chips when new message appears
    document.querySelectorAll('.smm-chatbot-suggestions').forEach(function (el) { el.remove(); });
    container.scrollTop = container.scrollHeight;
    messages.push({ role: role, content: text });
  }

  function formatBotMessage(text) {
    text = escapeHtml(String(text || ''));

    function makeSafeLink(url) {
      var rawUrl = String(url || '').trim();
      if (!rawUrl) return null;

      if (rawUrl.startsWith('/')) {
        var domain = config && config.panelDomain ? config.panelDomain.replace(/\/$/, '') : window.location.origin;
        if (domain && !domain.startsWith('http')) domain = 'https://' + domain;
        rawUrl = domain + rawUrl;
      }

      try {
        var parsed = new URL(rawUrl, window.location.origin);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.href;
      } catch (e) {
        return null;
      }
    }

    // Bold: **text** → <strong>text</strong>
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Headers: ### text → <strong>text</strong>
    text = text.replace(/^###\s+(.+)$/gm, '<strong>$1</strong>');
    text = text.replace(/^##\s+(.+)$/gm, '<strong>$1</strong>');
    // Links: [text](url) — convert relative paths to panel domain URL
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (match, linkText, url) {
      var fullUrl = makeSafeLink(url);
      if (!fullUrl) return linkText;
      return '<a href="' + escapeHtml(fullUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;font-weight:500;border-bottom:1px solid #93c5fd">' + linkText + ' -></a>';
    });
    // Auto-link any remaining raw URLs (https://...)
    text = text.replace(/(?<![">])(https?:\/\/[^\s<]+)/g, function (url) {
      var safeUrl = makeSafeLink(url);
      if (!safeUrl) return url;
      try {
        var u = new URL(safeUrl);
        var name = u.pathname === '/' ? u.hostname : u.pathname.split('/').pop();
        return '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;font-weight:500;border-bottom:1px solid #93c5fd">' + escapeHtml(name) + ' -></a>';
      } catch (e) {
        return url;
      }
    });
    return text;
  }

  function showTyping(show) {
    var el = document.getElementById('smm-chatbot-typing');
    if (el) el.classList.toggle('active', show);
    if (show) {
      var container = document.getElementById('smm-chatbot-messages');
      if (container) container.scrollTop = container.scrollHeight;
    }
  }

  // ─── Processing Steps UI ────────────────────────────────────────────
  var stepQueue = [];
  var stepTimer = null;

  function showSteps(show) {
    var el = document.getElementById('smm-chatbot-steps');
    if (show) {
      // Create steps container inside messages area (scrolls with chat)
      if (!el) {
        el = document.createElement('div');
        el.id = 'smm-chatbot-steps';
        el.className = 'smm-chatbot-steps active';
        var headerHtml = (config.widgetIconUrl ? '<img src="' + escapeHtml(config.widgetIconUrl) + '" style="width:18px;height:18px;border-radius:50%">' : '🤖') + ' ' + escapeHtml(config.botName);
        el.innerHTML = '<div class="smm-chatbot-steps-header">' + headerHtml + '</div>';
        var container = document.getElementById('smm-chatbot-messages');
        if (container) {
          container.appendChild(el);
          container.scrollTop = container.scrollHeight;
        }
      } else {
        // Clear previous steps (keep header)
        var header = el.querySelector('.smm-chatbot-steps-header');
        el.innerHTML = '';
        if (header) el.appendChild(header);
        el.classList.add('active');
      }
      // Clear queue
      stepQueue = [];
      if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
    } else {
      if (el) el.remove();
      stepQueue = [];
      if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
    }
  }

  function addStep(text, status) {
    if (!text) return;
    // Queue steps with delay so they appear one-by-one
    stepQueue.push({ text: text, status: status });
    if (!stepTimer) processStepQueue();
  }

  function processStepQueue() {
    if (stepQueue.length === 0) { stepTimer = null; return; }
    var item = stepQueue.shift();
    renderStep(item.text, item.status);
    stepTimer = setTimeout(processStepQueue, 400); // 400ms between steps
  }

  function renderStep(text, status) {
    var el = document.getElementById('smm-chatbot-steps');
    if (!el || !text) return;
    // Mark previous active step as done
    var prev = el.querySelector('.smm-chatbot-step.active');
    if (prev && status === 'active') {
      prev.classList.remove('active');
      prev.classList.add('done');
      prev.querySelector('.smm-chatbot-step-icon').textContent = '✓';
    }
    // Check if step already exists (update status)
    var existing = el.querySelector('[data-step-text="' + text + '"]');
    if (existing) {
      if (status === 'done') {
        existing.classList.remove('active');
        existing.classList.add('done');
        existing.querySelector('.smm-chatbot-step-icon').textContent = '✓';
      }
      return;
    }
    var step = document.createElement('div');
    step.className = 'smm-chatbot-step ' + (status || 'active');
    step.setAttribute('data-step-text', text);
    var icon = status === 'done' ? '✓' : '✴';
    step.innerHTML = '<span class="smm-chatbot-step-icon">' + icon + '</span>' + escapeHtml(text) + (status === 'active' ? ' ...' : '');
    el.appendChild(step);
    var container = document.getElementById('smm-chatbot-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function markAllStepsDone() {
    // Flush remaining queued steps immediately
    if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
    while (stepQueue.length > 0) {
      var item = stepQueue.shift();
      renderStep(item.text, item.status);
    }
    var el = document.getElementById('smm-chatbot-steps');
    if (!el) return;
    var activeSteps = el.querySelectorAll('.smm-chatbot-step.active');
    for (var i = 0; i < activeSteps.length; i++) {
      activeSteps[i].classList.remove('active');
      activeSteps[i].classList.add('done');
      activeSteps[i].querySelector('.smm-chatbot-step-icon').textContent = '✓';
    }
  }

  window.__smmChatbotSend = function () {
    if (isLoading) return;

    var input = document.getElementById('smm-chatbot-input');
    var text = input.value.trim();
    if (!text) return;

    // Add user message
    addMessage('user', text);
    input.value = '';
    input.style.height = 'auto';

    // Show processing steps
    isLoading = true;
    showSteps(true);
    showTyping(false);
    document.getElementById('smm-chatbot-send').disabled = true;

    // Try SSE streaming first
    fetch(MSG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message: text,
        sessionToken: sessionToken,
        publicKey: PUBLIC_KEY,
      }),
    })
      .then(function (res) {
        if (!res.ok) {
          // Handle rate limit and errors
          return res.json().then(function (data) {
            if (res.status === 429) {
              var retryAfter = data.retryAfter || 60;
              var mins = Math.floor(retryAfter / 60);
              var secs = retryAfter % 60;
              var lang = (navigator.language || '').slice(0, 2).toLowerCase();
              var tStr = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
              var rlMsgs = {
                vi: '⏳ Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau {t}.',
                en: '⏳ Too many messages. Please try again in {t}.',
              };
              if (window.__rlMsgCache && window.__rlMsgCache[lang]) rlMsgs[lang] = window.__rlMsgCache[lang];
              throw new Error((rlMsgs[lang] || rlMsgs['en']).replace('{t}', tStr));
            }
            throw new Error(data.reply || data.error || 'Failed to send message');
          });
        }

        var contentType = res.headers.get('content-type') || '';

        // SSE streaming response
        if (contentType.includes('text/event-stream')) {
          var reader = res.body.getReader();
          var decoder = new TextDecoder();
          var buffer = '';

          function processChunk() {
            return reader.read().then(function (result) {
              if (result.done) return;
              buffer += decoder.decode(result.value, { stream: true });

              // Parse SSE events from buffer
              var lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('data: ') === 0) {
                  try {
                    var evt = JSON.parse(line.slice(6));
                    if (evt.type === 'step') {
                      addStep(evt.text, evt.status);
                    } else if (evt.type === 'done') {
                      // Final response
                      markAllStepsDone();
                      setTimeout(function () {
                        showSteps(false);
                        handleResponse(evt);
                      }, 400);
                      return;
                    } else if (evt.type === 'error') {
                      showSteps(false);
                      addMessage('bot', '⚠️ ' + (evt.message || i18n.errorFallback));
                      finishLoading();
                      return;
                    }
                  } catch (e) { /* ignore parse errors */ }
                }
              }
              return processChunk();
            });
          }
          return processChunk();
        }

        // Fallback: JSON response (non-streaming)
        return res.json().then(function (data) {
          showSteps(false);
          handleResponse(data);
        });
      })
      .catch(function (err) {
        showSteps(false);
        addMessage('bot', '⚠️ ' + (err.message || i18n.errorFallback));
        finishLoading();
      });
  };

  // Handle parsed response data (shared by streaming and non-streaming)
  function handleResponse(data) {
    sessionToken = data.sessionToken;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token: data.sessionToken,
        mode: data.mode || sessionMode,
        expires: Date.now() + 24 * 60 * 60 * 1000
      }));
    } catch (e) { }

    if (data.mode) {
      sessionMode = data.mode;
      updateLiveBadge();
      if ((data.mode === 'pending' || data.mode === 'human') && !pusherInstance) {
        connectPusher();
      }
    }

    if (data.reply) {
      var msgRole = data.mode === 'pending' ? 'system' : 'bot';
      addMessage(msgRole, data.reply, null, data.messageId);
    }
    if (data.suggestions && data.suggestions.length > 0) {
      renderSuggestions(data.suggestions, false);
    }
    finishLoading();
  }

  function finishLoading() {
    isLoading = false;
    showTyping(false);
    showSteps(false);
    document.getElementById('smm-chatbot-send').disabled = false;
    var input = document.getElementById('smm-chatbot-input');
    if (input) input.focus();
  }

  // ─── Pusher Integration ───────────────────────────────────────────────
  function connectPusher() {
    if (pusherInstance || !sessionToken || !config.pusherKey) {
      console.log('[Chatbot Pusher] Skip connect:', !sessionToken ? 'no token' : !config.pusherKey ? 'no pusherKey' : 'already connected');
      return;
    }

    console.log('[Chatbot Pusher] Loading Pusher.js...');
    // Load Pusher.js dynamically
    var script = document.createElement('script');
    script.src = 'https://js.pusher.com/8.2.0/pusher.min.js';
    script.onload = function () {
      Pusher.logToConsole = true; // DEBUG — remove in production
      pusherInstance = new Pusher(config.pusherKey, {
        cluster: config.pusherCluster || 'ap1',
        authEndpoint: API_BASE + '/api/chatbot/pusher-auth',
      });

      console.log('[Chatbot Pusher] Connecting to channel: private-session-' + sessionToken);
      var channelName = 'private-session-' + sessionToken;
      pusherChannel = pusherInstance.subscribe(channelName);

      // Agent sent a message
      pusherChannel.bind('agent-message', function (data) {
        addMessage('agent', data.content, data.agentName);
      });

      // Agent joined
      pusherChannel.bind('agent-joined', function (data) {
        sessionMode = 'human';
        persistMode();
        updateLiveBadge();
        addMessage('system', '✅ ' + data.agentName + ' has joined the chat.');
      });

      // Agent left
      pusherChannel.bind('agent-left', function (data) {
        sessionMode = 'bot';
        persistMode();
        updateLiveBadge();
        addMessage('system', 'Agent has left. Bot will continue assisting you.');
      });

      // Session closed
      pusherChannel.bind('session-closed', function () {
        sessionMode = 'bot';
        persistMode();
        updateLiveBadge();
        disconnectPusher();
      });

      // Agent investigating
      pusherChannel.bind('agent-investigating', function (data) {
        addMessage('system', '🔍 Agent is looking into this, please wait...');
      });

      // Session transferred
      pusherChannel.bind('session-transferred', function (data) {
        addMessage('system', '🔄 You\'ve been transferred to ' + data.toAgent + '.');
      });

      // Agent typing
      pusherChannel.bind('agent-typing', function () {
        showTyping(true);
        clearTimeout(window.__smmTypingTimeout);
        window.__smmTypingTimeout = setTimeout(function () { showTyping(false); }, 2000);
      });
    };
    document.head.appendChild(script);
  }

  // Persist mode to localStorage
  function persistMode() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        parsed.mode = sessionMode;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) { }
  }

  function disconnectPusher() {
    if (pusherChannel) {
      pusherChannel.unbind_all();
      pusherChannel.unsubscribe();
      pusherChannel = null;
    }
    if (pusherInstance) {
      pusherInstance.disconnect();
      pusherInstance = null;
    }
  }

  // ─── Polling Fallback ─────────────────────────────────────────────────
  // Ensures agent messages appear even if Pusher fails
  function startPolling() {
    if (pollTimer) return; // Already polling
    lastPollMessageCount = messages.length;
    pollTimer = setInterval(function () {
      if (!sessionToken || (sessionMode !== 'pending' && sessionMode !== 'human')) {
        stopPolling();
        return;
      }
      // Fetch latest messages via POST (same as history API)
      fetch(HISTORY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: sessionToken, publicKey: PUBLIC_KEY }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.messages || !data.messages.length) return;
          // Check for new messages we haven't displayed
          var currentCount = messages.length;
          if (data.messages.length > lastPollMessageCount) {
            // Find new messages (from end of array)
            var newMsgs = data.messages.slice(lastPollMessageCount);
            for (var i = 0; i < newMsgs.length; i++) {
              var m = newMsgs[i];
              // Only show agent messages we haven't seen
              if (m.role === 'agent' && !m.isInternal) {
                addMessage('agent', m.content, m.agentName);
              }
            }
            lastPollMessageCount = data.messages.length;
          }
          // Update mode if changed
          if (data.mode && data.mode !== sessionMode) {
            sessionMode = data.mode;
            persistMode();
            updateLiveBadge();
            if (data.mode === 'bot') stopPolling();
          }
        })
        .catch(function () { /* silent fail */ });
    }, 3000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function updateLiveBadge() {
    var badge = document.getElementById('smm-chatbot-live-badge');
    var statusText = document.getElementById('smm-chatbot-status-text');
    if (badge) {
      badge.classList.toggle('active', sessionMode === 'human' || sessionMode === 'pending');
    }
    if (statusText) {
      statusText.textContent = sessionMode === 'human' ? i18n.liveStatus : sessionMode === 'pending' ? i18n.connecting : i18n.online;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function safeHttpUrl(value, fallback) {
    var rawUrl = String(value || '').trim();
    if (!rawUrl) return fallback || '/';
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl.replace(/^\/+/, '');
    }

    try {
      var parsed = new URL(rawUrl, window.location.origin);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback || '/';
      return parsed.href;
    } catch (e) {
      return fallback || '/';
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────
  function init() {
    fetch(INIT_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to init chatbot');
        return res.json();
      })
      .then(function (data) {
        config = data;
        injectStyles(config.widgetColor || '#3B82F6', config.buttonShape || 'circle');
        buildWidget();
      })
      .catch(function (err) {
        console.error('[Chatbot] Init failed:', err.message);
      });
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
