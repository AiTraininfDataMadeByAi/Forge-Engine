/* ===== FORGE ENGINE — App Boot ===== */

FORGE.Editor = {
  showModal(title, html, onMount) {
    const overlay=document.getElementById('modal-overlay');document.getElementById('modal-title').textContent=title;
    const body=document.getElementById('modal-body');body.innerHTML=html;overlay.style.display='flex';if(onMount)onMount(body);
  },
  hideModal() { document.getElementById('modal-overlay').style.display='none'; }
};

document.getElementById('modal-close').addEventListener('click',()=>FORGE.Editor.hideModal());
document.getElementById('modal-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget)FORGE.Editor.hideModal();});

// Bottom panel tabs
document.querySelectorAll('#panel-bottom .p-tab').forEach(tab=>{tab.addEventListener('click',()=>{
  document.querySelectorAll('#panel-bottom .p-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#panel-bottom .tab-content').forEach(c=>{c.style.display='none';c.classList.remove('active-tab');});
  tab.classList.add('active');const content=document.getElementById('tab-'+tab.dataset.tab);if(content){content.style.display='flex';content.classList.add('active-tab');}
});});

// ---- BOOT ----
(async function boot() {
  const bar=document.getElementById('load-bar');
  const status=document.getElementById('load-status');
  const errDiv=document.getElementById('load-error');
  try {
    await FORGE.Renderer.init(document.getElementById('viewport-canvas'));
    bar.style.width='90%'; status.textContent='Setting up editor...';
    await FORGE.Assets.init();
    FORGE.Input.init();
    FORGE.Physics.init();
    FORGE.Menubar.init();
    FORGE.Hierarchy.init();
    FORGE.Inspector.init();
    FORGE.Viewport.init();
    FORGE.Console.init();
    FORGE.AssetsPanel.init();
    FORGE.ScriptEditor.init();
    FORGE.Resize.init();
    FORGE.Toolbar.init();
    FORGE.Gizmos.init();
    bar.style.width='95%';
    if(!FORGE.Project.loadFromLocalStorage()){FORGE.Project.scene=FORGE.Scene.createDefault();FORGE.Events.emit('scene:loaded');}
    bar.style.width='100%'; status.textContent='Complete!';
    setTimeout(()=>{document.getElementById('loading-screen').style.display='none';document.getElementById('app').style.display='block';
      FORGE.Renderer._onResize();FORGE.Renderer.rebuildScene();
      FORGE.Events.emit('console:log','info','⚡ ForgeEngine v0.1.0 initialized');
      FORGE.Events.emit('console:log','info','Scene loaded with '+(FORGE.Project.scene?FORGE.Project.scene.getAllEntities().length:0)+' entities');
    },400);
  } catch(err) {
    status.textContent='Error loading engine';status.style.color='#f44';
    errDiv.style.display='block';
    errDiv.innerHTML='<p><b>'+err.message+'</b></p><p style="margin-top:8px;">This usually means Three.js couldn\'t load from CDN. To fix:</p><ol style="text-align:left;margin-top:8px;padding-left:20px;line-height:2;"><li>Download this project and open <code>index.html</code> locally</li><li>Or host it on GitHub Pages / any web server</li><li>Make sure you have internet access</li></ol>';
  }
})();
