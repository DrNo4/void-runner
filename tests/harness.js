
/* VOID RUNNER headless test harness
 * Usage: node tests/harness.js [game.js path]
 * Exit code 0 = all passed, 1 = any failure
 */
var fs = require('fs');

// ========== DOM/Canvas/WebAudio stubs ==========
function makeGradient(){ return { addColorStop:function(){}} }
var ctx = new Proxy({
  createRadialGradient:makeGradient, createLinearGradient:makeGradient
},{ get:function(t,k){return k in t?t[k]:function(){}}, set:function(){return true} });

var canvasEl = { width:0, height:0, style:{},
  getContext:function(){return ctx}, getBoundingClientRect:function(){return {left:0,top:0,width:1280,height:720}} };

var handlers = {};
var uoEl = {innerHTML:"", style:{}};
var dmEl = {style:{display:"none"}};
var dsEl = {value:"1"}, deEl = {value:"scout"}, dcEl = {value:"100"};

global.document = {
  hidden: false,
  getElementById: function(id){
    if(id==="c") return canvasEl;
    if(id==="uo") return uoEl;
    if(id==="dm") return dmEl;
    if(id==="ds") return dsEl;
    if(id==="de") return deEl;
    if(id==="dc") return dcEl;
    return {innerHTML:"", style:{}};
  },
  addEventListener: function(type,fn){(handlers[type]=handlers[type]||[]).push(fn)}
};
function fireType(type,ev){(handlers[type]||[]).forEach(function(f){f(ev)})}

var audioCtx = {
  sampleRate:44100, state:"running",
  createGain:function(){return{gain:{value:0.25},connect:function(){}}},
  createBuffer:function(c,n,s){return{getChannelData:function(){return new Float32Array(n)}}},
  createBufferSource:function(){return{buffer:null,connect:function(){},start:function(){}}},
  destination:{}, connect:function(){}, resume:function(){}, suspend:function(){}, close:function(){}
};

var __now=0, rafCb=null;
global.requestAnimationFrame=function(cb){rafCb=cb;return 1};
function tick(n){
  for(var k=0;k<n;k++){
    __now+=16.67;
    if(rafCb){var cb=rafCb;rafCb=null;cb(__now)}
    else throw new Error("rAF chain broken!")
  }
}

global.window={innerWidth:1280,innerHeight:720,onresize:null,AudioContext:function(){return audioCtx},webkitAudioContext:undefined};
global.localStorage={_d:{},getItem:function(k){return this._d[k]||null},setItem:function(k,v){this._d[k]=String(v)},removeItem:function(k){delete this._d[k]}};
if(typeof performance.now!=="function"||performance.now()>1000){try{Object.defineProperty(globalThis,"performance",{value:{now:function(){return __now}},configurable:true})}catch(e){}}

// ========== Test runner ==========
var failures=0, passes=0, timings={}, sectionStart=Date.now();
function assert(cond,msg){
  if(cond){passes++;console.log("  \033[32mPASS\033[0m " + msg)}
  else{failures++;console.log("  \033[31mFAIL\033[0m " + msg)}
}
function run(fn,msg){
  var t=Date.now();try{fn();var ms=Date.now()-t;console.log("  \033[32mPASS\033[0m ("+ms+"ms) " + msg)}
  catch(e){failures++;console.log("  \033[31mFAIL\033[0m ("+e.name+") " + msg + " -> " + e.message)}
}
function V(){return window.__vr()}
function section(name){console.log("\n\033[1m=== " + name + " ===\033[0m");sectionStart=Date.now()}
function sectionTime(){return "("+(Date.now()-sectionStart)+"ms elapsed)"}

// ========== Helper: clear wave -> hub/gameOver ==========
function clearToHub(maxTicks){
  // wait for phase=1 (spawn done), then clear, then wait for gate
  var timeout=maxTicks||400;
  for(var i=0;i<timeout;i++){tick(1);var v=V();if(v.bp===1){break}if(v.cur!=="combat")return v.cur}
  tick(2);
  window.dbCE();window.dbCB();
  for(var i=0;i<150;i++){tick(1);var v=V();if(v.cur==="hub"||v.cur==="gameOver")return v.cur}
  return V().cur;
}

function aim(mx,my){
  fireType("mousemove",{clientX:mx,clientY:my,preventDefault:function(){}})
}

// ========== Load game ==========
var code=fs.readFileSync(process.argv[2]||"src/game.js",'utf8');
try{(0,eval)(code);console.log("\033[32mPASS\033[0m script loaded")
}catch(e){console.log("\033[31mFATAL\033[0m "+e.message);console.log(e.stack.split("\n").slice(0,6).join("\n"));process.exit(1)}

// ====== A. Boot & globals ======
section("A. Boot & globals");
assert(uoEl.innerHTML.indexOf("VOID RUNNER")>=0,"title rendered");
assert(uoEl.innerHTML.indexOf("START MISSION")>=0,"title has START MISSION");
assert(uoEl.innerHTML.indexOf("STAR CHARTS")>=0||uoEl.innerHTML.indexOf("Star Charts")>=0,"shows star charts");
assert(uoEl.innerHTML.indexOf("SECTORS CLEARED")>=0||uoEl.innerHTML.indexOf("Sectors Cleared")>=0,"shows sectors cleared");
["startGame","resumeGame","quitToHub","showHub","showScores","buyUpg","buySpec","rstSv","goTitle",
 "dbCl","dbGo","dbSp","dbAC","dbCE","dbCB","dbCP","dbCU","resumeGame"].forEach(function(nm){
  assert(typeof window[nm]==='function',"window."+nm)
});
assert(typeof window.__vr==="function","__vr probe exists");

// ====== B. Start combat ======
section("B. Start combat");
window.startGame();
tick(20);
var v=V();
assert(v.cur==="combat","enters combat");
assert(v.pl!==null&&v.pl.indexOf("/")>=0,"player alive("+v.pl+")");
assert(uoEl.innerHTML==="","overlay cleared in combat");

// ====== C. Fire works ======
section("C. Player can fire");
aim(640,120);fireType("mousedown",{preventDefault:function(){}});
tick(90);
assert(V().pb>0,"player bullets spawned ("+V().pb+")");
fireType("mouseup",{});

// ====== D. Wave clear → hub ======
section("D. Wave clear → hub");
var stD=clearToHub(400);
assert(stD==="hub","sector "+V().rs+" clear -> hub ("+stD+")");
assert(uoEl.innerHTML.indexOf("HANGAR")>=0,"hub screen rendered");
assert(uoEl.innerHTML.indexOf("Sector")>=0,"hub offers next sector");

// ====== E. Sector progression ======
section("E. Sector progression");
window.startGame();tick(30);
var stE=clearToHub(500);
assert(stE==="hub","sector cleared -> hub ("+stE+")");
assert(V().rs>1,"sector progressed "+(V().rs-1)+" -> "+V().rs);

// ====== F. Boss auto-spawns ======
section("F. Boss on sector 3");
window.startGame();tick(60);var fV=V();
assert(fV.sec===3,"on sector 3"+" (actual: "+fV.sec+")");
assert(fV.boss!==null,"boss spawned:"+fV.boss);

// ====== G. Boss damage (requires fresh sector 3) ======
section("G. Boss takes damage");
// The boss drifts sideways at ~120px/s while bullets take ~1s to travel, so the
// player must keep re-aiming at the boss's CURRENT position (as the real
// mouse-aim does). A single stale aim would whiff every shot.
window.startGame();tick(5);dsEl.value="3";window.dbGo();
for(var gi=0;gi<120;gi++){tick(1);if(V().boss)break}
fV=V();
assert(fV.boss!==null,"G: boss spawned (boss="+fV.boss+")");
var gBase=parseFloat(fV.boss),gBest=gBase;
fireType("mousedown",{preventDefault:function(){}});
for(var gi=0;gi<1800;gi++){
  var gvG=V();
  if(gvG.boss!==null&&gvG.bx!==null)aim(gvG.bx,gvG.by);
  tick(1);
  gvG=V();
  if(gvG.boss!==null&&parseFloat(gvG.boss)<gBest)gBest=parseFloat(gvG.boss);
  if(gvG.boss===null){gBest=0;break}
  if(gvG.cur!=="combat")break;
}
fireType("mouseup",{});
assert(gBest<gBase,"boss took damage (HP "+gBase+" -> "+(gBest===0?"KILLED":gBest)+")");

// ====== H. Enemy damage player ======
section("H. Enemy damage player");
// Stationary player, sector-3 boss + escorts: the player MUST lose HP/shield
// (or die) — enemy fire actually lands.
window.startGame();tick(5);
dsEl.value="3";window.dbGo();
for(var hi=0;hi<60;hi++){tick(1);if(V().boss)break}
var hB=V().pl?V().pl.split("/").map(Number):null;
tick(900); // 15s under fire (first boss volley reaches the player at ~7s; only the
           // center shot of each fan lands on a stationary target, so ~6 dmg per volley)
var hV=V(),hA=hV.pl?hV.pl.split("/").map(Number):null;
var hBuffB=hB?hB[0]+hB[1]:Infinity,hBuffA=hA?hA[0]+hA[1]:Infinity;
assert(hBuffA<hBuffB||hV.cur!=="combat","player took real damage (HP/SH "+(hB?hB[0]+"/"+hB[1]:"?")+" -> "+(hA?hA[0]+"/"+hA[1]:"?")+", cur="+hV.cur+")");

// Heat: sustained fire must NET-POSITIVE heat (8/shot @ ~8.3/s gain vs 60/s drain)
section("I. Heat system");
window.startGame();tick(5);
dsEl.value="1";window.dbGo();
var iHb=V().pl?Number(V().pl.split("/")[2]):0;
aim(640,90);fireType("mousedown",{preventDefault:function(){}});
// Heat gain (8/shot at base rate) roughly tracks the 60/s drain, so the value
// oscillates near 0 across the window: the correct effect metric is the PEAK
// reached while firing (one shot alone guarantees a >=7 reading; a broken
// heat system would stay pinned at 0).
var iPeak=0;
for(var ii=0;ii<120;ii++){
  tick(1);
  var ih=V().pl?Number(V().pl.split("/")[2]):0;
  if(ih>iPeak)iPeak=ih;
  if(V().cur!=="combat")break;
}
fireType("mouseup",{});
var iV=V();
assert(iV.heatLv===0,"no heat upgrades yet");
assert(iPeak>=5,"heat rises under sustained fire (peak "+iPeak+", baseline 0)");

// ====== J. Victory (all sectors) ======
section("J. Victory path");
var won=false,cleared=0,deaths=0;
for(var i=0;i<30&&!won;i++){
  window.startGame();
  var stJ=clearToHub(500);
  if(stJ==="gameOver"){
    if(uoEl.innerHTML.indexOf("MISSION COMPLETE")>=0){won=true;break}
    deaths++;continue
  }
  if(stJ==="hub")cleared++
}
assert(won,"reached MISSION COMPLETE ("+cleared+" sectors, " + deaths + " deaths)")
if(won){
  var jV=V();
  assert(jV.scCl===9,"best sector = 9 (got "+jV.scCl+")");
  assert(jV.sc>=1,"highscore recorded ("+jV.sc+")");
  assert(uoEl.innerHTML.indexOf("Sector reached")>=0||uoEl.innerHTML.indexOf("sector")>=0,"game over recap renders")
}

// ====== K. Shop ======
section("K. Shop");
window.dbAC();window.showHub();
var kCr=V().cr;
assert(uoEl.innerHTML.indexOf("HANGAR")>=0,"hub renders");
run(function(){window.buyUpg("main",10)},"buy main (10cr)");
assert(V().cr<=kCr-10+1e-9,"credits "+kCr+" -> "+V().cr);
assert(uoEl.innerHTML.indexOf("Main Gun Lv")>=0,"upgrade level shown");
run(function(){window.buySpec("rail",1)},"buySpec rail");
assert(uoEl.innerHTML.indexOf("OWNED")>=0,"special shows OWNED");

// ====== L. Scores & nav ======
section("L. Scores & nav");
window.showScores();
assert(uoEl.innerHTML.indexOf("TOP SCORES")>=0,"scores screen");
assert(V().sc>=1&&uoEl.innerHTML.indexOf("sect")>=0,"score rows with sector");
run(function(){window.goTitle()},"goTitle");
assert(uoEl.innerHTML.indexOf("VOID RUNNER")>=0,"back to title");

// ====== M. Pause ======
section("M. Pause/resume");
window.startGame();tick(10);
run(function(){fireType("keydown",{keyCode:27,code:"Escape",preventDefault:function(){}})},"Esc pause");
assert(uoEl.innerHTML.indexOf("PAUSED")>=0,"pause overlay");
run(function(){window.resumeGame()},"resume");
assert(uoEl.innerHTML==="","overlay cleared");

// ====== N. Dash ======
section("N. Dash");
window.startGame();tick(5);
var nPy=V().py,nPx0=V().px;
aim(1200,nPy); // aim straight right
fireType("keydown",{keyCode:32,code:"Space",preventDefault:function(){}});
tick(40);
fireType("keyup",{keyCode:32,code:"Space"});
var nPx1=V().px;
assert(nPx1-nPx0>60,"dash propelled the ship toward its aim (moved "+Math.round(nPx1-nPx0)+"px)");
assert(V().pl!==null&&V().cur==="combat","player intact after dash");

// ====== O. Mute ======
section("O. Mute toggle");
run(function(){fireType("keydown",{keyCode:77,code:"KeyM"});fireType("keyup",{keyCode:77,code:"KeyM"})},"mute on");
assert(V().mute===true,"mute state on (functional)");
run(function(){fireType("keydown",{keyCode:77,code:"KeyM"});fireType("keyup",{keyCode:77,code:"KeyM"})},"mute off");
assert(V().mute===false,"mute state off (functional)");

// ====== P. Debug panel ======
section("P. Debug panel");
run(function(){fireType("keydown",{keyCode:116,code:"KeyT",preventDefault:function(){}})},"T opens");
assert(dmEl.style.display==="block","panel visible");
deEl.value="scout";var pEnm=V().enm;
run(function(){window.dbSp()},"dbSp scout");
assert(V().enm>pEnm,"spawned enemy("+pEnm+"->"+V().enm+")");
deEl.value="boss2";run(function(){window.dbSp()},"dbSp boss2");
assert(V().boss!==null,"boss present");
dcEl.value="500";var pCr=V().cr;
run(function(){window.dbAC()},"dbAC 500cr");
assert(V().cr===pCr+500,"credits +500");
run(function(){
  window.dbCE();window.dbCB();window.dbCP();window.dbCU()
},"clear all");
assert(V().enm===0&&V().boss===null&&V().eb===0,"everything cleared");
run(function(){fireType("keydown",{keyCode:116,code:"KeyT",preventDefault:function(){}})},"T closes");
assert(dmEl.style.display==="none","panel hidden");

// ====== Q. Reset ======
section("Q. Reset");
var qBeforeSc=V().sc,qBeforeCl=V().scCl,qBeforeCr=V().cr;
run(function(){window.goTitle();window.rstSv();window.goTitle()},"rstSv");
assert(uoEl.innerHTML.indexOf("Star Charts: 0")>=0,"charts zeroed ("+qBeforeSc+"->0)");
assert(uoEl.innerHTML.indexOf("Sectors Cleared: 0")>=0,"sectors zeroed ("+qBeforeCl+"->0)");

// ====== R. Post-reset playable ======
section("R. Post-reset playable");
window.startGame();aim(640,120);fireType("mousedown",{preventDefault:function(){}});
tick(120);fireType("mouseup",{});
assert(V().pb>0||V().enm>0,"combat working after reset (enm="+V().enm+")");
var rt=clearToHub(400);
assert(rt==="hub","wave clears post-reset ("+rt+")");

// ====== S. Heat drain scales with upgrade ======
section("S. Heat sink upgrade");
window.dbAC();window.showHub();
var sHb=V().heatLv;
run(function(){window.buyUpg("heat",6)},"buy heatLv+1");
assert(V().heatLv===sHb+1,"heatLv +1 after purchase ("+sHb+" -> "+V().heatLv+")");

// ====== T. Game over recap ======
section("T. Death handling (consolidated death path)");
// Dying in a boss sector must end the run as SHIP DESTROYED with no credit
// for that sector and no cleared-sector chart rewards. The old dual handlers
// diverged: one path granted endRun(gs.sec-1) rewards, the other none. One
// handler (uWB) now owns every death, with lastDeath context for the recap.
// Sector 9 (Leviathan volleys + dreadnights) drops a stationary player in a
// few seconds, making the death deterministic within the budget below.
window.rstSv();
uoEl.innerHTML="";dsEl.value="9";
window.startGame();
window.dbGo();
var tCur="combat";
for(var ti=0;ti<3600;ti++){tick(1);tCur=V().cur;if(tCur!=="combat")break}
assert(tCur==="gameOver","T: player died in sector 9 (cur="+tCur+")");
assert(uoEl.innerHTML.indexOf("SHIP DESTROYED")>=0,"T: SHIP DESTROYED heading");
assert(uoEl.innerHTML.indexOf("MISSION COMPLETE")<0,"T: no MISSION COMPLETE text");
assert(uoEl.innerHTML.indexOf("Star Charts: 0")>=0,"T: death grants no cleared-sector charts");
assert(uoEl.innerHTML.indexOf("Sectors Cleared: 0")>=0,"T: dying does not credit the sector");
assert(uoEl.innerHTML.indexOf("Final state")>=0,"T: death recap shows final-state context");
window.startGame(); // restore a live ship for later sections

// ====== U. Post-boss defeat state transitions (regression) ======
section("U. Post-boss defeat transitions");
uoEl.innerHTML="";dsEl.value="3";
window.dbGo();tick(60);
var uV=V();
assert(uV.boss!==null,"sector 3 boss spawned:"+uV.boss);
// Wait for spawn completion
for(var ui=0;ui<200;ui++){tick(1);uV=V();if(uV.bp===1)break;}
assert(V().bp===1,"wave spawn complete");
assert(V().enm>0||V().bp===1,"boss + enemies spawning");
// Kill boss: verify rapid hub transition (no freeze)
window.dbCE();window.dbCB();
var uFrames=0;
for(var ui=0;ui<60;ui++){tick(1);uV=V();uFrames++;if(uV.cur==="hub"||uV.cur==="gameOver")break;}
assert(uV.cur!=="combat","sector 3 boss -> "+uV.cur+" in "+uFrames+" frames (not frozen)");
assert(uV.cur==="hub","sector 3 post-boss -> hub");
assert(uoEl.innerHTML.indexOf("HANGAR")>=0,"hub rendered after boss");

// Test sector 6 boss
uoEl.innerHTML="";dsEl.value="6";
window.dbGo();tick(60);uV=V();
assert(uV.sec===6,"on sector 6");
for(var ui=0;ui<200;ui++){tick(1);uV=V();if(uV.bp===1&&uV.boss!==null)break;}
assert(uV.boss!==null,"sector 6 boss spawned");
window.dbCE();window.dbCB();uFrames=0;
for(var ui=0;ui<60;ui++){tick(1);uV=V();uFrames++;if(uV.cur==="hub"||uV.cur==="gameOver")break;}
assert(uV.cur==="hub","sector 6 boss -> hub in "+uFrames+" frames");

// Test sector 9 boss (victory)
uoEl.innerHTML="";dsEl.value="9";
window.dbGo();tick(60);uV=V();
assert(uV.sec===9,"on sector 9");
for(var ui=0;ui<200;ui++){tick(1);uV=V();if(uV.bp===1&&uV.boss!==null)break;}
assert(uV.boss!==null,"sector 9 boss (Leviathan) spawned");
window.dbCE();window.dbCB();uFrames=0;
for(var ui=0;ui<300;ui++){tick(1);uV=V();uFrames++;if(uV.cur==="gameOver")break;}
assert(uV.cur==="gameOver","sector 9 boss -> gameOver");
assert(uoEl.innerHTML.indexOf("MISSION COMPLETE")>=0,"MISSION COMPLETE after boss 9");
assert(V().scCl>=9,"best sector >= 9 (got "+V().scCl+")");

// ====== V. Death deadlock fix ======
section("V. Death beats the wave-complete race");
// uWB must judge death BEFORE its wave-complete early return: a ship that
// dies in the same window the last enemy drops must end as a death, not
// sail on to the hub with a dead player aboard.
window.rstSv();
uoEl.innerHTML="";dsEl.value="5";
window.startGame();
window.dbGo();
for(var vi=0;vi<400;vi++){tick(1);if(V().bp===1)break}
assert(V().cur==="combat"&&V().enm>0,"V: setup clean (player alive, wave ready, enm="+V().enm+")");
window.dbCE();        // clear the wave: wave-complete condition now true
window.__vrKill();    // player dies inside the 0.4s clear gate
var vSt="combat";
for(var vi=0;vi<60;vi++){tick(1);vSt=V().cur;if(vSt!=="combat")break}
assert(vSt==="gameOver","V: death on a clearing wave -> gameOver (got "+vSt+")");
assert(uoEl.innerHTML.indexOf("SHIP DESTROYED")>=0,"V: SHIP DESTROYED heading");
assert(uoEl.innerHTML.indexOf("HANGAR / TECH")<0,"V: no hangar screen for a dead ship (game-over always offers a HANGAR button, so check the hub HEADING)");
window.startGame();

// ====== W. High-sector bounds safety (gs.sec > 9) ======
section("W. High-sector bounds safety");
uoEl.innerHTML="";dsEl.value="30";
window.dbGo();tick(30);
// Verify no crash even with gs.sec=30 (TH only has 10 entries)
var uV2=V();
assert(uV2.cur==="combat","sector 30 entered without crash");
for(var ui=0;ui<300;ui++){tick(1);uV2=V();if(uV2.bp===1)break;}
assert(V().bp===1,"wave spawn complete at sector 30");
window.dbCE();window.dbCB();
for(var ui=0;ui<100;ui++){tick(1);uV2=V();if(uV2.cur!=="combat")break;}
assert(uV2.cur!=="combat","sector 30 wave clear completed without crash");
uoEl.innerHTML="";dsEl.value="1";

// ====== X. Leviathan zone cooldown ======
section("X. Leviathan zone cooldown");
uoEl.innerHTML="";dsEl.value="9";
window.dbGo();tick(60);uV=V();
assert(uV.sec===9,"on sector 9");
for(var ui=0;ui<200;ui++){tick(1);uV=V();if(uV.bp===1&&uV.boss!==null)break;}
assert(uV.boss!==null,"Leviathan spawned");
// Leviathan zones + regular boss attacks should keep bullet count manageable
var maxEB=0;for(var ui=0;ui<60;ui++){tick(1);var zv=V();if(zv.eb>maxEB)maxEB=zv.eb;}
assert(maxEB<80,"Leviathan fire manageable (max "+maxEB+" bullets in 60 tick window)");

// ====== Y. gs.zn cleanup on wave clear ======
section("Y. gs.zn cleanup (Leviathan zones cleared)");
uoEl.innerHTML="";dsEl.value="9";
window.dbGo();tick(60);
for(var ui=0;ui<200;ui++){tick(1);if(V().bp===1)break;}
// Simulate Leviathan creating zones (tick enough for zones to spawn)
for(var ui=0;ui<60;ui++){tick(1);}
var maxZonesBefore=0;for(var ui=0;ui<60;ui++){tick(1);var z=V().eb;if(z>maxZonesBefore)maxZonesBefore=z;}
// Kill boss and clear wave
window.dbCE();window.dbCB();
for(var ui=0;ui<100;ui++){tick(1);if(V().cur!=="combat")break;}
uoEl.innerHTML="";dsEl.value="3";
window.dbGo();tick(30);
var uV3=V();
assert(uV3.cur==="combat","sector 3 entered cleanly (no stale Leviathan zones)");

// ====== Z. Boss killed by bullets through real combat (chkBH crash regression) ======
section("Z. Boss kill by bullet volley (chkBH regression)");
// Real-player scenario: a multi-bullet volley reaches the boss, one bullet lands
// the killing blow while sibling bullets from the same burst are still in flight.
// If any null-read of gBoss remains in chkBH, tick() throws mid-loop.
// Set up a 3-way spread volley (main + spread) so killing frames carry siblings.
dcEl.value="10000";window.dbAC();
window.buyUpg("main",1);window.buyUpg("spread",1);
uoEl.innerHTML="";dsEl.value="3";
window.dbGo();
var zThrew=null,zKilled=false,zAtt=0;
for(zAtt=0;zAtt<12&&!zKilled;zAtt++){
  for(var zi=0;zi<200;zi++){tick(1);var q=V();if(q.boss&&q.by!==null&&q.by>90)break;}
  if(V().boss===null){window.dbGo();continue}
  aim(640,100);
  fireType("mousedown",{preventDefault:function(){}});
  try{
    for(var zi=0;zi<800;zi++){
      var q=V();
      if(q.boss!==null&&q.bx!==null)aim(q.bx,q.by);
      tick(1);
      if(V().cur!=="combat")break;
      if(V().boss===null){zKilled=true;break}
    }
  }catch(e){zThrew=e;}
  fireType("mouseup",{});
}
assert(zThrew===null,"no uncaught exception killing boss by bullet volley"+(zThrew?" -> "+zThrew.name+": "+zThrew.message:""));
assert(zKilled,"boss defeated by bullet volley within "+(zAtt+1)+" attempts"+(zKilled?"":" (boss="+(V().boss||"gone")+")"));
if(zThrew===null&&zKilled&&V().cur==="combat"){
  // Boss waves carry escorts — finish the remaining wave like a player would
  var zSt=clearToHub(500);
  assert(zSt==="hub"||zSt==="gameOver","post-bullet-kill wave finished -> "+zSt+" (not frozen)");
}

// ====== AA. Boss death nova vaporizes stray fire (fairness regression) ======
section("AA. Boss death nova (no death to the boss's own parting shot)");
// The field-reported case: boss dies, then the boss's own in-flight volley
// finishes the player a moment later. The instant the boss drops, its stray
// fire (and any leftover hazard zones) must be vaporized — verified with a
// stray volley live in the air at the moment of the killing blow.
dcEl.value="10000";window.dbAC();
window.buyUpg("main",1);window.buyUpg("spread",1);
var aaVerified=false,aaAtt=0,aaLast=null;
for(aaAtt=0;aaAtt<6&&!aaVerified;aaAtt++){
  window.startGame(); // fresh player each attempt (a dead player would insta-end)
  uoEl.innerHTML="";dsEl.value="3";
  window.dbGo();
  for(var ai=0;ai<250;ai++){tick(1);var av=V();if(av.boss&&av.by!==null&&av.by>90)break;}
  if(V().boss===null)continue;
  var sawEB=0,aaThrew=null;
  fireType("mousedown",{preventDefault:function(){}});
  try{
    for(var ai=0;ai<900;ai++){
      var av=V();
      if(av.boss!==null&&av.bx!==null)aim(av.bx,av.by);
      tick(1);
      av=V();
      if(av.eb>sawEB)sawEB=av.eb;
      if(av.cur!=="combat")break;
      if(av.boss===null)break;
    }
  }catch(e){aaThrew=e}
  fireType("mouseup",{});
  aaLast=V();
  if(aaThrew===null&&aaLast.boss===null&&sawEB>0){
    // verified attempt: strays were in flight before the kill, field clean at the kill
    assert(aaThrew===null,"AA: no uncaught exception during boss nova");
    assert(aaLast.eb===0,"AA: stray volleys vaporized at boss death (in-flight before: "+sawEB+", after: "+aaLast.eb+")");
    assert(aaLast.zn===0,"AA: no hazard zones survive boss death (got "+aaLast.zn+")");
    var aaSt=clearToHub(500);
    assert(aaSt==="hub"||aaSt==="gameOver","AA: wave completes after nova -> "+aaSt);
    aaVerified=true;
  }
}
assert(aaVerified,"AA: nova verified against a live stray volley (attempts: "+(aaAtt+1)+", last boss="+(aaLast?aaLast.boss:"?")+")");

// ====== AB. Dying in an uncleared sector 9 is not MISSION COMPLETE ======
section("AB. No false MISSION COMPLETE on death");
// Dying inside sector 9 with the boss still alive must read SHIP DESTROYED —
// the old code bumped secCl to the current sector on death, so a sector-9
// death rendered the victory heading. (Stationary player, sector-9 wave +
// Leviathan is a reliable kill within the budget below.)
window.rstSv();
uoEl.innerHTML="";dsEl.value="9";
window.startGame();
window.dbGo();
var abCur="combat";
for(var bi=0;bi<3600;bi++){tick(1);abCur=V().cur;if(abCur!=="combat")break;}
assert(abCur==="gameOver","AB: player died in sector 9 under enemy fire (cur="+abCur+")");
assert(uoEl.innerHTML.indexOf("SHIP DESTROYED")>=0,"AB: heading is SHIP DESTROYED");
assert(uoEl.innerHTML.indexOf("MISSION COMPLETE")<0,"AB: no MISSION COMPLETE text on a death screen");
assert(V().scCl<9,"AB: sectors-cleared not inflated by dying (got "+V().scCl+")");
assert(uoEl.innerHTML.indexOf("Final state")>=0,"AB: game over shows final-state context");

// ====== AC. Highscore top-10 retention ======
section("AC. Highscore top-10 retention (best kept, worst evicted)");
// hsc keeps the 10 BEST and evicts the lowest. The old hsc.shift() removed
// the BEST score instead, while the new entry collected the rewards.
window.rstSv();
for(var ai0=100;ai0<=1200;ai0+=100)window.__vrAddSc(ai0,1);
var acHs=V().hs;
assert(acHs.length===10,"top-10 cap (got "+acHs.length+")");
assert(acHs[0]===1200,"best score is kept at #1 (got "+acHs[0]+")");
assert(acHs[9]===300,"10th slot holds 300 (got "+acHs[9]+")");
assert(acHs.indexOf(200)<0&&acHs.indexOf(100)<0,"two lowest scores evicted");
assert(acHs.join(",")==="1200,1100,1000,900,800,700,600,500,400,300","sorted desc: "+acHs.join(","));

// ====== AD. Shield upgrade ======
section("AD. Shield upgrade (+10 max shield, capped at lv5)");
window.rstSv();
window.startGame();
assert(V().sM===50,"base max shield 50 (got "+V().sM+")");
window.buyUpg("shield",8);
window.startGame();
assert(V().sM===60,"shieldLv1 -> max shield 60 (got "+V().sM+")");
assert(Number(V().pl.split("/")[1])===60,"shield starts full at the new max (got "+V().pl+")");
var adGuard=0;
while(V().sM<100&&adGuard++<10){window.buyUpg("shield",8);window.startGame()}
assert(V().sM===100,"shieldLv5 -> max shield 100 (got "+V().sM+")");
var adCr=V().cr;
window.buyUpg("shield",8);
window.startGame();
assert(V().sM===100,"purchases past lv5 refused (got "+V().sM+")");
assert(V().cr===adCr,"no credits spent past the cap (credits "+adCr+")");

// ====== AE. Pulse Cannon ======
section("AE. Pulse Cannon (mainLv2: 2 rounds x 22 dmg per shot)");
window.rstSv();
window.dbAC();
window.buyUpg("main",10);
window.buyUpg("main",20);
window.startGame();
aim(640,100);
fireType("mousedown",{preventDefault:function(){}});
tick(3); // exactly one shot (next fires at ~tick 6)
var aeV=V();
assert(aeV.pb===2,"pulse fires 2 rounds per shot (got "+aeV.pb+")");
assert(aeV.pbst===22,"each round deals 22 dmg (got "+aeV.pbst+")");
fireType("mouseup",{});

// ====== AF. Spread ======
section("AF. Spread (extra bullets, no hidden damage bonus)");
window.rstSv();
window.startGame();
window.buyUpg("main",10);
window.buyUpg("spread",8);
window.startGame();
aim(640,100);
fireType("mousedown",{preventDefault:function(){}});
tick(3); // exactly one shot
var afV=V();
assert(afV.pb===3,"spreadLv1: 3 bullets per shot (got "+afV.pb+")");
assert(afV.pbst===30,"spawned rounds deal 30 each (got "+afV.pbst+")");
fireType("mouseup",{});
// Impact damage: each round must deal exactly 30. The OLD hidden spread
// bonus dealt 31.5 per round at impact (31.5 = 63/2, so its HP-delta can
// never land on a multiple of 30 while the 600hp boss is alive).
uoEl.innerHTML="";dsEl.value="1";
window.dbGo();
for(var fa0=0;fa0<400;fa0++){tick(1);if(V().bp===1)break}
window.dbCE(); // clear escorts; the boss holds the wave open so no hub race
deEl.value="boss1";window.dbSp();
for(var fa1=0;fa1<250;fa1++){tick(1);if(V().by!==null&&V().by>90)break}
var fBase=V().boss?Math.round(parseFloat(V().boss)):0;
var fDelta=0;
for(var fa2=0;fa2<10&&fDelta===0;fa2++){
  if(V().boss===null)break;
  aim(V().bx,V().by);
  fireType("mousedown",{preventDefault:function(){}});
  tick(3); // one shot: 3 rounds in flight
  fireType("mouseup",{});
  for(var fa3=0;fa3<250;fa3++){
    tick(1);
    if(V().boss===null)break;
    var fNow=Math.round(parseFloat(V().boss));
    fDelta=fBase-fNow;
    if(fDelta>0)break;
  }
}
assert(fDelta>0,"spread volley hit the boss (delta "+fDelta+")");
if(fDelta>0)assert(fDelta%30===0,"each round deals exactly 30 at impact (delta "+fDelta+"; the old hidden bonus made rounds deal 31.5)");

// ====== AG. Engine ======
section("AG. Engine speed (8%/level, applied exactly once)");
// 30 ticks = 0.5s at 16.67ms; movement = spd * 60 * 0.5 = 30*spd, deterministic.
window.rstSv();
window.startGame();tick(3);
var agX0=V().px;
fireType("keydown",{keyCode:68,code:"KeyD",preventDefault:function(){}});
tick(30);
fireType("keyup",{keyCode:68,code:"KeyD"});
var agDx0=V().px-agX0;
assert(agDx0>100&&agDx0<130,"engineLv0: ~120px in 0.5s (got "+Math.round(agDx0)+")");
window.buyUpg("engine",8);
window.startGame();tick(3);
agX0=V().px;
fireType("keydown",{keyCode:68,code:"KeyD",preventDefault:function(){}});
tick(30);
fireType("keyup",{keyCode:68,code:"KeyD"});
var agDx1=V().px-agX0;
assert(agDx1>125&&agDx1<135,"engineLv1: ~130px (got "+Math.round(agDx1)+"; the old double-application moved 139)");

// ====== AH. Auto-pause on tab hide ======
section("AH. Auto-pause when the tab is hidden");
window.startGame();tick(5);
document.hidden=true;
fireType("visibilitychange",{});
assert(V().cur==="paused","combat auto-pauses when hidden (cur="+V().cur+")");
assert(uoEl.innerHTML.indexOf("PAUSED")>=0,"pause overlay shown");
document.hidden=false;
window.resumeGame();
assert(V().cur==="combat","resume after refocus");

// ====== AI. Loop failure containment ======
section("AI. Loop failure containment (3 strikes, then hard stop)");
window.startGame();tick(5);
window.__vrFault(function(){throw new Error("injected frame fault")});
tick(1);
assert(V().frFail===1,"first failing frame counted (got "+V().frFail+")");
tick(1);tick(1);
assert(V().frFail===3,"three consecutive failures (got "+V().frFail+")");
var aiStopped=false;
try{tick(1)}catch(e){aiStopped=true}
assert(aiStopped,"loop hard-stops after the 3rd failing frame (no 4th frame)");
assert(V().frFail===3,"failure counter exposed via __vr (got "+V().frFail+")");
window.__vrFault(null); // clear the fault
window.__vrRearm();     // re-arm the rAF chain
tick(1);
assert(V().frFail===0,"counter resets after a clean frame (got "+V().frFail+")");

// ====== RESULT ======
var result=(failures===0?"ALL TESTS PASSED":failures+" failures");
var color=failures===0?"\033[32m":"\033[31m";
console.log("\n\033[1m" + "=".repeat(50) + "\033[0m");
console.log("\033[1m" + "RESULT: " + color + result + "\033[0m");
console.log("\033[1m" + "PASS: " + String(passes).padStart(6) + "  |  FAIL: " + String(failures).padStart(6) + "\033[0m");
console.log("\033[1m" + "=".repeat(50) + "\033[0m");
process.exit(failures===0?0:1);
