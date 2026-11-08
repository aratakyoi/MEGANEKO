import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import {expect} from 'Leaf.lspkg/Utils/common/Expect';
import {sleep,findSceneObjectByName} from 'Leaf.lspkg/Utils/common/Utils';
import {findInteractablesByName} from 'Leaf.lspkg/Interactors/InteractableUtils';
import {createIKInteractor} from 'Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar';
import {MeganekoMain} from './MeganekoMain';
@component
export class MeganekoTutorialScenario extends Scenario {
 async run(){
  await sleep(1200);const m=findSceneObjectByName('MEGANEKO Experience').getComponent(MeganekoMain.getTypeName()) as any,ui=m.ui as any;
  const store=global.persistentStorageSystem.store;
  const snapshot=()=>JSON.stringify({profile:m.profile,keys:store.getAllKeys().slice().sort(),values:store.getAllKeys().filter(k=>k.indexOf('MEGANEKO')>=0).sort().map(k=>[k,store.getString(k)]),ledger:m.ledger.currentValue,txs:m.txs,accepted:m.accepted,consent:m.consent,connection:m.session.getLocalConnectionId(),user:m.session.getLocalUserId()});
  const baseline=snapshot(),originalCat=m.cat,session=m.session,sync=m.sync;
  const ik=createIKInteractor();await sleep(300);
  const tap=async(n:string)=>{const b=findInteractablesByName(n,undefined,true)[0];expect(!!b).toBe(true);await ik.trigger(b);await sleep(150);};
  const unchanged=()=>{expect(snapshot()).toBe(baseline);expect(m.session===session).toBe(true);expect(m.sync===sync).toBe(true);expect(m.cat===originalCat).toBe(true);};
  const clean=()=>{expect(m.tutorial===null).toBe(true);expect(ui.view).toBe('home');expect(originalCat.root.enabled).toBe(true);expect(findSceneObjectByName('MEGANEKO Tutorial Stage')==null).toBe(true);unchanged();};
  await tap('tutorial');expect(m.tutorialSuspended).toBe(true);expect(ui.view).toBe('tutorial');expect(m.cat.root.enabled).toBe(false);unchanged();
  // Calls that normally mutate must be inert while tutorial owns the view.
  m.receive('test-peer','test-user',{type:'request',catalogue:'four-20261108'});m.applyLedger();m.consumeLedger(getTime());expect(m.persist(m.profile)).toBe(false);m.publish();unchanged();
  await sleep(1000);await tap('tutorialExit');clean();
  await tap('tutorial');const t=m.tutorial;expect(t.cats.length).toBe(2);expect(t.initialSpecies).toBe(m.profile.active);
  const pose=()=>{const nodes:SceneObject[]=[];const walk=(o:SceneObject)=>{nodes.push(o);for(let i=0;i<o.getChildrenCount();i++)walk(o.getChild(i));};walk(t.partner);walk(t.hand);return nodes.map(o=>{const tr=o.getTransform(),p=tr.getLocalPosition(),q=tr.getLocalRotation();return [p.x,p.y,p.z,q.x,q.y,q.z,q.w];}).flat();};
  await sleep(6400);expect(t.partnerPlayers.some((p:AnimationPlayer)=>p.getActiveClips().includes('Handshake'))).toBe(true);expect(t.handPlayers.some((p:AnimationPlayer)=>p.getActiveClips().includes('Grip'))).toBe(true);
  const a=pose();await sleep(450);const b=pose(),motion=Math.max(...a.map((v:number,i:number)=>Math.abs(v-b[i])));expect(motion).toBeGreaterThan(.00001);
  const v=(a:number[])=>new vec3(a[0],a[1],a[2]);
  const pc=t.contactBone.getTransform().getWorldTransform().multiplyPoint(v(t.meta.partnerBoneContact)),hc=t.handBone.getTransform().getWorldTransform().multiplyPoint(v(t.meta.handBoneContact)),gap=pc.distance(hc);expect(gap<.15).toBe(true);unchanged();
  await sleep(8500);expect(ui.view).toBe('tutorialResult');expect(t.results.length).toBe(2);expect(t.results.every((n:number)=>Number.isInteger(n)&&n>=0&&n<4)).toBe(true);expect(t.cats.length).toBe(2);unchanged();
  await tap('tutorialReplay');expect(ui.view).toBe('tutorial');expect(t.cats.length).toBe(2);expect(t.results.length).toBe(0);unchanged();
  await sleep(15500);expect(ui.view).toBe('tutorialResult');await tap('tutorialBack');clean();
  // Existing Home / Collection remains usable after completion.
  await tap('collection');expect(ui.view).toBe('collection');await tap('back');clean();
  print('TUTORIAL_PASS '+JSON.stringify({actualUIKitIK:true,midflowExit:true,replayBack:true,profileStorageSessionLedgerUnchanged:true,allStorageKeys:store.getAllKeys().length,contactGapCm:gap,animationMotion:motion,noStageLeaks:true}));
 }
}
