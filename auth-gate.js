// auth-gate.js
// Include this on EVERY page of the D.El.Ed Notes site (index2.html, S1.html...S9.html):
//     <script src="auth-gate.js"></script>
// Place it just before the closing </body> tag.
//
// What it does:
//   1. First-ever visit (this browser) -> shows a blocking "enter your name" modal.
//      Name is saved in localStorage so it is never asked again on this device.
//   2. Sends a Telegram notification once for that first name-entry.
//   3. On every NEW browser session after that (tab/browser closed & reopened),
//      sends one "site opened" notification - not on every single page click,
//      so navigating between subjects in one sitting won't spam you.
//
// SETUP: replace WORKER_URL below with your deployed Cloudflare Worker URL.

(function () {
  const WORKER_URL = "https://telegram-notify-workerjs.ctetone31.workers.dev"; // <-- REPLACE THIS

  const NAME_KEY = "deled_visitor_name";
  const SESSION_KEY = "deled_session_notified";

  function currentPageName() {
    const path = window.location.pathname.split("/").pop();
    return path && path.length ? path : "index";
  }

  function currentTimeIST() {
    try {
      return new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return new Date().toString();
    }
  }

  function sendEvent(type, name) {
    if (!WORKER_URL || WORKER_URL.indexOf("YOUR-WORKER-NAME") !== -1) {
      console.warn("auth-gate.js: WORKER_URL not configured yet.");
      return;
    }
    fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: type,
        name: name,
        page: currentPageName(),
        time: currentTimeIST(),
      }),
    }).catch(function () {
      /* fail silently - never block the visitor over a network hiccup */
    });
  }

  function showNameGate() {
    const overlay = document.createElement("div");
    overlay.id = "nameGateOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;" +
      "display:flex;align-items:center;justify-content:center;padding:20px;";

    overlay.innerHTML =
      '<div style="background:var(--card-bg,#fff);color:var(--text-color,#333);' +
      'border-radius:14px;padding:28px 24px;max-width:340px;width:100%;text-align:center;' +
      'font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.35);">' +
      '<div style="font-size:2rem;margin-bottom:10px;">👋</div>' +
      '<h2 style="margin-bottom:8px;font-size:1.2rem;color:var(--header-bg,#0056b3);">WRITE YOUR NAME</h2>' +
      '<p style="font-size:0.9rem;opacity:0.75;margin-bottom:16px;">😊</p>' +
      '<input id="visitorNameInput" type="text" placeholder="Write your name here" maxlength="40" autocomplete="off" ' +
      'style="width:100%;padding:12px;border:1px solid var(--border-color,#ccc);border-radius:8px;font-size:1rem;' +
      'margin-bottom:12px;background:var(--bg-color,#fff);color:var(--text-color,#333);box-sizing:border-box;" />' +
      '<div id="nameGateError" style="color:#e53935;font-size:0.8rem;margin-bottom:10px;display:none;">Write your name</div>' +
      '<button id="submitNameBtn" style="width:100%;padding:12px;background:var(--accent-color,#007bff);color:#fff;' +
      'border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;">Continue</button>' +
      "</div>";

    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const input = overlay.querySelector("#visitorNameInput");
    const btn = overlay.querySelector("#submitNameBtn");
    const err = overlay.querySelector("#nameGateError");

    function submit() {
      const name = input.value.trim();
      if (!name) {
        err.style.display = "block";
        input.focus();
        return;
      }
      localStorage.setItem(NAME_KEY, name);
      sessionStorage.setItem(SESSION_KEY, "1");
      sendEvent("naya_visitor", name);
      document.body.style.overflow = prevOverflow;
      overlay.remove();
    }

    btn.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
    });

    setTimeout(function () {
      input.focus();
    }, 50);
  }

  // ---- main logic ----
  const savedName = localStorage.getItem(NAME_KEY);

  if (!savedName) {
    showNameGate();
  } else if (!sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.setItem(SESSION_KEY, "1");
    sendEvent("site_open", savedName);
  }
})();
