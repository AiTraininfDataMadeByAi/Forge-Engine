/* ===== FORGE ENGINE — Scene Graph / ECS ===== */

FORGE.ComponentDefs = {
  Transform: { icon:'📐', description:'Position, rotation, scale', default:()=>({position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}}) },
  MeshRenderer: { icon:'🧊', description:'3D mesh rendering', default:()=>({meshType:'box',material:'standard',color:'#4488ff',wireframe:false,castShadow:true,receiveShadow:true,visible:true}) },
  Light: { icon:'💡', description:'Light source', default:()=>({type:'point',color:'#ffffff',intensity:1,distance:0,decay:2,castShadow:true,angle:0.523,penumbra:0.1,groundColor:'#444444'}) },
  Camera: { icon:'📷', description:'Camera component', default:()=>({type:'perspective',fov:60,near:0.1,far:1000,orthoSize:10}) },
  Script: { icon:'📜', description:'Custom script', default:()=>({scriptName:'',properties:{}}) },
  Rigidbody: { icon:'🏋️', description:'Physics body', default:()=>({type:'dynamic',mass:1,friction:0.5,restitution:0.3,useGravity:true}) },
  Collider: { icon:'🔲', description:'Physics collider', default:()=>({type:'box',isTrigger:false,size:{x:1,y:1,z:1},radius:0.5,height:2}) },
  AudioSource: { icon:'🔊', description:'Audio playback', default:()=>({clip:'',volume:1,loop:false,playOnAwake:false,spatial:true,minDistance:1,maxDistance:100}) },
  ParticleSystem: { icon:'✨', description:'Particle effects', default:()=>({maxParticles:100,emissionRate:10,lifetime:2,speed:1,size:0.1,color:'#ff8800',gravity:-1,shape:'sphere'}) },
  Animator: { icon:'🎬', description:'Animation controller', default:()=>({animations:[],currentAnim:'',speed:1,loop:true}) }
};

class Entity {
  constructor(name='GameObject', id=null) {
    this.id = id || FORGE.Utils.uid();
    this.name = name;
    this.active = true;
    this.tag = 'Untagged';
    this.layer = 'Default';
    this.components = {};
    this.children = [];
    this.parent = null;
    this._threeObj = null;
    this.addComponent('Transform');
  }
  addComponent(name) {
    if (this.components[name] && name !== 'Script') return this.components[name];
    const def = FORGE.ComponentDefs[name];
    if (!def) return null;
    const data = def.default();
    if (name === 'Script') {
      if (!this.components.Scripts) this.components.Scripts = [];
      const sc = { _type:'Script', ...data, _id:FORGE.Utils.uid() };
      this.components.Scripts.push(sc);
      FORGE.Events.emit('component:added', this, 'Script');
      return sc;
    }
    this.components[name] = { _type:name, ...data };
    FORGE.Events.emit('component:added', this, name);
    return this.components[name];
  }
  removeComponent(name, scriptId) {
    if (name === 'Transform') return;
    if (name === 'Script' && scriptId) { if (this.components.Scripts) this.components.Scripts = this.components.Scripts.filter(s => s._id !== scriptId); }
    else delete this.components[name];
    FORGE.Events.emit('component:removed', this, name);
  }
  getComponent(name) { return this.components[name] || null; }
  hasComponent(name) { if (name === 'Script') return this.components.Scripts && this.components.Scripts.length > 0; return !!this.components[name]; }
  addChild(entity) { entity.parent = this; this.children.push(entity); FORGE.Events.emit('scene:changed'); }
  removeChild(entity) { this.children = this.children.filter(c => c.id !== entity.id); entity.parent = null; FORGE.Events.emit('scene:changed'); }
  serialize() {
    return { id:this.id, name:this.name, active:this.active, tag:this.tag, layer:this.layer, components:FORGE.Utils.deepClone(this.components), children:this.children.map(c=>c.serialize()) };
  }
  static deserialize(data) {
    const e = new Entity(data.name, data.id);
    e.active = data.active; e.tag = data.tag||'Untagged'; e.layer = data.layer||'Default';
    e.components = {};
    for (const [k,v] of Object.entries(data.components)) e.components[k] = FORGE.Utils.deepClone(v);
    if (data.children) for (const cd of data.children) { const child = Entity.deserialize(cd); e.addChild(child); }
    return e;
  }
}

class Scene {
  constructor(name='Untitled Scene') { this.name = name; this.id = FORGE.Utils.uid(); this.entities = [];
    this.settings = { skyColor:'#1a1a2e', ambientColor:'#404060', ambientIntensity:0.4, fogEnabled:false, fogColor:'#1a1a2e', fogNear:10, fogFar:100, gravity:{x:0,y:-9.81,z:0} };
  }
  addEntity(entity) { this.entities.push(entity); FORGE.Events.emit('gameobject:added', entity); FORGE.Events.emit('scene:changed'); return entity; }
  removeEntity(id) {
    const remove = (list) => { for (let i=0;i<list.length;i++) { if (list[i].id===id) { const r=list.splice(i,1)[0]; FORGE.Events.emit('gameobject:removed',id); FORGE.Events.emit('scene:changed'); return r; } const f=remove(list[i].children); if(f)return f; } return null; };
    return remove(this.entities);
  }
  findEntity(id) { const find=(list)=>{ for(const e of list){if(e.id===id)return e;const f=find(e.children);if(f)return f;} return null;}; return find(this.entities); }
  getAllEntities() { const all=[]; const collect=(list)=>{for(const e of list){all.push(e);collect(e.children);}}; collect(this.entities); return all; }
  serialize() { return {name:this.name,id:this.id,settings:FORGE.Utils.deepClone(this.settings),entities:this.entities.map(e=>e.serialize())}; }
  static deserialize(data) { const s=new Scene(data.name);s.id=data.id;s.settings=data.settings||s.settings; for(const ed of data.entities)s.entities.push(Entity.deserialize(ed)); return s; }
  static createDefault() {
    const s = new Scene('Main Scene');
    const cam = new Entity('Main Camera'); cam.addComponent('Camera'); cam.components.Transform.position={x:0,y:3,z:8}; cam.components.Transform.rotation={x:-15,y:0,z:0}; s.addEntity(cam);
    const light = new Entity('Directional Light'); light.addComponent('Light'); light.components.Light.type='directional'; light.components.Light.intensity=1.2; light.components.Transform.position={x:5,y:10,z:5}; light.components.Transform.rotation={x:-45,y:30,z:0}; s.addEntity(light);
    const ground = new Entity('Ground'); ground.addComponent('MeshRenderer'); ground.components.MeshRenderer.meshType='plane'; ground.components.MeshRenderer.color='#3a5a3a'; ground.components.Transform.scale={x:20,y:20,z:1}; ground.components.Transform.rotation={x:-90,y:0,z:0}; s.addEntity(ground);
    const cube = new Entity('Cube'); cube.addComponent('MeshRenderer'); cube.components.Transform.position={x:0,y:0.5,z:0}; s.addEntity(cube);
    return s;
  }
}

FORGE.Entity = Entity;
FORGE.Scene = Scene;

FORGE.Project = {
  name:'My Game', scene:null, scripts:{}, selectedEntity:null,
  select(entity) { this.selectedEntity = entity; FORGE.Events.emit('selection:changed', entity); },
  deselect() { this.selectedEntity = null; FORGE.Events.emit('selection:changed', null); },
  saveToJSON() { return JSON.stringify({name:this.name,scene:this.scene?this.scene.serialize():null,scripts:this.scripts},null,2); },
  loadFromJSON(json) { try { const d=JSON.parse(json); this.name=d.name||'My Game'; this.scripts=d.scripts||{}; if(d.scene)this.scene=Scene.deserialize(d.scene); this.selectedEntity=null; FORGE.Events.emit('scene:loaded'); FORGE.Events.emit('selection:changed',null); return true; } catch(e){return false;} },
  saveToLocalStorage() { try{localStorage.setItem('forge_project',this.saveToJSON());FORGE.Events.emit('console:log','info','Project saved.');return true;}catch(e){return false;} },
  loadFromLocalStorage() { const d=localStorage.getItem('forge_project'); if(d)return this.loadFromJSON(d); return false; }
};
