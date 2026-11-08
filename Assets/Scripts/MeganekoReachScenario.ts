import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import {expect} from 'Leaf.lspkg/Utils/common/Expect';
import {sleep,findSceneObjectByName} from 'Leaf.lspkg/Utils/common/Utils';
import {findInteractablesByName} from 'Leaf.lspkg/Interactors/InteractableUtils';
import {createIKInteractor} from 'Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar';
import {Flow} from './MeganekoLeafScenario';
@component
export class MeganekoReachScenario extends Scenario {
 async run(){
  const f=new Flow();await sleep(1200);const m=f.main() as any,ui=m.ui as any;
  const visible=(n:string)=>findInteractablesByName(n,undefined,true).length;
  expect(ui.width).toBe(28);expect(ui.view).toBe('home');expect(m.ready).toBe(false);expect(m.session.getSession()==null).toBe(true);
  expect(visible('collection')).toBe(1);expect(visible('meet')).toBe(1);expect(visible('fusion')).toBe(0);
  expect(ui.badge.every((t:Text)=>!t.sceneObject.enabled)).toBe(true);
  for(const n of ['SoloButton','MultiplayerButton','inspect','odds','mute','reset','details','agree','cancel'])expect(visible(n)).toBe(0);
  const ik=createIKInteractor();await sleep(400);
  const profileBefore=JSON.stringify(m.profile),savedBefore=global.persistentStorageSystem.store.getString(m.key);
  for(let i=0;i<3;i++){
   if(i===0){await ik.trigger(findInteractablesByName('collection',undefined,true)[0]);await sleep(300);}else await f.tap('collection');
   expect(ui.view).toBe('collection');expect(m.cat.root.enabled).toBe(true);expect(ui.cards.length).toBe(4);expect(m.thumbnails.length).toBe(4);expect(ui.collectionModelAnchors.length).toBe(4);
   m.thumbnails.forEach((cat:any,j:number)=>{expect(cat.root.getParent()===ui.collectionModelAnchors[j]).toBe(true);expect(cat.root.getChildrenCount()>0).toBe(true);expect(cat.players.length>0).toBe(m.profile.counts[j]>0);expect(!!cat.tail).toBe(m.profile.counts[j]===0);});expect(visible('meet')).toBe(0);expect(visible('fusion')).toBe(0);
   const p=ui.cards.map((t:Text)=>t.sceneObject.getTransform().getWorldPosition());
   expect(Math.abs(p[0].y-p[1].y)<.1).toBe(true);expect(Math.abs(p[2].y-p[3].y)<.1).toBe(true);expect(Math.abs(p[0].x-p[1].x)>1).toBe(true);expect(Math.abs(p[0].y-p[2].y)>1).toBe(true);
   await ik.trigger(findInteractablesByName('back',undefined,true)[0]);await sleep(300);expect(ui.view).toBe('home');expect(m.thumbnails.length).toBe(0);expect(ui.collectionModelAnchors.every((a:SceneObject)=>a.getChildrenCount()===0)).toBe(true);expect(JSON.stringify(m.profile)).toBe(profileBefore);expect(global.persistentStorageSystem.store.getString(m.key)).toBe(savedBefore);
  }
  await f.start();await f.tap('match');await f.tap('fusion');expect(visible('agree')).toBe(0);expect(visible('cancel')).toBe(1);
  const c=m.consent,originalSession=m.session,originalSend=m.send,originalTick=m.tick;
  try{
   m.demo=false;m.ready=true;m.tick=()=>{};m.session={getLocalConnectionId:()=>c.b};let sent:any=null;m.send=(x:any)=>sent=x;m.refreshEncounter();await sleep(100);
   expect(visible('agree')).toBe(1);await f.tap('agree');expect(sent.type).toBe('agree');expect(sent.nonce).toBe(c.nonce);expect(c.yesB).toBe(false);
   m.session={getLocalConnectionId:()=>c.a};m.refreshEncounter();expect(visible('agree')).toBe(0);
  }finally{m.session=originalSession;m.send=originalSend;m.tick=originalTick;m.ready=false;m.demo=true;m.refreshEncounter();}
  await f.tap('cancel');expect(ui.view).toBe('home');expect(visible('cancel')).toBe(0);
  const species=m.demoPeer.active;m.demoPeer.active=(m.profile.active+1)%4;m.refreshEncounter();expect(visible('fusion')).toBe(0);m.demoPeer.active=species;
  await f.tap('match');await f.tap('fusion');await f.tap('fusion');await f.tap('hand');await sleep(5300);expect(ui.view).toBe('home');await f.tap('collection');await f.tap('back');expect(ui.view).toBe('home');
  const audio=m.sceneObject.getComponents('Component.AudioComponent');expect(audio.length).toBe(2);expect(audio.every((a:AudioComponent)=>a.volume===0)).toBe(true);
  print('SIMPLE_UI_PASS: 3 collection/back cycles with unchanged profile/storage; 4 anchored prefab/locked thumbnails cleared on Back; actual IK Collection/Back; 2x2; minimal home; no mode menu; sender/receiver agree boundary; cancellation; species gating; fusion auto-home; back after fusion; quiet audio.');
 }
}


