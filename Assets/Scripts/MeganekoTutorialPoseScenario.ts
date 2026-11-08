import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import {expect} from 'Leaf.lspkg/Utils/common/Expect';
import {sleep,findSceneObjectByName} from 'Leaf.lspkg/Utils/common/Utils';
import {MeganekoMain} from './MeganekoMain';
@component
export class MeganekoTutorialPoseScenario extends Scenario {
 async run(){
  await sleep(400);
  const m=findSceneObjectByName('MEGANEKO Experience').getComponent(MeganekoMain.getTypeName()) as any;
  if(m.tutorial)m.tutorial.exit();
  m.action('tutorial');const t=m.tutorial;expect(!!t).toBe(true);
  let gap:number;
  try{
   await sleep(6600);
   const v=(a:number[])=>new vec3(a[0],a[1],a[2]);
   const pc=t.contactBone.getTransform().getWorldTransform().multiplyPoint(v(t.meta.partnerBoneContact));
   const hc=t.handBone.getTransform().getWorldTransform().multiplyPoint(v(t.meta.handBoneContact));
   gap=pc.distance(hc);print('TUTORIAL_POSE_CONTACT '+JSON.stringify({gapCm:gap,limitCm:.15,pass:gap<.15}));
   expect(gap<.15).toBe(true);
  }finally{t.exit();}
  expect(m.tutorial===null).toBe(true);expect(m.ui.view).toBe('home');
  expect(m.muted).toBe(true);expect(m.musicPlayer.volume).toBe(0);expect(m.chimePlayer.volume).toBe(0);
  print('TUTORIAL_POSE_HOME '+JSON.stringify({tutorialNull:m.tutorial===null,view:m.ui.view,muted:m.muted,musicVolume:m.musicPlayer.volume,chimeVolume:m.chimePlayer.volume}));
 }
}
