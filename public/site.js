/* =========================================================
   Aaron Hampton — shared site interactions
   - Magnetic CTAs (nav, footer big link, contact email)
   - Iris page transitions (black aperture wipe)
   - Auto pause videos when offscreen (perf)
   ========================================================= */
(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse       = window.matchMedia('(pointer: coarse)').matches;

  /* ----- 1. Magnetic CTAs ------------------------------- */
  if (!reduceMotion && !coarse){
    var magnets = document.querySelectorAll(
      '.site-nav a, .site-foot__big a, .contact__email, .btn-send, [data-magnetic]'
    );
    magnets.forEach(function(el){
      var strength = el.dataset.magnetic ? parseFloat(el.dataset.magnetic) : 0.35;
      var raf = null, tx = 0, ty = 0;
      el.style.willChange = 'transform';
      el.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)';
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        tx = (e.clientX - (r.left + r.width/2)) * strength;
        ty = (e.clientY - (r.top  + r.height/2)) * strength;
        if (!raf) raf = requestAnimationFrame(function(){
          el.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
          raf = null;
        });
      });
      el.addEventListener('mouseleave', function(){
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ----- 2. Iris page transition ------------------------ */
  // Build the overlay
  var iris = document.createElement('div');
  iris.className = 'iris';
  iris.innerHTML = '<span class="iris__disc"></span>';
  document.body.appendChild(iris);

  function isInternal(a){
    if (!a || !a.href) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false; // same-page anchor
    if (!/\.html?$/i.test(url.pathname)) return false;
    return true;
  }

  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a');
    if (!isInternal(a)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    var x = e.clientX || window.innerWidth/2;
    var y = e.clientY || window.innerHeight/2;
    iris.style.setProperty('--ix', x + 'px');
    iris.style.setProperty('--iy', y + 'px');
    iris.classList.add('is-closing');
    setTimeout(function(){ window.location.href = a.href; }, reduceMotion ? 0 : 620);
  });

  // If returning via bfcache, reset overlay
  window.addEventListener('pageshow', function(){
    iris.classList.remove('is-closing');
  });

  /* ----- 3. Pause videos when offscreen ----------------- */
  var vids = document.querySelectorAll('video');
  if ('IntersectionObserver' in window && vids.length){
    var vio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var v = en.target;
        if (en.isIntersecting && en.intersectionRatio > 0.25){
          // only auto-play if originally autoplay or marked
          if (v.dataset.autoplay === 'true' || v.autoplay || v.hasAttribute('data-play-when-visible')){
            var p = v.play();
            if (p && p.catch) p.catch(function(){});
          }
        } else {
          if (!v.paused) v.pause();
        }
      });
    }, { threshold: [0, 0.25, 0.6] });
    vids.forEach(function(v){
      if (v.autoplay) v.dataset.autoplay = 'true';
      vio.observe(v);
    });
  }
})();

/* ----- 4. Case-study coming-soon toast on work rows ----- */
(function(){
  var rows = document.querySelectorAll('.work-row');
  if (!rows.length) return;
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<span class="toast__dot"></span><span class="toast__txt">Case study — coming soon</span>';
  document.body.appendChild(toast);
  var t;
  rows.forEach(function(r){
    r.style.cursor = 'pointer';
    r.addEventListener('click', function(){
      var link = r.dataset.link;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
        return;
      }
      toast.classList.add('show');
      clearTimeout(t);
      t = setTimeout(function(){ toast.classList.remove('show'); }, 2200);
    });
  });
})();

/* ----- 5. Resilient video loading -----------------------
   Goal: if a viewer is on slow/limited wifi (or a video errors out,
   stalls, or never reaches a playable state), don't leave an empty
   black rectangle on the page. Hide the failing <video> so the
   container's gradient/poster background shows through.
--------------------------------------------------------- */
(function(){
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var skipAll = false;
  if (conn) {
    if (conn.saveData) skipAll = true;
    var et = conn.effectiveType || '';
    if (et === 'slow-2g' || et === '2g') skipAll = true;
  }

  var vids = document.querySelectorAll('video');
  Array.prototype.forEach.call(vids, function(v){
    var failed = false;
    var fail = function(){
      if (failed) return;
      failed = true;
      v.classList.add('video-failed');
      try { v.pause(); } catch(e){}
      v.removeAttribute('autoplay');
      // Strip the heavy src so the browser stops trying to buffer it.
      try { v.removeAttribute('src'); v.load(); } catch(e){}
    };

    // Save-Data or very slow connection: never even try the video.
    if (skipAll) { fail(); return; }

    v.addEventListener('error', fail);
    v.addEventListener('abort', fail);
    Array.prototype.forEach.call(v.querySelectorAll('source'), function(s){
      s.addEventListener('error', fail);
    });

    // Timeout: if the video hasn't reached "have current data" within
    // 15 seconds of being asked to load, assume it's not coming.
    var killTimer = null;
    var armTimeout = function(){
      if (killTimer) return;
      killTimer = setTimeout(function(){
        if (v.readyState < 2) fail();
      }, 15000);
    };
    var clearTimer = function(){
      if (killTimer){ clearTimeout(killTimer); killTimer = null; }
    };
    v.addEventListener('loadstart', armTimeout);
    v.addEventListener('loadeddata', clearTimer);
    v.addEventListener('canplay', clearTimer);
    if (v.autoplay || v.preload === 'metadata' || v.preload === 'auto') armTimeout();
  });
})();
