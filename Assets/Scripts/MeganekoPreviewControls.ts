import {StartMenu} from 'SpectaclesSyncKit.lspkg/StartMenu/Scripts/StartMenu';
import {SessionController} from 'SpectaclesSyncKit.lspkg/Core/SessionController';
import {MeganekoMain} from './MeganekoMain';
/** Local companion starts immediately; real SyncKit is initialized only on explicit meeting intent.
 * Do not prepareOfflineMode: its mock cannot be upgraded to a real session. */
@component
export class MeganekoPreviewControls extends BaseScriptComponent {
 @input menu:StartMenu;
 @input camera:SceneObject;
 @input material:Material;
 @input graphic:SceneObject;
 @input help:Text;
 @input catalogue:MeganekoMain;
 onAwake(){
  this.createEvent('OnStartEvent').bind(()=>{
   const session=SessionController.getInstance();
   let attempted=false;
   let needsRestart=false;
   const showRestart=()=>{
    needsRestart=true;
    this.menu.hide();this.catalogue.ui.setConnection(false,'Reopen this Lens\nto reconnect.');
   };
   this.menu.hide();this.graphic.enabled=false;
   this.catalogue.sceneObject.getParent().enabled=true;this.catalogue.sceneObject.enabled=true;
   this.catalogue.ui.action.add(a=>{
    if(a!=='meet')return;
    if(session.isHost() !== null){
     this.catalogue.ui.setConnection(true);return;
    }
    if(needsRestart || attempted || session.getSession()){
     showRestart();return;
    }
    attempted=true;
    this.catalogue.ui.setConnection(true,'Connecting...');
    this.menu.attemptMultiplayer();
   });
   session.onConnectionFailed.add(showRestart);
   session.notifyOnReady(()=>{
    if(session.isHost() !== null){this.menu.hide();this.catalogue.ui.setConnection(true);}
    else showRestart();
   });
   session.onDisconnected.add(showRestart);
  });
 }
}
