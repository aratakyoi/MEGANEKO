import assert from 'node:assert/strict';
import {IDS,NAMES,FEATURED_IDS,CATALOGUE_VERSION,PROFILE_KEYS,PAGE_COUNT,catalogueIndex,tier,draw,initial,decode,commit,outcomes,prestige,Handshake,parsePose,validHand,validTransaction,decodeLedger,commitTransaction,matchesSnapshot} from './MeganekoRules.ts';
const results=[];
function check(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
function rng(...xs){let i=0;return ()=>xs[i++%xs.length];}
function consent(){return {nonce:'test1',a:'A',b:'B',species:1,expires:30,yesA:true,yesB:true,cancelled:false};}
function hands(t){return [{id:'A',tracked:true,received:t,seq:1,palm:[-3,0,0],normal:[1,0,0],head:[-40,50,0]},{id:'B',tracked:true,received:t,seq:1,palm:[3,0,0],normal:[-1,0,0],head:[40,50,0]}];}
check('4 unique stable IDs and tier counts 2/1/1',()=>{assert.equal(new Set(IDS).size,4);assert.deepEqual([0,1,2].map(t=>IDS.filter((_,i)=>tier(i)===t).length),[2,1,1]);});
check('Exact tier boundaries',()=>{assert.equal(draw(rng(0,0)),0);assert.equal(draw(rng(.799999,0)),0);assert.equal(draw(rng(.8,0)),2);assert.equal(draw(rng(.979999,0)),2);assert.equal(draw(rng(.98,0)),3);});
check('Species within each tier can reach last index',()=>assert.deepEqual([0,.8,.98].map(x=>draw(rng(x,.999999))),[1,2,3]));
check('Initial profile draws one cat and persists exactly',()=>{const p=initial(rng(.81,.5));assert.equal(p.counts.reduce((a,b)=>a+b),1);assert.deepEqual(decode(JSON.stringify(p)),p);});
check('Repeated species remain possible and count increases',()=>{const p=initial(rng(0));assert.equal(commit(p,'repeat',p.active),true);assert.equal(p.counts[p.active],2);});
check('A/B independent outcomes may differ',()=>assert.deepEqual(outcomes(1,rng(0,0,.8,0)),[0,2]));
check('A/B independent outcomes may match',()=>assert.deepEqual(outcomes(1,rng(0)),[0,0]));
check('All four matching species use independent draws',()=>{for(let i=0;i<4;i++){assert.deepEqual(outcomes(i,rng(0,0,.99,.99)),[0,3]);assert.deepEqual(outcomes(i,rng(0)),[0,0]);}});
check('Duplicate transaction does not pay twice',()=>{const p=initial(rng(0));assert.equal(commit(p,'nonce',1),true);const before=JSON.stringify(p);assert.equal(commit(p,'nonce',2),false);assert.equal(JSON.stringify(p),before);});
check('History survives new active companion',()=>{const p=initial(rng(0));commit(p,'new',3);assert.equal(p.active,3);assert.equal(p.counts[0],1);assert.equal(p.counts[3],1);});
check('Gold threshold exactly five',()=>assert.deepEqual([1,2,3,4,5,6].map(prestige),['Basic','Bronze','Silver','Prismatic','Gold','Gold']));
check('Malformed profile rejected',()=>{assert.equal(decode('{bad'),null);const p=initial(rng(0));p.counts[0]=-1;assert.equal(decode(JSON.stringify(p)),null);});
check('Valid continuous handshake triggers once',()=>{const d=new Handshake(),c=consent();assert.equal(d.step(0,c,...hands(0)),false);assert.equal(d.step(.81,c,...hands(.81)),true);assert.equal(d.step(1.7,c,...hands(1.7)),false);});
for(const [name,modify] of [
 ['one-sided consent',(c,a,b)=>{c.yesB=false;}],
 ['cancelled request',(c,a,b)=>{c.cancelled=true;}],
 ['same participant',(c,a,b)=>{b.id='A';}],
 ['untracked hand',(c,a,b)=>{b.tracked=false;}],
 ['far hands',(c,a,b)=>{b.palm=[90,0,0];}],
 ['far people',(c,a,b)=>{b.head=[400,0,0];}],
 ['wrong palm orientation',(c,a,b)=>{b.normal=[1,0,0];}],
 ['expired request',(c,a,b)=>{c.expires=-1;}],
])check('Reject '+name,()=>{const d=new Handshake(),c=consent();for(const t of [0,1]){const h=hands(t);modify(c,...h);assert.equal(d.step(t,c,...h),false);}});
check('Stale hand prevents completion',()=>{const d=new Handshake(),c=consent();assert.equal(d.step(0,c,...hands(0)),false);assert.equal(d.step(1,c,...hands(0)),false);});
check('Separation unlocks subsequent transaction',()=>{const d=new Handshake(),c=consent();d.step(0,c,...hands(0));assert.equal(d.step(1,c,...hands(1)),true);const h=hands(2);h[1].palm=[40,0,0];d.step(2,c,...h);c.nonce='test2';assert.equal(d.step(3,c,...hands(3)),false);assert.equal(d.step(4,c,...hands(4)),true);});

const clone=x=>JSON.parse(JSON.stringify(x));
function tx(){return {...consent(),catalogue:CATALOGUE_VERSION,species:0,users:['userA','userB'],serials:[1,1],snapshots:[{species:0,count:1,serial:1},{species:0,count:1,serial:1}],coordinator:'A',remaining:30,result:[2,3],resolvedAt:2,acks:[]};}
function pose(){return {catalogue:CATALOGUE_VERSION,hand:hands(0)[0],species:0,count:1,serial:1,companion:[20,0,-60],rotation:[1,0,0,0]};}
check('Pose trusts envelope identity and local receipt time only',()=>{const p=pose();p.hand.id='spoof';p.hand.received=-999;const v=parsePose(p,'real',10);assert.equal(v.hand.id,'real');assert.equal(v.hand.received,10);assert.equal(p.hand.id,'spoof');});
for(const [name,mutate] of [
 ['short palm',p=>p.hand.palm=[0,0]],['long head',p=>p.hand.head=[0,0,0,0]],['NaN palm',p=>p.hand.palm[0]=NaN],['infinite head',p=>p.hand.head[0]=Infinity],['unbounded coordinates',p=>p.hand.head[0]=100001],['nonboolean tracked',p=>p.hand.tracked=1],['negative sequence',p=>p.hand.seq=-1],['fractional sequence',p=>p.hand.seq=.1],['unsafe sequence',p=>p.hand.seq=Number.MAX_SAFE_INTEGER+1],['zero tracked normal',p=>p.hand.normal=[0,0,0]],['nonnormalized normal',p=>p.hand.normal=[1,1,1]],['invalid count',p=>p.count=0],['count exceeds serial',p=>p.count=2],['bad serial',p=>p.serial=NaN],['bad species',p=>p.species=4],['short quaternion',p=>p.rotation=[1,0,0]],['zero quaternion',p=>p.rotation=[0,0,0,0]],['invalid companion',p=>p.companion[0]=Infinity]
])check('Pose rejects '+name,()=>{const p=pose();mutate(p);assert.equal(parsePose(p,'A',0),null);});
check('Replay and reordered pose sequences rejected',()=>{assert.equal(parsePose(pose(),'A',0,1),null);assert.equal(parsePose(pose(),'A',0,2),null);});
check('Untracked sample may carry zero normal, detector still refuses it',()=>{const p=pose();p.hand.tracked=false;p.hand.normal=[0,0,0];assert.ok(parsePose(p,'A',0));const d=new Handshake();assert.equal(d.step(0,consent(),p.hand,hands(0)[1]),false);});
check('Future timestamps cannot build dwell or unlock latch',()=>{const d=new Handshake(),c=consent();assert.equal(d.step(0,c,...hands(2)),false);assert.equal(d.step(1,c,...hands(2)),false);});
check('Exact expiry refuses handshake',()=>{const d=new Handshake(),c=consent();c.expires=1;d.step(0,c,...hands(0));assert.equal(d.step(1,c,...hands(1)),false);});
check('Malformed consent cannot reward',()=>{const c=consent();c.yesA=1;const d=new Handshake();assert.equal(d.step(0,c,...hands(0)),false);assert.equal(d.step(1,c,...hands(1)),false);});
check('Cancellation reset does not clear held-hand latch',()=>{const d=new Handshake(),c=consent();d.step(0,c,...hands(0));assert.ok(d.step(1,c,...hands(1)));d.reset();c.nonce='next';d.step(2,c,...hands(2));assert.equal(d.step(3,c,...hands(3)),false);});
for(const [name,mutate] of [['zero serial',p=>p.serial=0],['unsafe count',p=>p.counts[0]=Number.MAX_SAFE_INTEGER+1],['serial/count mismatch',p=>p.serial=2],['duplicate commits',p=>{p.serial=3;p.counts[0]=3;p.commits=['same','same'];}],['empty commit',p=>{p.serial=2;p.counts[0]=2;p.commits=[''];}]])check('Profile rejects '+name,()=>{const p=initial(rng(0));mutate(p);assert.equal(decode(JSON.stringify(p)),null);});
check('Malformed weights rejected',()=>{for(const w of [[1],[80,18,NaN],[80,18,Infinity],[-1,1,1],[0,0,0],[80,18,1.9,.1]])assert.throws(()=>draw(rng(0),w));});
check('Nonfinite random samples rejected',()=>{assert.throws(()=>draw(()=>NaN));assert.throws(()=>draw(()=>Infinity));});
check('Valid transaction yields independent A and B rewards',()=>{const t=tx(),a=initial(rng(0)),b=initial(rng(0));assert.ok(validTransaction(t));assert.equal(commitTransaction(a,t,'userA'),'committed');assert.equal(commitTransaction(b,t,'userB'),'committed');assert.equal(a.active,2);assert.equal(b.active,3);assert.equal(a.counts[0],1);assert.equal(b.counts[0],1);});
check('Durable restart replay returns duplicate without mutation',()=>{const p=initial(rng(0)),t=tx();commitTransaction(p,t,'userA');const restarted=decode(JSON.stringify(p)),before=JSON.stringify(restarted);assert.equal(commitTransaction(restarted,t,'userA'),'duplicate');assert.equal(JSON.stringify(restarted),before);});
for(const [name,mutate] of [['changed serial',t=>t.snapshots[0].serial=2],['changed species',t=>t.snapshots[0].species=1],['changed count',t=>{t.snapshots[0].count=2;t.snapshots[0].serial=2;t.serials[0]=2;}],['cancelled',t=>t.cancelled=true],['one-sided',t=>t.yesB=false],['same user',t=>t.users[1]='userA'],['same connection',t=>t.b=t.a],['invalid result',t=>t.result[1]=4],['missing timing',t=>delete t.resolvedAt],['extra outcome',t=>t.result.push(1)],['unexpected ack',t=>t.acks=['stranger']]])check('Transaction rejects '+name+' without mutation',()=>{const p=initial(rng(0)),before=JSON.stringify(p),t=tx();mutate(t);assert.equal(commitTransaction(p,t,'userA'),'rejected');assert.equal(JSON.stringify(p),before);});
check('Nonparticipant cannot acquire',()=>{const p=initial(rng(0));assert.equal(commitTransaction(p,tx(),'stranger'),'rejected');assert.equal(p.serial,1);});
check('Changed local snapshot cannot acknowledge or acquire',()=>{const p=initial(rng(0));commit(p,'other',0);assert.equal(commitTransaction(p,tx(),'userA'),'rejected');assert.equal(p.serial,2);});
check('Snapshot compares count as well as species and serial',()=>assert.equal(matchesSnapshot({species:0,serial:2,count:1},{species:0,serial:2,count:2}),false));
check('Ledger validates complete shape before replacing existing state',()=>{for(const raw of ['{bad','{}','[null]',JSON.stringify([tx(),tx()])])assert.equal(decodeLedger(raw),null);});
for(const [name,mutate] of [['result rewrite',t=>t.result[0]=1],['identity rewrite',t=>t.users[0]='other'],['snapshot rewrite',t=>{t.snapshots[0].serial=2;t.serials[0]=2;}],['timestamp rewrite',t=>t.resolvedAt=3],['consent rollback',t=>{delete t.result;delete t.resolvedAt;t.yesB=false;}]])check('Ledger prevents '+name,()=>{const old=tx(),next=clone(old);mutate(next);assert.equal(decodeLedger(JSON.stringify([next]),[old]),null);});
check('Ledger cannot lose unacknowledged transactions',()=>assert.equal(decodeLedger('[]',[tx()]),null));
check('Acknowledgements monotonic, duplicate ack rejected',()=>{const old=tx();old.acks=['userA'];const next=clone(old);next.acks=[];assert.equal(decodeLedger(JSON.stringify([next]),[old]),null);next.acks=['userA','userA'];assert.equal(decodeLedger(JSON.stringify([next])),null);next.acks=['userA','userB'];assert.ok(decodeLedger(JSON.stringify([next]),[old]));});
check('Cancelled request cannot resurrect',()=>{const old=tx();delete old.result;delete old.resolvedAt;old.cancelled=true;const next=clone(old);next.cancelled=false;assert.equal(decodeLedger(JSON.stringify([next]),[old]),null);});
check('Ledger rejects over-capacity rather than dropping history',()=>{const all=Array.from({length:129},(_,i)=>({...tx(),nonce:'t'+i}));assert.equal(decodeLedger(JSON.stringify(all)),null);});

check('New coordinator requires observed separation before handshake',()=>{const d=new Handshake(),c=consent();d.requireSeparation();d.step(0,c,...hands(0));assert.equal(d.step(1,c,...hands(1)),false);const h=hands(2);h[1].palm=[40,0,0];d.step(2,null,...h);d.step(3,c,...hands(3));assert.equal(d.step(4,c,...hands(4)),true);});
check('Ledger cannot reorder historical transactions',()=>{const a=tx(),b=tx();b.nonce='second';assert.equal(decodeLedger(JSON.stringify([b,a]),[a,b]),null);});
check('Ledger rejects concurrent unresolved requests',()=>{const a=tx();delete a.result;delete a.resolvedAt;const b=clone(a);b.nonce='second';assert.equal(decodeLedger(JSON.stringify([a,b])),null);});
check('Owner remaining time cannot increase across updates',()=>{const a=tx();a.remaining=10;const b=clone(a);b.remaining=11;assert.equal(decodeLedger(JSON.stringify([b]),[a]),null);});
check('Animation age is bounded and cannot rewind',()=>{const a=tx();a.animationAge=2;const b=clone(a);b.animationAge=1;assert.equal(decodeLedger(JSON.stringify([b]),[a]),null);b.animationAge=5;assert.equal(decodeLedger(JSON.stringify([b])),null);b.animationAge=3;assert.ok(decodeLedger(JSON.stringify([b]),[a]));});
check('Oversize ledger rejected without parsing into app state',()=>assert.equal(decodeLedger(' '.repeat(200001)),null));

check('Resolution at or after expiry is not a valid transaction',()=>{for(const time of [30,31]){const t=tx();t.resolvedAt=time;assert.equal(validTransaction(t),false);assert.equal(commitTransaction(initial(rng(0)),t,'userA'),'rejected');}});
check('Sparse pose vectors are rejected',()=>{const p=pose();p.companion=Array(3);assert.equal(parsePose(p,'A',0),null);});
check('Same-participant samples cannot release handshake latch',()=>{const d=new Handshake(),c=consent();d.requireSeparation();const h=hands(0);h[1].id='A';h[1].palm=[40,0,0];d.step(0,null,...h);d.step(1,c,...hands(1));assert.equal(d.step(2,c,...hands(2)),false);});
check('Exact ordered catalogue and separate featured pair',()=>{assert.deepEqual(IDS,['gentle','detective','princess','queen']);assert.deepEqual(NAMES,['Gentle MegaNeko','Detective MegaNeko','Princess MegaNeko','Queen MegaNeko']);assert.deepEqual(FEATURED_IDS,['detective','princess']);assert.equal(PAGE_COUNT,1);assert.equal(IDS.slice(4,8).length,0);});
check('Deterministic probability integration gives 40/40/18/2 percent',()=>{const counts=IDS.map(()=>0);for(let i=0;i<10000;i++)for(let j=0;j<6;j++)counts[draw(rng((i+.5)/10000,(j+.5)/6))]++;assert.deepEqual(counts,[24000,24000,10800,1200]);});
check('Legacy profiles are rejected without reinterpretation',()=>{const p=initial(rng(0));for(const old of [{...p,version:1},{...p,catalogue:'legacy'},{...p,catalogue:'seven-20261107',counts:[1,0,0,0,0,0,0]},{...p,counts:Array(20).fill(0)},{...p,active:7}]){const raw=JSON.stringify(old);assert.equal(decode(raw),null);assert.equal(JSON.stringify(old),raw);}});
check('Legacy pose and ledger packets refused even with in-range indices',()=>{const p=pose(),t=tx();delete p.catalogue;delete t.catalogue;assert.equal(parsePose(p,'A',0),null);assert.equal(decodeLedger(JSON.stringify([t])),null);p.catalogue='old';t.catalogue='old';assert.equal(parsePose(p,'A',0),null);assert.equal(commitTransaction(initial(rng(0)),t,'userA'),'rejected');});
check('All storage modes have separate four namespaces',()=>{assert.equal(new Set(Object.values(PROFILE_KEYS)).size,4);assert.ok(Object.values(PROFILE_KEYS).every(k=>k.includes('_four_')));});
check('One-page view bounds reject invalid pages and slots',()=>{assert.deepEqual([0,1,2,3].map(i=>catalogueIndex(0,i)),[0,1,2,3]);for(const [p,s] of [[0,4],[1,0],[-1,0],[0,-1],[0,.5],[NaN,0]])assert.equal(catalogueIndex(p,s),-1);});
console.log(JSON.stringify({scope:'Standalone pure-rule tests only; NOT Lens compile, LEAF, UI, sync or hardware validation',passed:results.filter(x=>x.pass).length,total:results.length,results},null,2));
if(results.some(x=>!x.pass))process.exitCode=1;
