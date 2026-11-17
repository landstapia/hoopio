/* pages/controls.js - /controls: operator panel for the LIVE game. Built to fit a landscape phone and a laptop screen.
   The layout and buttons come from ctl.js (shared with /custom-controls); styles: css/controls.css */

pages.controls = function () {
  const g = CG();
  if (!g) return { bc: [['Controls']], h: '<p>No live game. Set one in ' + a('/games', 'Games') + '.</p>' };
  tickHook = () => ctlUpdate(CTL.main);          // numbers, labels and buttons follow the server every poll
  return { h: ctlHtml(CTL.main), after: () => ctlUpdate(CTL.main) };   // no breadcrumbs here: every pixel of height counts on a phone
};
