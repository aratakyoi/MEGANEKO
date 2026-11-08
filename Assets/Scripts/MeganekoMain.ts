import {MeganekoTutorial,TutorialMetadata} from './MeganekoTutorial';
import {MeganekoPanelUI} from './MeganekoPanelUI';
import {Cat,spark} from './MeganekoMesh';
import {CATALOGUE_VERSION,PROFILE_KEYS,PAGE_COUNT,PAGE_SIZE,catalogueIndex,IDS,NAMES,TIERS,tier,prestige,Profile,initial,decode,outcomes,Handshake,Hand,V,Pose,Transaction,parsePose,decodeLedger,commitTransaction,matchesSnapshot} from './MeganekoRules';
import {SessionController} from 'SpectaclesSyncKit.lspkg/Core/SessionController';
import {SyncEntity} from 'SpectaclesSyncKit.lspkg/Core/SyncEntity';
import {StorageProperty} from 'SpectaclesSyncKit.lspkg/Core/StorageProperty';
import {StoragePropertySet} from 'SpectaclesSyncKit.lspkg/Core/StoragePropertySet';
import {HandInputData} from 'SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData';
interface Peer extends Pose {user:string;}
import {NetworkIdOptions} from 'SpectaclesSyncKit.lspkg/Core/NetworkIdTools';
import {NetworkIdType} from 'SpectaclesSyncKit.lspkg/Core/NetworkIdType';
@component
export class MeganekoMain extends BaseScriptComponent {
 @input @hint('World camera') camera:SceneObject;
 @input @hint('Passive UIKit panel') ui:MeganekoPanelUI;
 @input @hint('Shared coordinate root') shared:SceneObject;
 @input @hint('Placeholder material') material:Material;
 @input @hint('Normal tier weight') normal:number=80;
 @input @hint('Rare tier weight') rare:number=18;
 @input @hint('UltraRare tier weight') ultraRare:number=2;
 @input @hint('Right palm proximity in cm') palmDistance:number=12;
 @input @hint('Continuous handshake dwell seconds') dwell:number=.8;
 @input @hint('Maximum age of peer hand data seconds') freshness:number=.35;
 @input @hint('Maximum head separation in cm') participantDistance:number=160;
 @input @hint('Separate palms this far to unlock next fusion') resetDistance:number=25;
 @input @hint('Shoulder companion offset in camera-local cm') offset:vec3=new vec3(17,6,-95);
 @input @hint('Companion smoothing rate') follow:number=5;
 @input @hint('Original ambient loop') music:AudioTrackAsset;
 @input @hint('Birth chime') chime:AudioTrackAsset;
 @input @hint('Quiet ambient volume') musicVolume:number=.08;
 private musicPlayer:AudioComponent;private chimePlayer:AudioComponent;private muted=true;
 @input @allowUndefined @hint('Replace gentle: centimeters, centered, face +Z') gentle:ObjectPrefab;
 @input @allowUndefined @hint('Replace detective: centimeters, centered, face +Z') detective:ObjectPrefab;
 @input @allowUndefined @hint('Replace princess: centimeters, centered, face +Z') princess:ObjectPrefab;
 @input @allowUndefined @hint('Replace queen: centimeters, centered, face +Z') queen:ObjectPrefab;
 @input @allowUndefined @hint('Tutorial partner: actual rigged prefab') tutorialPartner:ObjectPrefab;
 @input @allowUndefined @hint('Tutorial first person right forearm/hand prefab') tutorialRightHand:ObjectPrefab;
 @input @hint('Parent supplied meter-space contact metadata JSON') tutorialMetadata:string='';
 private tutorial:MeganekoTutorial=null;private tutorialSuspended=false;private tutorialDisconnected=false;
 private profile:Profile=null;private demoPeer:Profile=null;private writable=false;private key='';private cat:Cat;
 private demo=false;private approach=false;private inspect=false;private page=0;private catalogueOpen=false;private selected=-1;
 private networkFixture=false;
 private thumbnails:Cat[]=[];private inspection:Cat=null;
 private cats:{[id:string]:{cat:Cat;species:number;count:number}}=Object.create(null);
 private detector:Handshake;private consent:Transaction=null;private peers:{[id:string]:Peer}=Object.create(null);private seq=0;private sequenceByPeer:{[id:string]:number}=Object.create(null);private sendAt=0;private ledgerAt=0;private ackAt=0;
 private sync:SyncEntity;private session:SessionController;private ledger=StorageProperty.manualString('meganekoFourTransactionsV3','[]');private txs:Transaction[]=[];private accepted:Transaction[]=[];private ready=false;private wasOwner=false;private lastLedger='';private ledgerBroken=false;
 private revealAt=-1;private revealNonce='';private revealResults:number[];private revealPeer='';private revealLocalIndex=0;private revealSwapped=false;private revealStarts:vec3[]=[];private particles:SceneObject[]=[];
 private get weights(){return [this.normal,this.rare,this.ultraRare];}
 private get editor(){return global.deviceInfoSystem.isEditor();}
 private newDetector(){return new Handshake(this.palmDistance,this.dwell,this.freshness,this.participantDistance,this.resetDistance);}
 onAwake(){
  this.createEvent('OnStartEvent').bind(()=>this.start());this.createEvent('UpdateEvent').bind(()=>this.tick());this.createEvent('LateUpdateEvent').bind(()=>this.tutorial?.tick());
  this.createEvent('KeyPressEvent').bind(e=>{if(!this.editor)return;const map:{[key:number]:string}={[Keys.D]:'demo',[Keys.H]:'hand',[Keys.F]:'fusion',[Keys.X]:'cancel',[Keys.C]:'collection',[Keys.B]:'back',[Keys.I]:'inspect',[Keys.O]:'odds',[Keys.M]:'mute',[Keys.R]:'reset',[Keys.N]:'match',[Keys.L]:'leaveTest',[Keys.One]:'view0',[Keys.Two]:'view1',[Keys.Three]:'view2',[Keys.Four]:'view3'};if(map[e.key])this.action(map[e.key]);});
 }
 private start(){
  this.musicPlayer=this.sceneObject.createComponent('Component.AudioComponent');this.musicPlayer.audioTrack=this.music;this.musicPlayer.volume=this.muted?0:this.musicVolume;this.musicPlayer.play(-1);
  this.chimePlayer=this.sceneObject.createComponent('Component.AudioComponent');this.chimePlayer.audioTrack=this.chime;this.chimePlayer.volume=this.muted?0:.16;
  this.detector=this.newDetector();this.ui.action.add(a=>this.action(a));this.load(false);
  this.session=SessionController.getInstance();
  this.sync=new SyncEntity(this,new StoragePropertySet([this.ledger]),true,'Session',new NetworkIdOptions(NetworkIdType.Custom,'MEGANEKO.four-20261108.shared-ledger.v3'));
  this.sync.onEventReceived.add('meganeko',m=>this.receive(m.senderConnectionId,m.senderUserId,m.data));
  this.sync.notifyOnReady(()=>{this.ready=true;this.applyLedger();if(this.profile&&!this.demo&&!this.tutorialSuspended)this.ui.setStatus('Shared session ready. Meet a matching companion.');});
  this.session.onUserLeftSession.add((_s,u)=>{if(this.tutorialSuspended)return;delete this.peers[u.connectionId];delete this.sequenceByPeer[u.connectionId];this.removePeer(u.connectionId);const c=this.consent;if(this.sync.doIOwnStore()&&c&&!c.result&&(c.a===u.connectionId||c.b===u.connectionId)){c.cancelled=true;this.publish();}});
  this.session.onDisconnected.add(()=>{this.ready=false;if(this.tutorialSuspended){this.tutorialDisconnected=true;return;}this.consent=null;this.detector.requireSeparation();this.peers=Object.create(null);Object.keys(this.cats).forEach(id=>this.removePeer(id));this.finishReveal();this.ui.setStatus('Disconnected. Collection saved; restart to rejoin.');});
  this.ledger.onAnyChange.add(()=>{if(this.ready&&!this.demo)this.applyLedger();});
 }
 // Invalid primary data is never overwritten, even when a readable backup exists.
 private load(demo:boolean){
  this.networkFixture=false;
  this.profile=null;this.demoPeer=null;this.writable=false;this.demo=demo;this.key=demo?PROFILE_KEYS.demo:this.editor?PROFILE_KEYS.preview:PROFILE_KEYS.device;
  const store=global.persistentStorageSystem.store,raw=store.getString(this.key),backup=store.getString(this.key+'_backup');
  if(demo){try{if(raw){const pair=JSON.parse(raw);this.profile=decode(JSON.stringify(pair.local));this.demoPeer=decode(JSON.stringify(pair.peer));if(!this.profile||!this.demoPeer)throw Error('Damaged demo');}else{if(backup)throw Error('Missing primary');this.profile=initial(Math.random,this.weights);this.demoPeer=initial(Math.random,this.weights);}}catch(_){this.profile=null;this.demoPeer=null;this.ui.setStatus('Demo save damaged; preserved. Use Reset DEMO only.');return;}}
  else {const p=decode(raw);if(raw&&!p||!raw&&backup){this.ui.setInfo('Profile unavailable');this.ui.setStatus('Profile requires recovery. Original and backup preserved; acquisition disabled. Demo remains available.');return;}this.profile=p||initial(Math.random,this.weights);}
  this.writable=true;if(!raw&&!this.persist(this.profile)){this.profile=null;return;}this.rebuild();if(!raw)this.ui.setStatus('Four-catalogue record started. Earlier collection remains preserved separately.');
 }
 private persist(next:Profile,peer:Profile=this.demoPeer):boolean {
  if(this.tutorialSuspended)return false;
  if(!this.writable||!decode(JSON.stringify(next))||this.demo&&!decode(JSON.stringify(peer)))return false;
  const s=global.persistentStorageSystem.store;try{const old=s.getString(this.key);if(old)s.putString(this.key+'_backup',old);s.putString(this.key,JSON.stringify(this.demo?{local:next,peer}:next));return true;}catch(_){this.writable=false;this.ui.setStatus('Profile write failed; acquisition paused. Restart after storage recovery.');return false;}
 }
 private prefab(i:number):ObjectPrefab{return (this as any)[IDS[i]];}
 private rebuild(){if(!this.profile)return;if(this.cat)this.cat.destroy();this.cat=new Cat(this.sceneObject,this.profile.active,this.material,this.profile.counts[this.profile.active],this.prefab(this.profile.active));this.cat.root.getTransform().setWorldPosition(this.camera.getTransform().getWorldTransform().multiplyPoint(this.offset));this.updateInfo();}
 private updateInfo(){if(!this.profile)return;const i=this.profile.active;this.ui.setSimulation(this.demo||this.networkFixture);this.ui.setInfo(NAMES[i]);this.showCollection();}
 private clearCatalogue(){this.thumbnails.forEach(c=>c.destroy());this.thumbnails=[];if(this.inspection)this.inspection.destroy();this.inspection=null;}
 private showCollection(){
  this.clearCatalogue();if(!this.profile)return;
  this.ui.setCollection(IDS.map((_,i)=>NAMES[i]+' · '+TIERS[tier(i)]+'  |  '+this.profile.counts[i]+' collected').join('\n'));
  if(this.catalogueOpen)this.ui.collectionModelAnchors.forEach((anchor,i)=>{const count=this.profile.counts[i],cat=new Cat(anchor,i,this.material,count,count?this.prefab(i):undefined,!count);cat.root.getTransform().setLocalScale(new vec3(.38,.38,.38));this.thumbnails.push(cat);});
 }
 private home(){this.catalogueOpen=false;this.selected=-1;this.inspect=false;this.clearCatalogue();this.ui.showHome();}
 private tutorialReady(){
  if(!this.profile||!this.tutorialPartner||!this.tutorialRightHand||this.tutorialSuspended||this.revealAt>=0||!this.ui.isHome)return false;
  if(this.consent&&!this.consent.cancelled&&!this.consent.result)return false;
  const user=this.session?this.testIdentity(this.session.getLocalConnectionId(),this.session.getLocalUserId()):'';
  if(this.accepted.some(t=>t.result&&t.users.includes(user)&&!t.acks?.includes(user)))return false;
  try{return MeganekoTutorial.valid(JSON.parse(this.tutorialMetadata));}catch(_){return false;}
 }
 beginTutorial():boolean {
  if(!this.tutorialReady())return false;
  this.tutorialSuspended=true;this.cat.root.enabled=false;Object.keys(this.cats).forEach(id=>this.cats[id].cat.root.enabled=false);
  try{this.tutorial=new MeganekoTutorial(this.sceneObject,this.camera,this.ui,this.material,this.tutorialPartner,this.tutorialRightHand,JSON.parse(this.tutorialMetadata),IDS.map((_,i)=>this.prefab(i)),this.profile.active,()=>this.endTutorial(),this.chime,this.muted?0:.16);return true;}
  catch(e){this.tutorialSuspended=false;this.cat.root.enabled=true;Object.keys(this.cats).forEach(id=>this.cats[id].cat.root.enabled=true);this.home();print('Tutorial unavailable: '+e);return false;}
 }
 endTutorial(){
  this.tutorial=null;this.tutorialSuspended=false;this.cat.root.enabled=true;Object.keys(this.cats).forEach(id=>this.cats[id].cat.root.enabled=true);
  if(this.tutorialDisconnected){this.tutorialDisconnected=false;this.consent=null;this.detector.requireSeparation();this.peers=Object.create(null);Object.keys(this.cats).forEach(id=>this.removePeer(id));this.finishReveal();}
  this.updateInfo();this.home();
 }
 private refreshEncounter(){
  if(this.tutorialSuspended)return;this.ui.setTutorialAvailable(this.tutorialReady());
  const now=getTime(),local=this.demo?'demo-local':this.session?.getLocalConnectionId();
  const c=this.consent,participant=c&&(this.demo||c.a===local||c.b===local);
  const active=!!(participant&&!c.cancelled&&!c.result&&(this.demo?now<c.expires:c.remaining>0));
  const available=!!(this.writable&&this.revealAt<0&&(this.demo?this.demoPeer?.active===this.profile.active:
    this.ready&&!this.ledgerBroken&&Object.keys(this.peers).some(id=>id!==local&&this.peers[id].user!==this.session.getLocalUserId()&&this.peers[id].species===this.profile.active&&now-this.peers[id].hand.received<this.freshness)));
  const agreed=active&&(local===c.a?c.yesA:c.yesB);
  const both=active&&c.yesA&&c.yesB;
  if(active&&this.catalogueOpen){this.catalogueOpen=false;this.clearCatalogue();}
  this.ui.setEncounter(available,active,active&&!agreed,both?'Both agreed.\nBring right hands together.':agreed?'Waiting for your friend…':'A matching companion\nwants to fuse.');
 }
 private cleanupMode(){
  this.cancel();this.consent=null;this.approach=false;this.detector=this.newDetector();this.peers=Object.create(null);this.sequenceByPeer=Object.create(null);Object.keys(this.cats).forEach(id=>this.removePeer(id));this.finishReveal();this.clearCatalogue();this.selected=-1;this.catalogueOpen=false;this.ui.showHome();
  if(this.cat)this.cat.destroy();this.cat=null;this.sendAt=0;this.ackAt=0;this.lastLedger='';
 }
 private action(a:string){
  if(this.tutorialSuspended){if(a==='tutorialExit'||a==='tutorialBack')this.tutorial?.exit();else if(a==='tutorialReplay')this.tutorial?.replay();return;}
  if(a==='tutorial'){this.beginTutorial();return;}
  if(a==='leaveTest'&&this.editor&&this.networkFixture){this.session.connectedLensModuleToUse.leaveSession(this.session.getSession());return;}
  if(a==='networktest'&&this.editor&&this.ready&&!this.session.isSingleplayer()){
   this.cleanupMode();this.demo=false;this.networkFixture=true;this.writable=true;this.key=PROFILE_KEYS.fixture+this.session.getLocalConnectionId();this.profile=initial(()=>.12,this.weights);this.persist(this.profile);this.rebuild();this.ui.showDetails(false);this.ui.setStatus('SHARED TEST FIXTURE: isolated save. Both players F; H moves each simulated right hand.');return;
  }
  if(a==='diagnostic'&&this.editor){print('MEGANEKO NETWORK REPORT '+JSON.stringify({fixture:this.networkFixture,ready:this.ready,broken:this.ledgerBroken,server:this.session.getServerTimeInSeconds(),peerStates:Object.keys(this.peers).map(id=>({self:id===this.session.getLocalConnectionId(),sameUser:this.peers[id].user===this.session.getLocalUserId(),age:getTime()-this.peers[id].hand.received,species:this.peers[id].species,serial:this.peers[id].serial})),pending:this.txs,owner:this.sync?.doIOwnStore(),serial:this.profile?.serial,species:this.profile?.active,commits:this.profile?.commits,peers:Object.keys(this.peers).length,transactions:this.accepted.map(t=>({nonce:t.nonce,result:t.result,yesA:t.yesA,yesB:t.yesB,cancelled:t.cancelled,acks:t.acks?.length})),saved:this.key?global.persistentStorageSystem.store.getString(this.key):''}));return;}
  if(a==='demo'&&this.editor){this.cleanupMode();this.load(!this.demo);return;}
  if(a==='reset'&&this.editor&&this.demo){this.cleanupMode();const s=global.persistentStorageSystem.store;for(const suffix of ['','_backup'])s.remove(PROFILE_KEYS.demo+suffix);this.load(true);this.ui.setStatus('Demo profiles reset intentionally; hands separated.');return;}
  if(a==='back'){this.home();return;}
  if(a==='agree'&&this.demo)return;
  if(!this.profile)return;
  if(a==='ready'){this.updateInfo();return;}
  if(a==='back'){this.home();return;}
  if(a==='collection'){if(this.revealAt>=0)return;this.catalogueOpen=true;this.selected=-1;this.ui.showDetails(true);this.showCollection();}
  if(a.indexOf('view')===0){const i=catalogueIndex(this.page,/^view[0-3]$/.test(a)?Number(a.slice(4)):-1);if(Number.isInteger(i)&&i>=0&&i<IDS.length&&this.profile.counts[i]){this.selected=i;this.catalogueOpen=true;this.showCollection();this.ui.setStatus('Inspecting '+NAMES[i]+' · '+prestige(this.profile.counts[i])+' frame. Active partner unchanged.');}else this.ui.setStatus('Undiscovered species: silhouette only.');}
  if(a==='inspect'){this.inspect=!this.inspect;this.catalogueOpen=false;this.clearCatalogue();this.ui.showDetails(false);}
  if(a==='odds'){this.ui.showDetails(true);const total=this.weights.reduce((s,n)=>s+n,0);this.ui.setCollection('Tier odds '+this.weights.map(n=>(100*n/total).toFixed(2)+'%').join(' / ')+'\nNormal / Rare / UltraRare\nUniform within tier; duplicates allowed.\nEach participant draws independently.');}
  if(a==='mute'){this.muted=!this.muted;this.musicPlayer.volume=this.muted?0:this.musicVolume;this.chimePlayer.volume=this.muted?0:.16;this.ui.setStatus(this.muted?'Sound muted':'Sound on · quiet ambient music');}
  if(a==='match'&&this.demo&&this.editor&&this.revealAt<0){this.ui.showDetails(false);this.cancel();this.consent=null;this.approach=false;this.removePeer('demo-peer');const counts=IDS.map(()=>0);counts[this.profile.active]=1;this.demoPeer={version:2,catalogue:CATALOGUE_VERSION,active:this.profile.active,counts,serial:1,commits:[]};this.persist(this.profile);this.ui.setStatus('NEW simulated encounter: matching peer explicitly created. Your collection is unchanged.');}
  if(a==='hand'&&this.editor&&(this.demo||this.networkFixture)){this.approach=!this.approach;this.ui.setStatus(this.approach?'PREVIEW: simulated right palms approaching':'PREVIEW: simulated hands separated');}
  if(a==='cancel')this.cancel();if(a==='fusion'||a==='agree')this.request();
 }
 private cancel(){if(this.demo&&this.consent&&!this.consent.result)this.consent.cancelled=true;else if(this.consent&&!this.consent.result)this.send({type:'cancel',nonce:this.consent.nonce});this.detector?.reset();this.ui.setStatus('Request cancelled. Separate hands before another fusion.');}
 private snapshot(p:Profile){return {species:p.active,count:p.counts[p.active],serial:p.serial};}
 private makeTx(a:string,b:string,users:string[],snapshots:any[],now:number,coordinator:string):Transaction{return {catalogue:CATALOGUE_VERSION,nonce:coordinator+':'+Date.now()+':'+Math.random().toString(36).slice(2),a,b,users,snapshots,serials:snapshots.map(s=>s.serial),species:snapshots[0].species,expires:now+30,remaining:30,coordinator,yesA:true,yesB:false,cancelled:false};}
 private request(){
  if(!this.writable||this.revealAt>=0)return;
  if(this.demo){if(this.demoPeer.active!==this.profile.active){this.ui.setStatus('Different species. Use New matching demo encounter [N] to simulate a new visitor.');return;}
   if(this.consent&&!this.consent.cancelled&&getTime()<this.consent.expires&&!this.consent.result){this.consent.yesB=true;this.ui.setStatus('Both consented (simulated peer). H to approach.');return;}
   this.consent=this.makeTx('demo-local','demo-peer',['demo-local','demo-peer'],[this.snapshot(this.profile),this.snapshot(this.demoPeer)],getTime(),'demo-local');this.ui.setStatus('PREVIEW request sent. F again simulates peer consent.');return;}
  if(this.ledgerBroken||!this.ready)return;
  const c=this.consent;if(c&&!c.cancelled&&!c.result&&c.remaining>0){this.send({type:'agree',nonce:c.nonce});return;}
  const local=this.session.getLocalConnectionId(),p=Object.keys(this.peers).find(id=>id!==local&&this.peers[id].species===this.profile.active&&getTime()-this.peers[id].hand.received<this.freshness);
  if(!p){this.ui.setStatus('Join the shared session with another matching participant.');return;}this.send({type:'request',peer:p});
 }
 private testIdentity(id:string,user:string){return this.editor&&this.networkFixture?'preview-fixture:'+id:user;}
 private send(data:any){if(this.tutorialSuspended)return;if(this.ready&&!this.demo)this.sync.sendEvent('meganeko',{...data,catalogue:CATALOGUE_VERSION,fixture:this.editor&&this.networkFixture});}
 private vector(v:vec3):V{return [v.x,v.y,v.z];}
 private localPose(id:string):Pose {
  const inv=this.shared.getTransform().getInvertedWorldTransform(),cam=this.camera.getTransform(),head=this.vector(inv.multiplyPoint(cam.getWorldPosition())),h=HandInputData.getInstance().getHand('right');let palm:V=[0,0,0],normal:V=[0,0,0];const tracked=h.isTracked();
  if(tracked){const w=h.wrist.position,i=h.indexKnuckle.position,p=h.pinkyKnuckle.position,m=h.middleKnuckle.position;palm=this.vector(inv.multiplyPoint(w.add(m).uniformScale(.5)));normal=this.vector(inv.multiplyDirection(i.sub(w).cross(p.sub(w)).normalize()).normalize());}
  const q=this.shared.getTransform().getWorldRotation().invert().multiply(cam.getWorldRotation());
  if(this.editor&&this.networkFixture){const side=this.session.isHost()===true?-1:1;return {hand:{id,tracked:true,received:getTime(),seq:++this.seq,palm:[side*(this.approach?3:30),0,0],normal:[-side,0,0],head:[side*40,50,0]},species:this.profile.active,count:this.profile.counts[this.profile.active],serial:this.profile.serial,companion:[side*17,18,-95],rotation:[1,0,0,0]};}
  return {hand:{id,tracked,received:getTime(),seq:++this.seq,palm,normal,head},species:this.profile.active,count:this.profile.counts[this.profile.active],serial:this.profile.serial,companion:this.vector(inv.multiplyPoint(this.revealAt>=0||this.inspect?cam.getWorldTransform().multiplyPoint(this.offset):this.cat.root.getTransform().getWorldPosition())),rotation:[q.w,q.x,q.y,q.z]};
 }
 private receive(id:string,user:string,data:any){
  if(this.tutorialSuspended)return;
  if(this.demo||!data||data.catalogue!==CATALOGUE_VERSION||!this.ready||!this.profile||!this.writable)return;const now=getTime();
  // Two Preview panes share one authenticated account. Only the explicit isolated
  // fixture maps trusted connection IDs to test identities. Devices reject it.
  if(!!data.fixture!==(this.editor&&this.networkFixture))return;
  user=this.testIdentity(id,user);
  if(data.type==='pose'){const pose=parsePose(data,id,now,this.sequenceByPeer[id]??-1);if(pose&&(!this.peers[id]||pose.serial>=this.peers[id].serial)){this.sequenceByPeer[id]=pose.hand.seq;this.peers[id]={...pose,user};}return;}
  if(!this.sync.doIOwnStore()||this.ledgerBroken)return;const server=this.session.getServerTimeInSeconds();if(server===null)return;const c=this.consent,p=this.peers[id];
  if(this.editor&&data.type==='request')print('MEGANEKO request received '+JSON.stringify({hasSender:!!p,hasPeer:!!this.peers[data.peer],sameUser:p?.user===this.peers[data.peer]?.user,server,consent:c?.nonce}));
  if(data.type==='request'&&p&&(!c||c.cancelled||c.result||server>=c.expires)){
   const q=this.peers[data.peer];if(!q||data.peer===id||p.user!==user||p.user===q.user||p.species!==q.species||now-p.hand.received>this.freshness||now-q.hand.received>this.freshness||this.txs.length>=128)return;
   if(this.txs.some(t=>t.result&&t.users.some(u=>(u===p.user||u===q.user)&&!t.acks?.includes(u))))return;
   if(c&&!c.result&&!c.cancelled)c.cancelled=true;
   this.consent=this.makeTx(id,data.peer,[user,q.user],[{species:p.species,count:p.count,serial:p.serial},{species:q.species,count:q.count,serial:q.serial}],server,this.session.getLocalConnectionId());this.txs.push(this.consent);this.publish();
  }
  if(data.type==='agree'&&c&&c.nonce===data.nonce&&!c.cancelled&&!c.result&&server<c.expires&&p){const i=id===c.a?0:id===c.b?1:-1;if(i<0||user!==c.users[i]||!matchesSnapshot(p,c.snapshots[i])||now-p.hand.received>this.freshness)return;if(i===0)c.yesA=true;else c.yesB=true;this.publish();}
  if(data.type==='cancel'&&c&&c.nonce===data.nonce&&!c.result&&(id===c.a||id===c.b)){c.cancelled=true;this.detector.reset();this.publish();}
  if(data.type==='ack'){const t=this.txs.find(x=>x.nonce===data.nonce);if(t?.result&&t.users.includes(user)&&!t.acks?.includes(user)){t.acks=(t.acks||[]).concat(user);this.publish();}}
 }
 private publish(){if(this.tutorialSuspended)return;if(this.ready&&!this.demo&&!this.ledgerBroken&&this.sync.doIOwnStore())this.ledger.setPendingValue(JSON.stringify(this.txs));}
 private applyLedger(){
  if(this.tutorialSuspended||this.demo)return;
  // Read the store after SyncKit submits pending values. This is not a server durability acknowledgement.
  const raw=this.sync.currentStore?.has(this.ledger.key)?this.sync.currentStore.getString(this.ledger.key):null;if(!raw||raw===this.lastLedger)return;
  const parsed=decodeLedger(raw,this.accepted);if(!parsed){if(this.editor)print('MEGANEKO ledger rejected '+JSON.stringify({raw,previous:this.accepted}));this.ledgerBroken=true;this.ui.setStatus('Shared ledger invalid; fusion paused. Existing profile preserved.');return;}
  this.lastLedger=raw;const active=parsed.find(t=>t.nonce===this.revealNonce);if(active?.animationAge!==undefined&&this.revealAt>=0)this.revealAt=Math.min(this.revealAt,getTime()-active.animationAge);this.accepted=JSON.parse(raw);
  // SyncKit onAnyChange fires before putCurrentValue. Do not replace the owner's
  // newer working state with the previous stored snapshot during that callback.
  if(!this.sync.doIOwnStore()||!this.wasOwner){this.txs=parsed;this.consent=parsed[parsed.length-1]||null;}
 }
 private consumeLedger(now:number){
  if(this.tutorialSuspended)return;
  if(!this.profile||!this.writable||this.demo||this.ledgerBroken||now<this.ackAt)return;this.ackAt=now+1;
  const user=this.testIdentity(this.session.getLocalConnectionId(),this.session.getLocalUserId());for(const t of this.accepted){if(!t.result||t.acks?.includes(user)||!t.users.includes(user))continue;
   const next=decode(JSON.stringify(this.profile)),result=commitTransaction(next,t,user);if(result==='rejected'){this.ui.setStatus('Fusion recovery conflict; no reward or acknowledgement applied.');continue;}
   if(result==='committed'){if(!this.persist(next))return;this.profile=next;const i=t.users.indexOf(user),server=this.session.getServerTimeInSeconds();const age=this.editor?(t.animationAge??0):server!==null?Math.max(0,server-t.resolvedAt):(t.animationAge??0);if(age<4)this.reveal(t,i===0?t.b:t.a,i,age);else this.rebuild();}
   this.send({type:'ack',nonce:t.nonce});
  }
 }
 private reveal(t:Transaction,peer:string,localIndex:number,age=0){
  if(age<1&&!this.muted)this.chimePlayer.play(1);
  this.home();this.finishReveal();this.ui.showFusion();this.revealNonce=t.nonce;this.revealAt=getTime()-age;this.revealResults=t.result.slice();this.revealPeer=peer;this.revealLocalIndex=localIndex;this.revealSwapped=false;
  const other=this.cats[peer]?.cat,cam=this.camera.getTransform();this.revealStarts=[this.cat.root.getTransform().getWorldPosition(),other?other.root.getTransform().getWorldPosition():cam.getWorldTransform().multiplyPoint(new vec3(-17,peer==='demo-peer'?12:29,-110))];
  if(!other)this.showPeer(peer,t.species,t.snapshots[1-localIndex].count,this.revealStarts[1],cam.getWorldRotation(),getTime());
  this.ui.setStatus('Two spirits are meeting...');for(let j=0;j<32;j++)this.particles.push(spark(this.sceneObject,this.material,j<2));
 }
 private finishReveal(){this.particles.forEach(x=>x.destroy());this.particles=[];this.revealAt=-1;this.revealNonce='';this.revealPeer='';if(!this.demo)Object.keys(this.cats).forEach(id=>{if(!this.peers[id])this.removePeer(id);});if(this.cat)this.cat.root.getTransform().setLocalScale(new vec3(1,1,1));Object.keys(this.cats).forEach(id=>this.cats[id].cat.root.getTransform().setLocalScale(new vec3(1,1,1)));}
 private removePeer(id:string){if(this.cats[id]){this.cats[id].cat.destroy();delete this.cats[id];}}
 private showPeer(id:string,i:number,n:number,pos:vec3,rot:quat,t:number){let c=this.cats[id];if(!c||c.species!==i||c.count!==n){this.removePeer(id);c=this.cats[id]={cat:new Cat(this.sceneObject,i,this.material,n,this.prefab(i)),species:i,count:n};}c.cat.root.enabled=true;c.cat.root.getTransform().setWorldPosition(pos);c.cat.root.getTransform().setWorldRotation(rot);c.cat.tick(t+.8);}
 private tick(){
  if(this.tutorialSuspended)return;
  if(!this.profile||!this.cat)return;this.cat.root.enabled=true;const now=getTime(),cam=this.camera.getTransform();
  const target=cam.getWorldTransform().multiplyPoint(this.inspect?new vec3(14,10,-75):this.networkFixture?new vec3(this.session.isHost()===true?-17:17,22,-95):this.offset);target.y+=Math.sin(now*1.7)*1.2;
  if(this.revealAt<0){const tf=this.cat.root.getTransform();tf.setWorldPosition(vec3.lerp(tf.getWorldPosition(),target,Math.min(1,getDeltaTime()*this.follow)));tf.setWorldRotation(cam.getWorldRotation());}this.cat.tick(now);
  this.ui.sceneObject.getTransform().setWorldPosition(cam.getWorldTransform().multiplyPoint(this.ui.cameraOffset));this.ui.sceneObject.getTransform().setWorldRotation(cam.getWorldRotation());
  this.thumbnails.forEach(c=>c.tick(now));
  if(this.inspection){const t=this.inspection.root.getTransform();t.setWorldPosition(cam.getWorldTransform().multiplyPoint(new vec3(18,9,-95)));t.setWorldRotation(cam.getWorldRotation().multiply(quat.fromEulerAngles(0,Math.sin(now*.4)*.6,0)));t.setLocalScale(new vec3(.9,.9,.9));this.inspection.tick(now);}
  if(this.demo){
   const a:Hand={id:'demo-local',tracked:true,seq:++this.seq,received:now,palm:[this.approach?-3:-30,0,0],normal:[1,0,0],head:[-40,50,0]},b:Hand={...a,id:'demo-peer',palm:[this.approach?3:30,0,0],normal:[-1,0,0],head:[40,50,0]};
   if(this.revealAt<0)this.showPeer('demo-peer',this.demoPeer.active,this.demoPeer.counts[this.demoPeer.active],cam.getWorldTransform().multiplyPoint(new vec3(-17,12,-110)),cam.getWorldRotation(),now);
   const c=this.consent;if(c&&!c.result&&this.writable&&this.detector.step(now,c,a,b)){
    c.result=outcomes(c.species,Math.random,this.weights);c.resolvedAt=now;c.remaining=0;
    const next=decode(JSON.stringify(this.profile)),peer=decode(JSON.stringify(this.demoPeer));
    if(commitTransaction(next,c,'demo-local')==='committed'&&commitTransaction(peer,c,'demo-peer')==='committed'&&this.persist(next,peer)){this.profile=next;this.demoPeer=peer;this.reveal(c,'demo-peer',0);}
   }else if(!c||c.result||c.cancelled)this.detector.step(now,null,a,b);
  }else if(this.ready){
   const owner=this.sync.doIOwnStore();if(owner&&!this.wasOwner)this.detector.requireSeparation();this.wasOwner=owner;
   const id=this.session.getLocalConnectionId();if(now>this.sendAt){this.sendAt=now+.1;this.send({type:'pose',...this.localPose(id)});if(!this.sync.isStoreOwned()&&this.session.isHost()===true)this.sync.tryClaimOwnership();this.applyLedger();this.consumeLedger(now);}
   for(const k of Object.keys(this.peers)){const p=this.peers[k];if(now-p.hand.received>1){delete this.peers[k];if(k!==this.revealPeer)this.removePeer(k);continue;}if(k===id||k===this.revealPeer&&this.revealAt>=0)continue;
    const q=p.rotation;this.showPeer(k,p.species,p.count,this.shared.getTransform().getWorldTransform().multiplyPoint(new vec3(...p.companion)),this.shared.getTransform().getWorldRotation().multiply(new quat(q[0],q[1],q[2],q[3])),now);
   }
   const c=this.consent;if(c&&!c.result&&!c.cancelled){
    if(this.sync.doIOwnStore()){
     const server=this.session.getServerTimeInSeconds(),a=this.peers[c.a],b=this.peers[c.b];
     if(server!==null){c.remaining=Math.max(0,Math.min(30,c.expires-server));
      if(c.coordinator!==id||server>=c.expires||!a||!b||now-a.hand.received>this.freshness||now-b.hand.received>this.freshness||a.user!==c.users[0]||b.user!==c.users[1]||!matchesSnapshot(a,c.snapshots[0])||!matchesSnapshot(b,c.snapshots[1])){c.cancelled=true;this.detector.requireSeparation();this.publish();}
      else if(this.detector.step(now,{...c,expires:now+c.remaining},a.hand,b.hand)){c.result=outcomes(c.species,Math.random,this.weights);c.resolvedAt=server;c.animationAge=0;c.acks=[];this.publish();}
      else if(now>this.ledgerAt){this.ledgerAt=now+.25;this.publish();}
     }
    }
    if(this.revealAt<0)this.ui.setStatus(c.cancelled?'Request ended; separate hands and request again.':c.yesA&&c.yesB?'Both agreed. Bring RIGHT hands together. '+Math.ceil(c.remaining)+'s':'Matching request: both players press Agree.');
   }else if(c){const a=this.peers[c.a],b=this.peers[c.b];if(a&&b)this.detector.step(now,null,a.hand,b.hand);if(c.result&&this.sync.doIOwnStore()&&(c.animationAge??0)<4&&now>this.ledgerAt){const server=this.session.getServerTimeInSeconds();if(server!==null){c.animationAge=c.coordinator===id?Math.max(c.animationAge??0,Math.min(4,server-c.resolvedAt)):4;this.ledgerAt=now+.25;this.publish();}}}
  }
  if(this.revealAt>=0)this.animateReveal(now,target);this.refreshEncounter();
 }
 private animateReveal(now:number,target:vec3){
  const age=now-this.revealAt,mid=this.revealStarts[0].add(this.revealStarts[1]).uniformScale(.5),cam=this.camera.getTransform(),otherIndex=1-this.revealLocalIndex;
  if(age>=1.5&&!this.revealSwapped){this.revealSwapped=true;this.rebuild();const p=this.demo?this.demoPeer:null,i=this.revealResults[otherIndex];const count=p?p.counts[i]:(this.peers[this.revealPeer]?.species===i?this.peers[this.revealPeer].count:1);this.showPeer(this.revealPeer,i,count,mid,cam.getWorldRotation(),now);this.cat.celebrate();this.cats[this.revealPeer]?.cat.celebrate();this.ui.showBirth(NAMES[this.revealResults[this.revealLocalIndex]]+'\n'+TIERS[tier(this.revealResults[this.revealLocalIndex])]);}
  const p=this.peers[this.revealPeer],destination=p?this.shared.getTransform().getWorldTransform().multiplyPoint(new vec3(...p.companion)):cam.getWorldTransform().multiplyPoint(new vec3(-17,this.revealPeer==='demo-peer'?12:29,-110));
  const split=Math.max(0,Math.min(1,(age-1.8)/1.7)),approach=Math.min(1,age/1.2),smooth=(v:number)=>v*v*(3-2*v);
  [this.cat,this.cats[this.revealPeer]?.cat].forEach((cat,j)=>{if(!cat)return;const end=j===0?target:destination,pos=age<1.5?vec3.lerp(this.revealStarts[j],mid,smooth(approach)):vec3.lerp(mid,end,smooth(split));const scale=age<1.5?1-.65*smooth(approach):.35+.65*smooth(split);const t=cat.root.getTransform();t.setWorldPosition(pos);t.setWorldRotation(cam.getWorldRotation());t.setLocalScale(new vec3(scale,scale,scale));});
  for(let j=0;j<this.particles.length;j++){const angle=j*.7+age*2,r=age<1.5?10*(1-age/1.8):3+split*13;const t=this.particles[j].getTransform();t.setWorldPosition(mid.add(new vec3(Math.cos(angle)*r,Math.sin(angle)*r*.6,Math.sin(j+age)*3)));const glow=1+2*Math.max(0,1-Math.abs(age-1.5));t.setLocalScale(new vec3(glow,glow,glow));if(j<2){const radius=5+j*2+Math.sin(age*Math.PI)*1.5;t.setWorldPosition(mid);t.setWorldRotation(cam.getWorldRotation().multiply(quat.fromEulerAngles(j*.8,0,age)));t.setLocalScale(new vec3(radius,radius,radius));}}
  if(age>=4){this.finishReveal();this.updateInfo();this.home();}
 }
}










