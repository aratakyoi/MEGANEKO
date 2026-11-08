// Four rigged character prefabs. Centimeters, centered origin, face +Z.
// Parametric silhouettes are retained for locked catalogue entries only.
import {IDS} from './MeganekoRules';
type C=[number,number,number];
const palette:C[]=[[.72,.83,.91],[.68,.48,.28],[.96,.58,.76],[.37,.36,.6]];
export function object(parent:SceneObject,name:string):SceneObject{const o=global.scene.createSceneObject(name);o.setParent(parent);return o;}
class Geometry {
  v:number[]=[];i:number[]=[];
  ell(x:number,y:number,z:number,sx:number,sy:number,sz:number){const b=this.v.length/6,N=16,M=10;for(let j=0;j<=M;j++){const p=Math.PI*j/M;for(let k=0;k<=N;k++){const a=2*Math.PI*k/N,n=[Math.sin(p)*Math.cos(a),Math.cos(p),Math.sin(p)*Math.sin(a)];this.v.push(x+sx*n[0],y+sy*n[1],z+sz*n[2],...n);}}for(let j=0;j<M;j++)for(let k=0;k<N;k++){const a=b+j*(N+1)+k,c=a+N+1;this.i.push(a,a+1,c,c,a+1,c+1);}}
  ring(x:number,y:number,z:number,r:number,t:number){const b=this.v.length/6,N=28,M=6;for(let j=0;j<=N;j++)for(let k=0;k<=M;k++){const a=2*Math.PI*j/N,p=2*Math.PI*k/M;this.v.push(x+(r+t*Math.cos(p))*Math.cos(a),y+(r+t*Math.cos(p))*Math.sin(a),z+t*Math.sin(p),Math.cos(p)*Math.cos(a),Math.cos(p)*Math.sin(a),Math.sin(p));}for(let j=0;j<N;j++)for(let k=0;k<M;k++){const a=b+j*(M+1)+k,c=a+M+1;this.i.push(a,c,a+1,c,c+1,a+1);}}
  ear(x:number,y:number,z:number,w:number,h:number,d:number){const p=[[x-w,y,z-d],[x+w,y,z-d],[x,y+h,z],[x-w,y,z+d],[x+w,y,z+d]],tris=[[0,2,1],[3,4,2],[0,3,2],[1,2,4],[0,1,4],[0,4,3]];for(const q of tris){const a=new vec3(...p[q[0]] as [number,number,number]),b=new vec3(...p[q[1]] as [number,number,number]),c=new vec3(...p[q[2]] as [number,number,number]),n=b.sub(a).cross(c.sub(a)).normalize(),s=this.v.length/6;for(const k of q)this.v.push(...p[k],n.x,n.y,n.z);this.i.push(s,s+1,s+2);}}
  emit(parent:SceneObject,name:string,mat:Material,color:C){if(!this.i.length)return;const builder=new MeshBuilder([{name:'position',components:3},{name:'normal',components:3,normalized:true}]);builder.topology=MeshTopology.Triangles;builder.indexType=MeshIndexType.UInt16;builder.appendVerticesInterleaved(this.v);builder.appendIndices(this.i);builder.updateMesh();const rm=object(parent,name).createComponent('Component.RenderMeshVisual');rm.mesh=builder.getMesh();const m=mat.clone();m.mainPass.baseColor=new vec4(color[0],color[1],color[2],1);rm.mainMaterial=m;return rm;}
}
export class Cat {
  root:SceneObject; tail:SceneObject; ears:SceneObject;
  private players:AnimationPlayer[]=[];
  private celebrateUntil=-1;
  constructor(parent:SceneObject,index:number,mat:Material,count=1,prefab?:ObjectPrefab,locked=false){
    if(!Number.isInteger(index)||index<0||index>=IDS.length)throw Error('Invalid cat index');
    this.root=object(parent,'MEGANEKO '+IDS[index]);
    const display=object(this.root,'Display model');display.getTransform().setLocalScale(new vec3(.65,.65,.65));
    // Prestige is an acquisition frame, independent of species rarity and replacement model.
    if(!locked){const frame=new Geometry();frame.ring(0,3,-3,12,count>=5?.34:.18);const colors:C[]=[[.55,.66,.75],[.7,.4,.2],[.8,.88,.96],[.7,.5,1],[1,.74,.2]];frame.emit(display,'Acquisition frame',mat,colors[Math.min(4,Math.max(0,count-1))]);
      if(count===4)for(let j=0;j<8;j++){const g=new Geometry(),a=j*Math.PI/4;g.ell(12*Math.cos(a),3+12*Math.sin(a),-3,.5,.5,.5);g.emit(display,'Prismatic jewel',mat,palette[(j*2)%palette.length]);}}
    if(prefab&&!locked){const instance=prefab.instantiate(display);const visit=(o:SceneObject)=>{const p=o.getComponent('Component.AnimationPlayer');if(p)this.players.push(p);for(let j=0;j<o.getChildrenCount();j++)visit(o.getChild(j));};visit(instance);this.play('Idle');return;}
    const body=new Geometry(),white=new Geometry(),dark=new Geometry(),pink=new Geometry(),accent=new Geometry();
    body.ell(0,0,0,5.2,5.6,3.8);body.ell(0,5,0,6.4,5.0,4.2);body.ell(-4,-3,1,1.5,2,1.7);body.ell(4,-3,1,1.5,2,1.7);
    white.ell(0,-.8,3.2,3.2,3.7,.8);white.ell(0,3.6,3.7,2.9,1.6,.6);
    for(const x of [-2.5,2.5]){dark.ring(x,5.1,4.1,2.0,.3);dark.ell(x,5,4.35,.35,.65,.23);white.ell(x-.12,5.3,4.55,.12,.18,.1);pink.ell(x*1.65,3.6,3.5,.7,.4,.3);}
    dark.ell(0,5.1,4.15,.65,.22,.22);pink.ell(0,3.7,4.35,.38,.24,.23);dark.ell(0,2.9,4.1,.6,.16,.15);
    this.ears=object(display,'Ears');const ear=new Geometry();ear.ear(-4,8,0,2,4,1.3);ear.ear(4,8,0,2,4,1.3);ear.emit(this.ears,'Ears',mat,palette[index]);
    this.tail=object(display,'Wisp tail');const tail=new Geometry();for(let j=0;j<7;j++)tail.ell(4+j*.6,-3+j*.5,-1.7,1.2-j*.1,1.1-j*.08,1);tail.emit(this.tail,'Curl',mat,palette[index]);
    // Lightweight role accessories; replace with user-supplied prefab models later.
    if(index===0){dark.ell(0,10,0,4,1.6,3);dark.ell(0,8.8,0,5,.3,3.5);accent.ear(-.7,1.8,4,.9,1,.3);accent.ear(.7,1.8,4,.9,1,.3);}
    if(index===1){accent.ell(0,9.4,0,5.6,1.2,3.6);dark.ell(0,8.7,2,6,.3,2.5);dark.ring(6,1,3.8,1.7,.25);dark.ell(6,-1.5,3.8,.3,1.4,.3);accent.ear(-2,1,3.8,1.4,2,.4);accent.ear(2,1,3.8,1.4,2,.4);}
    if(index===2||index===3){for(let j=-2;j<=2;j++)accent.ear(j*1.6,9,1,.7,2.5+(j===0?1:0),.5);accent.ell(0,9,1,4,.4,1);pink.ell(0,10.5,1.7,.6,.8,.4);accent.ring(0,1.2,3.9,1,.2);}
    body.emit(display,'Spirit',mat,palette[index]);white.emit(display,'Cream details',mat,[.94,.97,1]);dark.emit(display,'Glasses',mat,count>=5?[1,.72,.18]:[.12,.16,.26]);pink.emit(display,'Blush',mat,[1,.5,.6]);accent.emit(display,'Species accessory',mat,[1,.74,.3]);
    if(locked){const shade=(o:SceneObject)=>{const v=o.getComponent('Component.RenderMeshVisual');if(v)v.mainMaterial.mainPass.baseColor=new vec4(.09,.12,.17,1);for(let j=0;j<o.getChildrenCount();j++)shade(o.getChild(j));};shade(display);}
  }
  private play(name:string){for(const p of this.players){p.stopAll();for(const c of p.clips)p.setClipEnabled(c.name,c.name===name);if(p.getClip(name))p.playClipAt(name,0);}}
  celebrate(){this.celebrateUntil=getTime()+2.5;this.play('Celebrate');}
  tick(t:number){if(this.celebrateUntil>=0&&getTime()>=this.celebrateUntil){this.celebrateUntil=-1;this.play('Idle');}if(this.tail)this.tail.getTransform().setLocalRotation(quat.fromEulerAngles(0,Math.sin(t*2)*.18,0));if(this.ears)this.ears.getTransform().setLocalRotation(quat.fromEulerAngles(0,0,Math.sin(t*1.7)*.025));}
  destroy(){this.root.destroy();}
}
export function spark(parent:SceneObject,mat:Material,ring=false):SceneObject {const o=object(parent,ring?'Fusion halo':'Emitted sparkle'),g=new Geometry();if(ring)g.ring(0,0,0,1,.035);else g.ell(0,0,0,.3,.3,.3);const visual=g.emit(o,'Glow',mat,[.35,.55,.7]);if(visual){visual.mainMaterial.mainPass.blendMode=BlendMode.Add;visual.mainMaterial.mainPass.depthWrite=false;}return o;}

