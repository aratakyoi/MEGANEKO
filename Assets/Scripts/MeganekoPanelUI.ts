import {FlexLayout} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout';
import {FlexItem} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem';
import {FlexDirection,FlexAlign,FlexAlignSelf} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';
import {BackPlate} from 'SpectaclesUIKit.lspkg/Scripts/BackPlate';
import {RoundedRectangle} from 'SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle';
import {Button} from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button';
import {ElementContent} from 'SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent';
import Event from 'SpectaclesInteractionKit.lspkg/Utils/Event';
type View='home'|'collection'|'request'|'fusion'|'result'|'tutorial'|'tutorialResult';
@component
export class MeganekoPanelUI extends BaseScriptComponent {
 @input width:number=28;
 @input title:string='MEGANEKO';
 readonly action=new Event<string>();
 private view:View='home';private panels:{[key:string]:SceneObject}={};
 private infoValue='Meeting your companion';private statusValue='';private collectionValue='';
 private tutorialText:Text;private tutorialResultText:Text;private tutorialRow:SceneObject;
 private info:Text;private status:Text;private requestText:Text;private resultText:Text;
 readonly collectionModelAnchors:SceneObject[]=[];
 private cards:Text[]=[];private fuseRow:SceneObject;private agreeRow:SceneObject;private meetButton:SceneObject;private fuseButton:SceneObject;private connected=false;
 private badge:Text[]=[];private simulation=false;private rowIndex=0;
 onAwake(){this.createEvent('OnStartEvent').bind(()=>this.build());}
 private visible(o:SceneObject,v:boolean){if(o.enabled===v)return;o.enabled=v;const f=o.getParent().getComponent(FlexLayout.getTypeName()) as FlexLayout,i=o.getComponent(FlexItem.getTypeName()) as FlexItem;if(f&&i){if(v)f.addItems([i]);else f.removeItems([i]);}}
 private child(p:SceneObject,n:string){const o=global.scene.createSceneObject(n);o.setParent(p);return o;}
 private row(f:FlexLayout,h:number){const o=this.child(f.sceneObject,'Row'),i=o.createComponent(FlexItem.getTypeName()) as FlexItem;i.order=this.rowIndex++;i.overrideHeight=h;i.overrideWidth=this.width-4;i.flexShrink=0;i.alignSelf=FlexAlignSelf.Stretch;f.addItems([i]);return o;}
 private label(f:FlexLayout,value:string,h:number,size=54){const o=this.row(f,h),t=o.createComponent('Component.Text');t.text=value;t.depthTest=true;t.horizontalOverflow=HorizontalOverflow.Wrap;t.horizontalAlignment=HorizontalAlignment.Center;t.verticalAlignment=VerticalAlignment.Center;t.layoutRect=Rect.create(-(this.width-4)/2,(this.width-4)/2,-h/2,h/2);t.size=size;o.getTransform().setLocalPosition(new vec3(0,0,.15));return t;}
 private buttons(f:FlexLayout,items:string[][]){
  const o=this.row(f,4.6),line=o.createComponent(FlexLayout.getTypeName()) as FlexLayout;
  line.autoDiscoverItemsOnStart=false;line.width=this.width-4;line.height=4.6;line.direction=FlexDirection.Row;line.columnGap=.8;
  const count=items.length===3?2:items.length;const width=(this.width-4-.8*(count-1))/count;
  for(const [label,id] of items){const c=this.child(o,id),item=c.createComponent(FlexItem.getTypeName()) as FlexItem;item.overrideWidth=width;item.overrideHeight=4.6;item.flexShrink=0;line.addItems([item]);const b=c.createComponent(Button.getTypeName()) as Button;b.size=new vec3(width,4.6,1);const textRoot=this.child(c,'Label');textRoot.getTransform().setLocalPosition(new vec3(0,0,.08));const text=textRoot.createComponent('Component.Text');text.text=label;text.size=42;text.horizontalAlignment=HorizontalAlignment.Center;text.verticalAlignment=VerticalAlignment.Center;text.horizontalOverflow=HorizontalOverflow.Overflow;text.layoutRect=Rect.create(-width/2,width/2,-2.3,2.3);b.onTriggerUp.add(()=>this.action.invoke(id));}return o;
 }
 private panel(name:View,title:string){
  const root=this.child(this.sceneObject,'SimpleUI_'+name);this.panels[name]=root;
  const bp=root.createComponent(BackPlate.getTypeName()) as BackPlate;bp.style='dark';
  bp.onInitialized.add(()=>{const r=root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle;r.gradient=false;r.backgroundColor=new vec4(.045,.10,.32,1);r.opacity=1;r.renderMeshVisual.mainPass.blendMode=BlendMode.PremultipliedAlphaAuto;});
  const content=this.child(root,'Content');content.getTransform().setLocalPosition(new vec3(0,0,.6));
  const f=content.createComponent(FlexLayout.getTypeName()) as FlexLayout;f.autoDiscoverItemsOnStart=false;f.width=this.width;f.height=-1;f.direction=FlexDirection.Column;f.alignItems=FlexAlign.Stretch;f.rowGap=.8;f.paddingTop=2;f.paddingBottom=2;f.paddingLeft=2;f.paddingRight=2;f.onLayoutComplete.add(r=>bp.size=new vec2(r.containerWidth,r.containerHeight));
  if(title)this.label(f,title,3,60);const badge=this.label(f,'',1.5,30);this.visible(badge.sceneObject,this.simulation);this.badge.push(badge);return f;
 }
 private build(){
  this.sceneObject.createComponent('Component.Canvas');
  const home=this.panel('home','');this.info=this.label(home,this.infoValue,2.4,44);
  this.fuseRow=this.buttons(home,[['Collection','collection'],['Meet','meet'],['Fuse','fusion']]);
  this.meetButton=this.fuseRow.getChild(1);this.fuseButton=this.fuseRow.getChild(2);this.visible(this.fuseButton,false);
  this.tutorialRow=this.buttons(home,[['Tutorial','tutorial']]);this.visible(this.tutorialRow,false);
  this.status=this.label(home,'',2,30);this.visible(this.status.sceneObject,false);
  const collection=this.panel('collection','Collection');
  for(let r=0;r<2;r++){
   const row=this.row(collection,10.5),line=row.createComponent(FlexLayout.getTypeName()) as FlexLayout;line.autoDiscoverItemsOnStart=false;line.width=this.width-4;line.height=10.5;line.direction=FlexDirection.Row;line.columnGap=.8;
   for(let c=0;c<2;c++){const o=this.child(row,'CollectionCard'+(r*2+c)),item=o.createComponent(FlexItem.getTypeName()) as FlexItem;const w=(this.width-4-.8)/2;item.overrideWidth=w;item.overrideHeight=10.5;item.flexShrink=0;line.addItems([item]);const anchor=this.child(o,'CollectionModelAnchor'+(r*2+c));anchor.getTransform().setLocalPosition(new vec3(0,1.1,2.5));this.collectionModelAnchors.push(anchor);const label=this.child(o,'CollectionLabel');label.getTransform().setLocalPosition(new vec3(0,-3.3,.2));const t=label.createComponent('Component.Text');t.size=30;t.horizontalAlignment=HorizontalAlignment.Center;t.verticalAlignment=VerticalAlignment.Center;t.layoutRect=Rect.create(-w/2,w/2,-1.8,1.8);this.cards.push(t);}
  }
  this.buttons(collection,[['Back','back']]);
  const request=this.panel('request','A matching companion');
  this.requestText=this.label(request,'',6,54);this.agreeRow=this.buttons(request,[['Agree','agree']]);this.buttons(request,[['Cancel','cancel']]);
  const fusion=this.panel('fusion','A new beginning');this.label(fusion,'Two spirits are meeting...',4,54);
  const result=this.panel('result','A new MEGANEKO is born!');
  this.resultText=this.label(result,'',5,54);
  const tutorial=this.panel('tutorial','');this.tutorialText=this.label(tutorial,'Practice with a virtual partner.',5,42);this.buttons(tutorial,[['Exit','tutorialExit']]);
  const tutorialResult=this.panel('tutorialResult','Two new companions');this.tutorialResultText=this.label(tutorialResult,'',8,34);this.buttons(tutorialResult,[['Replay','tutorialReplay']]);this.buttons(tutorialResult,[['Back','tutorialBack']]);
  this.setInfo(this.infoValue);this.setCollection(this.collectionValue);this.setSimulation(this.simulation);this.setView(this.view);this.setEncounter(false,false,false,'');this.action.invoke('ready');
 }
 get cameraOffset():vec3{return this.view==='home'?new vec3(17,-8,-110):this.view==='collection'?new vec3(0,0,-120):new vec3(0,-12,-120);}
 get isHome(){return this.view==='home';}
 get inTutorial(){return this.view==='tutorial'||this.view==='tutorialResult';}
 setTutorialAvailable(v:boolean){if(this.tutorialRow)this.visible(this.tutorialRow,v);}
 showTutorial(message:string,result:boolean){const t=result?this.tutorialResultText:this.tutorialText;if(t)t.text=message;this.setView(result?'tutorialResult':'tutorial');}
 private setView(view:View){this.view=view;Object.keys(this.panels).forEach(k=>this.panels[k].enabled=k===view);}
 setInfo(s:string){this.infoValue=s;if(this.info)this.info.text=s;}
 setSimulation(v:boolean){this.simulation=v;this.badge.forEach(t=>{t.text=v?'PREVIEW SIMULATION':'';this.visible(t.sceneObject,v);});}
 setConnection(connected:boolean,message=''){this.connected=connected;if(this.meetButton)this.visible(this.meetButton,!connected);if(this.status){this.status.text=message;this.visible(this.status.sceneObject,!!message);}}
 setStatus(s:string){this.statusValue=s;}
 setCollection(s:string){this.collectionValue=s;const lines=s.split('\n');this.cards.forEach((t,i)=>t.text=(lines[i]||'').replace(' · ','\n').replace('  |  ','\n').replace(' collected',' owned'));}
 showDetails(v:boolean){this.setView(v?'collection':'home');}
 showHome(){this.setView('home');}
 showBirth(s:string){if(this.resultText)this.resultText.text=s;this.setView('result');}
 showFusion(){this.setView('fusion');}
 setEncounter(available:boolean,active:boolean,canAgree:boolean,message:string){
  if(this.inTutorial)return;
  if(this.fuseButton)this.visible(this.fuseButton,available&&!active);
  if(this.meetButton)this.visible(this.meetButton,!this.connected&&!this.simulation&&!available&&!active);
  if(this.agreeRow)this.visible(this.agreeRow,canAgree);
  if(this.requestText)this.requestText.text=message;
  if(active&&this.view!=='fusion'&&this.view!=='result')this.setView('request');
  else if(!active&&this.view==='request')this.setView('home');
 }
}

