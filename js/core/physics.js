/* ===== FORGE ENGINE — Physics Stub ===== */
FORGE.Physics = {
  _enabled:false,
  init(){FORGE.Events.emit('console:log','info','Physics: Ready (basic mode)');},
  update(dt){if(!this._enabled)return;const entities=FORGE.Project.scene?FORGE.Project.scene.getAllEntities():[];
    for(const e of entities){const rb=e.getComponent('Rigidbody');if(!rb||rb.type!=='dynamic'||!rb.useGravity)continue;const t=e.components.Transform;if(!e._velocity)e._velocity={x:0,y:0,z:0};
      e._velocity.y+=FORGE.Project.scene.settings.gravity.y*dt;t.position.y+=e._velocity.y*dt;if(t.position.y<0){t.position.y=0;e._velocity.y=-e._velocity.y*rb.restitution;if(Math.abs(e._velocity.y)<0.1)e._velocity.y=0;}
    }
  }
};
