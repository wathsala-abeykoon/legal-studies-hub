/* Legal Studies Hub interactions */
(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      nav.classList.toggle("open");
      const open = nav.classList.contains("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll(".accordion-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".accordion")?.classList.toggle("open");
    });
  });

  const zoomSelect = document.querySelector("#poster-zoom");
  const poster = document.querySelector(".poster");
  const zoomIn = document.querySelector("#zoom-in");
  const zoomOut = document.querySelector("#zoom-out");
  const zoomSteps = [75, 100, 125, 150, 175, 200];

  function applyPosterZoom(value) {
    if (!poster || !zoomSelect) return;
    const zoom = zoomSteps.includes(Number(value)) ? Number(value) : 100;
    zoomSelect.value = String(zoom);
    poster.style.transform = `scale(${zoom / 100})`;
    if (zoomIn) zoomIn.disabled = zoom >= 200;
    if (zoomOut) zoomOut.disabled = zoom <= 75;
  }

  function stepZoom(delta) {
    const current = Number(zoomSelect?.value || 100);
    const index = Math.max(0, Math.min(zoomSteps.length - 1, zoomSteps.indexOf(current) + delta));
    applyPosterZoom(zoomSteps[index]);
  }

  if (zoomSelect && poster) {
    applyPosterZoom(zoomSelect.value);
    zoomSelect.addEventListener("change", () => applyPosterZoom(zoomSelect.value));
    zoomIn?.addEventListener("click", () => stepZoom(1));
    zoomOut?.addEventListener("click", () => stepZoom(-1));
  }

  const fsBtn = document.querySelector("#poster-fullscreen");
  const viewer = document.querySelector(".poster-viewer");
  if (fsBtn && viewer) {
    const syncFsLabel = () => {
      const active = Boolean(document.fullscreenElement);
      fsBtn.innerHTML = active
        ? '<iconify-icon icon="mdi:fullscreen-exit" width="18" height="18"></iconify-icon> Exit full screen'
        : '<iconify-icon icon="mdi:fullscreen" width="18" height="18"></iconify-icon> Full screen';
    };
    fsBtn.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          await viewer.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (_) {
        /* ignore */
      }
    });
    document.addEventListener("fullscreenchange", syncFsLabel);
  }

  const frame = document.querySelector(".poster-frame");
  if (frame && poster) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    frame.addEventListener("mousedown", (event) => {
      dragging = true;
      frame.classList.add("is-grabbing");
      startX = event.pageX;
      startY = event.pageY;
      scrollLeft = frame.scrollLeft;
      scrollTop = frame.scrollTop;
      event.preventDefault();
    });

    window.addEventListener("mousemove", (event) => {
      if (!dragging) return;
      frame.scrollLeft = scrollLeft - (event.pageX - startX);
      frame.scrollTop = scrollTop - (event.pageY - startY);
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      frame.classList.remove("is-grabbing");
    });
  }

  document.querySelectorAll(".cmd-btn[data-seek]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const video = document.querySelector("#lesson-video");
      const seconds = Number(btn.dataset.seek || 0);
      if (video) {
        video.currentTime = seconds;
        video.play();
      }
    });
  });

})();
