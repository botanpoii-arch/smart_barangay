import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

(function (_0xGlobal, _0xDoc) {
  const _0xEnv = import.meta.env;
  
  const _0xVault = {
    h: "authorized-production-domain.com", 
    p: "?dev=true",
    s: "SHA-256"
  };

  const _0xCheckBypass = () => {
    const _0xParams = new URLSearchParams(window.location.search);
    return _0xParams.get('dev') === 'true';
  };

  // --- 🛡️ LAYER 1: DOMAIN LOCK ---
  if (_0xEnv.PROD && !_0xCheckBypass()) {
    if (window.location.hostname !== _0xVault.h) {
      _0xDoc.documentElement.innerHTML = "";
      throw new Error("\x44\x6f\x6d\x61\x69\x6e\x20\x4c\x6f\x63\x6b\x20\x41\x63\x74\x69\x76\x65"); 
    }
  }

  const _0xK = [
    'log', 'warn', 'error', 'debug', 'table', 'trace',
    'constructor', 'apply', 'debugger', 'state', 'action',
    'contextmenu', 'keydown', 'F12'
  ];

  // --- 🛡️ LAYER 2: CONSOLE HOLLOWING (FIXED ANY TYPE) ---
  const _0xSilencer = () => {
    const _0xEmpty = () => {};
    _0xK.slice(0, 6).forEach(k => {
      // Casting console to 'any' stops the index signature error
      (_0xGlobal.console as any)[k] = _0xEmpty;
    });
  };

  // --- 🛡️ LAYER 3: INTEGRITY SEAL ---
  const _0xEnforceIntegrity = async () => {
    try {
      const _0xScripts = Array.from(_0xDoc.getElementsByTagName('script'));
      for (const _0xS of _0xScripts) {
        if (_0xS.src && _0xS.src.includes(window.location.hostname)) {
          const _0xR = await fetch(_0xS.src);
          const _0xRaw = await _0xR.text();
          const _0xBuf = await crypto.subtle.digest(_0xVault.s, new TextEncoder().encode(_0xRaw));
          const _0xSig = Array.from(new Uint8Array(_0xBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
          (_0xGlobal as any)['\x5f\x5f\x53\x49\x47\x5f\x5f'] = _0xSig;
        }
      }
    } catch (_0xErr) {
      _0xDoc.body.innerHTML = "\x49\x4e\x54\x45\x47\x52\x49\x54\x59\x5f\x45\x52\x52\x4f\x52";
    }
  };

  // --- 🛡️ LAYER 4: DEBUGGER TRAP (FIXED TRUTHY ERROR) ---
  const _0xTrap = function() {
    const _0xRecursive = function(_0xStep: number) {
      // Force n to string and check length to create a dynamic condition TS can't pre-calculate
      const _0xCheck = (_0xStep + "").length !== 1 || _0xStep % 20 === 0;
      
      if (_0xCheck) {
        // We use a constructor call that TS sees as a generic 'any' execution
        const _0xBomb: any = function() { return true; };
        _0xBomb[_0xK[6]](_0xK[8])[_0xK[7]](_0xK[10]);
      } else {
        const _0xDud: any = function() { return false; };
        _0xDud[_0xK[6]](_0xK[8])[_0xK[7]](_0xK[9]);
      }
      _0xRecursive(++_0xStep);
    };
    try { _0xRecursive(0); } catch (_0xErr) {}
  };

  // --- 🛡️ INITIALIZE PROTECTION ---
  if (_0xEnv.PROD && !_0xCheckBypass()) {
    _0xSilencer();
    _0xEnforceIntegrity();
    setInterval(_0xTrap, 500);

    _0xDoc.addEventListener(_0xK[11], (e) => e.preventDefault());
    _0xDoc.addEventListener(_0xK[12] as any, (e: any) => {
      const _0xForbidden = ['I', 'J', 'C', 'U'];
      if (
        e.key === _0xK[13] || 
        (e.ctrlKey && e.shiftKey && _0xForbidden.includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === 'u')
      ) {
        e.preventDefault();
        return false;
      }
    });
  }

})(window, document);

// --- 🚀 APP BOOT ---
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}