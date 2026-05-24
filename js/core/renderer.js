/* ===== FORGE ENGINE — 3D Renderer (Three.js) ===== */

FORGE.Renderer = {
  scene:null, camera:null, renderer:null, orbitControls:null, transformControls:null,
  gridHelper:null, raycaster:null, mouse:null, clock:null,
  _entityMap:new Map(), _objectToEntity:new Map(),
  _lightHelpers:[], _cameraHelpers:[],
  _frameCount:0, _fpsTime:0, _currentFps:0,
  _showGrid:true, _snapEnabled:false, _snapValue:0.5,
  _currentTool:'select', _isPlaying:false, _viewMode:'scene', _shadingMode:'default',

  async init(canvas) {
    await this._loadThreeJS();
    const container = canvas.parentElement;
    const w = container.clientWidth, h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1e1e30');

    this.camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 2000);
    this.camera.position.set(5, 5, 8);
    this.camera.lookAt(0,0,0);

    this.renderer = new THREE.WebGLRenderer({canvas, antialias:true});
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.gridHelper = new THREE.GridHelper(40, 40, 0x444470, 0x333355);
    this.scene.add(this.gridHelper);
    this.scene.add(new THREE.AxesHelper(1));

    this._editorAmbient = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this._editorAmbient);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    if (THREE.OrbitControls) {
      this.orbitControls = new THREE.OrbitControls(this.camera, canvas);
      this.orbitControls.enableDamping = true;
      this.orbitControls.dampingFactor = 0.08;
    }
    if (THREE.TransformControls) {
      this.transformControls = new THREE.TransformControls(this.camera, canvas);
      this.transformControls.setSize(0.8);
      this.scene.add(this.transformControls);
      this.transformControls.addEventListener('dragging-changed', e => { if(this.orbitControls) this.orbitControls.enabled = !e.value; });
      this.transformControls.addEventListener('objectChange', () => this._syncTransformToEntity());
    }

    canvas.addEventListener('pointerdown', e => this._onPointerDown(e));
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(container);

    FORGE.Events.on('scene:loaded', () => this.rebuildScene());
    FORGE.Events.on('scene:changed', FORGE.Utils.debounce(() => this.rebuildScene(), 50));
    FORGE.Events.on('selection:changed', entity => this._onSelectionChanged(entity));
    FORGE.Events.on('tool:changed', tool => this._onToolChanged(tool));
    FORGE.Events.on('component:added', () => this.rebuildScene());
    FORGE.Events.on('component:removed', () => this.rebuildScene());

    this._animate();
  },

  async _loadThreeJS() {
    const load = url => new Promise((res, rej) => {
      if (url.includes('three') && window.THREE) { res(); return; }
      const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    const status = document.getElementById('load-status');
    const bar = document.getElementById('load-bar');
    status.textContent = 'Loading Three.js...'; bar.style.width = '20%';
    await load('https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js');
    status.textContent = 'Loading controls...'; bar.style.width = '50%';
    await load('https://cdn.jsdelivr.net/npm/three@0.152.0/examples/js/controls/OrbitControls.js');
    status.textContent = 'Loading gizmos...'; bar.style.width = '70%';
    await load('https://cdn.jsdelivr.net/npm/three@0.152.0/examples/js/controls/TransformControls.js');
    bar.style.width = '90%'; status.textContent = 'Ready!';
  },

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = this.clock.getDelta();
    this._frameCount++; this._fpsTime += dt;
    if (this._fpsTime >= 0.5) { this._currentFps = Math.round(this._frameCount/this._fpsTime); this._fpsTime=0; this._frameCount=0; const el=document.getElementById('vp-fps'); if(el)el.textContent=this._currentFps+' FPS'; }
    if (this.orbitControls) this.orbitControls.update();
    if (this._isPlaying) FORGE.Scripting.update(dt);
    this.renderer.render(this.scene, this.camera);
  },

  _onResize() {
    const c = this.renderer.domElement.parentElement; if(!c)return;
    const w=c.clientWidth, h=c.clientHeight; if(w<=0||h<=0)return;
    this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h);
  },

  _onPointerDown(e) {
    if (this.transformControls && this.transformControls.dragging) return;
    const canvas = this.renderer.domElement, rect = canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX-rect.left)/rect.width)*2-1;
    this.mouse.y = -((e.clientY-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const selectables = [];
    this._entityMap.forEach(obj => { obj.traverse(child => { if(child.isMesh)selectables.push(child); }); });
    const hits = this.raycaster.intersectObjects(selectables, false);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj) { if (obj.userData.entityId) { const ent=FORGE.Project.scene.findEntity(obj.userData.entityId); if(ent){FORGE.Project.select(ent);return;} } obj=obj.parent; }
    } else if (e.button===0 && !e.shiftKey) { FORGE.Project.deselect(); }
  },

  _onSelectionChanged(entity) {
    if (this.transformControls) { if(entity&&this._entityMap.has(entity.id)) this.transformControls.attach(this._entityMap.get(entity.id)); else this.transformControls.detach(); }
    this._entityMap.forEach(obj => { obj.traverse(child => { if(child.isMesh && child._origMat){child.material=child._origMat;child._origMat=null;} }); });
    if (entity && this._entityMap.has(entity.id)) {
      this._entityMap.get(entity.id).traverse(child => {
        if (child.isMesh) { child._origMat=child.material; child.material=child.material.clone(); child.material.emissive=new THREE.Color(0x003355); child.material.emissiveIntensity=0.3; }
      });
    }
  },

  _onToolChanged(tool) {
    this._currentTool = tool;
    if (this.transformControls) {
      const modes = {move:'translate',rotate:'rotate',scale:'scale',select:'translate'};
      this.transformControls.setMode(modes[tool]||'translate');
      this.transformControls.setTranslationSnap(this._snapEnabled?this._snapValue:null);
      this.transformControls.setRotationSnap(this._snapEnabled?FORGE.Utils.degToRad(15):null);
      this.transformControls.setScaleSnap(this._snapEnabled?0.25:null);
    }
  },

  _syncTransformToEntity() {
    const entity=FORGE.Project.selectedEntity; if(!entity)return;
    const obj=this._entityMap.get(entity.id); if(!obj)return;
    const t=entity.components.Transform;
    t.position.x=+obj.position.x.toFixed(4); t.position.y=+obj.position.y.toFixed(4); t.position.z=+obj.position.z.toFixed(4);
    t.rotation.x=+FORGE.Utils.radToDeg(obj.rotation.x).toFixed(2); t.rotation.y=+FORGE.Utils.radToDeg(obj.rotation.y).toFixed(2); t.rotation.z=+FORGE.Utils.radToDeg(obj.rotation.z).toFixed(2);
    t.scale.x=+obj.scale.x.toFixed(4); t.scale.y=+obj.scale.y.toFixed(4); t.scale.z=+obj.scale.z.toFixed(4);
    FORGE.Events.emit('selection:changed', entity);
  },

  toggleGrid() { this._showGrid=!this._showGrid; if(this.gridHelper)this.gridHelper.visible=this._showGrid; },
  toggleSnap() { this._snapEnabled=!this._snapEnabled; this._onToolChanged(this._currentTool); FORGE.Events.emit('console:log','info','Snap: '+(this._snapEnabled?'ON':'OFF')); },

  setViewCamera(view) {
    const d=15;
    if(view==='perspective'){this.camera.position.set(5,5,8);if(this.orbitControls)this.orbitControls.target.set(0,0,0);}
    else if(view==='top'){this.camera.position.set(0,d,0.01);if(this.orbitControls)this.orbitControls.target.set(0,0,0);}
    else if(view==='front'){this.camera.position.set(0,2,d);if(this.orbitControls)this.orbitControls.target.set(0,2,0);}
    else if(view==='right'){this.camera.position.set(d,2,0);if(this.orbitControls)this.orbitControls.target.set(0,2,0);}
  },

  setShadingMode(mode) { this._shadingMode=mode; this.rebuildScene(); },

  rebuildScene() {
    if (!this.scene || !FORGE.Project.scene) return;
    this._entityMap.forEach(obj => { this.scene.remove(obj); this._disposeObj(obj); });
    this._entityMap.clear(); this._objectToEntity.clear();
    this._lightHelpers.forEach(h=>this.scene.remove(h)); this._cameraHelpers.forEach(h=>this.scene.remove(h));
    this._lightHelpers=[]; this._cameraHelpers=[];
    const settings = FORGE.Project.scene.settings;
    this.scene.background = new THREE.Color(settings.skyColor);
    this._editorAmbient.color.set(settings.ambientColor); this._editorAmbient.intensity = settings.ambientIntensity;
    this.scene.fog = settings.fogEnabled ? new THREE.Fog(settings.fogColor,settings.fogNear,settings.fogFar) : null;
    const all = FORGE.Project.scene.getAllEntities(); let triCount=0;
    for (const entity of all) {
      const obj = this._buildEntity(entity);
      if (obj) {
        if (entity.parent && this._entityMap.has(entity.parent.id)) this._entityMap.get(entity.parent.id).add(obj);
        else this.scene.add(obj);
        this._entityMap.set(entity.id, obj); entity._threeObj = obj;
        obj.traverse(child => { if(child.isMesh&&child.geometry){const idx=child.geometry.index;triCount+=idx?idx.count/3:(child.geometry.attributes.position?.count||0)/3;} });
      }
    }
    const tEl=document.getElementById('vp-tris'),oEl=document.getElementById('vp-objects');
    if(tEl)tEl.textContent=Math.round(triCount)+' tris'; if(oEl)oEl.textContent=all.length+' objects';
    if (FORGE.Project.selectedEntity) this._onSelectionChanged(FORGE.Project.selectedEntity);
  },

  _buildEntity(entity) {
    const g = new THREE.Group(); g.name=entity.name; g.userData.entityId=entity.id; g.visible=entity.active;
    const t=entity.components.Transform;
    if(t){g.position.set(t.position.x,t.position.y,t.position.z);g.rotation.set(FORGE.Utils.degToRad(t.rotation.x),FORGE.Utils.degToRad(t.rotation.y),FORGE.Utils.degToRad(t.rotation.z));g.scale.set(t.scale.x,t.scale.y,t.scale.z);}
    const mr=entity.components.MeshRenderer;
    if(mr){
      const geom=this._createGeom(mr.meshType); let mat;
      if(this._shadingMode==='wireframe')mat=new THREE.MeshBasicMaterial({color:mr.color,wireframe:true});
      else if(this._shadingMode==='unlit')mat=new THREE.MeshBasicMaterial({color:mr.color});
      else{
        if(mr.material==='basic')mat=new THREE.MeshBasicMaterial({color:mr.color});
        else if(mr.material==='phong')mat=new THREE.MeshPhongMaterial({color:mr.color});
        else if(mr.material==='physical')mat=new THREE.MeshPhysicalMaterial({color:mr.color,roughness:0.4,metalness:0.3});
        else mat=new THREE.MeshStandardMaterial({color:mr.color,roughness:0.6,metalness:0.1});
        mat.wireframe=mr.wireframe;
      }
      const mesh=new THREE.Mesh(geom,mat);mesh.castShadow=mr.castShadow;mesh.receiveShadow=mr.receiveShadow;mesh.visible=mr.visible;mesh.userData.entityId=entity.id;g.add(mesh);
    }
    const lc=entity.components.Light;
    if(lc){
      let light;
      if(lc.type==='directional'){light=new THREE.DirectionalLight(lc.color,lc.intensity);light.castShadow=lc.castShadow;light.shadow.mapSize.set(2048,2048);light.shadow.camera.near=0.5;light.shadow.camera.far=50;light.shadow.camera.left=-15;light.shadow.camera.right=15;light.shadow.camera.top=15;light.shadow.camera.bottom=-15;const dh=new THREE.DirectionalLightHelper(light,1);this.scene.add(dh);this._lightHelpers.push(dh);}
      else if(lc.type==='spot'){light=new THREE.SpotLight(lc.color,lc.intensity,lc.distance,lc.angle,lc.penumbra,lc.decay);light.castShadow=lc.castShadow;}
      else if(lc.type==='ambient'){light=new THREE.AmbientLight(lc.color,lc.intensity);}
      else if(lc.type==='hemisphere'){light=new THREE.HemisphereLight(lc.color,lc.groundColor,lc.intensity);}
      else{light=new THREE.PointLight(lc.color,lc.intensity,lc.distance,lc.decay);light.castShadow=lc.castShadow;const ph=new THREE.PointLightHelper(light,0.3);this.scene.add(ph);this._lightHelpers.push(ph);}
      g.add(light);
    }
    const cc=entity.components.Camera;
    if(cc&&this._viewMode==='scene'){const gc=new THREE.PerspectiveCamera(cc.fov,16/9,cc.near,cc.far);gc.updateProjectionMatrix();const ch=new THREE.CameraHelper(gc);g.add(gc);this.scene.add(ch);this._cameraHelpers.push(ch);}
    return g;
  },

  _createGeom(type) {
    if(type==='sphere')return new THREE.SphereGeometry(0.5,32,16);if(type==='cylinder')return new THREE.CylinderGeometry(0.5,0.5,1,32);if(type==='plane')return new THREE.PlaneGeometry(1,1);if(type==='cone')return new THREE.ConeGeometry(0.5,1,32);if(type==='torus')return new THREE.TorusGeometry(0.4,0.15,16,32);
    return new THREE.BoxGeometry(1,1,1);
  },

  _disposeObj(obj) { obj.traverse(c=>{if(c.geometry)c.geometry.dispose();if(c.material){if(Array.isArray(c.material))c.material.forEach(m=>m.dispose());else c.material.dispose();}}); },

  focusSelected() {
    const e=FORGE.Project.selectedEntity; if(!e||!this._entityMap.has(e.id))return;
    const obj=this._entityMap.get(e.id), box=new THREE.Box3().setFromObject(obj), center=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3()).length();
    if(this.orbitControls)this.orbitControls.target.copy(center);
    this.camera.position.copy(center).add(new THREE.Vector3(size,size*0.7,size));
  }
};
