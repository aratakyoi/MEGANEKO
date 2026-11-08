import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import {expect} from 'Leaf.lspkg/Utils/common/Expect';
import {sleep,findSceneObjectByName} from 'Leaf.lspkg/Utils/common/Utils';
import {MeganekoMain} from './MeganekoMain';
import {Cat} from './MeganekoMesh';
import {IDS} from './MeganekoRules';
@component
export class MeganekoFourModelsScenario extends Scenario {
 async run(){
  const root=findSceneObjectByName('MEGANEKO Experience');
  const main=root.getComponent(MeganekoMain.getTypeName()) as MeganekoMain;
  for(let i=0;i<4;i++){
   const prefab=(main as any)[IDS[i]] as ObjectPrefab;expect(!!prefab).toBe(true);
   const holder=global.scene.createSceneObject('Four model verification');holder.getTransform().setWorldPosition(main.camera.getTransform().getWorldTransform().multiplyPoint(new vec3(0,0,-90)));const cat=new Cat(holder,i,main.material,5,prefab);
   try{
    const players:AnimationPlayer[]=[],bones:SceneObject[]=[],meshes:RenderMeshVisual[]=[];
    const visit=(o:SceneObject)=>{const p=o.getComponent('Component.AnimationPlayer');if(p)players.push(p);const m=o.getComponent('Component.RenderMeshVisual');if(m&&o.name.endsWith('_Body'))meshes.push(m);if(['Head','TailMid','ForePaw_L'].includes(o.name))bones.push(o);for(let k=0;k<o.getChildrenCount();k++)visit(o.getChild(k));};visit(cat.root);
    expect(players.length).toBe(1);expect(bones.length).toBe(3);expect(meshes.length).toBe(1);
    const p=players[0];expect(p.clips.map(c=>c.name).sort()).toEqual(['Celebrate','Idle','Walk']);
    const pose=()=>bones.map(b=>{const q=b.getTransform().getLocalRotation();return [q.x,q.y,q.z,q.w];}).flat();
    await sleep(150);expect(p.getActiveClips()).toEqual(['Idle']);const a=pose();await sleep(650);const b=pose();
    const idleMotion=Math.max(...a.map((v,k)=>Math.abs(v-b[k])));expect(idleMotion).toBeGreaterThan(.00001);
    cat.celebrate();await sleep(100);expect(p.getActiveClips()).toEqual(['Celebrate']);const c=pose();await sleep(700);const d=pose();
    const celebrateMotion=Math.max(...c.map((v,k)=>Math.abs(v-d[k])));expect(celebrateMotion).toBeGreaterThan(.00001);
    await sleep(1800);cat.tick(getTime());expect(p.getActiveClips()).toEqual(['Idle']);
    const mn=meshes[0].worldAabbMin(),mx=meshes[0].worldAabbMax();
    print('FOUR_MODEL_VERIFIED '+JSON.stringify({species:IDS[i],idleMotion,celebrateMotion,displayBounds:{min:[mn.x,mn.y,mn.z],max:[mx.x,mx.y,mx.z]},clips:p.clips.map(c=>({name:c.name,begin:c.begin,end:c.end})),active:p.getActiveClips()}));
   }finally{cat.destroy();holder.destroy();}
  }
 }
}
