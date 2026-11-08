// Pure rules shared by device, Preview demo and LEAF. No engine state.
export const CATALOGUE_VERSION = 'four-20261108';
export const PROFILE_VERSION = 2;
export const IDS = ['gentle','detective','princess','queen'];
export const NAMES = ['Gentle MegaNeko','Detective MegaNeko','Princess MegaNeko','Queen MegaNeko'];
export const FEATURED_IDS = ['detective','princess']; // Branding only; never affects draws.
export const TIERS = ['Normal','Rare','UltraRare'];
export const DEFAULT_WEIGHTS = [80,18,2];
export const PAGE_SIZE = 4;
export const PAGE_COUNT = Math.ceil(IDS.length/PAGE_SIZE);
export const PROFILE_KEYS = {demo:'MEGANEKO_four_demo_pair_v2',preview:'MEGANEKO_four_preview_v2',device:'MEGANEKO_four_profile_v2',fixture:'MEGANEKO_four_network_fixture_v2_'};
export function catalogueIndex(page:number,slot:number):number {return integer(page,0,PAGE_COUNT-1)&&integer(slot,0,PAGE_SIZE-1)&&species(page*PAGE_SIZE+slot)?page*PAGE_SIZE+slot:-1;}
export function tier(i:number):number { return i<2?0:i<3?1:2; }
export function prestige(n:number):string { return n>=5?'Gold':n===4?'Prismatic':n===3?'Silver':n===2?'Bronze':'Basic'; }
export function draw(r:()=>number, weights:number[]=DEFAULT_WEIGHTS):number {
  const total=weights.reduce((a,b)=>a+b,0); if(weights.length!==3||!Number.isFinite(total)||total<=0||weights.some(x=>!Number.isFinite(x)||x<0)) throw Error('Invalid odds');
  const random=()=>{const n=r();if(!Number.isFinite(n))throw Error('Invalid random sample');return Math.min(.999999999,Math.max(0,n));};
  let roll=random()*total, t=0;
  for(;t<2;t++){if(roll<weights[t])break;roll-=weights[t];}
  const starts=[0,2,3], counts=[2,1,1];
  return starts[t]+Math.min(counts[t]-1,Math.floor(random()*counts[t]));
}
export interface Profile { version:2; catalogue:string; active:number; counts:number[]; commits:string[]; serial:number; }
export function initial(r:()=>number,weights?:number[]):Profile {const active=draw(r,weights),counts=IDS.map(()=>0);counts[active]=1;return {version:2,catalogue:CATALOGUE_VERSION,active,counts,commits:[],serial:1};}
export const integer=(n:any,min=0,max=Number.MAX_SAFE_INTEGER):boolean=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const species=(n:any):boolean=>integer(n,0,IDS.length-1);
export const token=(s:any):boolean=>typeof s==='string'&&s.length>0&&s.length<=256;
export function decode(raw:string):Profile|null {try {const p=JSON.parse(raw);
 if(!p||p.version!==PROFILE_VERSION||p.catalogue!==CATALOGUE_VERSION||!species(p.active)||!Array.isArray(p.counts)||p.counts.length!==IDS.length||p.counts.some((x:any)=>!integer(x))||p.counts[p.active]<1||!Array.isArray(p.commits)||p.commits.some((x:any)=>!token(x))||new Set(p.commits).size!==p.commits.length||!integer(p.serial,1)||p.counts.reduce((a:number,b:number)=>a+b,0)!==p.serial||p.commits.length!==p.serial-1)return null;
 return p;}catch(_){return null;}}
export function commit(p:Profile,nonce:string,result:number):boolean {if(!p||!token(nonce)||!species(result)||p.commits.indexOf(nonce)>=0||!integer(p.serial,1,Number.MAX_SAFE_INTEGER-1)||!integer(p.counts[result],0,Number.MAX_SAFE_INTEGER-1))return false;p.counts[result]++;p.active=result;p.commits.push(nonce);p.serial++;return true;}
export function outcomes(matchedSpecies:number,r:()=>number,weights?:number[]):number[]{if(!species(matchedSpecies))throw Error('Invalid matching species');return [draw(r,weights),draw(r,weights)];}
export type V = [number,number,number];
export interface Hand {id:string; tracked:boolean; received:number; seq:number; palm:V; normal:V; head:V;}
export interface Consent {nonce:string; a:string;b:string;species:number;expires:number;yesA:boolean;yesB:boolean;cancelled:boolean;}
export const distance=(a:V,b:V)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])*(v-b[i]),0));
export class Handshake {
  private since=-1; private latched=false; private nonce='';
  near:number;dwell:number;fresh:number;people:number;separation:number;normalDot:number;
  constructor(near=12,dwell=.8,fresh=.35,people=160,separation=25,normalDot=-.15){this.near=near;this.dwell=dwell;this.fresh=fresh;this.people=people;this.separation=separation;this.normalDot=normalDot;}
  reset(){this.since=-1;this.nonce='';}
  requireSeparation(){this.reset();this.latched=true;}
  step(now:number,c:Consent,a:Hand,b:Hand):boolean {
    if(validHand(a)&&validHand(b)&&a.id!==b.id&&now>=a.received&&now>=b.received&&a.tracked&&b.tracked&&now-a.received<=this.fresh&&now-b.received<=this.fresh&&distance(a.palm,b.palm)>this.separation){this.latched=false;this.since=-1;}
    if(!Number.isFinite(now)||!validConsent(c)||!validHand(a)||!validHand(b)||now<a.received||now<b.received||c.cancelled||!c.yesA||!c.yesB||now>=c.expires||a.id===b.id||a.id!==c.a||b.id!==c.b||!a.tracked||!b.tracked||now-a.received>this.fresh||now-b.received>this.fresh||distance(a.head,b.head)>this.people||distance(a.palm,b.palm)>this.near||a.normal.reduce((s,v,i)=>s+v*b.normal[i],0)>this.normalDot){this.since=-1;return false;}
    if(this.latched)return false;
    if(this.nonce!==c.nonce){this.nonce=c.nonce;this.since=now;}
    if(this.since<0)this.since=now;
    if(now-this.since<this.dwell)return false;
    this.latched=true;this.since=-1;return true;
  }
}

// Receive time and identity come from the trusted network envelope, never payload fields.
export interface Pose {hand:Hand;species:number;count:number;serial:number;companion:V;rotation:[number,number,number,number];}
export const vector=(v:any,n=3,bound=100000):boolean=>Array.isArray(v)&&v.length===n&&Array.from(v).every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=bound);
export function validHand(h:any):h is Hand {
 if(!h||!token(h.id)||typeof h.tracked!=='boolean'||!Number.isFinite(h.received)||!integer(h.seq)||!vector(h.palm)||!vector(h.head)||!vector(h.normal,3,1.01))return false;
 const norm=h.normal.reduce((s:number,x:number)=>s+x*x,0);return !h.tracked||(norm>=.81&&norm<=1.21);
}
export function parsePose(data:any,id:string,received:number,previousSeq=-1):Pose|null {
 if(!data||data.catalogue!==CATALOGUE_VERSION||!data.hand||!token(id)||!Number.isFinite(received))return null;const h={...data.hand,id,received};
 if(!validHand(h)||h.seq<=previousSeq||!species(data.species)||!integer(data.count,1)||!integer(data.serial,1)||data.count>data.serial||!vector(data.companion)||!vector(data.rotation,4,1.01))return null;
 const norm=data.rotation.reduce((s:number,x:number)=>s+x*x,0);if(norm<.98||norm>1.02)return null;
 return {hand:h,species:data.species,count:data.count,serial:data.serial,companion:data.companion.slice(),rotation:data.rotation.slice()};
}
export interface Snapshot {species:number;count:number;serial:number;}
export interface Transaction extends Consent {catalogue:string;users:string[];serials:number[];snapshots:Snapshot[];coordinator:string;remaining:number;result?:number[];acks?:string[];resolvedAt?:number;animationAge?:number;}
export function validConsent(c:any):boolean {return !!c&&token(c.nonce)&&token(c.a)&&token(c.b)&&c.a!==c.b&&species(c.species)&&Number.isFinite(c.expires)&&typeof c.yesA==='boolean'&&typeof c.yesB==='boolean'&&typeof c.cancelled==='boolean';}
export function validTransaction(t:any):t is Transaction {
 if(!validConsent(t)||t.catalogue!==CATALOGUE_VERSION||!token(t.coordinator)||!Number.isFinite(t.remaining)||t.remaining<0||t.remaining>30||!Array.isArray(t.users)||t.users.length!==2||!t.users.every(token)||t.users[0]===t.users[1]||!Array.isArray(t.serials)||t.serials.length!==2||!t.serials.every((x:any)=>integer(x,1))||!Array.isArray(t.snapshots)||t.snapshots.length!==2)return false;
 if(t.snapshots.some((s:any,i:number)=>!s||s.species!==t.species||s.serial!==t.serials[i]||!integer(s.count,1,s.serial)))return false;
 if(t.result!==undefined&&(!Array.isArray(t.result)||t.result.length!==2||!t.result.every(species)||t.cancelled||!t.yesA||!t.yesB||!Number.isFinite(t.resolvedAt)||t.resolvedAt>=t.expires))return false;
 if(t.animationAge!==undefined&&(!t.result||!Number.isFinite(t.animationAge)||t.animationAge<0||t.animationAge>4))return false;
 return t.acks===undefined||(Array.isArray(t.acks)&&t.acks.length<=2&&new Set(t.acks).size===t.acks.length&&t.acks.every((u:any)=>t.users.indexOf(u)>=0)&&(!t.acks.length||!!t.result));
}
export function decodeLedger(raw:string,previous:Transaction[]=[]):Transaction[]|null {
 try {if(raw.length>200000)return null;const list=JSON.parse(raw);
 if(!Array.isArray(list)||list.length>128||list.some(t=>!validTransaction(t))||new Set(list.map(t=>t.nonce)).size!==list.length)return null;
 if(previous.some((t,i)=>list[i]?.nonce!==t.nonce))return null;
 if(list.filter(t=>!t.cancelled&&!t.result).length>1)return null;
 for(const old of previous){const t=list.find(t=>t.nonce===old.nonce);if(!t)return null;
 for(const key of ['a','b','users','serials','snapshots','species','coordinator','expires'])if(JSON.stringify(t[key])!==JSON.stringify((old as any)[key]))return null;
 if((t.animationAge??0)<(old.animationAge??0)||t.remaining>old.remaining)return null;
 if(old.cancelled&&!t.cancelled||old.yesA&&!t.yesA||old.yesB&&!t.yesB||old.result&&JSON.stringify(old.result)!==JSON.stringify(t.result)||old.result&&old.resolvedAt!==t.resolvedAt||old.acks?.some(u=>!t.acks?.includes(u)))return null;
 }return list;}catch(_){return null;}
}
export function matchesSnapshot(p:Snapshot,s:Snapshot):boolean {return !!p&&!!s&&p.species===s.species&&p.serial===s.serial&&p.count===s.count;}
export function commitTransaction(p:Profile,t:Transaction,user:string):'committed'|'duplicate'|'rejected' {
 if(!p||!validTransaction(t)||!t.result||t.cancelled)return 'rejected';const i=t.users.indexOf(user);if(i<0)return 'rejected';
 if(p.commits.includes(t.nonce))return 'duplicate';
 if(!matchesSnapshot({species:p.active,count:p.counts[p.active],serial:p.serial},t.snapshots[i]))return 'rejected';
 return commit(p,t.nonce,t.result[i])?'committed':'rejected';
}
