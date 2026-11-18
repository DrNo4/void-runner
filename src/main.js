// ============================================================
// VOID RUNNER - Complete Game
// ============================================================
(function() {
'use strict';

// ============================================================
// CANVAS SETUP
// ============================================================
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var CW = 1280, CH = 720;
canvas.width = CW;
canvas.height = CH;

function resize() {
  try {
    var s = Math.min(window.innerWidth / CW, window.innerHeight / CH);
    canvas.style.width = (CW * s) + 'px';
    canvas.style.height = (CH * s) + 'px';
  } catch(e) {}
}
setTimeout(resize, 50);
window.onresize = resize;

// ============================================================
// CONSTANTS
// ============================================================
var MP = 800;
var ME = 14;
var MD = 0.05;
var CCW = 3;
var CXM = 5;
var CBL = 0.15;
var HM = 100;

var SCR = {
  scout: 100, swarmling: 40, raider: 200,
  cannon: 300, cruiser: 500, dreadnought: 1000, boss: 5000
};

// ============================================================
// THEMES
// ============================================================
var THEM = [null,
  {bg:"#1a0a2e",n1:"#3a1060",n2:"#25104a",ac:"#d050ff",nm:"Nebula Drift"},
  {bg:"#1e0c32",n1:"#481870",n2:"#2c1455",ac:"#d858ff",nm:"Nebula Drift"},
  {bg:"#220e38",n1:"#562080",n2:"#331760",ac:"#e060ff",nm:"Nebula Drift"},
  {bg:"#281c14",n1:"#655020",n2:"#453515",ac:"#d4a030",nm:"Asteroid Belt"},
  {bg:"#2c2018",n1:"#735e24",n2:"#4d3f19",ac:"#dca838",nm:"Asteroid Belt"},
  {bg:"#32261c",n1:"#806828",n2:"#58481d",ac:"#e4b040",nm:"Asteroid Belt"},
  {bg:"#08162a",n1:"#183c60",n2:"#102640",ac:"#40d0ff",nm:"Void Rift"},
  {bg:"#0c1a30",n1:"#1c4a72",n2:"#143250",ac:"#48d8ff",nm:"Void Rift"},
  {bg:"#102036",n1:"#246080",n2:"#1a4058",ac:"#50e0ff",nm:"Void Rift"},
  {bg:"#1a0a18",n1:"#402040",n2:"#2a1528",ac:"#ff8000",nm:"Deep Void"}
];

// ============================================================
// SAVE / LOAD
// ============================================================
var MT = {
  starCharts:0, hullLv:0, shieldLv:0, shieldRlv:0,
  engineLv:0, mainLv:0, sideLv:0, spreadLv:0,
  heatLv:0, repairLv:0, heatBv:0,
  rail:false, crit:false, tank:false, speed:false,
  startCr:0, wDmg:0, maxHpExtra:0, shieldExtra:0
};
var hsc = [];

function defM() { var o={}; for(var k in MT) o[k]=MT[k]; return o; }
function loadSV() {
  try {
    var raw=localStorage.getItem("vr_v1");
    if(raw){var o=JSON.parse(raw);for(var k in MT)if(o[k]!==undefined&&o[k]!==null)MT[k]=o[k]}
  }catch(e){}
  try{var o2=JSON.parse(localStorage.getItem("vr_v1"));hsc=o2.highscores||[]}catch(e){hsc=[]}
  if(MT.starCharts===undefined)MT=defM();
}
function saveSV() {
  try{var o={},k;for(k in MT)o[k]=MT[k];o.highscores=hsc;localStorage.setItem("vr_v1",JSON.stringify(o))}catch(e){}
}
function rstSV() {
  try{localStorage.removeItem("vr_v1")}catch(e){}
  MT=defM();hsc=[];saveSV();cur="title";bUI();
}
function addSc(score,sector){
  hsc.push({score:score,date:new Date().toLocaleDateString(),sector:sector||1});
  hsc.sort(function(a,b){return b.score-a.score});
  while(hsc.length>10)hsc.pop();saveSV();
}

loadSV();