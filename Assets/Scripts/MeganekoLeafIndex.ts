import {MeganekoTutorialPoseScenario} from './MeganekoTutorialPoseScenario';
import {MeganekoTutorialScenario} from './MeganekoTutorialScenario';
import {MeganekoFourModelsScenario} from './MeganekoFourModelsScenario';
import {scenariosIndex} from 'Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator';
import {ScenarioMetadata} from 'Leaf.lspkg/Scenarios/scenario/ScenarioMetadata';
import {MeganekoLeafScenario} from './MeganekoLeafScenario';
import {MeganekoReachScenario} from './MeganekoReachScenario';
import {DefaultScenarioManager} from 'Leaf.lspkg/Scenarios/scenario/manager/DefaultLeafScenarioManager';
@component
export class MeganekoLeafIndex extends BaseScriptComponent {
 onAwake(){if(!global.deviceInfoSystem.isEditor())return;this.createEvent('KeyPressEvent').bind(e=>{const id=e.key===Keys.T?'meganeko-demo-integration':e.key===Keys.U?'meganeko-ui-audio-reach':'';if(id)DefaultScenarioManager.getInstance().startScenario(id).then(()=>print('MEGANEKO LEAF completed '+id)).catch(e=>print('MEGANEKO LEAF failed '+String(e)));});}
 @scenariosIndex static scenariosIndex:ScenarioMetadata[]=[{id:'meganeko-tutorial-pose',typename:MeganekoTutorialPoseScenario.getTypeName()},{id:'meganeko-tutorial',typename:MeganekoTutorialScenario.getTypeName()},{id:'meganeko-four-models',typename:MeganekoFourModelsScenario.getTypeName()},{id:'meganeko-demo-integration',typename:MeganekoLeafScenario.getTypeName()},{id:'meganeko-ui-audio-reach',typename:MeganekoReachScenario.getTypeName()}];
}

