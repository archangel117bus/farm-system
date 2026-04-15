import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ─── FRESHNESS WINDOWS ────────────────────────────────────────────────────────
const FW = {
  berry:{fresh:3,aging:5},greens:{fresh:4,aging:6},lettuce:{fresh:5,aging:7},
  herbs:{fresh:6,aging:9},microgreens:{fresh:5,aging:8},roots:{fresh:10,aging:16},
  brassicas:{fresh:6,aging:10},alliums:{fresh:7,aging:12},fruiting:{fresh:4,aging:6},
  squash:{fresh:7,aging:12},legumes:{fresh:4,aging:6},peppers:{fresh:7,aging:12},
  tomatoes:{fresh:4,aging:6},flowers:{fresh:4,aging:6},canned:{fresh:365,aging:540},
  pickled:{fresh:180,aging:360},jam:{fresh:180,aging:360},refrigerated:{fresh:14,aging:21},
};
const todayStr = () => new Date().toISOString().split("T")[0];
const daysOld  = d => Math.floor((new Date()-new Date(d))/86400000);
const getFreshness = (harvestedOn,type) => {
  if(!harvestedOn) return "unknown";
  const d=daysOld(harvestedOn),w=FW[type]||FW.greens;
  if(d>=w.aging) return "expired";
  if(d>=w.fresh) return "aging";
  if(d>=w.fresh*0.6) return "usefirst";
  return "fresh";
};
const FC={fresh:"#22c55e",usefirst:"#eab308",aging:"#f97316",expired:"#ef4444",unknown:"#94a3b8"};
const FL={fresh:"Fresh",usefirst:"Use First",aging:"Aging",expired:"Past Peak",unknown:"Not Set"};

const displayQty = item => {
  const q=item.qty||0;
  if(item.altSellUnit&&item.altSellRatio){
    const a=Math.floor(q/item.altSellRatio),r=q%item.altSellRatio;
    if(a>0&&r>0) return `${a} ${item.altSellUnit} + ${r} ${item.sellUnit}`;
    if(a>0) return `${a} ${item.altSellUnit}`;
    return `${r} ${item.sellUnit}`;
  }
  if(item.gramsPerPackage) return `${q} pkg (${(q*item.gramsPerPackage).toFixed(0)}g)`;
  return `${q} ${item.sellUnit}`;
};
const multiUnitDisplay = (item,qty) => {
  const q=qty??item.qty??0,parts=[];
  parts.push(`${q} ${item.sellUnit}${q!==1?"s":""}`);
  if(item.harvestUnit==="crate"&&item.harvestToSellRatio){
    const c=Math.floor(q/item.harvestToSellRatio),r=q%item.harvestToSellRatio;
    if(c>0) parts.push(`${c} crate${c!==1?"s":""}${r>0?` +${r}`:""}`);
  }
  if(item.altSellUnit&&item.altSellRatio){
    const a=Math.floor(q/item.altSellRatio),r=q%item.altSellRatio;
    if(a>0) parts.push(`${a} ${item.altSellUnit}${a!==1?"s":""}${r>0?` +${r}`:""}`);
  }
  return parts;
};
const harvestToQty=(item,crates,rem)=>{
  if(item.harvestUnit==="crate") return(parseInt(crates)||0)*(item.harvestToSellRatio||1)+(parseInt(rem)||0);
  return parseInt(crates)||0;
};
const getTotalQty=item=>Array.isArray(item.batches)?item.batches.reduce((s,b)=>s+(b.qty||0),0):item.qty||0;
const getBestFreshness=item=>{
  if(!Array.isArray(item.batches)||!item.batches.length) return "unknown";
  const order={fresh:0,usefirst:1,aging:2,expired:3,unknown:4};
  return item.batches.filter(b=>b.qty>0).map(b=>getFreshness(b.harvestedOn,item.freshnessType)).sort((a,b)=>order[a]-order[b])[0]||"unknown";
};
const migrateItems=items=>items.map(item=>{
  if(!Array.isArray(item.batches)){
    const batches=(item.qty>0)?[{id:Date.now()+item.id,qty:item.qty,harvestedOn:item.harvestedOn||todayStr(),stepsDone:[]}]:[];
    const{qty,harvestedOn,...rest}=item;
    return{...rest,batches};
  }
  return item;
});

// ─── SEED ITEMS ───────────────────────────────────────────────────────────────
const SEED_ITEMS=[
  {id:101,cat:"Berries",name:"Strawberries",price:7.00,emoji:"🍓",freshnessType:"berry",harvestUnit:"crate",harvestToSellRatio:20,sellUnit:"quart",altSellUnit:"flat",altSellRatio:8,batches:[],publicVisible:true,orderable:true},
  {id:102,cat:"Berries",name:"Blackberries",price:7.00,emoji:"🫐",freshnessType:"berry",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"pint",batches:[],publicVisible:true,orderable:true},
  {id:103,cat:"Berries",name:"Blueberries",price:6.67,emoji:"🫐",freshnessType:"berry",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"pint",batches:[],publicVisible:true,orderable:true},
  {id:104,cat:"Berries",name:"u-pic Blueberries",price:28.00,emoji:"🫐",freshnessType:"berry",harvestUnit:"gallon",harvestToSellRatio:1,sellUnit:"gallon",batches:[],publicVisible:true,orderable:false},
  {id:201,cat:"Greens",name:"Arugula",price:10.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:202,cat:"Greens",name:"Spinach",price:20.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:203,cat:"Greens",name:"Dino Kale",price:4.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:204,cat:"Greens",name:"Siberian Kale",price:4.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:205,cat:"Greens",name:"Red Russian Kale",price:4.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:206,cat:"Greens",name:"Swiss Chard",price:4.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:207,cat:"Greens",name:"Romaine Lettuce",price:3.00,emoji:"🥬",freshnessType:"lettuce",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:208,cat:"Greens",name:"Salanova Lettuce Mix",price:6.00,emoji:"🥗",freshnessType:"lettuce",harvestUnit:"bag",harvestToSellRatio:1,sellUnit:"bag",batches:[],publicVisible:true,orderable:true},
  {id:209,cat:"Greens",name:"Mustard Greens",price:4.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:210,cat:"Greens",name:"Collard Greens",price:4.00,emoji:"🥬",freshnessType:"greens",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:301,cat:"Vegetables",name:"Beets",price:4.00,emoji:"🫀",freshnessType:"roots",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:302,cat:"Vegetables",name:"Broccoli",price:8.00,emoji:"🥦",freshnessType:"brassicas",harvestUnit:"head",harvestToSellRatio:1,sellUnit:"head",batches:[],publicVisible:true,orderable:true},
  {id:303,cat:"Vegetables",name:"Cabbage",price:5.00,emoji:"🥬",freshnessType:"brassicas",harvestUnit:"head",harvestToSellRatio:1,sellUnit:"head",batches:[],publicVisible:true,orderable:true},
  {id:304,cat:"Vegetables",name:"Carrots",price:5.00,emoji:"🥕",freshnessType:"roots",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",workflowSteps:["Harvest","Wash","Trim","Sort","Weigh","Bundle"],batches:[],publicVisible:true,orderable:true},
  {id:305,cat:"Vegetables",name:"Cucumbers / English",price:2.00,emoji:"🥒",freshnessType:"fruiting",harvestUnit:"each",harvestToSellRatio:1,sellUnit:"each",batches:[],publicVisible:true,orderable:true},
  {id:306,cat:"Vegetables",name:"Eggplant",price:3.00,emoji:"🍆",freshnessType:"fruiting",harvestUnit:"each",harvestToSellRatio:1,sellUnit:"each",batches:[],publicVisible:true,orderable:false},
  {id:307,cat:"Vegetables",name:"Salad Turnips",price:4.00,emoji:"🟣",freshnessType:"roots",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:308,cat:"Vegetables",name:"Kohlrabi",price:3.00,emoji:"🫑",freshnessType:"brassicas",harvestUnit:"each",harvestToSellRatio:1,sellUnit:"each",batches:[],publicVisible:false,orderable:false},
  {id:309,cat:"Vegetables",name:"Radishes",price:2.00,emoji:"🔴",freshnessType:"roots",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:310,cat:"Vegetables",name:"Yellow Squash",price:3.00,emoji:"🟡",freshnessType:"squash",harvestUnit:"each",harvestToSellRatio:1,sellUnit:"each",batches:[],publicVisible:true,orderable:false},
  {id:311,cat:"Vegetables",name:"Zucchini",price:3.00,emoji:"🥒",freshnessType:"squash",harvestUnit:"each",harvestToSellRatio:1,sellUnit:"each",batches:[],publicVisible:true,orderable:false},
  {id:312,cat:"Vegetables",name:"Green Onions",price:4.00,emoji:"🌱",freshnessType:"alliums",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:313,cat:"Vegetables",name:"Leeks",price:1.00,emoji:"🌿",freshnessType:"alliums",harvestUnit:"each",harvestToSellRatio:1,sellUnit:"each",batches:[],publicVisible:false,orderable:false},
  {id:314,cat:"Vegetables",name:"Potatoes",price:2.00,emoji:"🥔",freshnessType:"roots",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:true},
  {id:315,cat:"Vegetables",name:"Purple Top Turnips",price:4.00,emoji:"🟣",freshnessType:"roots",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:316,cat:"Vegetables",name:"Green Beans",price:8.00,emoji:"🫘",freshnessType:"legumes",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:true},
  {id:317,cat:"Vegetables",name:"Okra",price:3.00,emoji:"🫘",freshnessType:"fruiting",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:true},
  {id:318,cat:"Vegetables",name:"Okra Sliced",price:5.00,emoji:"🫘",freshnessType:"fruiting",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:true},
  {id:319,cat:"Vegetables",name:"Sugar Snap Peas",price:8.00,emoji:"🫛",freshnessType:"legumes",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:true},
  {id:401,cat:"Peppers",name:"Anaheim / Chili",price:4.00,emoji:"🌶️",freshnessType:"peppers",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:402,cat:"Peppers",name:"Bell Peppers",price:4.00,emoji:"🫑",freshnessType:"peppers",harvestUnit:"each",harvestToSellRatio:1,sellUnit:"each",batches:[],publicVisible:true,orderable:true},
  {id:403,cat:"Peppers",name:"Jalapeños",price:4.00,emoji:"🌶️",freshnessType:"peppers",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:true},
  {id:404,cat:"Peppers",name:"Habanero",price:7.00,emoji:"🌶️",freshnessType:"peppers",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:false},
  {id:405,cat:"Peppers",name:"Banana Peppers",price:4.00,emoji:"🫑",freshnessType:"peppers",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:false},
  {id:501,cat:"Tomatoes",name:"Cherry Tomatoes",price:4.00,emoji:"🍒",freshnessType:"tomatoes",harvestUnit:"pint",harvestToSellRatio:1,sellUnit:"pint",batches:[],publicVisible:true,orderable:true},
  {id:502,cat:"Tomatoes",name:"Tomatoes Large",price:4.00,emoji:"🍅",freshnessType:"tomatoes",harvestUnit:"lb",harvestToSellRatio:1,sellUnit:"lb",batches:[],publicVisible:true,orderable:true},
  {id:601,cat:"Herbs",name:"Basil",price:3.00,emoji:"🌿",freshnessType:"herbs",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:602,cat:"Herbs",name:"Cilantro",price:3.00,emoji:"🌿",freshnessType:"herbs",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:true},
  {id:603,cat:"Herbs",name:"Dill",price:3.00,emoji:"🌿",freshnessType:"herbs",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:604,cat:"Herbs",name:"Parsley",price:3.00,emoji:"🌿",freshnessType:"herbs",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:605,cat:"Herbs",name:"Rosemary",price:3.00,emoji:"🌿",freshnessType:"herbs",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:606,cat:"Herbs",name:"Mint",price:3.00,emoji:"🌿",freshnessType:"herbs",harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",batches:[],publicVisible:true,orderable:false},
  {id:607,cat:"Herbs",name:"Flowers",price:8.00,emoji:"🌸",freshnessType:"flowers",harvestUnit:"bunch",harvestToSellRatio:1,sellUnit:"bunch",batches:[],publicVisible:true,orderable:false},
  {id:701,cat:"Micro Greens",name:"Broccoli Micro",price:5.00,emoji:"🌱",freshnessType:"microgreens",harvestUnit:"pkg",harvestToSellRatio:1,sellUnit:"pkg",gramsPerPackage:50,batches:[],publicVisible:true,orderable:true},
  {id:702,cat:"Micro Greens",name:"Radish Micro",price:5.00,emoji:"🌱",freshnessType:"microgreens",harvestUnit:"pkg",harvestToSellRatio:1,sellUnit:"pkg",gramsPerPackage:50,batches:[],publicVisible:true,orderable:true},
  {id:703,cat:"Micro Greens",name:"Cantaloupe Micro",price:5.00,emoji:"🌱",freshnessType:"microgreens",harvestUnit:"pkg",harvestToSellRatio:1,sellUnit:"pkg",gramsPerPackage:50,batches:[],publicVisible:true,orderable:true},
  {id:704,cat:"Micro Greens",name:"Sweet Pea Micro",price:5.00,emoji:"🌱",freshnessType:"microgreens",harvestUnit:"pkg",harvestToSellRatio:1,sellUnit:"pkg",gramsPerPackage:50,batches:[],publicVisible:true,orderable:true},
  {id:705,cat:"Micro Greens",name:"Sunflower Micro",price:5.00,emoji:"🌱",freshnessType:"microgreens",harvestUnit:"pkg",harvestToSellRatio:1,sellUnit:"pkg",gramsPerPackage:50,batches:[],publicVisible:true,orderable:true},
  {id:706,cat:"Micro Greens",name:"Spicy Salad Micro",price:5.00,emoji:"🌱",freshnessType:"microgreens",harvestUnit:"pkg",harvestToSellRatio:1,sellUnit:"pkg",gramsPerPackage:50,batches:[],publicVisible:true,orderable:true},
  {id:801,cat:"Canned Goods",name:"Bread & Butter Pickles",price:10.00,emoji:"🫙",freshnessType:"pickled",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:802,cat:"Canned Goods",name:"Candied Jalapeños",price:12.00,emoji:"🫙",freshnessType:"pickled",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:803,cat:"Canned Goods",name:"Pickled Cabbage",price:10.00,emoji:"🫙",freshnessType:"pickled",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:804,cat:"Canned Goods",name:"Pickled Okra",price:10.00,emoji:"🫙",freshnessType:"pickled",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:805,cat:"Canned Goods",name:"Hot-n-Spicy Pickled Okra",price:10.00,emoji:"🫙",freshnessType:"pickled",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:806,cat:"Canned Goods",name:"Salsa",price:10.00,emoji:"🫙",freshnessType:"canned",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:807,cat:"Canned Goods",name:"Hot Salsa",price:10.00,emoji:"🫙",freshnessType:"canned",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:808,cat:"Canned Goods",name:"Jalapeño Blueberry Jam",price:10.00,emoji:"🫙",freshnessType:"jam",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:901,cat:"Refrigerator",name:"Fresh Cucumber Pickles",price:10.00,emoji:"🥒",freshnessType:"refrigerated",harvestUnit:"jar",harvestToSellRatio:1,sellUnit:"jar",batches:[],publicVisible:true,orderable:true},
  {id:902,cat:"Refrigerator",name:"Purple Hull Peas",price:9.00,emoji:"🫛",freshnessType:"refrigerated",harvestUnit:"pt",harvestToSellRatio:1,sellUnit:"pt",batches:[],publicVisible:true,orderable:true},
];
const SEED_SETTINGS={farmName:"Going Rogue Farms",tagline:"3921 HWY 110 East · Longville LA 70652",orderDeadline:"Thursday at 5pm",pickupLocation:"Saturday Farmers Market",adminPassword:"farm2026",phone:"(337) 529-6761",crew:["Samantha","Mary","Ruth","Isaiah","Calum","Sage"]};
const ALL_CATS=["All","Berries","Greens","Vegetables","Peppers","Tomatoes","Herbs","Micro Greens","Canned Goods","Refrigerator"];

// ─── ROW CONFIG & ROWS ────────────────────────────────────────────────────────
const SEED_ROW_CONFIG = {
  cropTypes:[
    {id:"c1",name:"Strawberries",color:"#ef4444"},{id:"c2",name:"Carrots",color:"#f97316"},
    {id:"c3",name:"Kale",color:"#16a34a"},{id:"c4",name:"Lettuce Mix",color:"#4ade80"},
    {id:"c5",name:"Beets",color:"#c026d3"},{id:"c6",name:"Tomatoes",color:"#dc2626"},
    {id:"c7",name:"Peppers",color:"#ea580c"},{id:"c8",name:"Herbs",color:"#059669"},
    {id:"c9",name:"Greens",color:"#65a30d"},{id:"c10",name:"Squash",color:"#ca8a04"},
    {id:"c11",name:"Cucumbers",color:"#15803d"},{id:"c12",name:"Green Beans",color:"#854d0e"},
    {id:"c13",name:"Sugar Snap Peas",color:"#84cc16"},{id:"c14",name:"Swiss Chard",color:"#0d9488"},
  ],
  conditionTags:[
    {id:"t1",name:"Drip",color:"#3b82f6"},{id:"t2",name:"Taped",color:"#8b5cf6"},
    {id:"t3",name:"Composted",color:"#92400e"},{id:"t4",name:"Litter",color:"#d97706"},
    {id:"t5",name:"Fabric",color:"#6b7280"},{id:"t6",name:"Tarp",color:"#374151"},
    {id:"t7",name:"Ready",color:"#22c55e"},{id:"t8",name:"Edge Tarp",color:"#1e293b"},
  ],
  amendSteps:[
    {id:"a1",name:"Pull Old Crop",color:"#ef4444"},{id:"a2",name:"Compost",color:"#92400e"},
    {id:"a3",name:"Chicken Litter",color:"#d97706"},{id:"a4",name:"Living Earth",color:"#65a30d"},
    {id:"a5",name:"Till / Mix",color:"#a16207"},{id:"a6",name:"Chill",color:"#94a3b8"},
    {id:"a7",name:"Fabric Cover",color:"#6b7280"},{id:"a8",name:"Ready to Plant",color:"#22c55e"},
  ],
  pestTypes:[
    {id:"p1",name:"Ants",color:"#ef4444"},{id:"p2",name:"Aphids",color:"#f97316"},
    {id:"p3",name:"Bug Holes",color:"#dc2626"},{id:"p4",name:"Slugs",color:"#7c3aed"},
    {id:"p5",name:"Mold / Disease",color:"#854d0e"},
  ],
  wateringZones:[
    {id:"w1",name:"Zone A",color:"#0ea5e9"},{id:"w2",name:"Zone B",color:"#6366f1"},
    {id:"w3",name:"Zone C",color:"#14b8a6"},{id:"w4",name:"Zone D",color:"#8b5cf6"},
  ],
  readinessLevels:[
    {id:"r1",name:"Ready Now",color:"#22c55e"},{id:"r2",name:"Almost Ready",color:"#eab308"},
    {id:"r3",name:"Growing",color:"#3b82f6"},{id:"r4",name:"Just Planted",color:"#94a3b8"},
    {id:"r5",name:"Empty",color:"#e8e2d8"},{id:"r6",name:"Unknown",color:"#f5f5f4"},
  ],
  jobTypes:[
    {id:"j1",name:"Harvest",color:"#22c55e"},{id:"j2",name:"Amend",color:"#f97316"},
    {id:"j3",name:"Plant",color:"#3b82f6"},{id:"j4",name:"Drip Tape",color:"#8b5cf6"},
    {id:"j5",name:"Pest Treatment",color:"#ef4444"},{id:"j6",name:"Weed",color:"#a16207"},
    {id:"j7",name:"Water Check",color:"#0ea5e9"},{id:"j8",name:"Fabric",color:"#6b7280"},
    {id:"j9",name:"Tarp",color:"#374151"},{id:"j10",name:"General Maint.",color:"#9a8a72"},
  ],
};

const SEED_ROWS=[
  ...Array.from({length:18},(_,i)=>({id:i+1,side:"east",tunnel:"Tunnel 1",crop:"",notes:"",conditionTags:[],inAmendment:false,amendStepIndex:-1,wateringZone:"",pestFlags:[],readiness:"Unknown",plantedDate:""})),
  ...Array.from({length:20},(_,i)=>({id:i+20,side:"west",tunnel:"Tunnel 3",crop:"",notes:"",conditionTags:[],inAmendment:false,amendStepIndex:-1,wateringZone:"",pestFlags:[],readiness:"Unknown",plantedDate:""})),
];

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [items,setItems]=useState(SEED_ITEMS);
  const [settings,setSettings]=useState(SEED_SETTINGS);
  const [orders,setOrders]=useState([]);
  const [marketPlan,setMarketPlan]=useState({});
  const [rows,setRows]=useState(SEED_ROWS);
  const [rowConfig,setRowConfig]=useState(SEED_ROW_CONFIG);
  const [jobLogs,setJobLogs]=useState([]);
  const [isAdmin,setIsAdmin]=useState(false);
  const [tab,setTab]=useState("stock");
  const [showLogin,setShowLogin]=useState(false);
  const [dbLoaded,setDbLoaded]=useState(false);

  // ─── LOAD FROM SUPABASE ON MOUNT ─────────────────────────────────────────
  useEffect(()=>{
    async function loadAll(){
      const {data,error}=await supabase.from("app_data").select("*");
      if(data){
        const m=Object.fromEntries(data.map(r=>[r.key,r.data]));
        if(m.grf_items_v6) setItems(migrateItems(m.grf_items_v6));
        if(m.grf_settings_v6) setSettings(m.grf_settings_v6);
        if(m.grf_orders_v6) setOrders(m.grf_orders_v6);
        if(m.grf_market_v6) setMarketPlan(m.grf_market_v6);
        if(m.grf_rows_v1) setRows(m.grf_rows_v1);
        if(m.grf_rowconfig_v1) setRowConfig(m.grf_rowconfig_v1);
        if(m.grf_joblogs_v1) setJobLogs(m.grf_joblogs_v1);
      }
      setDbLoaded(true);
    }
    loadAll();
  },[]);

  // ─── SAVE TO SUPABASE ON CHANGE ──────────────────────────────────────────
  const dbSave=(key,val)=>supabase.from("app_data").upsert({key,data:val},{onConflict:"key"});

  useEffect(()=>{if(dbLoaded)dbSave("grf_items_v6",items);},[items,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbSave("grf_settings_v6",settings);},[settings,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbSave("grf_orders_v6",orders);},[orders,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbSave("grf_market_v6",marketPlan);},[marketPlan,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbSave("grf_rows_v1",rows);},[rows,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbSave("grf_rowconfig_v1",rowConfig);},[rowConfig,dbLoaded]);
  useEffect(()=>{if(dbLoaded)dbSave("grf_joblogs_v1",jobLogs);},[jobLogs,dbLoaded]);

  const updateItem=(id,patch)=>setItems(is=>is.map(i=>i.id===id?{...i,...patch}:i));
  const updateRow=(id,patch)=>setRows(rs=>rs.map(r=>r.id===id?{...r,...patch}:r));
  const agingItems=items.filter(i=>Array.isArray(i.batches)&&i.batches.some(b=>b.qty>0&&["aging","usefirst"].includes(getFreshness(b.harvestedOn,i.freshnessType))));

  const TABS=[{key:"stock",icon:"📦",label:"Stock"},{key:"market",icon:"🏪",label:"Market"},{key:"log",icon:"✋",label:"Log"},{key:"garden",icon:"🌱",label:"Garden"},{key:"public",icon:"🌐",label:"Public"}];

  if(!dbLoaded) return(<div style={{fontFamily:"'Lora',Georgia,serif",background:"#f5f2ed",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🌿</div><p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#9a8a72",letterSpacing:"0.1em"}}>LOADING FARM DATA…</p></div></div>);

  return(
    <div style={{fontFamily:"'Lora',Georgia,serif",background:"#f5f2ed",minHeight:"100vh",maxWidth:580,margin:"0 auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{background:#f5f2ed;}
        .mono{font-family:'JetBrains Mono',monospace;}
        .card{background:#fff;border:1px solid #e2d9cc;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);}
        .btn{border:none;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;border-radius:10px;transition:all 0.15s;-webkit-tap-highlight-color:transparent;}
        .btn-green{background:#1a4a0a;color:#e8f5d8;padding:12px 20px;}.btn-amber{background:#a05008;color:#fff8ee;padding:12px 20px;}
        .btn-red{background:#8b1a1a;color:#fff;padding:10px 16px;}.btn-ghost{background:none;border:1.5px solid #ccc0b0;color:#6a5a42;padding:10px 14px;}
        .btn-sm{padding:7px 13px;font-size:11px;}
        .btn-icon{background:none;border:none;cursor:pointer;padding:5px 9px;border-radius:8px;-webkit-tap-highlight-color:transparent;font-size:18px;}
        input,select,textarea{background:#faf7f2;border:1.5px solid #d0c4b4;color:#2a1f12;font-family:'JetBrains Mono',monospace;font-size:14px;padding:11px 13px;border-radius:10px;outline:none;width:100%;transition:border 0.15s;}
        input:focus,select:focus,textarea:focus{border-color:#1a4a0a;background:#fff;}
        input::placeholder,textarea::placeholder{color:#b0a090;}
        .tag{font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:5px;font-weight:500;}
        .tag-fresh{background:#dcfce7;color:#14532d;}.tag-usefirst{background:#fef9c3;color:#713f12;}.tag-aging{background:#ffedd5;color:#7c2d12;}.tag-expired{background:#fee2e2;color:#7f1d1d;}.tag-unknown{background:#f1f5f9;color:#475569;}
        .toggle{width:46px;height:26px;background:#ccc0b0;border-radius:13px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0;}
        .toggle.on{background:#1a4a0a;}.toggle::after{content:'';position:absolute;width:20px;height:20px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);}.toggle.on::after{left:23px;}
        .fade{animation:fi 0.25s ease;}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .bigbtn{background:#fff;border:2px solid #ddd0c0;border-radius:14px;padding:18px 14px;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all 0.15s;}.bigbtn:active{transform:scale(0.97);}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
        .modal{background:#fff;border-radius:22px 22px 0 0;padding:26px 22px 44px;width:100%;max-width:580px;max-height:92vh;overflow-y:auto;}
        .modal-mid{align-items:center;}.modal-mid .modal{border-radius:20px;max-width:380px;width:92%;}
        .admin-bar{background:#1a4a0a;color:#e8f5d8;padding:8px 16px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.1em;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;}
        .warn-bar{background:#fff8ee;border:1px solid #f0c060;border-radius:12px;padding:11px 14px;display:flex;gap:10px;align-items:flex-start;}
        .stitle{font-size:11px;font-weight:600;color:#5a4a32;font-family:'JetBrains Mono',monospace;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;}
        .bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:580px;background:#fff;border-top:1px solid #e2d9cc;display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,0px);}
        .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px 6px;background:none;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;}
        .nav-icon{font-size:19px;line-height:1;}.nav-label{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:0.07em;color:#9a8a72;text-transform:uppercase;}
        .nav-btn.active .nav-label{color:#1a4a0a;font-weight:600;}
        .content{padding:18px 14px 96px;}
        .crew-pill{background:#f0fae8;border:1px solid #9dd87a;border-radius:20px;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#1a4a0a;display:flex;align-items:center;gap:8px;}
        @keyframes shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
        input[type=number]{-moz-appearance:textfield;}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        .batch-bar{height:4px;background:#f0ebe2;border-radius:2px;overflow:hidden;margin-top:4px;}
        .step-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;border:1.5px solid #d0c4b4;background:#faf7f2;cursor:pointer;transition:all 0.15s;}
        .step-chip.done{background:#dcfce7;border-color:#22c55e;color:#14532d;}
        .mode-seg{display:flex;background:#ede8e0;border-radius:12px;padding:4px;gap:4px;margin-bottom:16px;}
        .mode-seg button{flex:1;padding:8px 4px;border:none;border-radius:9px;font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;transition:all 0.15s;}
        .mode-seg button.active{background:#fff;color:#1a4a0a;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.1);}
        .mode-seg button:not(.active){background:none;color:#9a8a72;}
        .bring-toggle{display:flex;border-radius:10px;overflow:hidden;border:1.5px solid #d0c4b4;}
        .bring-toggle button{flex:1;padding:7px 8px;border:none;font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;transition:all 0.15s;background:#faf7f2;color:#9a8a72;}
        .bring-toggle button.active{background:#1a4a0a;color:#e8f5d8;}
        .row-bar{border-radius:9px;padding:0 10px;height:42px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.15s;border:1.5px solid transparent;-webkit-tap-highlight-color:transparent;}
        .row-bar:active{transform:scale(0.98);}
        .row-chip{border-radius:8px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;border:2px solid transparent;-webkit-tap-highlight-color:transparent;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;}
        .row-chip.selected{border-color:#1a4a0a!important;box-shadow:0 0 0 2px #1a4a0a;}
        .map-mode-pill{padding:7px 13px;border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:10px;white-space:nowrap;border:1.5px solid #ccc0b0;background:#fff;color:#6a5a42;cursor:pointer;transition:all 0.15s;flex-shrink:0;}
        .map-mode-pill.active{background:#1a4a0a;color:#e8f5d8;border-color:#1a4a0a;}
        .color-swatch{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,0.15);cursor:pointer;flex-shrink:0;}
        .admin-config-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0ebe2;}
        .tab-pill{padding:7px 14px;border-radius:10px;font-family:'JetBrains Mono',monospace;font-size:10px;border:1.5px solid #d0c4b4;background:#faf7f2;color:#6a5a42;cursor:pointer;white-space:nowrap;transition:all 0.15s;flex-shrink:0;}
        .tab-pill.active{background:#1a4a0a;color:#e8f5d8;border-color:#1a4a0a;}
      `}</style>

      {isAdmin&&<div className="admin-bar"><span>🔓 ADMIN MODE</span><button onClick={()=>setIsAdmin(false)} style={{background:"none",border:"1px solid #4a8020",color:"#a0d870",fontFamily:"'JetBrains Mono',monospace",fontSize:10,cursor:"pointer",padding:"3px 10px",borderRadius:6}}>LOCK</button></div>}

      <header style={{background:"#fff",borderBottom:"1px solid #e2d9cc",padding:"13px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontWeight:700,fontSize:18,color:"#1a3a0a",lineHeight:1.2}}>Going Rogue Farms</div>
          <div className="mono" style={{fontSize:9,color:"#9a8060",letterSpacing:"0.1em",marginTop:2}}>LONGVILLE · LA 70652</div>
        </div>
        <button className="btn-icon" style={{fontSize:22}} onClick={()=>isAdmin?setIsAdmin(false):setShowLogin(true)}>{isAdmin?"🔓":"🔒"}</button>
      </header>

      <div className="content">
        {tab==="stock"&&<StockTab items={items} setItems={setItems} updateItem={updateItem} isAdmin={isAdmin} agingItems={agingItems}/>}
        {tab==="market"&&<MarketTab items={items} updateItem={updateItem} marketPlan={marketPlan} setMarketPlan={setMarketPlan}/>}
        {tab==="log"&&<LogTab items={items} updateItem={updateItem} settings={settings} rows={rows} setRows={setRows} rowConfig={rowConfig} jobLogs={jobLogs} setJobLogs={setJobLogs}/>}
        {tab==="garden"&&<GardenTab rows={rows} setRows={setRows} rowConfig={rowConfig} setRowConfig={setRowConfig} jobLogs={jobLogs} setJobLogs={setJobLogs} isAdmin={isAdmin} settings={settings}/>}
        {tab==="public"&&<PublicTab items={items} updateItem={updateItem} orders={orders} setOrders={setOrders} settings={settings} setSettings={setSettings} isAdmin={isAdmin}/>}
      </div>

      <nav className="bottom-nav">
        {TABS.map(t=>(
          <button key={t.key} className={`nav-btn ${tab===t.key?"active":""}`} onClick={()=>setTab(t.key)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
      {showLogin&&<AdminLogin password={settings.adminPassword} onSuccess={()=>{setIsAdmin(true);setShowLogin(false);}} onClose={()=>setShowLogin(false)}/>}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({password,onSuccess,onClose}){
  const [pw,setPw]=useState(""),[ err,setErr]=useState(false),[shake,setShake]=useState(false);
  const attempt=()=>{if(pw===password)onSuccess();else{setErr(true);setShake(true);setTimeout(()=>setShake(false),400);setPw("");}};
  return(<div className="modal-bg modal-mid" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="modal" style={{textAlign:"center"}}><div style={{fontSize:44,marginBottom:12}}>🔒</div><h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>Admin Access</h2><p className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:18}}>GOING ROGUE FARMS</p><input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Password" autoFocus style={{textAlign:"center",fontSize:20,letterSpacing:"0.25em",marginBottom:8,animation:shake?"shake 0.4s":"none",border:err?"1.5px solid #ef4444":undefined}}/>{err&&<p className="mono" style={{fontSize:11,color:"#ef4444",marginBottom:8}}>WRONG PASSWORD</p>}<button className="btn btn-green" style={{width:"100%",padding:14,marginTop:8}} onClick={attempt}>Unlock</button><button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:10}} onClick={onClose}>Cancel</button></div></div>);
}

// ─── STOCK TAB ────────────────────────────────────────────────────────────────
function StockTab({items,setItems,updateItem,isAdmin,agingItems}){
  const [cat,setCat]=useState("All"),[showAdd,setShowAdd]=useState(false),[editItem,setEditItem]=useState(null),[showZero,setShowZero]=useState(false),[expanded,setExpanded]=useState({}),[pullModal,setPullModal]=useState(null);
  const toggleExpand=id=>setExpanded(e=>({...e,[id]:!e[id]}));
  const filtered=items.filter(i=>(cat==="All"||i.cat===cat)&&(showZero||getTotalQty(i)>0)).sort((a,b)=>{const o={fresh:0,usefirst:1,aging:2,expired:3,unknown:4};return o[getBestFreshness(a)]-o[getBestFreshness(b)];});
  const adjustBatch=(itemId,batchId,delta)=>setItems(is=>is.map(i=>i.id!==itemId?i:{...i,batches:i.batches.map(b=>b.id===batchId?{...b,qty:Math.max(0,b.qty+delta)}:b)}));
  const removeBatch=(itemId,batchId)=>setItems(is=>is.map(i=>i.id!==itemId?i:{...i,batches:i.batches.filter(b=>b.id!==batchId)}));
  return(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:4}}>
      <div><h1 style={{fontSize:22,fontWeight:700}}>Current Stock</h1><p className="mono" style={{fontSize:11,color:"#9a8a72"}}>{items.filter(i=>getTotalQty(i)>0).length} items in stock</p></div>
      <div style={{display:"flex",gap:8}}><button className="btn btn-ghost btn-sm" onClick={()=>setShowZero(s=>!s)} style={{fontSize:10}}>{showZero?"Hide Empty":"+ Show Empty"}</button>{isAdmin&&<button className="btn btn-green btn-sm" onClick={()=>setShowAdd(true)}>+ Add</button>}</div>
    </div>
    {agingItems.length>0&&<div className="warn-bar" style={{margin:"10px 0"}}><span>⚠️</span><div className="mono" style={{fontSize:11,color:"#713f12"}}>USE FIRST: {agingItems.map(i=>i.name).join(", ")}</div></div>}
    <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:6,margin:"10px 0"}}>
      {ALL_CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?"#1a4a0a":"#fff",color:cat===c?"#e8f5d8":"#6a5a42",border:`1.5px solid ${cat===c?"#1a4a0a":"#ccc0b0"}`,borderRadius:20,padding:"5px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,whiteSpace:"nowrap",cursor:"pointer",flexShrink:0,transition:"all 0.15s"}}>{c}</button>)}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.map(item=>{
        const totalQty=getTotalQty(item),bestF=getBestFreshness(item),isExp=expanded[item.id],hasBatches=Array.isArray(item.batches)&&item.batches.filter(b=>b.qty>0).length>1;
        return(<div key={item.id} className="card" style={{padding:"13px 14px",opacity:totalQty===0?0.45:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:totalQty>0?8:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9,flex:1,cursor:hasBatches?"pointer":"default"}} onClick={()=>hasBatches&&toggleExpand(item.id)}>
              <span style={{fontSize:22}}>{item.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,display:"flex",alignItems:"center",gap:6}}>{item.name}{hasBatches&&<span className="mono" style={{fontSize:10,color:"#9a8a72",background:"#f0ebe2",borderRadius:10,padding:"1px 6px"}}>{item.batches.filter(b=>b.qty>0).length} batches</span>}</div>
                <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center",flexWrap:"wrap"}}>
                  <span className="mono" style={{fontSize:10,color:"#9a8a72"}}>${item.price}/{item.sellUnit}</span>
                  <span className="mono" style={{fontSize:10,color:"#9a8a72"}}>· {item.cat}</span>
                  {item.gramsPerPackage&&<span className="mono" style={{fontSize:10,color:"#6a8a60"}}>{item.gramsPerPackage}g/pkg</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7}}>{totalQty>0&&<span className={`tag tag-${bestF}`}>{FL[bestF]}</span>}{isAdmin&&<button className="btn-icon" onClick={()=>setEditItem(item)}>✏️</button>}</div>
          </div>
          {totalQty>0&&<>
            <div style={{marginBottom:8}}>{multiUnitDisplay(item,totalQty).map((line,i)=><span key={i} className="mono" style={{fontSize:i===0?14:11,color:i===0?(totalQty<=3?"#a05008":"#1a4a0a"):"#6a8060",fontWeight:i===0?700:400,marginRight:10}}>{line}</span>)}</div>
            {!isExp&&<div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>{item.batches.filter(b=>b.qty>0).slice(0,1).map(b=>{const f=getFreshness(b.harvestedOn,item.freshnessType),d=b.harvestedOn?daysOld(b.harvestedOn):null,w=FW[item.freshnessType]||FW.greens,pct=d!==null?Math.min((d/w.aging)*100,100):0;return(<div key={b.id}>{d!==null&&<span className="mono" style={{fontSize:10,color:"#9a8a72"}}>{d}d old</span>}{d!==null&&<div className="batch-bar"><div style={{height:"100%",width:`${pct}%`,background:FC[f],borderRadius:2}}/></div>}</div>);})}</div>
              <div style={{display:"flex",gap:5}}>{hasBatches?<button className="btn btn-ghost btn-sm" onClick={()=>setPullModal(item)} style={{fontSize:10}}>Pull batch</button>:<>
                <button className="btn-icon" style={{background:"#fee2e2",borderRadius:8,padding:"5px 9px"}} onClick={()=>setItems(is=>is.map(i=>{if(i.id!==item.id)return i;const b=[...i.batches];for(let j=b.length-1;j>=0;j--){if(b[j].qty>0){b[j]={...b[j],qty:b[j].qty-1};break;}}return{...i,batches:b};}))}>−</button>
                <button className="btn-icon" style={{background:"#dcfce7",borderRadius:8,padding:"5px 9px"}} onClick={()=>setItems(is=>is.map(i=>{if(i.id!==item.id)return i;const b=[...i.batches];if(b.length>0)b[b.length-1]={...b[b.length-1],qty:b[b.length-1].qty+1};else b.push({id:Date.now(),qty:1,harvestedOn:todayStr(),stepsDone:[]});return{...i,batches:b};}))}>+</button>
              </>}</div>
            </div>}
            {isExp&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:6}}>
              {item.batches.filter(b=>b.qty>0).sort((a,b)=>new Date(a.harvestedOn)-new Date(b.harvestedOn)).map((b,idx)=>{
                const f=getFreshness(b.harvestedOn,item.freshnessType),d=b.harvestedOn?daysOld(b.harvestedOn):null,w=FW[item.freshnessType]||FW.greens,pct=d!==null?Math.min((d/w.aging)*100,100):0;
                return(<div key={b.id} style={{background:"#faf7f2",borderRadius:10,padding:"10px 12px",border:"1px solid #e2d9cc"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div><div style={{display:"flex",gap:6,alignItems:"center"}}><span className="mono" style={{fontSize:11,color:"#5a4a32",fontWeight:600}}>BATCH {idx+1}</span><span className={`tag tag-${f}`}>{FL[f]}</span></div>
                      <div style={{marginTop:4}}>{multiUnitDisplay(item,b.qty).map((line,i)=><span key={i} className="mono" style={{fontSize:i===0?13:10,color:i===0?"#1a4a0a":"#6a8060",fontWeight:i===0?600:400,marginRight:8}}>{line}</span>)}</div>
                      {d!==null&&<div className="mono" style={{fontSize:10,color:"#9a8a72",marginTop:2}}>{b.harvestedOn} · {d}d old</div>}
                      {item.workflowSteps&&item.workflowSteps.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{item.workflowSteps.map(step=>{const done=(b.stepsDone||[]).includes(step);return(<span key={step} className={`step-chip ${done?"done":""}`} onClick={()=>setItems(is=>is.map(i=>{if(i.id!==item.id)return i;return{...i,batches:i.batches.map(bt=>{if(bt.id!==b.id)return bt;const sd=done?(bt.stepsDone||[]).filter(s=>s!==step):[...(bt.stepsDone||[]),step];return{...bt,stepsDone:sd};})};}))}>{done?"✓":"○"} {step}</span>);})}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                      <div style={{display:"flex",gap:4}}><button className="btn-icon" style={{background:"#fee2e2",borderRadius:8,padding:"4px 8px",fontSize:14}} onClick={()=>adjustBatch(item.id,b.id,-1)}>−</button><button className="btn-icon" style={{background:"#dcfce7",borderRadius:8,padding:"4px 8px",fontSize:14}} onClick={()=>adjustBatch(item.id,b.id,1)}>+</button></div>
                      {isAdmin&&<button className="btn-icon" style={{fontSize:12,color:"#ef4444"}} onClick={()=>removeBatch(item.id,b.id)}>🗑</button>}
                    </div>
                  </div>
                  {d!==null&&<div className="batch-bar"><div style={{height:"100%",width:`${pct}%`,background:FC[f],borderRadius:2}}/></div>}
                </div>);
              })}
              <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>toggleExpand(item.id)}>▲ Collapse</button>
            </div>}
          </>}
          {totalQty===0&&isAdmin&&<button className="btn btn-ghost btn-sm" style={{marginTop:8,fontSize:10,width:"100%"}} onClick={()=>setEditItem(item)}>+ Set quantity & date</button>}
        </div>);
      })}
    </div>
    {editItem&&isAdmin&&<EditItemModal item={editItem} onSave={p=>{updateItem(editItem.id,p);setEditItem(null);}} onDelete={()=>{setItems(is=>is.filter(i=>i.id!==editItem.id));setEditItem(null);}} onClose={()=>setEditItem(null)}/>}
    {showAdd&&isAdmin&&<AddItemModal onAdd={n=>{setItems(is=>[...is,{...n,id:Date.now(),batches:[]}]);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>}
    {pullModal&&<BatchPullModal item={pullModal} onPull={(batchId,qty)=>{setItems(is=>is.map(i=>i.id!==pullModal.id?i:{...i,batches:i.batches.map(b=>b.id===batchId?{...b,qty:Math.max(0,b.qty-qty)}:b)}));setPullModal(null);}} onClose={()=>setPullModal(null)}/>}
  </div>);
}

function BatchPullModal({item,onPull,onClose}){
  const [selBatch,setSelBatch]=useState(null),[qty,setQty]=useState(1);
  const batches=(item.batches||[]).filter(b=>b.qty>0).sort((a,b)=>new Date(a.harvestedOn)-new Date(b.harvestedOn));
  return(<div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="modal fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:17,fontWeight:700}}>{item.emoji} Pull from stock</h2><button className="btn-icon" onClick={onClose}>✕</button></div>
    <p style={{fontSize:13,color:"#6a5a42",marginBottom:14}}>Choose which batch to pull from:</p>
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
      {batches.map((b,idx)=>{const f=getFreshness(b.harvestedOn,item.freshnessType),d=b.harvestedOn?daysOld(b.harvestedOn):null;return(<div key={b.id} onClick={()=>setSelBatch(b)} style={{padding:"12px 14px",borderRadius:12,border:`2px solid ${selBatch?.id===b.id?"#1a4a0a":"#e2d9cc"}`,background:selBatch?.id===b.id?"#f0fae8":"#fff",cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span className="mono" style={{fontSize:11,fontWeight:600}}>BATCH {idx+1}</span>{" "}<span className={`tag tag-${f}`}>{FL[f]}</span><div style={{marginTop:4}}>{multiUnitDisplay(item,b.qty).map((l,i)=><span key={i} className="mono" style={{fontSize:i===0?13:10,color:i===0?"#1a4a0a":"#6a8060",fontWeight:i===0?600:400,marginRight:8}}>{l}</span>)}</div>{d!==null&&<div className="mono" style={{fontSize:10,color:"#9a8a72",marginTop:2}}>{b.harvestedOn} · {d}d old</div>}</div>{selBatch?.id===b.id&&<span style={{fontSize:20}}>✓</span>}</div>
      </div>);})}
    </div>
    {selBatch&&<><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>HOW MANY TO PULL?</div><input type="number" inputMode="numeric" value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} style={{textAlign:"center",fontSize:24,marginBottom:12}}/><button className="btn btn-green" style={{width:"100%",padding:14}} onClick={()=>onPull(selBatch.id,qty)}>Pull {qty} {item.sellUnit}{qty!==1?"s":""} from Batch</button></>}
  </div></div>);
}

// ─── LOG TAB ──────────────────────────────────────────────────────────────────
function LogTab({items,updateItem,settings,rows,setRows,rowConfig,jobLogs,setJobLogs}){
  const [mode,setMode]=useState(null),[search,setSearch]=useState(""),[sel,setSel]=useState(null),[mainQty,setMainQty]=useState(""),[remainder,setRemainder]=useState(""),[date,setDate]=useState(todayStr()),[crew,setCrew]=useState(""),[done,setDone]=useState(false),[taggedRows,setTaggedRows]=useState([]),[showRowTag,setShowRowTag]=useState(false),[showJobLog,setShowJobLog]=useState(false);
  const filtered=items.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
  const isCrate=sel?.harvestUnit==="crate";
  const submit=()=>{
    if(!sel||!mainQty||!crew) return;
    const addQty=harvestToQty(sel,mainQty,remainder);
    if(mode==="picked"){
      const newBatch={id:Date.now(),qty:addQty,harvestedOn:date,stepsDone:[]};
      updateItem(sel.id,{batches:[...(sel.batches||[]),newBatch]});
      if(taggedRows.length>0){
        setJobLogs(jl=>[...jl,{id:Date.now(),type:"Harvest",crew,rowIds:taggedRows,date,notes:`Harvested ${addQty} ${sel.sellUnit} of ${sel.name}`,createdAt:new Date().toLocaleString()}]);
      }
    } else {
      let remaining=addQty;
      const updated=[...(sel.batches||[])].sort((a,b)=>new Date(a.harvestedOn)-new Date(b.harvestedOn)).map(b=>{if(remaining<=0||b.qty<=0)return b;const take=Math.min(b.qty,remaining);remaining-=take;return{...b,qty:b.qty-take};});
      updateItem(sel.id,{batches:updated});
    }
    setDone(true);
    setTimeout(()=>{setMode(null);setSel(null);setMainQty("");setRemainder("");setDone(false);setCrew("");setTaggedRows([]);setShowRowTag(false);},2000);
  };
  const cratePreview=()=>{
    if(!sel||!isCrate) return null;
    const total=(parseInt(mainQty)||0)*(sel.harvestToSellRatio||20)+(parseInt(remainder)||0);
    return(<div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:10,padding:"10px 14px",marginTop:10}}>
      <div className="mono" style={{fontSize:11,color:"#1a4a0a",marginBottom:4}}>CALCULATED STOCK:</div>
      {multiUnitDisplay(sel,total).map((line,i)=><div key={i} className="mono" style={{fontSize:i===0?15:12,color:i===0?"#1a4a0a":"#5a8a40",fontWeight:i===0?700:400}}>{line}</div>)}
    </div>);
  };

  if(done) return(<div className="fade" style={{textAlign:"center",paddingTop:80}}><div style={{fontSize:72,marginBottom:12}}>✅</div><h2 style={{fontSize:20,fontWeight:700,color:"#1a4a0a",marginBottom:8}}>Logged!</h2><p className="mono" style={{fontSize:12,color:"#9a8a72",marginBottom:4}}>{sel?.name}</p><p className="mono" style={{fontSize:12,color:"#9a8a72"}}>by {crew}</p>{taggedRows.length>0&&<p className="mono" style={{fontSize:11,color:"#5a8a40",marginTop:4}}>Rows: {taggedRows.join(", ")}</p>}</div>);

  return(<div className="fade">
    <h1 style={{fontSize:22,fontWeight:700,marginTop:4,marginBottom:4}}>Farm Log</h1>
    <p className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:18}}>QUICK ENTRY · WHO · WHAT · HOW MANY</p>
    {!mode&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
      <div className="bigbtn" style={{padding:26,border:"2px solid #1a4a0a",background:"#f0fae8"}} onClick={()=>setMode("picked")}><div style={{fontSize:40,marginBottom:8}}>🌾</div><div style={{fontSize:16,fontWeight:700,color:"#1a4a0a"}}>Just Picked</div><div className="mono" style={{fontSize:10,color:"#4a7a20",marginTop:4}}>Add to stock</div></div>
      <div className="bigbtn" style={{padding:26,border:"2px solid #a05008",background:"#fff8ee"}} onClick={()=>setMode("pulled")}><div style={{fontSize:40,marginBottom:8}}>❄️</div><div style={{fontSize:16,fontWeight:700,color:"#a05008"}}>From Fridge</div><div className="mono" style={{fontSize:10,color:"#806030",marginTop:4}}>Moving to sale</div></div>
      <div className="bigbtn" style={{gridColumn:"1/-1",padding:"18px 14px",border:"2px solid #5a3a8a",background:"#f5f0ff"}} onClick={()=>setMode("pipeline")}><div style={{fontSize:36,marginBottom:6}}>🔄</div><div style={{fontSize:15,fontWeight:700,color:"#5a3a8a"}}>Log Pipeline Step</div><div className="mono" style={{fontSize:10,color:"#7a5aaa",marginTop:3}}>Mark progress on a crop batch</div></div>
      <div className="bigbtn" style={{gridColumn:"1/-1",padding:"18px 14px",border:"2px solid #0a4a3a",background:"#f0faf7"}} onClick={()=>setShowJobLog(true)}><div style={{fontSize:36,marginBottom:6}}>🌿</div><div style={{fontSize:15,fontWeight:700,color:"#0a4a3a"}}>Log Field Job</div><div className="mono" style={{fontSize:10,color:"#2a7a5a",marginTop:3}}>Record work done in the rows</div></div>
    </div>}

    {mode==="pipeline"&&<PipelineModeUI items={items} updateItem={updateItem} settings={settings} onBack={()=>setMode(null)}/>}

    {(mode==="picked"||mode==="pulled")&&<>
      {!crew&&<div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><button className="btn btn-ghost btn-sm" onClick={()=>setMode(null)}>← Back</button><span style={{fontWeight:700,fontSize:15}}>Who is logging?</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{(settings.crew||[]).map(name=><button key={name} className="bigbtn" style={{padding:"18px 14px"}} onClick={()=>setCrew(name)}><div style={{fontSize:28,marginBottom:6}}>👤</div><div style={{fontWeight:600,fontSize:14}}>{name}</div></button>)}</div></div>}
      {crew&&!sel&&<div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><button className="btn btn-ghost btn-sm" onClick={()=>setCrew("")}>← Back</button><div className="crew-pill">👤 {crew}</div><span style={{fontWeight:700,fontSize:14}}>{mode==="picked"?"What was picked?":"What from fridge?"}</span></div>
        <input placeholder="🔍 Search item…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:12}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{filtered.map(i=><div key={i.id} className="bigbtn" style={{padding:13}} onClick={()=>setSel(i)}><div style={{fontSize:24,marginBottom:4}}>{i.emoji}</div><div style={{fontWeight:600,fontSize:12,lineHeight:1.3}}>{i.name}</div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{getTotalQty(i)} {i.sellUnit}</div></div>)}</div>
      </div>}
      {crew&&sel&&<div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><button className="btn btn-ghost btn-sm" onClick={()=>setSel(null)}>← Back</button><div className="crew-pill">👤 {crew}</div><span style={{fontSize:22}}>{sel.emoji}</span><span style={{fontWeight:700,fontSize:14}}>{sel.name}</span></div>
        <div className="card" style={{padding:18,marginBottom:12}}>
          {isCrate?<><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>HOW MANY CRATES? (1 CRATE = {sel.harvestToSellRatio} {sel.sellUnit.toUpperCase()}S)</div><input type="number" inputMode="numeric" value={mainQty} onChange={e=>setMainQty(e.target.value)} placeholder="Crates" style={{fontSize:28,textAlign:"center",padding:12,marginBottom:10}} autoFocus/><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>REMAINDER ({sel.sellUnit.toUpperCase()}S)?</div><input type="number" inputMode="numeric" value={remainder} onChange={e=>setRemainder(e.target.value)} placeholder="0" style={{fontSize:22,textAlign:"center",padding:10}}/>{cratePreview()}</>
          :<><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>HOW MANY {sel.harvestUnit.toUpperCase()}S?</div><input type="number" inputMode="numeric" value={mainQty} onChange={e=>setMainQty(e.target.value)} placeholder="0" style={{fontSize:30,textAlign:"center",padding:12}} autoFocus/><div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>{[1,2,5,10,12,24,50].map(n=><button key={n} className="btn btn-ghost btn-sm" onClick={()=>setMainQty(String(n))}>{n}</button>)}</div></>}
        </div>
        {mode==="picked"&&<><div className="card" style={{padding:16,marginBottom:12}}><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:7}}>HARVEST DATE</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{colorScheme:"light"}}/></div>
          <div className="card" style={{padding:14,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showRowTag?12:0}}>
              <div><div className="mono" style={{fontSize:11,color:"#9a8a72"}}>TAG ROWS (optional)</div>{taggedRows.length>0&&<div className="mono" style={{fontSize:10,color:"#1a4a0a",marginTop:2}}>Rows: {taggedRows.join(", ")}</div>}</div>
              <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>setShowRowTag(s=>!s)}>{showRowTag?"▲ Hide":"▼ Select"}</button>
            </div>
            {showRowTag&&<RowMultiSelect rows={rows} rowConfig={rowConfig} selected={taggedRows} onToggle={id=>setTaggedRows(s=>s.includes(id)?s.filter(r=>r!==id):[...s,id])} compact/>}
          </div>
        </>}
        <button className="btn btn-green" style={{width:"100%",padding:15,fontSize:14}} onClick={submit} disabled={!mainQty}>{mode==="picked"?"✅ Log Harvest":"✅ Log Pulled"}</button>
      </div>}
    </>}
    {showJobLog&&<JobLogModal rows={rows} setRows={setRows} rowConfig={rowConfig} jobLogs={jobLogs} setJobLogs={setJobLogs} settings={settings} onClose={()=>setShowJobLog(false)}/>}
  </div>);
}

function PipelineModeUI({items,updateItem,settings,onBack}){
  const [crew,setCrew]=useState(null),[sel,setSel]=useState(null),[pipeBatch,setPipeBatch]=useState(null),[done,setDone]=useState(false);
  const pipelineItems=items.filter(i=>Array.isArray(i.workflowSteps)&&i.workflowSteps.length>0&&(i.batches||[]).some(b=>b.qty>0));
  if(done) return(<div className="fade" style={{textAlign:"center",paddingTop:60}}><div style={{fontSize:72,marginBottom:12}}>✅</div><h2 style={{fontSize:20,fontWeight:700,color:"#1a4a0a"}}>Step Logged!</h2></div>);
  return(<div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button><span style={{fontWeight:700,fontSize:15}}>Pipeline Step Log</span></div>
    {!crew&&<div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:10}}>WHO IS LOGGING?</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{(settings.crew||[]).map(name=><button key={name} className="bigbtn" style={{padding:"14px 10px"}} onClick={()=>setCrew(name)}><div style={{fontSize:24,marginBottom:4}}>👤</div><div style={{fontWeight:600,fontSize:13}}>{name}</div></button>)}</div></div>}
    {crew&&!sel&&<div><div className="crew-pill" style={{marginBottom:12}}>👤 {crew}</div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:10}}>SELECT CROP:</div>{pipelineItems.length===0?<p style={{color:"#9a8a72",fontSize:13,fontStyle:"italic"}}>No workflow crops in stock.</p>:pipelineItems.map(i=><div key={i.id} className="bigbtn" style={{padding:"14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,textAlign:"left"}} onClick={()=>setSel(i)}><span style={{fontSize:28}}>{i.emoji}</span><div><div style={{fontWeight:600,fontSize:14}}>{i.name}</div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{i.batches.filter(b=>b.qty>0).length} batch(es)</div></div></div>)}</div>}
    {crew&&sel&&!pipeBatch&&<div><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><div className="crew-pill">👤 {crew}</div><span style={{fontSize:20}}>{sel.emoji}</span><span style={{fontWeight:700}}>{sel.name}</span></div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:10}}>SELECT BATCH:</div>{sel.batches.filter(b=>b.qty>0).sort((a,b)=>new Date(a.harvestedOn)-new Date(b.harvestedOn)).map((b,idx)=><div key={b.id} className="bigbtn" style={{padding:"12px 14px",marginBottom:8,textAlign:"left"}} onClick={()=>setPipeBatch(b)}><span className="mono" style={{fontSize:11,fontWeight:600}}>BATCH {idx+1}</span>{" "}<span className={`tag tag-${getFreshness(b.harvestedOn,sel.freshnessType)}`}>{FL[getFreshness(b.harvestedOn,sel.freshnessType)]}</span><div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{(sel.workflowSteps||[]).map(step=><span key={step} className={`step-chip ${(b.stepsDone||[]).includes(step)?"done":""}`}>{(b.stepsDone||[]).includes(step)?"✓":"○"} {step}</span>)}</div></div>)}</div>}
    {crew&&sel&&pipeBatch&&<div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:10}}>MARK STEP COMPLETE:</div>{(sel.workflowSteps||[]).map((step,i)=>{const done=(pipeBatch.stepsDone||[]).includes(step);return(<button key={step} className="bigbtn" style={{padding:"16px 14px",display:"flex",alignItems:"center",gap:12,textAlign:"left",marginBottom:8,border:done?"2px solid #22c55e":"2px solid #ddd0c0",background:done?"#f0fae8":"#fff"}} onClick={()=>{if(done)return;updateItem(sel.id,{batches:sel.batches.map(b=>b.id!==pipeBatch.id?b:{...b,stepsDone:[...(b.stepsDone||[]),step]})});setDone(true);setTimeout(()=>{onBack();},2000);}}><div style={{fontSize:24}}>{done?"✅":"⬜"}</div><div><div style={{fontWeight:600,fontSize:14,color:done?"#1a4a0a":"#2a1f12"}}>Step {i+1}: {step}</div><div className="mono" style={{fontSize:10,color:done?"#4a8020":"#9a8a72"}}>{done?"COMPLETED":"PENDING"}</div></div></button>);})}</div>}
  </div>);
}

// ─── ROW MULTI-SELECT ─────────────────────────────────────────────────────────
function RowMultiSelect({rows,rowConfig,selected,onToggle,compact=false,mapMode="none"}){
  const [rangeStart,setRangeStart]=useState(null),[rangeMode,setRangeMode]=useState(false);
  const eastRows=rows.filter(r=>r.side==="east").sort((a,b)=>a.id-b.id);
  const westRows=rows.filter(r=>r.side==="west").sort((a,b)=>a.id-b.id);
  const maxLen=Math.max(eastRows.length,westRows.length);
  const getRowColor=(row)=>{
    if(mapMode==="crop"){const ct=rowConfig.cropTypes.find(c=>c.name===row.crop);return ct?ct.color:"#e8e2d8";}
    if(mapMode==="status"){if(row.inAmendment&&row.amendStepIndex>=0){const s=rowConfig.amendSteps[row.amendStepIndex];return s?s.color:"#f97316";}if(row.conditionTags.length>0){const t=rowConfig.conditionTags.find(t=>t.name===row.conditionTags[0]);return t?t.color:"#ccc0b0";}return"#e8e2d8";}
    if(mapMode==="readiness"){const rl=rowConfig.readinessLevels.find(r=>r.name===row.readiness);return rl?rl.color:"#f5f5f4";}
    if(mapMode==="water"){const wz=rowConfig.wateringZones.find(w=>w.name===row.wateringZone);return wz?wz.color:"#e8e2d8";}
    if(mapMode==="pest"){return row.pestFlags.length>0?"#ef4444":"#dcfce7";}
    return selected.includes(row.id)?"#dcfce7":"#faf7f2";
  };
  const handleTap=(row)=>{
    if(rangeMode){
      if(!rangeStart){setRangeStart(row.id);}
      else{
        const sameSet=rows.filter(r=>r.side===rows.find(r=>r.id===rangeStart).side).sort((a,b)=>a.id-b.id);
        const startIdx=sameSet.findIndex(r=>r.id===rangeStart),endIdx=sameSet.findIndex(r=>r.id===row.id);
        const lo=Math.min(startIdx,endIdx),hi=Math.max(startIdx,endIdx);
        sameSet.slice(lo,hi+1).forEach(r=>{if(!selected.includes(r.id))onToggle(r.id);});
        setRangeStart(null);setRangeMode(false);
      }
    } else onToggle(row.id);
  };
  const h=compact?32:38;
  return(<div>
    <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
      <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>westRows.forEach(r=>{if(!selected.includes(r.id))onToggle(r.id);})}>All W</button>
      <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>eastRows.forEach(r=>{if(!selected.includes(r.id))onToggle(r.id);})}>All E</button>
      <button className="btn btn-ghost btn-sm" style={{fontSize:10,background:rangeMode?"#1a4a0a":"",color:rangeMode?"#e8f5d8":""}} onClick={()=>{setRangeMode(s=>!s);setRangeStart(null);}}>Range{rangeStart?" (pick end)":""}</button>
      <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>rows.forEach(r=>{if(selected.includes(r.id))onToggle(r.id);})}>Clear</button>
      {selected.length>0&&<span className="mono" style={{fontSize:10,color:"#1a4a0a",padding:"7px 0",alignSelf:"center"}}>{selected.length} rows</span>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 8px 1fr",gap:"3px 0"}}>
      <div className="mono" style={{fontSize:9,color:"#9a8a72",textAlign:"center",padding:"4px 0",letterSpacing:"0.1em"}}>WEST (T3)</div>
      <div/>
      <div className="mono" style={{fontSize:9,color:"#9a8a72",textAlign:"center",padding:"4px 0",letterSpacing:"0.1em"}}>EAST (T1)</div>
      {Array.from({length:maxLen},(_,i)=>{
        const w=westRows[i],e=eastRows[i];
        return([
          w?<div key={`w${w.id}`} className="row-chip" style={{background:getRowColor(w),border:`2px solid ${selected.includes(w.id)?"#1a4a0a":"transparent"}`,boxShadow:selected.includes(w.id)?"0 0 0 2px #1a4a0a":"none",height:h,color:selected.includes(w.id)?"#1a4a0a":"#5a4a32"}} onClick={()=>handleTap(w)}>{w.id}{w.crop&&<span style={{fontSize:9,marginLeft:3,opacity:0.7}}>{w.crop.slice(0,4)}</span>}</div>
            :<div key={`we${i}`} style={{height:h}}/>,
          <div key={`d${i}`}/>,
          e?<div key={`e${e.id}`} className="row-chip" style={{background:getRowColor(e),border:`2px solid ${selected.includes(e.id)?"#1a4a0a":"transparent"}`,boxShadow:selected.includes(e.id)?"0 0 0 2px #1a4a0a":"none",height:h,color:selected.includes(e.id)?"#1a4a0a":"#5a4a32"}} onClick={()=>handleTap(e)}>{e.id}{e.crop&&<span style={{fontSize:9,marginLeft:3,opacity:0.7}}>{e.crop.slice(0,4)}</span>}</div>
            :<div key={`ee${i}`} style={{height:h}}/>,
        ]);
      })}
    </div>
  </div>);
}

// ─── JOB LOG MODAL ────────────────────────────────────────────────────────────
function JobLogModal({rows,setRows,rowConfig,jobLogs,setJobLogs,settings,onClose,preSelectedRows=[]}){
  const [step,setStep]=useState(0);
  const [crew,setCrew]=useState("");
  const [jobType,setJobType]=useState(null);
  const [selRows,setSelRows]=useState(preSelectedRows);
  const [date,setDate]=useState(todayStr());
  const [notes,setNotes]=useState("");
  const [applyStatus,setApplyStatus]=useState(false);
  const [statusPatch,setStatusPatch]=useState({conditionTagsAdd:[],conditionTagsRemove:[],setAmendment:false,amendStepIndex:-1,setReadiness:"",clearPests:false,pestsAdd:[]});
  const [done,setDone]=useState(false);

  const toggleRowSel=id=>setSelRows(s=>s.includes(id)?s.filter(r=>r!==id):[...s,id]);
  const toggleTagAdd=name=>setStatusPatch(p=>({...p,conditionTagsAdd:p.conditionTagsAdd.includes(name)?p.conditionTagsAdd.filter(t=>t!==name):[...p.conditionTagsAdd,name]}));
  const toggleTagRemove=name=>setStatusPatch(p=>({...p,conditionTagsRemove:p.conditionTagsRemove.includes(name)?p.conditionTagsRemove.filter(t=>t!==name):[...p.conditionTagsRemove,name]}));

  const confirm=()=>{
    const log={id:Date.now(),type:jobType.name,crew,rowIds:selRows,date,notes,createdAt:new Date().toLocaleString()};
    setJobLogs(jl=>[...jl,log]);
    if(applyStatus&&selRows.length>0){
      setRows(rs=>rs.map(r=>{
        if(!selRows.includes(r.id)) return r;
        let updated={...r};
        if(statusPatch.conditionTagsAdd.length>0) updated.conditionTags=[...new Set([...r.conditionTags,...statusPatch.conditionTagsAdd])];
        if(statusPatch.conditionTagsRemove.length>0) updated.conditionTags=updated.conditionTags.filter(t=>!statusPatch.conditionTagsRemove.includes(t));
        if(statusPatch.setAmendment) updated={...updated,inAmendment:true,amendStepIndex:statusPatch.amendStepIndex};
        if(statusPatch.setReadiness) updated.readiness=statusPatch.setReadiness;
        if(statusPatch.clearPests) updated.pestFlags=[];
        if(statusPatch.pestsAdd.length>0) updated.pestFlags=[...new Set([...r.pestFlags,...statusPatch.pestsAdd])];
        return updated;
      }));
    }
    setDone(true);
  };

  if(done) return(<div className="modal-bg"><div className="modal fade" style={{textAlign:"center"}}><div style={{fontSize:64,marginBottom:12}}>✅</div><h2 style={{fontSize:20,fontWeight:700,color:"#0a4a3a",marginBottom:8}}>Job Logged!</h2><p className="mono" style={{fontSize:12,color:"#9a8a72",marginBottom:4}}>{jobType?.name} · {crew}</p><p className="mono" style={{fontSize:11,color:"#9a8a72"}}>Rows: {selRows.join(", ")||"none"}</p><button className="btn btn-green" style={{marginTop:20,padding:"12px 24px"}} onClick={onClose}>Done</button></div></div>);

  return(<div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:17,fontWeight:700}}>🌿 Log Field Job</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:20,justifyContent:"center"}}>
        {["Who","Job","Rows","Status","Confirm"].map((s,i)=><div key={s} style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:24,height:24,borderRadius:12,background:i<=step?"#1a4a0a":"#e2d9cc",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:i<=step?"#e8f5d8":"#9a8a72",fontWeight:600}}>{i+1}</div>
          {i<4&&<div style={{width:16,height:2,background:i<step?"#1a4a0a":"#e2d9cc"}}/>}
        </div>)}
      </div>
      {step===0&&<div>
        <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:12}}>WHO IS DOING THIS JOB?</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {(settings.crew||[]).map(name=><button key={name} className="bigbtn" style={{padding:"16px 10px",border:crew===name?"2px solid #1a4a0a":"2px solid #ddd0c0",background:crew===name?"#f0fae8":"#fff"}} onClick={()=>setCrew(name)}><div style={{fontSize:26,marginBottom:4}}>👤</div><div style={{fontWeight:600,fontSize:13}}>{name}</div></button>)}
        </div>
        <button className="btn btn-green" style={{width:"100%",padding:13}} disabled={!crew} onClick={()=>setStep(1)}>Next →</button>
      </div>}
      {step===1&&<div>
        <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:12}}>WHAT TYPE OF JOB?</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {rowConfig.jobTypes.map(jt=><button key={jt.id} className="bigbtn" style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,textAlign:"left",border:jobType?.id===jt.id?`2px solid ${jt.color}`:"2px solid #ddd0c0",background:jobType?.id===jt.id?`${jt.color}18`:"#fff"}} onClick={()=>setJobType(jt)}>
            <div style={{width:14,height:14,borderRadius:7,background:jt.color,flexShrink:0}}/>
            <span style={{fontWeight:600,fontSize:14}}>{jt.name}</span>
            {jobType?.id===jt.id&&<span style={{marginLeft:"auto"}}>✓</span>}
          </button>)}
        </div>
        <div style={{display:"flex",gap:10}}><button className="btn btn-ghost" style={{flex:1,padding:12}} onClick={()=>setStep(0)}>← Back</button><button className="btn btn-green" style={{flex:2,padding:13}} disabled={!jobType} onClick={()=>setStep(2)}>Next →</button></div>
      </div>}
      {step===2&&<div>
        <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:12}}>WHICH ROWS? (TAP TO SELECT)</div>
        <RowMultiSelect rows={rows} rowConfig={rowConfig} selected={selRows} onToggle={toggleRowSel} mapMode="none"/>
        <div style={{display:"flex",gap:10,marginTop:16}}><button className="btn btn-ghost" style={{flex:1,padding:12}} onClick={()=>setStep(1)}>← Back</button><button className="btn btn-green" style={{flex:2,padding:13}} onClick={()=>setStep(3)}>Next →</button></div>
      </div>}
      {step===3&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div className="mono" style={{fontSize:11,color:"#9a8a72"}}>UPDATE ROW STATUS?</div>
          <button className={`toggle ${applyStatus?"on":""}`} onClick={()=>setApplyStatus(s=>!s)}/>
        </div>
        {applyStatus&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><div className="mono" style={{fontSize:10,color:"#9a8a72",marginBottom:6}}>ADD CONDITION TAGS:</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.conditionTags.map(t=><span key={t.id} onClick={()=>toggleTagAdd(t.name)} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${statusPatch.conditionTagsAdd.includes(t.name)?t.color:"#d0c4b4"}`,background:statusPatch.conditionTagsAdd.includes(t.name)?t.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",color:statusPatch.conditionTagsAdd.includes(t.name)?t.color:"#6a5a42"}}>{t.name}</span>)}</div></div>
          <div><div className="mono" style={{fontSize:10,color:"#9a8a72",marginBottom:6}}>REMOVE CONDITION TAGS:</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.conditionTags.map(t=><span key={t.id} onClick={()=>toggleTagRemove(t.name)} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${statusPatch.conditionTagsRemove.includes(t.name)?"#ef4444":"#d0c4b4"}`,background:statusPatch.conditionTagsRemove.includes(t.name)?"#fee2e2":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer"}}>{t.name}</span>)}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span className="mono" style={{fontSize:11,color:"#9a8a72"}}>SET IN AMENDMENT:</span><button className={`toggle ${statusPatch.setAmendment?"on":""}`} onClick={()=>setStatusPatch(p=>({...p,setAmendment:!p.setAmendment}))}/></div>
          {statusPatch.setAmendment&&<div><div className="mono" style={{fontSize:10,color:"#9a8a72",marginBottom:6}}>CURRENT AMEND STEP:</div><div style={{display:"flex",flexDirection:"column",gap:4}}>{rowConfig.amendSteps.map((s,i)=><button key={s.id} onClick={()=>setStatusPatch(p=>({...p,amendStepIndex:i}))} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${statusPatch.amendStepIndex===i?s.color:"#d0c4b4"}`,background:statusPatch.amendStepIndex===i?s.color+"22":"#faf7f2",cursor:"pointer"}}><div style={{width:10,height:10,borderRadius:5,background:s.color}}/><span className="mono" style={{fontSize:11}}>{s.name}</span>{statusPatch.amendStepIndex===i&&<span style={{marginLeft:"auto"}}>✓</span>}</button>)}</div></div>}
          <div><div className="mono" style={{fontSize:10,color:"#9a8a72",marginBottom:6}}>SET READINESS:</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.readinessLevels.map(rl=><span key={rl.id} onClick={()=>setStatusPatch(p=>({...p,setReadiness:p.setReadiness===rl.name?"":rl.name}))} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${statusPatch.setReadiness===rl.name?rl.color:"#d0c4b4"}`,background:statusPatch.setReadiness===rl.name?rl.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",color:statusPatch.setReadiness===rl.name?rl.color:"#6a5a42"}}>{rl.name}</span>)}</div></div>
          <div><div className="mono" style={{fontSize:10,color:"#9a8a72",marginBottom:6}}>FLAG PEST ISSUES:</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.pestTypes.map(pt=><span key={pt.id} onClick={()=>setStatusPatch(p=>({...p,pestsAdd:p.pestsAdd.includes(pt.name)?p.pestsAdd.filter(x=>x!==pt.name):[...p.pestsAdd,pt.name]}))} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${statusPatch.pestsAdd.includes(pt.name)?pt.color:"#d0c4b4"}`,background:statusPatch.pestsAdd.includes(pt.name)?pt.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer"}}>{pt.name}</span>)}</div></div>
        </div>}
        <div style={{display:"flex",gap:10,marginTop:16}}><button className="btn btn-ghost" style={{flex:1,padding:12}} onClick={()=>setStep(2)}>← Back</button><button className="btn btn-green" style={{flex:2,padding:13}} onClick={()=>setStep(4)}>Next →</button></div>
      </div>}
      {step===4&&<div>
        <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:16}}>
          <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>DATE</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{colorScheme:"light"}}/></div>
          <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>NOTES (optional)</div><textarea rows={3} placeholder="What was done, any observations…" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
          <div className="card" style={{padding:14,background:"#f0fae8",border:"1px solid #9dd87a"}}>
            <div className="stitle" style={{color:"#1a4a0a"}}>Summary</div>
            <div style={{fontSize:13,marginBottom:4}}><strong>{jobType?.name}</strong> · {crew}</div>
            <div className="mono" style={{fontSize:11,color:"#5a4a32"}}>Rows: {selRows.length>0?selRows.join(", "):"none selected"}</div>
            {applyStatus&&<div className="mono" style={{fontSize:10,color:"#5a8a40",marginTop:4}}>+ Status updates will apply</div>}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}><button className="btn btn-ghost" style={{flex:1,padding:12}} onClick={()=>setStep(3)}>← Back</button><button className="btn btn-green" style={{flex:2,padding:14,fontSize:13}} onClick={confirm}>✅ Confirm Job Log</button></div>
      </div>}
    </div>
  </div>);
}

// ─── GARDEN TAB ───────────────────────────────────────────────────────────────
const MAP_MODES=[{key:"crop",label:"Crop",icon:"🌿"},{key:"status",label:"Status",icon:"📋"},{key:"readiness",label:"Ready",icon:"⏱"},{key:"water",label:"Water",icon:"💧"},{key:"pest",label:"Pest",icon:"🐛"}];

function GardenTab({rows,setRows,rowConfig,setRowConfig,jobLogs,setJobLogs,isAdmin,settings}){
  const [mapMode,setMapMode]=useState("crop");
  const [selRow,setSelRow]=useState(null);
  const [showAdmin,setShowAdmin]=useState(false);
  const [showJobLog,setShowJobLog]=useState(false);
  const [showJobHistory,setShowJobHistory]=useState(false);

  const eastRows=rows.filter(r=>r.side==="east").sort((a,b)=>a.id-b.id);
  const westRows=rows.filter(r=>r.side==="west").sort((a,b)=>a.id-b.id);
  const maxLen=Math.max(eastRows.length,westRows.length);

  const getRowColor=(row)=>{
    if(mapMode==="crop"){const ct=rowConfig.cropTypes.find(c=>c.name===row.crop);return ct?ct.color:"#e8e2d8";}
    if(mapMode==="status"){
      if(row.inAmendment&&row.amendStepIndex>=0){const s=rowConfig.amendSteps[row.amendStepIndex];return s?s.color:"#f97316";}
      if(row.inAmendment) return "#f97316";
      if(row.conditionTags.length>0){const t=rowConfig.conditionTags.find(t=>t.name===row.conditionTags[0]);return t?t.color:"#ccc0b0";}
      return"#e8e2d8";
    }
    if(mapMode==="readiness"){const rl=rowConfig.readinessLevels.find(r=>r.name===row.readiness);return rl?rl.color:"#f5f5f4";}
    if(mapMode==="water"){const wz=rowConfig.wateringZones.find(w=>w.name===row.wateringZone);return wz?wz.color:"#e8e2d8";}
    if(mapMode==="pest"){return row.pestFlags.length>0?"#ef4444":"#dcfce7";}
    return "#e8e2d8";
  };

  const getLegendItems=()=>{
    if(mapMode==="crop") return rowConfig.cropTypes.filter(ct=>rows.some(r=>r.crop===ct.name));
    if(mapMode==="status") return[...rowConfig.conditionTags,...rowConfig.amendSteps.map(s=>({...s,name:`Amend: ${s.name}`}))];
    if(mapMode==="readiness") return rowConfig.readinessLevels;
    if(mapMode==="water") return rowConfig.wateringZones;
    if(mapMode==="pest") return[{id:"pe",name:"Has Pests",color:"#ef4444"},{id:"pn",name:"No Issues",color:"#dcfce7"}];
    return[];
  };

  const pestRows=rows.filter(r=>r.pestFlags.length>0).length;
  const emptyRows=rows.filter(r=>!r.crop).length;

  return(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:14}}>
      <div><h1 style={{fontSize:22,fontWeight:700}}>Garden Map</h1><p className="mono" style={{fontSize:11,color:"#9a8a72"}}>{rows.length} rows · {emptyRows} empty{pestRows>0?` · ⚠️ ${pestRows} pest`:""}</p></div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn btn-ghost btn-sm" style={{fontSize:10,borderColor:"#0a4a3a",color:"#0a4a3a"}} onClick={()=>setShowJobLog(true)}>+ Log Job</button>
        {isAdmin&&<button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>setShowAdmin(true)}>⚙️</button>}
      </div>
    </div>
    <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:6,marginBottom:16}}>
      {MAP_MODES.map(m=><button key={m.key} className={`map-mode-pill ${mapMode===m.key?"active":""}`} onClick={()=>setMapMode(m.key)}>{m.icon} {m.label}</button>)}
    </div>
    <div className="card" style={{padding:"12px 10px",marginBottom:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 6px 1fr",gap:"3px 0"}}>
        <div style={{textAlign:"center",paddingBottom:6}}><span className="mono" style={{fontSize:9,color:"#9a8a72",letterSpacing:"0.1em"}}>▲ NORTH · WEST (T3)</span></div>
        <div/>
        <div style={{textAlign:"center",paddingBottom:6}}><span className="mono" style={{fontSize:9,color:"#9a8a72",letterSpacing:"0.1em"}}>▲ NORTH · EAST (T1)</span></div>
        {Array.from({length:maxLen},(_,i)=>{
          const w=westRows[i],e=eastRows[i];
          const wColor=w?getRowColor(w):"transparent";
          const eColor=e?getRowColor(e):"transparent";
          const wDark=w&&(wColor==="transparent"||wColor==="#e8e2d8"||wColor==="#f5f5f4")?"#9a8a72":"#1a1208";
          const eDark=e&&(eColor==="transparent"||eColor==="#e8e2d8"||eColor==="#f5f5f4")?"#9a8a72":"#1a1208";
          return([
            w?<div key={`w${w.id}`} className="row-bar" style={{background:wColor,border:`1.5px solid ${wColor==="transparent"?"transparent":wColor+"66"}`}} onClick={()=>setSelRow(w)}>
              <span className="mono" style={{fontSize:11,fontWeight:700,color:wDark,width:22,flexShrink:0}}>{w.id}</span>
              <span style={{fontSize:11,color:wDark,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.crop||<span style={{opacity:0.4}}>—</span>}</span>
              <div style={{display:"flex",gap:2,flexShrink:0}}>
                {w.pestFlags.length>0&&<span style={{fontSize:10}}>🐛</span>}
                {w.inAmendment&&<span style={{fontSize:10}}>🔄</span>}
                {w.conditionTags.slice(0,2).map(t=>{const cfg=rowConfig.conditionTags.find(x=>x.name===t);return cfg?<div key={t} style={{width:6,height:6,borderRadius:3,background:cfg.color,marginTop:1}}/>:null;})}
              </div>
            </div>:<div key={`we${i}`}/>,
            <div key={`div${i}`} style={{background:"#e2d9cc",width:2,margin:"1px auto"}}/>,
            e?<div key={`e${e.id}`} className="row-bar" style={{background:eColor,border:`1.5px solid ${eColor==="transparent"?"transparent":eColor+"66"}`}} onClick={()=>setSelRow(e)}>
              <span className="mono" style={{fontSize:11,fontWeight:700,color:eDark,width:22,flexShrink:0}}>{e.id}</span>
              <span style={{fontSize:11,color:eDark,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.crop||<span style={{opacity:0.4}}>—</span>}</span>
              <div style={{display:"flex",gap:2,flexShrink:0}}>
                {e.pestFlags.length>0&&<span style={{fontSize:10}}>🐛</span>}
                {e.inAmendment&&<span style={{fontSize:10}}>🔄</span>}
                {e.conditionTags.slice(0,2).map(t=>{const cfg=rowConfig.conditionTags.find(x=>x.name===t);return cfg?<div key={t} style={{width:6,height:6,borderRadius:3,background:cfg.color,marginTop:1}}/>:null;})}
              </div>
            </div>:<div key={`ee${i}`}/>,
          ]);
        })}
        <div style={{textAlign:"center",paddingTop:6}}><span className="mono" style={{fontSize:9,color:"#9a8a72",letterSpacing:"0.1em"}}>▼ SOUTH</span></div>
        <div/>
        <div style={{textAlign:"center",paddingTop:6}}><span className="mono" style={{fontSize:9,color:"#9a8a72",letterSpacing:"0.1em"}}>▼ SOUTH</span></div>
      </div>
    </div>
    <div className="card" style={{padding:"10px 14px",marginBottom:14}}>
      <div className="stitle">Legend — {MAP_MODES.find(m=>m.key===mapMode)?.label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {getLegendItems().map(item=><div key={item.id} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:12,height:12,borderRadius:3,background:item.color,border:"1px solid rgba(0,0,0,0.1)",flexShrink:0}}/><span className="mono" style={{fontSize:10,color:"#5a4a32"}}>{item.name}</span></div>)}
        {getLegendItems().length===0&&<span className="mono" style={{fontSize:10,color:"#9a8a72"}}>No data yet</span>}
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div className="stitle" style={{marginBottom:0}}>Recent Jobs</div>
      <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>setShowJobHistory(s=>!s)}>{showJobHistory?"▲ Hide":"▼ Show all"}</button>
    </div>
    {jobLogs.slice(-3).reverse().map(log=>{
      const jt=rowConfig.jobTypes.find(j=>j.name===log.type);
      return(<div key={log.id} className="card" style={{padding:"10px 13px",marginBottom:6,display:"flex",gap:10,alignItems:"center"}}>
        <div style={{width:10,height:10,borderRadius:5,background:jt?.color||"#9a8a72",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>{log.type} <span style={{fontWeight:400,color:"#6a5a42"}}>· {log.crew}</span></div>
          <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>Rows: {log.rowIds.join(", ")||"—"} · {log.date}</div>
          {log.notes&&<div style={{fontSize:11,color:"#6a5a42",fontStyle:"italic",marginTop:2}}>"{log.notes}"</div>}
        </div>
      </div>);
    })}
    {showJobHistory&&jobLogs.slice(0,-3).reverse().map(log=>{
      const jt=rowConfig.jobTypes.find(j=>j.name===log.type);
      return(<div key={log.id} className="card" style={{padding:"10px 13px",marginBottom:6,display:"flex",gap:10,alignItems:"center"}}>
        <div style={{width:10,height:10,borderRadius:5,background:jt?.color||"#9a8a72",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>{log.type} <span style={{fontWeight:400,color:"#6a5a42"}}>· {log.crew}</span></div>
          <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>Rows: {log.rowIds.join(", ")||"—"} · {log.date}</div>
          {log.notes&&<div style={{fontSize:11,color:"#6a5a42",fontStyle:"italic",marginTop:2}}>"{log.notes}"</div>}
        </div>
      </div>);
    })}
    {jobLogs.length===0&&<div className="card" style={{padding:"24px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:8}}>📋</div><p className="mono" style={{fontSize:11,color:"#9a8a72"}}>No jobs logged yet</p></div>}
    {selRow&&<RowDetailModal row={selRow} rows={rows} setRows={setRows} rowConfig={rowConfig} isAdmin={isAdmin} jobLogs={jobLogs} onClose={()=>setSelRow(null)}/>}
    {showAdmin&&isAdmin&&<RowAdminModal rowConfig={rowConfig} setRowConfig={setRowConfig} onClose={()=>setShowAdmin(false)}/>}
    {showJobLog&&<JobLogModal rows={rows} setRows={setRows} rowConfig={rowConfig} jobLogs={jobLogs} setJobLogs={setJobLogs} settings={settings} onClose={()=>setShowJobLog(false)}/>}
  </div>);
}

// ─── ROW DETAIL MODAL ─────────────────────────────────────────────────────────
function RowDetailModal({row,rows,setRows,rowConfig,isAdmin,jobLogs,onClose}){
  const [editing,setEditing]=useState(false);
  const [f,setF]=useState({...row});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const rowJobs=jobLogs.filter(j=>j.rowIds.includes(row.id)).slice(-5).reverse();
  const toggleTag=name=>s("conditionTags",f.conditionTags.includes(name)?f.conditionTags.filter(t=>t!==name):[...f.conditionTags,name]);
  const togglePest=name=>s("pestFlags",f.pestFlags.includes(name)?f.pestFlags.filter(t=>t!==name):[...f.pestFlags,name]);
  const save=()=>{setRows(rs=>rs.map(r=>r.id===row.id?f:r));setEditing(false);};

  return(<div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><h2 style={{fontSize:18,fontWeight:700}}>Row {row.id}</h2><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{row.side.toUpperCase()} SIDE · {row.tunnel}</div></div>
        <div style={{display:"flex",gap:8}}>
          {isAdmin&&<button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>setEditing(e=>!e)}>{editing?"▲ Done":"✏️ Edit"}</button>}
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
      </div>
      {!editing&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card" style={{padding:"12px 14px"}}>
          <div className="stitle">Crop</div>
          {row.crop?<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:14,height:14,borderRadius:7,background:rowConfig.cropTypes.find(c=>c.name===row.crop)?.color||"#9a8a72"}}/><span style={{fontSize:15,fontWeight:600}}>{row.crop}</span></div>:<span style={{fontSize:13,color:"#9a8a72",fontStyle:"italic"}}>No crop set</span>}
          {row.plantedDate&&<div className="mono" style={{fontSize:10,color:"#9a8a72",marginTop:4}}>Planted: {row.plantedDate} · {daysOld(row.plantedDate)}d ago</div>}
        </div>
        <div className="card" style={{padding:"12px 14px"}}>
          <div className="stitle">Harvest Readiness</div>
          {(()=>{const rl=rowConfig.readinessLevels.find(r=>r.name===row.readiness);return(<div style={{display:"flex",alignItems:"center",gap:8}}>{rl&&<div style={{width:12,height:12,borderRadius:6,background:rl.color}}/>}<span style={{fontSize:13,fontWeight:600}}>{row.readiness||"Unknown"}</span></div>);})()}
        </div>
        <div className="card" style={{padding:"12px 14px"}}>
          <div className="stitle">Condition Tags</div>
          {row.conditionTags.length>0?<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{row.conditionTags.map(t=>{const cfg=rowConfig.conditionTags.find(x=>x.name===t);return(<span key={t} style={{padding:"4px 10px",borderRadius:12,background:cfg?cfg.color+"22":"#f0ebe2",border:`1.5px solid ${cfg?cfg.color:"#d0c4b4"}`,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:cfg?cfg.color:"#6a5a42"}}>{t}</span>);})}</div>:<span style={{fontSize:13,color:"#9a8a72",fontStyle:"italic"}}>None</span>}
        </div>
        {row.inAmendment&&<div className="card" style={{padding:"12px 14px",background:"#fff8ee",border:"1px solid #f0c060"}}>
          <div className="stitle" style={{color:"#a05008"}}>In Amendment</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {rowConfig.amendSteps.map((step,i)=><div key={step.id} style={{display:"flex",alignItems:"center",gap:8,opacity:i>row.amendStepIndex?0.3:1}}>
              <div style={{width:12,height:12,borderRadius:6,background:i<=row.amendStepIndex?step.color:"#d0c4b4",flexShrink:0}}/>
              <span className="mono" style={{fontSize:11,color:i===row.amendStepIndex?"#1a1208":"#6a5a42",fontWeight:i===row.amendStepIndex?700:400}}>{step.name}</span>
              {i===row.amendStepIndex&&<span className="mono" style={{fontSize:9,color:"#a05008",marginLeft:"auto"}}>← CURRENT</span>}
            </div>)}
          </div>
        </div>}
        <div className="card" style={{padding:"12px 14px"}}>
          <div className="stitle">Watering Zone</div>
          {row.wateringZone?(()=>{const wz=rowConfig.wateringZones.find(w=>w.name===row.wateringZone);return(<div style={{display:"flex",alignItems:"center",gap:8}}>{wz&&<div style={{width:12,height:12,borderRadius:6,background:wz.color}}/>}<span style={{fontSize:13,fontWeight:600}}>{row.wateringZone}</span></div>);})():<span style={{fontSize:13,color:"#9a8a72",fontStyle:"italic"}}>Not assigned</span>}
        </div>
        {row.pestFlags.length>0&&<div className="card" style={{padding:"12px 14px",background:"#fff5f5",border:"1px solid #fca5a5"}}>
          <div className="stitle" style={{color:"#8b1a1a"}}>⚠️ Pest Issues</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{row.pestFlags.map(p=>{const cfg=rowConfig.pestTypes.find(x=>x.name===p);return(<span key={p} style={{padding:"4px 10px",borderRadius:12,background:cfg?cfg.color+"22":"#fee2e2",border:`1.5px solid ${cfg?cfg.color:"#f87171"}`,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:cfg?cfg.color:"#8b1a1a"}}>{p}</span>);})}</div>
        </div>}
        {row.notes&&<div className="card" style={{padding:"12px 14px"}}><div className="stitle">Notes</div><p style={{fontSize:13,color:"#6a5a42",fontStyle:"italic"}}>"{row.notes}"</p></div>}
        {rowJobs.length>0&&<div><div className="stitle">Recent Jobs on Row {row.id}</div>{rowJobs.map(log=>{const jt=rowConfig.jobTypes.find(j=>j.name===log.type);return(<div key={log.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid #f0ebe2"}}><div style={{width:8,height:8,borderRadius:4,background:jt?.color||"#9a8a72",marginTop:4,flexShrink:0}}/><div><div style={{fontSize:13,fontWeight:600}}>{log.type} <span style={{fontWeight:400,color:"#6a5a42"}}>· {log.crew}</span></div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{log.date}</div>{log.notes&&<div style={{fontSize:11,color:"#6a5a42",fontStyle:"italic"}}>"{log.notes}"</div>}</div></div>);})}</div>}
      </div>}
      {editing&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>CROP TYPE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>{rowConfig.cropTypes.map(ct=><span key={ct.id} onClick={()=>s("crop",f.crop===ct.name?"":ct.name)} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${f.crop===ct.name?ct.color:"#d0c4b4"}`,background:f.crop===ct.name?ct.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",color:f.crop===ct.name?ct.color:"#6a5a42"}}>{ct.name}</span>)}</div>
          <input type="date" value={f.plantedDate||""} onChange={e=>s("plantedDate",e.target.value)} placeholder="Planted date" style={{colorScheme:"light"}}/>
        </div>
        <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>HARVEST READINESS</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.readinessLevels.map(rl=><span key={rl.id} onClick={()=>s("readiness",rl.name)} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${f.readiness===rl.name?rl.color:"#d0c4b4"}`,background:f.readiness===rl.name?rl.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",color:f.readiness===rl.name?rl.color:"#6a5a42"}}>{rl.name}</span>)}</div></div>
        <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>CONDITION TAGS</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.conditionTags.map(t=><span key={t.id} onClick={()=>toggleTag(t.name)} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${f.conditionTags.includes(t.name)?t.color:"#d0c4b4"}`,background:f.conditionTags.includes(t.name)?t.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",color:f.conditionTags.includes(t.name)?t.color:"#6a5a42"}}>{t.name}</span>)}</div></div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:f.inAmendment?8:0}}><span className="mono" style={{fontSize:11,color:"#9a8a72"}}>IN AMENDMENT:</span><button className={`toggle ${f.inAmendment?"on":""}`} onClick={()=>s("inAmendment",!f.inAmendment)}/></div>
          {f.inAmendment&&<div style={{display:"flex",flexDirection:"column",gap:4}}>{rowConfig.amendSteps.map((step,i)=><button key={step.id} onClick={()=>s("amendStepIndex",i)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${f.amendStepIndex===i?step.color:"#d0c4b4"}`,background:f.amendStepIndex===i?step.color+"22":"#faf7f2",cursor:"pointer"}}><div style={{width:10,height:10,borderRadius:5,background:step.color}}/><span className="mono" style={{fontSize:11}}>{step.name}</span>{f.amendStepIndex===i&&<span style={{marginLeft:"auto"}}>← current</span>}</button>)}</div>}
        </div>
        <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>WATERING ZONE</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.wateringZones.map(wz=><span key={wz.id} onClick={()=>s("wateringZone",f.wateringZone===wz.name?"":wz.name)} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${f.wateringZone===wz.name?wz.color:"#d0c4b4"}`,background:f.wateringZone===wz.name?wz.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",color:f.wateringZone===wz.name?wz.color:"#6a5a42"}}>{wz.name}</span>)}</div></div>
        <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>PEST FLAGS</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{rowConfig.pestTypes.map(pt=><span key={pt.id} onClick={()=>togglePest(pt.name)} style={{padding:"5px 12px",borderRadius:16,border:`2px solid ${f.pestFlags.includes(pt.name)?pt.color:"#d0c4b4"}`,background:f.pestFlags.includes(pt.name)?pt.color+"22":"#faf7f2",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",color:f.pestFlags.includes(pt.name)?pt.color:"#6a5a42"}}>{pt.name}</span>)}</div></div>
        <div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>NOTES</div><textarea rows={3} value={f.notes||""} onChange={e=>s("notes",e.target.value)} placeholder="Observations about this row…"/></div>
        <button className="btn btn-green" style={{padding:13,width:"100%"}} onClick={save}>💾 Save Row</button>
      </div>}
    </div>
  </div>);
}

// ─── ROW ADMIN MODAL ──────────────────────────────────────────────────────────
function RowAdminModal({rowConfig,setRowConfig,onClose}){
  const [activeTab,setActiveTab]=useState("cropTypes");
  const [cfg,setCfg]=useState(JSON.parse(JSON.stringify(rowConfig)));
  const tabs=[{key:"cropTypes",label:"Crops"},{key:"conditionTags",label:"Tags"},{key:"amendSteps",label:"Amend Steps"},{key:"pestTypes",label:"Pests"},{key:"wateringZones",label:"Zones"},{key:"readinessLevels",label:"Readiness"},{key:"jobTypes",label:"Job Types"}];
  const list=cfg[activeTab]||[];
  const update=(idx,field,val)=>setCfg(c=>({...c,[activeTab]:c[activeTab].map((item,i)=>i===idx?{...item,[field]:val}:item)}));
  const remove=idx=>setCfg(c=>({...c,[activeTab]:c[activeTab].filter((_,i)=>i!==idx)}));
  const addNew=()=>setCfg(c=>({...c,[activeTab]:[...c[activeTab],{id:`new${Date.now()}`,name:"New Item",color:"#9a8a72"}]}));
  const moveUp=idx=>{if(idx===0)return;setCfg(c=>{const a=[...c[activeTab]];[a[idx-1],a[idx]]=[a[idx],a[idx-1]];return{...c,[activeTab]:a};});};
  const moveDown=idx=>{const a=cfg[activeTab];if(idx===a.length-1)return;setCfg(c=>{const ar=[...c[activeTab]];[ar[idx],ar[idx+1]]=[ar[idx+1],ar[idx]];return{...c,[activeTab]:ar};});};
  const save=()=>{setRowConfig(cfg);onClose();};
  return(<div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h2 style={{fontSize:17,fontWeight:700}}>⚙️ Row Config</h2><button className="btn-icon" onClick={onClose}>✕</button></div>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:14}}>
        {tabs.map(t=><button key={t.key} className={`tab-pill ${activeTab===t.key?"active":""}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0,marginBottom:16}}>
        {list.map((item,idx)=><div key={item.id} className="admin-config-row">
          <input type="color" value={item.color} onChange={e=>update(idx,"color",e.target.value)} style={{width:32,height:32,padding:2,border:"1.5px solid #d0c4b4",borderRadius:8,cursor:"pointer",background:"none"}}/>
          <input value={item.name} onChange={e=>update(idx,"name",e.target.value)} style={{flex:1,fontSize:13,padding:"8px 10px"}}/>
          <button className="btn-icon" style={{fontSize:14,color:"#9a8a72"}} onClick={()=>moveUp(idx)}>↑</button>
          <button className="btn-icon" style={{fontSize:14,color:"#9a8a72"}} onClick={()=>moveDown(idx)}>↓</button>
          <button className="btn-icon" style={{fontSize:14,color:"#ef4444"}} onClick={()=>remove(idx)}>🗑</button>
        </div>)}
      </div>
      <button className="btn btn-ghost btn-sm" style={{width:"100%",marginBottom:14}} onClick={addNew}>+ Add New</button>
      <button className="btn btn-green" style={{width:"100%",padding:13}} onClick={save}>💾 Save All Changes</button>
      <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:8}} onClick={onClose}>Cancel</button>
    </div>
  </div>);
}

// ─── MARKET TAB ───────────────────────────────────────────────────────────────
function MarketTab({items,updateItem,marketPlan,setMarketPlan}){
  const [view,setView]=useState("plan"),[returns,setReturns]=useState({});
  const getPlan=id=>marketPlan[id]||{mode:"qty",wantQty:0};
  const setPlanMode=(id,mode)=>setMarketPlan(p=>({...p,[id]:{...getPlan(id),mode}}));
  const setPlanQty=(id,v)=>setMarketPlan(p=>({...p,[id]:{...getPlan(id),wantQty:Math.max(0,parseInt(v)||0)}}));
  const getEffQty=item=>{const p=getPlan(item.id);return p.mode==="all"?getTotalQty(item):p.wantQty||0;};
  const planned=items.filter(i=>{const p=getPlan(i.id);return p.mode==="all"||p.wantQty>0;});
  const harvestNeeded=item=>Math.max(0,getEffQty(item)-getTotalQty(item));
  const closeOut=()=>{planned.forEach(item=>{const ret=returns[item.id]||0,sold=getEffQty(item)-ret;if(sold>0){let rem=sold;const ub=[...(item.batches||[])].sort((a,b)=>new Date(a.harvestedOn)-new Date(b.harvestedOn)).map(b=>{if(rem<=0||b.qty<=0)return b;const take=Math.min(b.qty,rem);rem-=take;return{...b,qty:b.qty-take};});updateItem(item.id,{batches:ub});}});setView("done");};
  if(view==="done") return(<div className="fade" style={{textAlign:"center",paddingTop:60}}><div style={{fontSize:72,marginBottom:16}}>🎉</div><h2 style={{fontSize:22,fontWeight:700,color:"#1a4a0a",marginBottom:8}}>Market Closed!</h2><p className="mono" style={{fontSize:12,color:"#9a8a72",marginBottom:24}}>Inventory updated.</p><button className="btn btn-green" onClick={()=>{setView("plan");setReturns({});}}>Plan Next Market</button></div>);
  return(<div className="fade">
    <h1 style={{fontSize:22,fontWeight:700,marginTop:4,marginBottom:4}}>To Market</h1>
    <div className="mode-seg">{[{k:"plan",l:"Plan Load"},{k:"closeout",l:"Close Out"}].map(v=><button key={v.k} className={view===v.k?"active":""} onClick={()=>setView(v.k)}>{v.l}</button>)}</div>
    {view==="plan"&&<>
      {planned.filter(i=>harvestNeeded(i)>0).length>0&&<div className="warn-bar" style={{marginBottom:14}}><span>🌾</span><div><div className="mono" style={{fontSize:11,color:"#713f12",marginBottom:4}}>STILL NEED TO HARVEST:</div>{planned.filter(i=>harvestNeeded(i)>0).map(i=><div key={i.id} className="mono" style={{fontSize:11,color:"#a05008"}}>· {i.name} — {harvestNeeded(i)} more {i.sellUnit}</div>)}</div></div>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {items.map(item=>{const plan=getPlan(item.id),stock=getTotalQty(item),effQty=getEffQty(item),need=harvestNeeded(item),isPlanned=plan.mode==="all"||plan.wantQty>0;return(<div key={item.id} className="card" style={{padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:22}}>{item.emoji}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{item.name}</div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{stock>0?multiUnitDisplay(item,stock).join(" · "):"none in stock"} in stock</div></div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div className="bring-toggle" style={{width:160,flexShrink:0}}><button className={plan.mode==="qty"?"active":""} onClick={()=>setPlanMode(item.id,"qty")}>Bring X</button><button className={plan.mode==="all"?"active":""} onClick={()=>setPlanMode(item.id,"all")}>Bring All</button></div>
            {plan.mode==="qty"?<input type="number" inputMode="numeric" value={plan.wantQty||""} onChange={e=>setPlanQty(item.id,e.target.value)} placeholder="0" style={{width:70,textAlign:"center",padding:"8px 6px",fontSize:14,flexShrink:0}}/>:<span className="mono" style={{fontSize:12,color:"#1a4a0a",fontWeight:600}}>{stock>0?`All ${stock} ${item.sellUnit}`:"Nothing in stock"}</span>}
          </div>
          {isPlanned&&<div style={{marginTop:8}}>{plan.mode==="all"&&stock===0?<div style={{background:"#fff8ee",border:"1px solid #f0c060",borderRadius:8,padding:"5px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#a05008"}}>🌾 Nothing in stock — needs harvest</div>:need>0?<div style={{background:"#fff8ee",border:"1px solid #f0c060",borderRadius:8,padding:"5px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#a05008"}}>🌾 Harvest {need} more {item.sellUnit}</div>:<div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:8,padding:"5px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#1a5a0a"}}>✅ {effQty} {item.sellUnit} — ready</div>}</div>}
        </div>);})}
      </div>
      {planned.length>0&&<div className="card" style={{padding:16,background:"#f0fae8",border:"1px solid #9dd87a"}}><div className="stitle" style={{color:"#1a4a0a"}}>Load Summary</div>{planned.map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13}}>{item.emoji} {item.name}</span><span className="mono" style={{fontSize:12,color:"#1a4a0a",fontWeight:600}}>{getPlan(item.id).mode==="all"?"ALL":getEffQty(item)} {item.sellUnit}</span></div>)}<div style={{borderTop:"1px solid #b8e098",marginTop:10,paddingTop:10}}><span className="mono" style={{fontSize:11,color:"#1a4a0a"}}>${planned.reduce((s,i)=>s+i.price*getEffQty(i),0).toFixed(0)} potential revenue</span></div></div>}
    </>}
    {view==="closeout"&&(planned.length===0?<div style={{textAlign:"center",paddingTop:40,color:"#9a8a72"}}><p className="mono" style={{fontSize:12}}>No plan set. Go to Plan Load first.</p></div>:<><p style={{fontSize:13,color:"#6a5a42",marginBottom:14}}>Enter what came back unsold.</p><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>{planned.map(item=>{const ret=returns[item.id]||0,effQty=getEffQty(item),sold=effQty-ret;return(<div key={item.id} className="card" style={{padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:22}}>{item.emoji}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{item.name}</div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>Brought: {getPlan(item.id).mode==="all"?"All":effQty} {item.sellUnit}</div></div><span className="mono" style={{fontSize:14,fontWeight:700,color:sold>0?"#1a4a0a":"#9a8a72"}}>Sold: {sold}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span className="mono" style={{fontSize:11,color:"#9a8a72",whiteSpace:"nowrap"}}>Came back:</span><input type="number" inputMode="numeric" value={returns[item.id]||""} onChange={e=>setReturns(r=>({...r,[item.id]:Math.max(0,parseInt(e.target.value)||0)}))} placeholder="0" style={{flex:1,textAlign:"center"}}/></div></div>);})}</div><button className="btn btn-green" style={{width:"100%",padding:14}} onClick={closeOut}>✅ Confirm & Update Inventory</button></>)}
  </div>);
}

// ─── PUBLIC TAB ───────────────────────────────────────────────────────────────
function PublicTab({items,updateItem,orders,setOrders,settings,setSettings,isAdmin}){
  const [view,setView]=useState("availability"),[form,setForm]=useState({name:"",phone:"",pickup:"",notes:"",cart:{}}),[submitted,setSubmitted]=useState(false),[showSettings,setShowSettings]=useState(false);
  const orderable=items.filter(i=>i.orderable&&getTotalQty(i)>0),pending=orders.filter(o=>o.status==="pending").length;
  const setCart=(id,v)=>setForm(f=>({...f,cart:{...f.cart,[id]:Math.max(0,parseInt(v)||0)}}));
  const placeOrder=()=>{const lines=Object.entries(form.cart).filter(([,q])=>q>0).map(([id,qty])=>{const item=items.find(i=>i.id===parseInt(id));return{id:parseInt(id),name:item?.name,qty,unit:item?.sellUnit,price:item?.price};});if(!lines.length||!form.name)return;setOrders(os=>[...os,{id:Date.now(),...form,lineItems:lines,status:"pending",placedAt:new Date().toLocaleString()}]);setSubmitted(true);};
  return(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:4}}><h1 style={{fontSize:22,fontWeight:700}}>Public & Orders</h1>{isAdmin&&<button className="btn btn-ghost btn-sm" onClick={()=>setShowSettings(true)}>⚙️ Settings</button>}</div>
    <p className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:14}}>WEBSITE · PRE-ORDERS · VISIBILITY</p>
    <div className="mode-seg">{[{k:"availability",l:"Availability"},{k:"order",l:"Pre-Order"},{k:"orders",l:`Orders (${pending})`}].map(v=><button key={v.k} className={view===v.k?"active":""} onClick={()=>setView(v.k)}>{v.l}</button>)}</div>
    {view==="availability"&&<div>{isAdmin&&<div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:10,padding:"9px 13px",marginBottom:12}}><span className="mono" style={{fontSize:11,color:"#1a4a0a"}}>🔓 Admin: toggle Show and Order per item</span></div>}<div style={{display:"flex",flexDirection:"column",gap:8}}>{items.map(i=><div key={i.id} className="card" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:10,opacity:i.publicVisible?1:0.45}}><span style={{fontSize:20}}>{i.emoji}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{i.name}</div><div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}><span className="mono" style={{fontSize:10,color:"#9a8a72"}}>${i.price}/{i.sellUnit} · {getTotalQty(i)} {i.sellUnit}</span>{i.orderable&&<span className="tag tag-fresh" style={{fontSize:9}}>orderable</span>}</div></div>{isAdmin&&<div style={{display:"flex",flexDirection:"column",gap:7,alignItems:"flex-end"}}><div style={{display:"flex",alignItems:"center",gap:5}}><span className="mono" style={{fontSize:9,color:"#9a8a72"}}>SHOW</span><button className={`toggle ${i.publicVisible?"on":""}`} onClick={()=>updateItem(i.id,{publicVisible:!i.publicVisible})}/></div><div style={{display:"flex",alignItems:"center",gap:5}}><span className="mono" style={{fontSize:9,color:"#9a8a72"}}>ORDER</span><button className={`toggle ${i.orderable?"on":""}`} onClick={()=>updateItem(i.id,{orderable:!i.orderable})} disabled={!i.publicVisible} style={{opacity:i.publicVisible?1:0.4}}/></div></div>}</div>)}</div></div>}
    {view==="order"&&<div><div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:12,padding:"13px 14px",marginBottom:14}}><div style={{fontWeight:700,fontSize:15,color:"#1a4a0a",marginBottom:2}}>🌿 Going Rogue Farms</div><div className="mono" style={{fontSize:11,color:"#3a7010"}}>Order by {settings.orderDeadline}</div><div className="mono" style={{fontSize:11,color:"#3a7010"}}>Pickup: {settings.pickupLocation}</div></div>
      {!submitted?<div style={{display:"flex",flexDirection:"column",gap:11}}><input placeholder="Your name *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/><input placeholder="Phone / text" inputMode="tel" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/><input placeholder="Pickup time preference" value={form.pickup} onChange={e=>setForm(f=>({...f,pickup:e.target.value}))}/><div className="mono" style={{fontSize:11,color:"#9a8a72",marginTop:4}}>SELECT ITEMS:</div>{orderable.length===0&&<p style={{fontSize:13,color:"#9a8a72",fontStyle:"italic"}}>No items available for pre-order right now.</p>}{orderable.map(i=><div key={i.id} className="card" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{i.emoji}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{i.name}</div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>${i.price}/{i.sellUnit}</div></div><div style={{display:"flex",alignItems:"center",gap:7}}><button className="btn-icon" style={{background:"#fee2e2",borderRadius:8,padding:"5px 9px"}} onClick={()=>setCart(i.id,(form.cart[i.id]||0)-1)}>−</button><span className="mono" style={{fontSize:15,minWidth:22,textAlign:"center",fontWeight:600}}>{form.cart[i.id]||0}</span><button className="btn-icon" style={{background:"#dcfce7",borderRadius:8,padding:"5px 9px"}} onClick={()=>setCart(i.id,(form.cart[i.id]||0)+1)}>+</button></div></div>)}<textarea rows={2} placeholder="Notes or requests" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/><button className="btn btn-green" style={{padding:15,fontSize:14}} onClick={placeOrder} disabled={!form.name||!Object.values(form.cart).some(q=>q>0)}>Place Pre-Order →</button></div>
      :<div className="card" style={{padding:30,textAlign:"center"}}><div style={{fontSize:52,marginBottom:12}}>🎉</div><h3 style={{fontSize:18,fontWeight:700,color:"#1a4a0a",marginBottom:8}}>Order Received!</h3><p style={{fontSize:13,color:"#6a5a42"}}>We'll reach out to confirm pickup.</p><button className="btn btn-ghost btn-sm" style={{marginTop:14}} onClick={()=>{setSubmitted(false);setForm({name:"",phone:"",pickup:"",notes:"",cart:{}});}}>Place Another</button></div>}
    </div>}
    {view==="orders"&&<div>{!isAdmin&&<div className="warn-bar" style={{marginBottom:14}}><span>🔒</span><span className="mono" style={{fontSize:11,color:"#713f12",marginLeft:8}}>ADMIN ACCESS REQUIRED</span></div>}{isAdmin&&orders.length===0&&<div style={{textAlign:"center",paddingTop:50,color:"#9a8a72"}}><div style={{fontSize:48,marginBottom:10}}>🛒</div><p className="mono" style={{fontSize:12}}>No orders yet.</p></div>}{isAdmin&&orders.map(o=><div key={o.id} className="card" style={{padding:14,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}><div><div style={{fontWeight:700,fontSize:15}}>{o.name}</div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{o.phone} · {o.pickup}</div><div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{o.placedAt}</div></div><div style={{display:"flex",gap:7}}><button className="btn btn-green btn-sm" onClick={()=>setOrders(os=>os.map(x=>x.id===o.id?{...x,status:"confirmed"}:x))}>{o.status==="confirmed"?"✅":"Confirm"}</button><button className="btn btn-ghost btn-sm" onClick={()=>setOrders(os=>os.filter(x=>x.id!==o.id))}>✕</button></div></div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:o.notes?8:0}}>{o.lineItems.map(li=><span key={li.id} style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:6,padding:"3px 9px",fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{li.qty}× {li.name}</span>)}</div>{o.notes&&<p style={{fontSize:13,color:"#6a5a42",fontStyle:"italic"}}>"{o.notes}"</p>}</div>)}</div>}
    {showSettings&&isAdmin&&<FarmSettingsModal settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
  </div>);
}

// ─── EDIT ITEM MODAL ──────────────────────────────────────────────────────────
function EditItemModal({item,onSave,onDelete,onClose}){
  const [f,setF]=useState({...item,workflowStepsStr:(item.workflowSteps||[]).join(", ")});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const [newBatchQty,setNewBatchQty]=useState(""),[newBatchDate,setNewBatchDate]=useState(todayStr());
  const handleSave=()=>{const steps=f.workflowStepsStr?f.workflowStepsStr.split(",").map(s=>s.trim()).filter(Boolean):[];onSave({...f,workflowSteps:steps});};
  const addBatch=()=>{if(!newBatchQty)return;const batch={id:Date.now(),qty:parseInt(newBatchQty)||0,harvestedOn:newBatchDate,stepsDone:[]};s("batches",[...(f.batches||[]),batch]);setNewBatchQty("");};
  return(<div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="modal fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:17,fontWeight:700}}>Edit — {item.name}</h2><button className="btn-icon" onClick={onClose}>✕</button></div>
    <div style={{display:"flex",flexDirection:"column",gap:11}}>
      <div style={{display:"flex",gap:9}}><input style={{width:58}} value={f.emoji} onChange={e=>s("emoji",e.target.value)} placeholder="emoji"/><input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Name"/></div>
      <div style={{display:"flex",gap:9}}><input type="number" inputMode="decimal" value={f.price} onChange={e=>s("price",parseFloat(e.target.value)||0)} placeholder="Price $"/><input value={f.sellUnit} onChange={e=>s("sellUnit",e.target.value)} placeholder="Sell unit"/></div>
      <select value={f.cat} onChange={e=>s("cat",e.target.value)}>{ALL_CATS.slice(1).map(c=><option key={c}>{c}</option>)}</select>
      <div className="mono" style={{fontSize:11,color:"#9a8a72",marginTop:4}}>HARVEST UNIT SETTINGS</div>
      <div style={{display:"flex",gap:9}}><input value={f.harvestUnit} onChange={e=>s("harvestUnit",e.target.value)} placeholder="Harvest unit"/><input type="number" inputMode="numeric" value={f.harvestToSellRatio} onChange={e=>s("harvestToSellRatio",parseInt(e.target.value)||1)} placeholder="Ratio" style={{width:70}}/></div>
      <div style={{display:"flex",gap:9}}><input value={f.altSellUnit||""} onChange={e=>s("altSellUnit",e.target.value)} placeholder="Alt unit (flat…)"/><input type="number" inputMode="numeric" value={f.altSellRatio||""} onChange={e=>s("altSellRatio",parseInt(e.target.value)||0)} placeholder="Per alt" style={{width:70}}/></div>
      <div className="mono" style={{fontSize:11,color:"#9a8a72",marginTop:4}}>WORKFLOW STEPS (comma-separated)</div>
      <input value={f.workflowStepsStr||""} onChange={e=>s("workflowStepsStr",e.target.value)} placeholder="e.g. Harvest, Wash, Trim, Bundle"/>
      <div className="mono" style={{fontSize:11,color:"#9a8a72",marginTop:4}}>ADD A BATCH</div>
      <div style={{display:"flex",gap:9}}><input type="number" inputMode="numeric" value={newBatchQty} onChange={e=>setNewBatchQty(e.target.value)} placeholder={`Qty in ${f.sellUnit||"units"}`}/><input type="date" value={newBatchDate} onChange={e=>setNewBatchDate(e.target.value)} style={{width:140}}/></div>
      <button className="btn btn-ghost btn-sm" onClick={addBatch} disabled={!newBatchQty}>+ Add Batch</button>
      {(f.batches||[]).length>0&&<div><div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>CURRENT BATCHES</div>{f.batches.map((b,idx)=><div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#faf7f2",borderRadius:8,marginBottom:4}}><span className="mono" style={{fontSize:11}}>Batch {idx+1}: {b.qty} {f.sellUnit} · {b.harvestedOn}</span><button className="btn-icon" style={{fontSize:12,color:"#ef4444"}} onClick={()=>s("batches",f.batches.filter(x=>x.id!==b.id))}>🗑</button></div>)}</div>}
      <button className="btn btn-green" style={{padding:13,marginTop:4}} onClick={handleSave}>Save Changes</button>
      <button className="btn btn-red" style={{padding:11}} onClick={onDelete}>Delete Item</button>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
    </div>
  </div></div>);
}

// ─── ADD ITEM MODAL ───────────────────────────────────────────────────────────
function AddItemModal({onAdd,onClose}){
  const [f,setF]=useState({cat:"Vegetables",name:"",emoji:"🌱",price:0,sellUnit:"each",harvestUnit:"each",harvestToSellRatio:1,altSellUnit:"",altSellRatio:0,freshnessType:"greens",publicVisible:true,orderable:false,workflowStepsStr:"",batches:[]});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const handleAdd=()=>{if(!f.name)return;const steps=f.workflowStepsStr?f.workflowStepsStr.split(",").map(s=>s.trim()).filter(Boolean):[];const{workflowStepsStr,...rest}=f;onAdd({...rest,workflowSteps:steps});};
  return(<div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="modal fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:17,fontWeight:700}}>Add New Item</h2><button className="btn-icon" onClick={onClose}>✕</button></div>
    <div style={{display:"flex",flexDirection:"column",gap:11}}>
      <div style={{display:"flex",gap:9}}><input style={{width:58}} value={f.emoji} onChange={e=>s("emoji",e.target.value)} placeholder="emoji"/><input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Name *"/></div>
      <div style={{display:"flex",gap:9}}><input type="number" inputMode="decimal" value={f.price} onChange={e=>s("price",parseFloat(e.target.value)||0)} placeholder="Price $"/><input value={f.sellUnit} onChange={e=>s("sellUnit",e.target.value)} placeholder="Sell unit"/></div>
      <div style={{display:"flex",gap:9}}><select value={f.cat} onChange={e=>s("cat",e.target.value)}>{ALL_CATS.slice(1).map(c=><option key={c}>{c}</option>)}</select><select value={f.freshnessType} onChange={e=>s("freshnessType",e.target.value)}>{Object.keys(FW).map(k=><option key={k}>{k}</option>)}</select></div>
      <div style={{display:"flex",gap:9}}><input value={f.harvestUnit} onChange={e=>s("harvestUnit",e.target.value)} placeholder="Harvest unit"/><input type="number" inputMode="numeric" value={f.harvestToSellRatio} onChange={e=>s("harvestToSellRatio",parseInt(e.target.value)||1)} placeholder="Ratio" style={{width:70}}/></div>
      <div style={{display:"flex",gap:9}}><input value={f.altSellUnit} onChange={e=>s("altSellUnit",e.target.value)} placeholder="Alt unit (optional)"/><input type="number" inputMode="numeric" value={f.altSellRatio||""} onChange={e=>s("altSellRatio",parseInt(e.target.value)||0)} placeholder="Per alt" style={{width:70}}/></div>
      <div className="mono" style={{fontSize:11,color:"#9a8a72"}}>WORKFLOW STEPS (comma-separated, optional)</div>
      <input value={f.workflowStepsStr} onChange={e=>s("workflowStepsStr",e.target.value)} placeholder="e.g. Harvest, Wash, Bundle"/>
      <button className="btn btn-green" style={{padding:13,marginTop:4}} onClick={handleAdd} disabled={!f.name}>Add Item</button>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
    </div>
  </div></div>);
}

// ─── FARM SETTINGS MODAL ──────────────────────────────────────────────────────
function FarmSettingsModal({settings,setSettings,onClose}){
  const [f,setF]=useState({...settings,crewStr:(settings.crew||[]).join(", ")});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const saveFn=()=>{const crew=f.crewStr.split(",").map(s=>s.trim()).filter(Boolean);setSettings({...f,crew});onClose();};
  return(<div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="modal fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:17,fontWeight:700}}>Farm Settings</h2><button className="btn-icon" onClick={onClose}>✕</button></div>
    <div style={{display:"flex",flexDirection:"column",gap:11}}>
      <input value={f.farmName} onChange={e=>s("farmName",e.target.value)} placeholder="Farm name"/>
      <input value={f.tagline} onChange={e=>s("tagline",e.target.value)} placeholder="Address / tagline"/>
      <input value={f.phone} onChange={e=>s("phone",e.target.value)} placeholder="Phone"/>
      <input value={f.orderDeadline} onChange={e=>s("orderDeadline",e.target.value)} placeholder="Order deadline"/>
      <input value={f.pickupLocation} onChange={e=>s("pickupLocation",e.target.value)} placeholder="Pickup location"/>
      <input value={f.adminPassword} onChange={e=>s("adminPassword",e.target.value)} placeholder="Admin password"/>
      <div className="mono" style={{fontSize:11,color:"#9a8a72"}}>CREW (comma-separated)</div>
      <input value={f.crewStr} onChange={e=>s("crewStr",e.target.value)} placeholder="Name1, Name2, Name3"/>
      <button className="btn btn-green" style={{padding:13,marginTop:4}} onClick={saveFn}>Save Settings</button>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
    </div>
  </div></div>);
}
