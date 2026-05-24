/* ===== FORGE ENGINE — Plugin System ===== */
FORGE.Plugins = {
  _registered:{}, _loaded:{},
  register(plugin) {
    if(!plugin.id){console.error('Plugin must have an id');return;}
    this._registered[plugin.id]={...plugin,enabled:false};
    if(plugin.components)for(const[n,d]of Object.entries(plugin.components))FORGE.ComponentDefs[n]=d;
    FORGE.Events.emit('plugins:changed');FORGE.Events.emit('console:log','info','Plugin registered: '+plugin.name);
  },
  enable(id) {
    const p=this._registered[id];if(!p)return;p.enabled=true;
    if(p.panel&&p.panel.css){const s=document.createElement('style');s.id='plugin-css-'+id;s.textContent=p.panel.css;document.head.appendChild(s);}
    try{if(p.init)p.init();}catch(e){FORGE.Events.emit('console:log','error','Plugin init error: '+e.message);}
    this._loaded[id]=true;FORGE.Events.emit('plugin:loaded',p);FORGE.Events.emit('plugins:changed');
  },
  disable(id) {
    const p=this._registered[id];if(!p)return;p.enabled=false;
    const s=document.getElementById('plugin-css-'+id);if(s)s.remove();
    try{if(p.destroy)p.destroy();}catch(e){}
    delete this._loaded[id];FORGE.Events.emit('plugins:changed');
  },
  toggle(id){const p=this._registered[id];if(!p)return;if(p.enabled)this.disable(id);else this.enable(id);},
  loadFromCode(code){try{new Function('FORGE',code)(FORGE);}catch(e){FORGE.Events.emit('console:log','error','Plugin load error: '+e.message);}},
  openPluginPanel(id){const p=this._registered[id];if(!p||!p.panel)return;FORGE.Editor.showModal(p.panel.title,p.panel.html,c=>{if(p.panel.onMount)p.panel.onMount(c);});},
  getAll(){return Object.values(this._registered);}
};
