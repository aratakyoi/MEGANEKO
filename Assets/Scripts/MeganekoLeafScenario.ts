import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import {expect} from 'Leaf.lspkg/Utils/common/Expect';
import {sleep,findSceneObjectByName} from 'Leaf.lspkg/Utils/common/Utils';
import {DefaultLeafInteractor} from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor';
import {findInteractablesByName} from 'Leaf.lspkg/Interactors/InteractableUtils';
import {createIKInteractor} from 'Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar';
import {Cat} from './MeganekoMesh';
import {MeganekoMain} from './MeganekoMain';
import {decode,IDS,tier,outcomes,PROFILE_KEYS,species,catalogueIndex,PAGE_COUNT} from './MeganekoRules';
export class Flow extends DefaultLeafInteractor {
 main(){return findSceneObjectByName('MEGANEKO Experience').getComponent(MeganekoMain.getTypeName()) as MeganekoMain;}
 async tap(name:string){const hidden=['demo','match','hand','inspect','mute','view3'];if(hidden.includes(name)){(this.main() as any).action(name);await sleep(250);return;}if(name==='fusion'&&(this.main() as any).consent){(this.main() as any).action(name);await sleep(250);return;}const b=findInteractablesByName(name,undefined,true)[0];if(!b)throw Error('Missing enabled button: '+name);await this.trigger(b);await sleep(250);}
 async start(){if(!global.deviceInfoSystem.isEditor())throw Error('Demo integration tests require Preview');await sleep(1200);if(!(this.main() as any).demo)await this.tap('demo');}
 pair(){return JSON.parse(global.persistentStorageSystem.store.getString(PROFILE_KEYS.demo));}
}
@component
export class MeganekoLeafScenario extends Scenario {
 async run(){
  const legacyKeys=['MEGANEKO_profile_v1','MEGANEKO_preview_v1','MEGANEKO_demo_pair_v2','MEGANEKO_seven_profile_v2','MEGANEKO_seven_preview_v2','MEGANEKO_seven_demo_pair_v2','MEGANEKO_seven_profile_v2_backup','MEGANEKO_seven_preview_v2_backup','MEGANEKO_seven_demo_pair_v2_backup'];const store=global.persistentStorageSystem.store;const legacy=legacyKeys.map(k=>store.getString(k));
  const f=new Flow();await f.start();const initialSaved=store.getString(PROFILE_KEYS.preview);expect(!!decode(initialSaved)).toBe(true);await f.tap('match');
  const before=f.pair();expect(!!decode(JSON.stringify(before.local))).toBe(true);
  await f.tap('fusion');await f.tap('hand');await sleep(1400);
  expect(f.pair().local.serial).toBe(before.local.serial); // one-sided consent
  await f.tap('hand');await f.tap('fusion');await sleep(1000);
  expect(f.pair().local.serial).toBe(before.local.serial); // both consent, separated
  await f.tap('hand');await sleep(4700);
  const after=f.pair();expect(after.local.serial).toBe(before.local.serial+1);expect(after.peer.serial).toBe(before.peer.serial+1);
  expect(after.local.counts.reduce((a:number,b:number)=>a+b,0)).toBe(before.local.counts.reduce((a:number,b:number)=>a+b,0)+1);
  expect(after.peer.counts.reduce((a:number,b:number)=>a+b,0)).toBe(before.peer.counts.reduce((a:number,b:number)=>a+b,0)+1);
  await sleep(1400);expect(f.pair().local.serial).toBe(after.local.serial); // held handshake cannot repeat
  await f.tap('hand');await f.tap('match');await f.tap('fusion');await f.tap('cancel');await f.tap('hand');await sleep(1200);
  expect(f.pair().local.serial).toBe(after.local.serial); // cancellation
  await f.tap('hand');await f.tap('collection');await f.tap('back');await f.tap('collection');await f.tap('back');expect(species(after.local.active)&&species(after.peer.active)).toBe(true);
  const root=findSceneObjectByName('MEGANEKO Experience');expect(!!(f.main() as any).cat).toBe(true);
  expect(!!(f.main() as any).cats['demo-peer']).toBe(true);
  const main=root.getComponent(MeganekoMain.getTypeName()) as MeganekoMain;expect([main.normal,main.rare,main.ultraRare]).toEqual([80,18,2]);
  for(let i=0;i<IDS.length;i++)for(const count of [4,5]){const cat=new Cat(root,i,main.material,count,(main as any)[IDS[i]]);const display=cat.root.getChild(0);let jewels=0;for(let j=0;j<display.getChildrenCount();j++)if(display.getChild(j).name==='Prismatic jewel')jewels++;expect(jewels).toBe(count===4?8:0);cat.destroy();}
  expect(PAGE_COUNT).toBe(1);expect(catalogueIndex(0,3)).toBe(3);expect(catalogueIndex(0,4)).toBe(-1);expect(catalogueIndex(1,0)).toBe(-1);
  print('MEGANEKO four: all 8 Prismatic/Gold rigged model builds PASS');
  const saved=global.persistentStorageSystem.store.getString(PROFILE_KEYS.demo);await f.tap('inspect');await f.tap('demo');await f.tap('demo');
  expect(global.persistentStorageSystem.store.getString(PROFILE_KEYS.demo)).toBe(saved); // mode/reload persistence
  expect(store.getString(PROFILE_KEYS.preview)).toBe(initialSaved);expect(legacyKeys.map(k=>store.getString(k))).toEqual(legacy);
  const counts=[0,0,0];IDS.forEach((_,i)=>counts[tier(i)]++);expect(counts).toEqual([2,1,1]);
  const samples=[0,0,.99,.99];const results=outcomes(0,()=>samples.shift(),[80,18,2]);expect(results[0]===results[1]).toBe(false);
  print('MEGANEKO integration: consent, separation, commit, replay, cancel, catalogue, reload PASS');
 }
}




