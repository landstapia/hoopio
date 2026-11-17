/* pages/scoreboard.js - /scoreboard: the display for a second monitor. No menu, no breadcrumbs (see router.js).
   Look: css/scoreboard.css · HTML: board() in components.js · digits: segment.js · sound: buzzer.js
   Keys: F or double-click = full screen. Click once anywhere to allow sound. */

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}

pages.scoreboard = function () {
  tickHook = () => {
    setHtml('#sb', board());                        // redraw so the clock keeps moving
    $('#bhint').toggle(!Buzzer.ready);              // hide the sound hint once sound is allowed
  };
  $(document).on('keydown.page', e => { if (e.key.toLowerCase() == 'f') toggleFullscreen(); })
             .on('dblclick.page', toggleFullscreen);
  return {
    h: `<div id="sb">${board()}</div>
        <div id="bhint">🔊 Click once to enable sound · press F or double-click for full screen</div>`,
  };
};
