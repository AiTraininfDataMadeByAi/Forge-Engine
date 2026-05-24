/* ===== FORGE ENGINE — Asset Manager (IndexedDB) ===== */
FORGE.Assets = {
  db:null, _cache:new Map(),
  async init() {
    return new Promise(res => {
      const req=indexedDB.open('ForgeEngine_Assets',1);
      req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets',{keyPath:'id'});};
      req.onsuccess=e=>{this.db=e.target.result;res();};
      req.onerror=()=>res();
    });
  },
  async store(asset){if(!this.db)return;return new Promise((res,rej)=>{const tx=this.db.transaction('assets','readwrite');tx.objectStore('assets').put(asset);tx.oncomplete=()=>{this._cache.set(asset.id,asset);FORGE.Events.emit('assets:changed');res(asset);};tx.onerror=rej;});},
  async get(id){if(this._cache.has(id))return this._cache.get(id);if(!this.db)return null;return new Promise(res=>{const tx=this.db.transaction('assets','readonly');const r=tx.objectStore('assets').get(id);r.onsuccess=()=>{if(r.result)this._cache.set(id,r.result);res(r.result||null);};r.onerror=()=>res(null);});},
  async getAll(){if(!this.db)return[];return new Promise(res=>{const tx=this.db.transaction('assets','readonly');const r=tx.objectStore('assets').getAll();r.onsuccess=()=>{for(const a of r.result)this._cache.set(a.id,a);res(r.result);};r.onerror=()=>res([]);});},
  async remove(id){if(!this.db)return;return new Promise(res=>{const tx=this.db.transaction('assets','readwrite');tx.objectStore('assets').delete(id);tx.oncomplete=()=>{this._cache.delete(id);FORGE.Events.emit('assets:changed');res();};});},
  async importFile(file){const id=FORGE.Utils.uid();const data=await file.arrayBuffer();const type=file.type.startsWith('image/')?'texture':file.type.startsWith('audio/')?'audio':file.name.match(/\.(glb|gltf|obj|fbx)$/)?'model':'other';
    const asset={id,name:file.name,type,mimeType:file.type,data:this._ab2b64(data),size:file.size,folder:'/',created:Date.now()};
    await this.store(asset);FORGE.Events.emit('console:log','info','Imported: '+file.name);return asset;},
  _ab2b64(buf){let b='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.byteLength;i++)b+=String.fromCharCode(bytes[i]);return btoa(b);},
  getIcon(type){return{texture:'🖼️',audio:'🎵',model:'🧊',script:'📜',other:'📁'}[type]||'📁';}
};
