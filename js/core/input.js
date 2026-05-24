/* ===== FORGE ENGINE — Input System ===== */
FORGE.Input = {
  keys:{}, keysDown:{}, keysUp:{}, mousePos:{x:0,y:0}, mouseButtons:{},
  init() {
    window.addEventListener('keydown', e => {
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
      this.keys[e.code]=true; this.keysDown[e.code]=true;
      if(!e.ctrlKey&&!e.metaKey){
        if(e.code==='KeyQ')FORGE.Events.emit('tool:changed','select');
        if(e.code==='KeyW')FORGE.Events.emit('tool:changed','move');
        if(e.code==='KeyE')FORGE.Events.emit('tool:changed','rotate');
        if(e.code==='KeyR')FORGE.Events.emit('tool:changed','scale');
        if(e.code==='KeyF'&&FORGE.Renderer)FORGE.Renderer.focusSelected();
        if((e.code==='Delete'||e.code==='Backspace')&&FORGE.Project.selectedEntity){const id=FORGE.Project.selectedEntity.id;FORGE.Project.deselect();FORGE.Project.scene.removeEntity(id);}
      }
      if(e.ctrlKey||e.metaKey){
        if(e.code==='KeyS'){e.preventDefault();FORGE.Project.saveToLocalStorage();}
        if(e.code==='KeyD'){e.preventDefault();if(FORGE.Project.selectedEntity){const j=FORGE.Project.selectedEntity.serialize();j.id=FORGE.Utils.uid();j.name+=' (Copy)';const d=FORGE.Entity.deserialize(j);FORGE.Project.scene.addEntity(d);FORGE.Project.select(d);}}
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code]=false; this.keysUp[e.code]=true; });
    window.addEventListener('mousemove', e => { this.mousePos.x=e.clientX; this.mousePos.y=e.clientY; });
    window.addEventListener('mousedown', e => { this.mouseButtons[e.button]=true; });
    window.addEventListener('mouseup', e => { this.mouseButtons[e.button]=false; });
  },
  getKey(code){return!!this.keys[code];}, getKeyDown(code){return!!this.keysDown[code];},
};
