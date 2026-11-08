import {Cat,object,spark} from './MeganekoMesh';
import {outcomes,DEFAULT_WEIGHTS,NAMES,TIERS,tier} from './MeganekoRules';
import {MeganekoPanelUI} from './MeganekoPanelUI';
export interface TutorialMetadata {
 partnerContact:number[];partnerPalmNormal:number[];partnerForward:number[];
 handWrist:number[];handContact:number[];handPalmNormal:number[];handForward:number[];
 partnerContactBone?:string;partnerBoneContact?:number[];handContactBone?:string;handBoneContact?:number[];
 partnerScale?:number;handScale?:number;
}
/** Scripted virtual partner only. Owns no profile, storage, consent, session or network handle. */
export class MeganekoTutorial {
 readonly root:SceneObject; private partner:SceneObject;private hand:SceneObject;
 private partnerPlayers:AnimationPlayer[]=[];private handPlayers:AnimationPlayer[]=[];
 private contactBone:SceneObject;private handBone:SceneObject;private cats:Cat[]=[];private particles:SceneObject[]=[];
 private started=0;private phase=-1;private initialSpecies=0;private results:number[]=[];
 private audio:AudioComponent;private rotation:quat;private ended=false;
 constructor(parent:SceneObject,private camera:SceneObject,private ui:MeganekoPanelUI,
  private material:Material,partnerPrefab:ObjectPrefab,handPrefab:ObjectPrefab,
  private meta:TutorialMetadata,private prefabs:ObjectPrefab[],species:number,private done:()=>void,chime:AudioTrackAsset,volume:number){
  this.root=object(parent,'MEGANEKO Tutorial Stage');
  this.audio=this.root.createComponent('Component.AudioComponent');this.audio.audioTrack=chime;this.audio.volume=volume;
  try {
   this.partner=partnerPrefab.instantiate(this.root);this.partner.name='Tutorial Virtual Partner';
   this.hand=handPrefab.instantiate(this.root);this.hand.name='Tutorial First Person RIGHT Hand';
   this.partner.getTransform().setLocalScale(vec3.one().uniformScale(meta.partnerScale??100));
   this.partner.getTransform().setLocalPosition(new vec3(0,-115,-190));
   this.partner.getTransform().setLocalRotation(quat.fromEulerAngles(0,-22*Math.PI/180,0));
   this.hand.getTransform().setLocalScale(vec3.one().uniformScale(meta.handScale??100));
   this.scan(this.partner,this.partnerPlayers);this.scan(this.hand,this.handPlayers);
   for(const clip of ['Idle','OfferHandshake','Handshake'])if(!this.partnerPlayers.some(p=>!!p.getClip(clip)))throw Error('Missing partner clip '+clip);
   for(const clip of ['Open','Grip'])if(!this.handPlayers.some(p=>!!p.getClip(clip)))throw Error('Missing right hand clip '+clip);
   this.contactBone=this.find(this.partner,meta.partnerContactBone);
   this.handBone=this.find(this.hand,meta.handContactBone);
   if(this.contactBone&&!meta.partnerBoneContact){const p=this.contactBone.getTransform().getInvertedWorldTransform().multiplyPoint(this.partner.getTransform().getWorldTransform().multiplyPoint(this.v(meta.partnerContact)));meta.partnerBoneContact=[p.x,p.y,p.z];}
   if(this.handBone&&!meta.handBoneContact){const p=this.handBone.getTransform().getInvertedWorldTransform().multiplyPoint(this.hand.getTransform().getWorldTransform().multiplyPoint(this.v(meta.handContact)));meta.handBoneContact=[p.x,p.y,p.z];}
   const from=quat.lookAt(this.v(meta.handForward),this.v(meta.handPalmNormal));
   const to=quat.lookAt(this.v(meta.partnerForward).uniformScale(-1),this.v(meta.partnerPalmNormal).uniformScale(-1));
   this.rotation=quat.fromEulerAngles(.48,.22,0).multiply(to.multiply(from.invert()));
   this.initialSpecies=species;this.replay();
  } catch(e){this.root.destroy();throw e;}
 }
 static valid(m:TutorialMetadata):boolean {
  return !!m&&['partnerContact','partnerPalmNormal','partnerForward','handWrist','handContact','handPalmNormal','handForward'].every(k=>Array.isArray(m[k])&&m[k].length===3&&m[k].every(Number.isFinite));
 }
 private v(a:number[]):vec3{return new vec3(a[0],a[1],a[2]);}
 private scan(o:SceneObject,players:AnimationPlayer[]){const p=o.getComponent('Component.AnimationPlayer');if(p)players.push(p);for(let i=0;i<o.getChildrenCount();i++)this.scan(o.getChild(i),players);}
 private find(o:SceneObject,name:string):SceneObject {if(!name)return null;if(o.name===name)return o;for(let i=0;i<o.getChildrenCount();i++){const r=this.find(o.getChild(i),name);if(r)return r;}return null;}
 private play(players:AnimationPlayer[],name:string){players.forEach(p=>{p.stopAll();p.clips.forEach(c=>p.setClipEnabled(c.name,c.name===name));if(p.getClip(name))p.playClipAt(name,0);});}
 private clearCats(){this.cats.forEach(c=>c.destroy());this.cats=[];this.particles.forEach(p=>p.destroy());this.particles=[];}
 private makeCats(indices:number[]){this.cats=indices.map(i=>new Cat(this.root,i,this.material,1,this.prefabs[i]));}
 replay(){if(this.ended)return;this.clearCats();this.makeCats([this.initialSpecies,this.initialSpecies]);this.results=[];this.phase=-1;this.started=getTime();this.partner.enabled=true;this.hand.enabled=false;this.play(this.partnerPlayers,'Idle');this.play(this.handPlayers,'Open');this.ui.showTutorial('Practice with a virtual partner.',false);this.tick();}
 exit(){if(this.ended)return;this.ended=true;this.clearCats();this.root.destroy();this.done();}
 get age(){return getTime()-this.started;}
 private smooth(n:number){const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);}
 tick(){
  if(this.ended)return;const age=this.age,cam=this.camera.getTransform(),root=this.root.getTransform();
  root.setWorldPosition(cam.getWorldPosition());root.setWorldRotation(cam.getWorldRotation());
  this.ui.sceneObject.getTransform().setWorldPosition(cam.getWorldTransform().multiplyPoint(new vec3(0,this.phase===5?-5:-12,-120)));
  this.ui.sceneObject.getTransform().setWorldRotation(cam.getWorldRotation());
  const phase=age<3?0:age<6?1:age<10?2:age<12?3:age<15?4:5;
  if(phase!==this.phase){this.phase=phase;
   if(phase===1){this.hand.enabled=true;this.play(this.partnerPlayers,'OfferHandshake');this.ui.showTutorial('Offer your right hand.',false);}
   if(phase===2){this.play(this.partnerPlayers,'Handshake');this.play(this.handPlayers,'Grip');this.ui.showTutorial('A friendly handshake.\nBoth partners agreed to practice.',false);}
   if(phase===3){if(this.audio.volume>0)this.audio.play(1);this.play(this.handPlayers,'Open');this.play(this.partnerPlayers,'Idle');this.ui.showTutorial('Matching companions fuse…',false);for(let i=0;i<32;i++)this.particles.push(spark(this.root,this.material,i<2));}
   if(phase===4){this.hand.enabled=false;this.results=outcomes(this.initialSpecies,Math.random,DEFAULT_WEIGHTS);this.cats.forEach(c=>c.destroy());this.makeCats(this.results);this.cats.forEach(c=>c.celebrate());}
   if(phase===5){this.particles.forEach(p=>p.destroy());this.particles=[];this.ui.showTutorial('You: '+NAMES[this.results[0]]+' · '+TIERS[tier(this.results[0])]+'\nPartner: '+NAMES[this.results[1]]+' · '+TIERS[tier(this.results[1])],true);}
  }
  if(this.hand.enabled){
   const partnerTf=this.partner.getTransform();
   const contact=this.contactBone&&this.meta.partnerBoneContact?this.contactBone.getTransform().getWorldTransform().multiplyPoint(this.v(this.meta.partnerBoneContact)):partnerTf.getWorldTransform().multiplyPoint(this.v(this.meta.partnerContact));
   const handTf=this.hand.getTransform(),rot=partnerTf.getWorldRotation().multiply(this.rotation);handTf.setWorldRotation(rot);
   // Align animated contact points after the engine animation phase. No detector or tracked hand is involved.
   const localContact=this.handBone&&this.meta.handBoneContact?handTf.getInvertedWorldTransform().multiplyPoint(this.handBone.getTransform().getWorldTransform().multiplyPoint(this.v(this.meta.handBoneContact))):this.v(this.meta.handContact);
   const aligned=contact.sub(rot.multiplyVec3(localContact.uniformScale(this.meta.handScale??100)));
   const foreground=cam.getWorldTransform().multiplyPoint(new vec3(25,-38,-55));
   const reach=phase===1?this.smooth((age-3)/3):phase===2?1:1-this.smooth((age-10)/2);
   handTf.setWorldPosition(vec3.lerp(foreground,aligned,reach));
  }
  const starts=[new vec3(20,4,-120),new vec3(-31,13,-185)],mid=new vec3(0,4,-117);
  this.cats.forEach((c,i)=>{
   const t=c.root.getTransform();let p=starts[i],s=1;
   if(phase===3){const n=this.smooth((age-10)/2);p=vec3.lerp(starts[i],mid,n);s=1-.65*n;}
   if(phase>=4){const n=this.smooth((age-12)/3);p=vec3.lerp(mid,new vec3(i===0?19:-19,5,-108),n);s=.35+.65*n;}
   t.setLocalPosition(p);t.setLocalScale(vec3.one().uniformScale(s));c.tick(getTime());
  });
  this.particles.forEach((p,i)=>{const a=(age-10)*2+i*.7,r=phase===3?10*(1-(age-10)/2.5):3+Math.min(1,(age-12)/3)*13,t=p.getTransform();t.setLocalPosition(mid.add(new vec3(Math.cos(a)*r,Math.sin(a)*r*.6,Math.sin(i+age)*3)));t.setLocalScale(vec3.one().uniformScale(1.6));if(i<2){t.setLocalPosition(mid);t.setLocalRotation(quat.fromEulerAngles(i*.8,0,age));t.setLocalScale(vec3.one().uniformScale(5+i*2+Math.sin(age*Math.PI)));}});
 }
}
