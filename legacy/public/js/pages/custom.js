/* pages/custom.js - the CUSTOM scoreboard (menu: Others).
     /custom-scoreboard  the display (same look as /scoreboard, no menu): F or double-click = full screen
     /custom-controls    the operator panel (same buttons as /controls plus scores, fouls and timeouts typed in by hand)
   Everything is stored in db.custom and ticked by the server on its own, so it never changes the live game, players or statistics.
   Use it when a manual scoreboard is needed. */

pages['custom-scoreboard'] = function () {
  tickHook = () => {
    setHtml('#sb', customBoard());
    $('#bhint').toggle(!Buzzer.ready);
  };
  $(document).on('keydown.page', e => { if (e.key.toLowerCase() == 'f') toggleFullscreen(); })
             .on('dblclick.page', toggleFullscreen);
  return {
    h: `<div id="sb">${customBoard()}</div>
        <div id="bhint">🔊 Click once to enable sound · press F or double-click for full screen</div>`,
  };
};

pages['custom-controls'] = function () {
  tickHook = () => ctlUpdate(CTL.custom);
  return { h: ctlHtml(CTL.custom), after: () => ctlUpdate(CTL.custom) };
};
