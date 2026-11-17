/* pages/log.js - /log: shows game-log.txt */

pages.log = async function () {
  const text = await $.get('/api/log');
  return {
    bc: [['Game log']],
    h: `<h2>game-log.txt</h2><pre class="card" style="overflow:auto">${E(text || '(empty)')}</pre>`,
  };
};
