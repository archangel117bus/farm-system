import { useState, useEffect } from "react";

// ─── FRESHNESS WINDOWS ────────────────────────────────────────────────────────
const FW = {
  berry:       { fresh:3,  aging:5   },
  greens:      { fresh:4,  aging:6   },
  lettuce:     { fresh:5,  aging:7   },
  herbs:       { fresh:6,  aging:9   },
  microgreens: { fresh:5,  aging:8   },
  roots:       { fresh:10, aging:16  },
  brassicas:   { fresh:6,  aging:10  },
  alliums:     { fresh:7,  aging:12  },
  fruiting:    { fresh:4,  aging:6   },
  squash:      { fresh:7,  aging:12  },
  legumes:     { fresh:4,  aging:6   },
  peppers:     { fresh:7,  aging:12  },
  tomatoes:    { fresh:4,  aging:6   },
  flowers:     { fresh:4,  aging:6   },
  canned:      { fresh:365,aging:540 },
  pickled:     { fresh:180,aging:360 },
  jam:         { fresh:180,aging:360 },
  refrigerated:{ fresh:14, aging:21  },
};

const todayStr = () => new Date().toISOString().split("T")[0];
const daysOld  = (d) => Math.floor((new Date() - new Date(d)) / 86400000);

const getFreshness = (item) => {
  if (!item.harvestedOn) return "unknown";
  const d = daysOld(item.harvestedOn);
  const w = FW[item.freshnessType] || FW.greens;
  if (d >= w.aging)        return "expired";
  if (d >= w.fresh)        return "aging";
  if (d >= w.fresh * 0.6)  return "usefirst";
  return "fresh";
};

const FC = { fresh:"#22c55e", usefirst:"#eab308", aging:"#f97316", expired:"#ef4444", unknown:"#94a3b8" };
const FL = { fresh:"Fresh", usefirst:"Use First", aging:"Aging", expired:"Past Peak", unknown:"Not Set" };

// ─── UNIT DISPLAY HELPER ──────────────────────────────────────────────────────
// Returns a human-readable stock string for any item
// qty is always stored in sellUnit (primary sell unit)
const displayQty = (item) => {
  const q = item.qty || 0;
  if (item.altSellUnit && item.altSellRatio) {
    const alts  = Math.floor(q / item.altSellRatio);
    const rem   = q % item.altSellRatio;
    if (alts > 0 && rem > 0) return `${alts} ${item.altSellUnit} + ${rem} ${item.sellUnit}`;
    if (alts > 0)             return `${alts} ${item.altSellUnit}`;
    return `${rem} ${item.sellUnit}`;
  }
  if (item.gramsPerPackage) {
    const grams = (q * item.gramsPerPackage).toFixed(0);
    return `${q} pkg (${grams}g)`;
  }
  return `${q} ${item.sellUnit}`;
};

// Convert harvest entry -> qty in sell units
const harvestToQty = (item, crates, remainder) => {
  if (item.harvestUnit === "crate") {
    return (parseInt(crates) || 0) * (item.harvestToSellRatio || 1) + (parseInt(remainder) || 0);
  }
  return parseInt(crates) || 0; // crates field = main count for non-crate items
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
// qty = stored in sellUnit always
// harvestUnit = what farm hand logs
// sellUnit    = primary display/sell unit
// harvestToSellRatio = how many sellUnits per harvestUnit (default 1)
// altSellUnit / altSellRatio = optional second way to display (e.g. flats)
// gramsPerPackage = microgreens only

const SEED_ITEMS = [
  // BERRIES
  { id:101, cat:"Berries",     name:"Strawberries",           price:7.00,  emoji:"🍓", freshnessType:"berry",
    harvestUnit:"crate", harvestToSellRatio:20, sellUnit:"quart", altSellUnit:"flat", altSellRatio:8,
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:102, cat:"Berries",     name:"Blackberries",           price:7.00,  emoji:"🫐", freshnessType:"berry",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"pint",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:103, cat:"Berries",     name:"Blueberries",            price:6.67,  emoji:"🫐", freshnessType:"berry",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"pint",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:104, cat:"Berries",     name:"u-pic Blueberries",      price:28.00, emoji:"🫐", freshnessType:"berry",
    harvestUnit:"gallon", harvestToSellRatio:1, sellUnit:"gallon",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  // GREENS
  { id:201, cat:"Greens",      name:"Arugula",                price:10.00, emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:202, cat:"Greens",      name:"Spinach",                price:20.00, emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:203, cat:"Greens",      name:"Dino Kale",              price:4.00,  emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:204, cat:"Greens",      name:"Siberian Kale",          price:4.00,  emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:205, cat:"Greens",      name:"Red Russian Kale",       price:4.00,  emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:206, cat:"Greens",      name:"Swiss Chard",            price:4.00,  emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:207, cat:"Greens",      name:"Romaine Lettuce",        price:3.00,  emoji:"🥬", freshnessType:"lettuce",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:208, cat:"Greens",      name:"Salanova Lettuce Mix",   price:6.00,  emoji:"🥗", freshnessType:"lettuce",
    harvestUnit:"bag",    harvestToSellRatio:1, sellUnit:"bag",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:209, cat:"Greens",      name:"Mustard Greens",         price:4.00,  emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:210, cat:"Greens",      name:"Collard Greens",         price:4.00,  emoji:"🥬", freshnessType:"greens",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  // VEGETABLES
  { id:301, cat:"Vegetables",  name:"Beets",                  price:4.00,  emoji:"🫀", freshnessType:"roots",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:302, cat:"Vegetables",  name:"Broccoli",               price:8.00,  emoji:"🥦", freshnessType:"brassicas",
    harvestUnit:"head",   harvestToSellRatio:1, sellUnit:"head",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:303, cat:"Vegetables",  name:"Cabbage",                price:5.00,  emoji:"🥬", freshnessType:"brassicas",
    harvestUnit:"head",   harvestToSellRatio:1, sellUnit:"head",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:304, cat:"Vegetables",  name:"Carrots",                price:5.00,  emoji:"🥕", freshnessType:"roots",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:305, cat:"Vegetables",  name:"Cucumbers / English",    price:2.00,  emoji:"🥒", freshnessType:"fruiting",
    harvestUnit:"each",   harvestToSellRatio:1, sellUnit:"each",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:306, cat:"Vegetables",  name:"Eggplant",               price:3.00,  emoji:"🍆", freshnessType:"fruiting",
    harvestUnit:"each",   harvestToSellRatio:1, sellUnit:"each",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:307, cat:"Vegetables",  name:"Salad Turnips",          price:4.00,  emoji:"🟣", freshnessType:"roots",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:308, cat:"Vegetables",  name:"Kohlrabi",               price:3.00,  emoji:"🫑", freshnessType:"brassicas",
    harvestUnit:"each",   harvestToSellRatio:1, sellUnit:"each",
    qty:0, harvestedOn:"", publicVisible:false, orderable:false },
  { id:309, cat:"Vegetables",  name:"Radishes",               price:2.00,  emoji:"🔴", freshnessType:"roots",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:310, cat:"Vegetables",  name:"Yellow Squash",          price:3.00,  emoji:"🟡", freshnessType:"squash",
    harvestUnit:"each",   harvestToSellRatio:1, sellUnit:"each",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:311, cat:"Vegetables",  name:"Zucchini",               price:3.00,  emoji:"🥒", freshnessType:"squash",
    harvestUnit:"each",   harvestToSellRatio:1, sellUnit:"each",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:312, cat:"Vegetables",  name:"Green Onions",           price:4.00,  emoji:"🌱", freshnessType:"alliums",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:313, cat:"Vegetables",  name:"Leeks",                  price:1.00,  emoji:"🌿", freshnessType:"alliums",
    harvestUnit:"each",   harvestToSellRatio:1, sellUnit:"each",
    qty:0, harvestedOn:"", publicVisible:false, orderable:false },
  { id:314, cat:"Vegetables",  name:"Potatoes",               price:2.00,  emoji:"🥔", freshnessType:"roots",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:315, cat:"Vegetables",  name:"Purple Top Turnips",     price:4.00,  emoji:"🟣", freshnessType:"roots",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:316, cat:"Vegetables",  name:"Green Beans",            price:8.00,  emoji:"🫘", freshnessType:"legumes",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:317, cat:"Vegetables",  name:"Okra",                   price:3.00,  emoji:"🫘", freshnessType:"fruiting",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:318, cat:"Vegetables",  name:"Okra Sliced",            price:5.00,  emoji:"🫘", freshnessType:"fruiting",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:319, cat:"Vegetables",  name:"Sugar Snap Peas",        price:8.00,  emoji:"🫛", freshnessType:"legumes",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  // PEPPERS
  { id:401, cat:"Peppers",     name:"Anaheim / Chili",        price:4.00,  emoji:"🌶️", freshnessType:"peppers",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:402, cat:"Peppers",     name:"Bell Peppers",           price:4.00,  emoji:"🫑", freshnessType:"peppers",
    harvestUnit:"each",   harvestToSellRatio:1, sellUnit:"each",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:403, cat:"Peppers",     name:"Jalapeños",              price:4.00,  emoji:"🌶️", freshnessType:"peppers",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:404, cat:"Peppers",     name:"Habanero",               price:7.00,  emoji:"🌶️", freshnessType:"peppers",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:405, cat:"Peppers",     name:"Banana Peppers",         price:4.00,  emoji:"🫑", freshnessType:"peppers",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  // TOMATOES
  { id:501, cat:"Tomatoes",    name:"Cherry Tomatoes",        price:4.00,  emoji:"🍒", freshnessType:"tomatoes",
    harvestUnit:"pint",   harvestToSellRatio:1, sellUnit:"pint",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:502, cat:"Tomatoes",    name:"Tomatoes Large",         price:4.00,  emoji:"🍅", freshnessType:"tomatoes",
    harvestUnit:"lb",     harvestToSellRatio:1, sellUnit:"lb",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  // HERBS
  { id:601, cat:"Herbs",       name:"Basil",                  price:3.00,  emoji:"🌿", freshnessType:"herbs",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:602, cat:"Herbs",       name:"Cilantro",               price:3.00,  emoji:"🌿", freshnessType:"herbs",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:603, cat:"Herbs",       name:"Dill",                   price:3.00,  emoji:"🌿", freshnessType:"herbs",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:604, cat:"Herbs",       name:"Parsley",                price:3.00,  emoji:"🌿", freshnessType:"herbs",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:605, cat:"Herbs",       name:"Rosemary",               price:3.00,  emoji:"🌿", freshnessType:"herbs",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:606, cat:"Herbs",       name:"Mint",                   price:3.00,  emoji:"🌿", freshnessType:"herbs",
    harvestUnit:"bundle", harvestToSellRatio:1, sellUnit:"bundle",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  { id:607, cat:"Herbs",       name:"Flowers",                price:8.00,  emoji:"🌸", freshnessType:"flowers",
    harvestUnit:"bunch",  harvestToSellRatio:1, sellUnit:"bunch",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:false },
  // MICRO GREENS — gramsPerPackage set per variety
  { id:701, cat:"Micro Greens",name:"Broccoli Micro",         price:5.00,  emoji:"🌱", freshnessType:"microgreens",
    harvestUnit:"pkg", harvestToSellRatio:1, sellUnit:"pkg", gramsPerPackage:50,
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:702, cat:"Micro Greens",name:"Radish Micro",           price:5.00,  emoji:"🌱", freshnessType:"microgreens",
    harvestUnit:"pkg", harvestToSellRatio:1, sellUnit:"pkg", gramsPerPackage:50,
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:703, cat:"Micro Greens",name:"Cantaloupe Micro",       price:5.00,  emoji:"🌱", freshnessType:"microgreens",
    harvestUnit:"pkg", harvestToSellRatio:1, sellUnit:"pkg", gramsPerPackage:50,
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:704, cat:"Micro Greens",name:"Sweet Pea Micro",        price:5.00,  emoji:"🌱", freshnessType:"microgreens",
    harvestUnit:"pkg", harvestToSellRatio:1, sellUnit:"pkg", gramsPerPackage:50,
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:705, cat:"Micro Greens",name:"Sunflower Micro",        price:5.00,  emoji:"🌱", freshnessType:"microgreens",
    harvestUnit:"pkg", harvestToSellRatio:1, sellUnit:"pkg", gramsPerPackage:50,
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:706, cat:"Micro Greens",name:"Spicy Salad Micro",      price:5.00,  emoji:"🌱", freshnessType:"microgreens",
    harvestUnit:"pkg", harvestToSellRatio:1, sellUnit:"pkg", gramsPerPackage:50,
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  // CANNED GOODS
  { id:801, cat:"Canned Goods",name:"Bread & Butter Pickles", price:10.00, emoji:"🫙", freshnessType:"pickled",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:802, cat:"Canned Goods",name:"Candied Jalapeños",      price:12.00, emoji:"🫙", freshnessType:"pickled",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:803, cat:"Canned Goods",name:"Pickled Cabbage",        price:10.00, emoji:"🫙", freshnessType:"pickled",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:804, cat:"Canned Goods",name:"Pickled Okra",           price:10.00, emoji:"🫙", freshnessType:"pickled",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:805, cat:"Canned Goods",name:"Hot-n-Spicy Pickled Okra",price:10.00,emoji:"🫙", freshnessType:"pickled",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:806, cat:"Canned Goods",name:"Salsa",                  price:10.00, emoji:"🫙", freshnessType:"canned",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:807, cat:"Canned Goods",name:"Hot Salsa",              price:10.00, emoji:"🫙", freshnessType:"canned",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:808, cat:"Canned Goods",name:"Jalapeño Blueberry Jam", price:10.00, emoji:"🫙", freshnessType:"jam",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  // REFRIGERATOR
  { id:901, cat:"Refrigerator",name:"Fresh Cucumber Pickles", price:10.00, emoji:"🥒", freshnessType:"refrigerated",
    harvestUnit:"jar", harvestToSellRatio:1, sellUnit:"jar",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
  { id:902, cat:"Refrigerator",name:"Purple Hull Peas",       price:9.00,  emoji:"🫛", freshnessType:"refrigerated",
    harvestUnit:"pt",  harvestToSellRatio:1, sellUnit:"pt",
    qty:0, harvestedOn:"", publicVisible:true,  orderable:true  },
];

const SEED_SETTINGS = {
  farmName:       "Going Rogue Farms",
  tagline:        "3921 HWY 110 East · Longville LA 70652",
  orderDeadline:  "Thursday at 5pm",
  pickupLocation: "Saturday Farmers Market",
  adminPassword:  "farm2026",
  phone:          "(337) 529-6761",
  crew:           ["Samantha","Mary","Ruth","Isaiah","Calum","Sage"],
};

const ALL_CATS = ["All","Berries","Greens","Vegetables","Peppers","Tomatoes","Herbs","Micro Greens","Canned Goods","Refrigerator"];

const load = (k,fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
const save = (k,v)  => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [items,    setItems]    = useState(() => load("grf_items_v5",    SEED_ITEMS));
  const [settings, setSettings] = useState(() => load("grf_settings_v5", SEED_SETTINGS));
  const [orders,   setOrders]   = useState(() => load("grf_orders_v5",   []));
  const [marketPlan,setMarketPlan]=useState(() => load("grf_market_v5",  {}));
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [tab,      setTab]      = useState("stock");
  const [showLogin,setShowLogin]= useState(false);

  useEffect(()=>save("grf_items_v5",    items),      [items]);
  useEffect(()=>save("grf_settings_v5", settings),   [settings]);
  useEffect(()=>save("grf_orders_v5",   orders),     [orders]);
  useEffect(()=>save("grf_market_v5",   marketPlan), [marketPlan]);

  const updateItem = (id,patch) => setItems(is=>is.map(i=>i.id===id?{...i,...patch}:i));
  const aging = items.filter(i=>["aging","usefirst"].includes(getFreshness(i))&&i.qty>0);

  return (
    <div style={{fontFamily:"'Lora',Georgia,serif",background:"#f5f2ed",minHeight:"100vh",maxWidth:580,margin:"0 auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#f5f2ed;}
        .mono{font-family:'JetBrains Mono',monospace;}
        .card{background:#fff;border:1px solid #e2d9cc;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);}
        .btn{border:none;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;border-radius:10px;transition:all 0.15s;-webkit-tap-highlight-color:transparent;}
        .btn-green{background:#1a4a0a;color:#e8f5d8;padding:12px 20px;}
        .btn-amber{background:#a05008;color:#fff8ee;padding:12px 20px;}
        .btn-red{background:#8b1a1a;color:#fff;padding:10px 16px;}
        .btn-ghost{background:none;border:1.5px solid #ccc0b0;color:#6a5a42;padding:10px 14px;}
        .btn-sm{padding:7px 13px;font-size:11px;}
        .btn-icon{background:none;border:none;cursor:pointer;padding:5px 9px;border-radius:8px;-webkit-tap-highlight-color:transparent;font-size:18px;}
        input,select,textarea{background:#faf7f2;border:1.5px solid #d0c4b4;color:#2a1f12;font-family:'JetBrains Mono',monospace;font-size:14px;padding:11px 13px;border-radius:10px;outline:none;width:100%;transition:border 0.15s;}
        input:focus,select:focus,textarea:focus{border-color:#1a4a0a;background:#fff;}
        input::placeholder,textarea::placeholder{color:#b0a090;}
        .tag{font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:5px;font-weight:500;}
        .tag-fresh{background:#dcfce7;color:#14532d;} .tag-usefirst{background:#fef9c3;color:#713f12;} .tag-aging{background:#ffedd5;color:#7c2d12;} .tag-expired{background:#fee2e2;color:#7f1d1d;} .tag-unknown{background:#f1f5f9;color:#475569;}
        .toggle{width:46px;height:26px;background:#ccc0b0;border-radius:13px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0;}
        .toggle.on{background:#1a4a0a;} .toggle::after{content:'';position:absolute;width:20px;height:20px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);}
        .toggle.on::after{left:23px;}
        .fade{animation:fi 0.25s ease;} @keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .bigbtn{background:#fff;border:2px solid #ddd0c0;border-radius:14px;padding:18px 14px;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all 0.15s;}
        .bigbtn:active{transform:scale(0.97);}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
        .modal{background:#fff;border-radius:22px 22px 0 0;padding:26px 22px 44px;width:100%;max-width:580px;max-height:92vh;overflow-y:auto;}
        .modal-mid{align-items:center;} .modal-mid .modal{border-radius:20px;max-width:340px;width:92%;}
        .admin-bar{background:#1a4a0a;color:#e8f5d8;padding:8px 16px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.1em;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;}
        .warn-bar{background:#fff8ee;border:1px solid #f0c060;border-radius:12px;padding:11px 14px;display:flex;gap:10px;align-items:flex-start;}
        .stitle{font-size:11px;font-weight:600;color:#5a4a32;font-family:'JetBrains Mono',monospace;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;}
        .bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:580px;background:#fff;border-top:1px solid #e2d9cc;display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,0px);}
        .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px 8px;background:none;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;}
        .nav-icon{font-size:21px;line-height:1;}
        .nav-label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.07em;color:#9a8a72;text-transform:uppercase;}
        .nav-btn.active .nav-label{color:#1a4a0a;font-weight:600;}
        .content{padding:18px 14px 96px;}
        .crew-pill{background:#f0fae8;border:1px solid #9dd87a;border-radius:20px;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#1a4a0a;display:flex;align-items:center;gap:8px;}
        @keyframes shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
        input[type=number]{-moz-appearance:textfield;} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
      `}</style>

      {isAdmin && (
        <div className="admin-bar">
          <span>🔓 ADMIN MODE</span>
          <button onClick={()=>setIsAdmin(false)} style={{background:"none",border:"1px solid #4a8020",color:"#a0d870",fontFamily:"'JetBrains Mono',monospace",fontSize:10,cursor:"pointer",padding:"3px 10px",borderRadius:6}}>LOCK</button>
        </div>
      )}

      <header style={{background:"#fff",borderBottom:"1px solid #e2d9cc",padding:"13px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontWeight:700,fontSize:18,color:"#1a3a0a",lineHeight:1.2}}>Going Rogue Farms</div>
          <div className="mono" style={{fontSize:9,color:"#9a8060",letterSpacing:"0.1em",marginTop:2}}>LONGVILLE · LA 70652</div>
        </div>
        <button className="btn-icon" style={{fontSize:22}} onClick={()=>isAdmin?setIsAdmin(false):setShowLogin(true)}>
          {isAdmin?"🔓":"🔒"}
        </button>
      </header>

      <div className="content">
        {tab==="stock"  && <StockTab   items={items} setItems={setItems} updateItem={updateItem} isAdmin={isAdmin} aging={aging} />}
        {tab==="market" && <MarketTab  items={items} updateItem={updateItem} marketPlan={marketPlan} setMarketPlan={setMarketPlan} />}
        {tab==="log"    && <LogTab     items={items} updateItem={updateItem} settings={settings} />}
        {tab==="public" && <PublicTab  items={items} updateItem={updateItem} orders={orders} setOrders={setOrders} settings={settings} setSettings={setSettings} isAdmin={isAdmin} />}
      </div>

      <nav className="bottom-nav">
        {[{key:"stock",icon:"📦",label:"Stock"},{key:"market",icon:"🏪",label:"Market"},{key:"log",icon:"✋",label:"Log"},{key:"public",icon:"🌐",label:"Public"}].map(t=>(
          <button key={t.key} className={`nav-btn ${tab===t.key?"active":""}`} onClick={()=>setTab(t.key)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {showLogin && <AdminLogin password={settings.adminPassword} onSuccess={()=>{setIsAdmin(true);setShowLogin(false);}} onClose={()=>setShowLogin(false)} />}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({password,onSuccess,onClose}){
  const [pw,setPw]=useState("");
  const [err,setErr]=useState(false);
  const [shake,setShake]=useState(false);
  const attempt=()=>{
    if(pw===password){onSuccess();}
    else{setErr(true);setShake(true);setTimeout(()=>setShake(false),400);setPw("");}
  };
  return(
    <div className="modal-bg modal-mid" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:12}}>🔒</div>
        <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>Admin Access</h2>
        <p className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:18}}>GOING ROGUE FARMS</p>
        <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Password" autoFocus
          style={{textAlign:"center",fontSize:20,letterSpacing:"0.25em",marginBottom:8,animation:shake?"shake 0.4s":"none",border:err?"1.5px solid #ef4444":undefined}} />
        {err&&<p className="mono" style={{fontSize:11,color:"#ef4444",marginBottom:8}}>WRONG PASSWORD</p>}
        <button className="btn btn-green" style={{width:"100%",padding:14,marginTop:8}} onClick={attempt}>Unlock</button>
        <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:10}} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── STOCK TAB ────────────────────────────────────────────────────────────────
function StockTab({items,setItems,updateItem,isAdmin,aging}){
  const [cat,setCat]=useState("All");
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [showZero,setShowZero]=useState(false);

  const filtered=items
    .filter(i=>(cat==="All"||i.cat===cat)&&(showZero||i.qty>0))
    .sort((a,b)=>{const o={fresh:0,usefirst:1,aging:2,expired:3,unknown:4};return o[getFreshness(a)]-o[getFreshness(b)];});

  return(
    <div className="fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:4}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700}}>Current Stock</h1>
          <p className="mono" style={{fontSize:11,color:"#9a8a72"}}>{items.filter(i=>i.qty>0).length} items in stock</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowZero(s=>!s)} style={{fontSize:10}}>{showZero?"Hide Empty":"+ Show Empty"}</button>
          {isAdmin&&<button className="btn btn-green btn-sm" onClick={()=>setShowAdd(true)}>+ Add</button>}
        </div>
      </div>

      {aging.length>0&&(
        <div className="warn-bar" style={{margin:"10px 0"}}>
          <span>⚠️</span>
          <div className="mono" style={{fontSize:11,color:"#713f12"}}>USE FIRST: {aging.map(i=>i.name).join(", ")}</div>
        </div>
      )}

      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:6,margin:"10px 0"}}>
        {ALL_CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{background:cat===c?"#1a4a0a":"#fff",color:cat===c?"#e8f5d8":"#6a5a42",border:`1.5px solid ${cat===c?"#1a4a0a":"#ccc0b0"}`,borderRadius:20,padding:"5px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,whiteSpace:"nowrap",cursor:"pointer",flexShrink:0,transition:"all 0.15s"}}>
            {c}
          </button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(item=>{
          const f=getFreshness(item);
          const d=item.harvestedOn?daysOld(item.harvestedOn):null;
          const w=FW[item.freshnessType]||FW.greens;
          const pct=d!==null?Math.min((d/w.aging)*100,100):0;
          return(
            <div key={item.id} className="card" style={{padding:"13px 14px",opacity:item.qty===0?0.45:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:item.qty>0?8:0}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:22}}>{item.emoji}</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{item.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center",flexWrap:"wrap"}}>
                      <span className="mono" style={{fontSize:10,color:"#9a8a72"}}>${item.price}/{item.sellUnit}</span>
                      <span className="mono" style={{fontSize:10,color:"#9a8a72"}}>· {item.cat}</span>
                      {item.gramsPerPackage&&<span className="mono" style={{fontSize:10,color:"#6a8a60"}}>{item.gramsPerPackage}g/pkg</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  {item.qty>0&&<span className={`tag tag-${f}`}>{FL[f]}</span>}
                  {isAdmin&&<button className="btn-icon" onClick={()=>setEditItem(item)}>✏️</button>}
                </div>
              </div>

              {item.qty>0&&(
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span className="mono" style={{fontSize:13,color:item.qty<=3?"#a05008":"#1a4a0a",fontWeight:600}}>{displayQty(item)}</span>
                      {d!==null&&<span className="mono" style={{fontSize:10,color:"#9a8a72"}}>{d}d old</span>}
                    </div>
                    {d!==null&&(
                      <div style={{height:3,background:"#f0ebe2",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:FC[f],borderRadius:2,transition:"width 0.5s"}} />
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button className="btn-icon" style={{background:"#fee2e2",borderRadius:8,padding:"5px 9px"}} onClick={()=>updateItem(item.id,{qty:Math.max(0,item.qty-1)})}>−</button>
                    <button className="btn-icon" style={{background:"#dcfce7",borderRadius:8,padding:"5px 9px"}} onClick={()=>updateItem(item.id,{qty:item.qty+1})}>+</button>
                  </div>
                </div>
              )}

              {item.qty===0&&isAdmin&&(
                <button className="btn btn-ghost btn-sm" style={{marginTop:8,fontSize:10,width:"100%"}} onClick={()=>setEditItem(item)}>+ Set quantity & date</button>
              )}
            </div>
          );
        })}
      </div>

      {editItem&&isAdmin&&<EditItemModal item={editItem} onSave={p=>{updateItem(editItem.id,p);setEditItem(null);}} onDelete={()=>{setItems(is=>is.filter(i=>i.id!==editItem.id));setEditItem(null);}} onClose={()=>setEditItem(null)} />}
      {showAdd&&isAdmin&&<AddItemModal onAdd={n=>{setItems(is=>[...is,{...n,id:Date.now()}]);setShowAdd(false);}} onClose={()=>setShowAdd(false)} />}
    </div>
  );
}

// ─── LOG TAB ──────────────────────────────────────────────────────────────────
function LogTab({items,updateItem,settings}){
  const [mode,setMode]=useState(null);
  const [search,setSearch]=useState("");
  const [sel,setSel]=useState(null);
  const [mainQty,setMainQty]=useState("");      // crates OR generic count
  const [remainder,setRemainder]=useState("");   // only for crate items
  const [date,setDate]=useState(todayStr());
  const [crew,setCrew]=useState("");
  const [done,setDone]=useState(false);

  const filtered=items.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
  const isCrate=sel?.harvestUnit==="crate";

  const submit=()=>{
    if(!sel||!mainQty||!crew) return;
    const addQty = harvestToQty(sel, mainQty, remainder);
    if(mode==="picked") updateItem(sel.id,{qty:sel.qty+addQty,harvestedOn:date});
    else updateItem(sel.id,{qty:Math.max(0,sel.qty-addQty)});
    setDone(true);
    setTimeout(()=>{setMode(null);setSel(null);setMainQty("");setRemainder("");setDone(false);setCrew("");},2000);
  };

  const cratePreview=()=>{
    if(!sel||!isCrate) return null;
    const total=(parseInt(mainQty)||0)*(sel.harvestToSellRatio||20)+(parseInt(remainder)||0);
    const flats=sel.altSellRatio?Math.floor(total/sel.altSellRatio):null;
    const rem=sel.altSellRatio?total%sel.altSellRatio:null;
    return(
      <div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:10,padding:"10px 14px",marginTop:10}}>
        <div className="mono" style={{fontSize:11,color:"#1a4a0a",marginBottom:4}}>CALCULATED STOCK:</div>
        <div className="mono" style={{fontSize:14,color:"#1a4a0a",fontWeight:600}}>
          {total} {sel.sellUnit}s
          {flats!==null&&<span style={{color:"#5a8a40"}}> = {flats} {sel.altSellUnit}{rem>0?` + ${rem} ${sel.sellUnit}`:""}</span>}
        </div>
      </div>
    );
  };

  if(done) return(
    <div className="fade" style={{textAlign:"center",paddingTop:80}}>
      <div style={{fontSize:72,marginBottom:12}}>✅</div>
      <h2 style={{fontSize:20,fontWeight:700,color:"#1a4a0a",marginBottom:8}}>Logged!</h2>
      <p className="mono" style={{fontSize:12,color:"#9a8a72",marginBottom:4}}>{sel?.name}</p>
      <p className="mono" style={{fontSize:12,color:"#9a8a72"}}>by {crew}</p>
    </div>
  );

  return(
    <div className="fade">
      <h1 style={{fontSize:22,fontWeight:700,marginTop:4,marginBottom:4}}>Farm Log</h1>
      <p className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:18}}>QUICK ENTRY · WHO · WHAT · HOW MANY</p>

      {!mode&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="bigbtn" style={{padding:26,border:"2px solid #1a4a0a",background:"#f0fae8"}} onClick={()=>setMode("picked")}>
            <div style={{fontSize:40,marginBottom:8}}>🌾</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1a4a0a"}}>Just Picked</div>
            <div className="mono" style={{fontSize:10,color:"#4a7a20",marginTop:4}}>Add to stock</div>
          </div>
          <div className="bigbtn" style={{padding:26,border:"2px solid #a05008",background:"#fff8ee"}} onClick={()=>setMode("pulled")}>
            <div style={{fontSize:40,marginBottom:8}}>❄️</div>
            <div style={{fontSize:16,fontWeight:700,color:"#a05008"}}>From Fridge</div>
            <div className="mono" style={{fontSize:10,color:"#806030",marginTop:4}}>Moving to sale</div>
          </div>
        </div>
      )}

      {/* STEP 1: Who */}
      {mode&&!crew&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setMode(null)}>← Back</button>
            <span style={{fontWeight:700,fontSize:15}}>Who is logging this?</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {(settings.crew||[]).map(name=>(
              <button key={name} className="bigbtn" style={{padding:"18px 14px"}} onClick={()=>setCrew(name)}>
                <div style={{fontSize:28,marginBottom:6}}>👤</div>
                <div style={{fontWeight:600,fontSize:14,color:"#2a1f12"}}>{name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: What */}
      {mode&&crew&&!sel&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setCrew("")}>← Back</button>
            <div className="crew-pill">👤 {crew}</div>
            <span style={{fontWeight:700,fontSize:14}}>{mode==="picked"?"What was picked?":"What from fridge?"}</span>
          </div>
          <input placeholder="🔍 Search item…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:12}} />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {filtered.map(i=>(
              <div key={i.id} className="bigbtn" style={{padding:13}} onClick={()=>setSel(i)}>
                <div style={{fontSize:24,marginBottom:4}}>{i.emoji}</div>
                <div style={{fontWeight:600,fontSize:12,color:"#1a1208",marginBottom:2,lineHeight:1.3}}>{i.name}</div>
                <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{displayQty(i)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: How many */}
      {mode&&crew&&sel&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSel(null)}>← Back</button>
            <div className="crew-pill">👤 {crew}</div>
            <span style={{fontSize:22}}>{sel.emoji}</span>
            <span style={{fontWeight:700,fontSize:14}}>{sel.name}</span>
          </div>

          <div className="card" style={{padding:18,marginBottom:12}}>
            {isCrate?(
              <>
                <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>
                  HOW MANY CRATES? (1 CRATE = {sel.harvestToSellRatio} {sel.sellUnit.toUpperCase()}S)
                </div>
                <input type="number" inputMode="numeric" value={mainQty} onChange={e=>setMainQty(e.target.value)} placeholder="Crates" style={{fontSize:28,textAlign:"center",padding:12,marginBottom:10}} autoFocus />
                <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>REMAINDER ({sel.sellUnit.toUpperCase()}S)?</div>
                <input type="number" inputMode="numeric" value={remainder} onChange={e=>setRemainder(e.target.value)} placeholder="0" style={{fontSize:22,textAlign:"center",padding:10}} />
                {cratePreview()}
              </>
            ):(
              <>
                <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>
                  HOW MANY {sel.harvestUnit.toUpperCase()}S?
                </div>
                <input type="number" inputMode="numeric" value={mainQty} onChange={e=>setMainQty(e.target.value)} placeholder="0" style={{fontSize:30,textAlign:"center",padding:12}} autoFocus />
                <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
                  {[1,2,5,10,12,24,50].map(n=>(
                    <button key={n} className="btn btn-ghost btn-sm" onClick={()=>setMainQty(String(n))}>{n}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {mode==="picked"&&(
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:7}}>HARVEST DATE</div>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{colorScheme:"light"}} />
            </div>
          )}

          <button className="btn btn-green" style={{width:"100%",padding:15,fontSize:14}} onClick={submit} disabled={!mainQty}>
            {mode==="picked"?"✅ Log Harvest":"✅ Log Pulled"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MARKET TAB ───────────────────────────────────────────────────────────────
function MarketTab({items,updateItem,marketPlan,setMarketPlan}){
  const [view,setView]=useState("plan");
  const [returns,setReturns]=useState({});

  const setPlanQty=(id,v)=>setMarketPlan(p=>({...p,[id]:{...(p[id]||{}),wantQty:Math.max(0,parseInt(v)||0)}}));
  const planned=Object.entries(marketPlan).filter(([,v])=>v.wantQty>0);

  const harvestNeeded=(id)=>{
    const want=marketPlan[id]?.wantQty||0;
    const have=items.find(i=>i.id===parseInt(id))?.qty||0;
    return Math.max(0,want-have);
  };

  const totalHarvestItems=planned.filter(([id])=>harvestNeeded(id)>0).length;

  const closeOut=()=>{
    planned.forEach(([idStr,plan])=>{
      const id=parseInt(idStr);
      const item=items.find(i=>i.id===id);
      const ret=returns[id]||0;
      const sold=plan.wantQty-ret;
      if(item&&sold>0) updateItem(id,{qty:Math.max(0,item.qty-sold)});
    });
    setView("done");
  };

  if(view==="done") return(
    <div className="fade" style={{textAlign:"center",paddingTop:60}}>
      <div style={{fontSize:72,marginBottom:16}}>🎉</div>
      <h2 style={{fontSize:22,fontWeight:700,color:"#1a4a0a",marginBottom:8}}>Market Closed!</h2>
      <p className="mono" style={{fontSize:12,color:"#9a8a72",marginBottom:24}}>Inventory updated.</p>
      <button className="btn btn-green" onClick={()=>{setView("plan");setReturns({});}}>Plan Next Market</button>
    </div>
  );

  return(
    <div className="fade">
      <h1 style={{fontSize:22,fontWeight:700,marginTop:4,marginBottom:4}}>To Market</h1>
      <div style={{display:"flex",background:"#ede8e0",borderRadius:12,padding:4,marginBottom:16,gap:4}}>
        {[{k:"plan",l:"Plan Load"},{k:"closeout",l:"Close Out"}].map(v=>(
          <button key={v.k} onClick={()=>setView(v.k)} style={{flex:1,padding:"8px 4px",border:"none",borderRadius:9,background:view===v.k?"#fff":"none",color:view===v.k?"#1a4a0a":"#9a8a72",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",fontWeight:view===v.k?600:400,boxShadow:view===v.k?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.15s"}}>
            {v.l}
          </button>
        ))}
      </div>

      {view==="plan"&&(
        <>
          {totalHarvestItems>0&&(
            <div className="warn-bar" style={{marginBottom:14}}>
              <span>🌾</span>
              <div>
                <div className="mono" style={{fontSize:11,color:"#713f12",marginBottom:4}}>STILL NEED TO HARVEST:</div>
                {planned.filter(([id])=>harvestNeeded(id)>0).map(([id,plan])=>{
                  const item=items.find(i=>i.id===parseInt(id));
                  if(!item) return null;
                  const need=harvestNeeded(id);
                  return <div key={id} className="mono" style={{fontSize:11,color:"#a05008"}}>· {item.name} — {need} more {item.sellUnit}</div>;
                })}
              </div>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {items.map(item=>{
              const plan=marketPlan[item.id]?.wantQty||0;
              const need=harvestNeeded(item.id);
              return(
                <div key={item.id} className="card" style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:plan>0?8:0}}>
                    <span style={{fontSize:22}}>{item.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{item.name}</div>
                      <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{displayQty(item)} in stock</div>
                    </div>
                    <input type="number" inputMode="numeric" value={plan||""} onChange={e=>setPlanQty(item.id,e.target.value)} placeholder="0" style={{width:60,textAlign:"center",padding:"8px 6px",fontSize:14}} />
                  </div>
                  {plan>0&&(
                    need===0
                      ?<div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:8,padding:"5px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#1a5a0a"}}>✅ {item.qty} in stock — ready</div>
                      :<div style={{background:"#fff8ee",border:"1px solid #f0c060",borderRadius:8,padding:"5px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#a05008"}}>🌾 Harvest {need} more {item.sellUnit}</div>
                  )}
                </div>
              );
            })}
          </div>

          {planned.length>0&&(
            <div className="card" style={{padding:16,background:"#f0fae8",border:"1px solid #9dd87a"}}>
              <div className="stitle" style={{color:"#1a4a0a"}}>Load Summary</div>
              {planned.map(([id,plan])=>{
                const item=items.find(i=>i.id===parseInt(id));
                if(!item) return null;
                return(
                  <div key={id} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13}}>{item.emoji} {item.name}</span>
                    <span className="mono" style={{fontSize:12,color:"#1a4a0a",fontWeight:600}}>{plan.wantQty} {item.sellUnit}</span>
                  </div>
                );
              })}
              <div style={{borderTop:"1px solid #b8e098",marginTop:10,paddingTop:10}}>
                <span className="mono" style={{fontSize:11,color:"#1a4a0a"}}>
                  ${planned.reduce((s,[id,p])=>{const item=items.find(i=>i.id===parseInt(id));return s+(item?item.price*p.wantQty:0);},0).toFixed(0)} potential revenue
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {view==="closeout"&&(
        planned.length===0
          ?<div style={{textAlign:"center",paddingTop:40,color:"#9a8a72"}}><p className="mono" style={{fontSize:12}}>No plan set. Go to Plan Load first.</p></div>
          :(
            <>
              <p style={{fontSize:13,color:"#6a5a42",marginBottom:14}}>Enter what came back unsold.</p>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
                {planned.map(([idStr,plan])=>{
                  const id=parseInt(idStr);
                  const item=items.find(i=>i.id===id);
                  if(!item) return null;
                  const ret=returns[id]||0;
                  const sold=plan.wantQty-ret;
                  return(
                    <div key={id} className="card" style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <span style={{fontSize:22}}>{item.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:13}}>{item.name}</div>
                          <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>Planned: {plan.wantQty} {item.sellUnit}</div>
                        </div>
                        <span className="mono" style={{fontSize:14,fontWeight:700,color:sold>0?"#1a4a0a":"#9a8a72"}}>Sold: {sold}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span className="mono" style={{fontSize:11,color:"#9a8a72",whiteSpace:"nowrap"}}>Came back:</span>
                        <input type="number" inputMode="numeric" value={returns[id]||""} onChange={e=>setReturns(r=>({...r,[id]:Math.max(0,parseInt(e.target.value)||0)}))} placeholder="0" style={{flex:1,textAlign:"center"}} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-green" style={{width:"100%",padding:14}} onClick={closeOut}>✅ Confirm & Update Inventory</button>
            </>
          )
      )}
    </div>
  );
}

// ─── PUBLIC TAB ───────────────────────────────────────────────────────────────
function PublicTab({items,updateItem,orders,setOrders,settings,setSettings,isAdmin}){
  const [view,setView]=useState("availability");
  const [form,setForm]=useState({name:"",phone:"",pickup:"",notes:"",cart:{}});
  const [submitted,setSubmitted]=useState(false);
  const [showSettings,setShowSettings]=useState(false);

  const orderable=items.filter(i=>i.orderable&&i.qty>0);
  const pending=orders.filter(o=>o.status==="pending").length;
  const setCart=(id,v)=>setForm(f=>({...f,cart:{...f.cart,[id]:Math.max(0,parseInt(v)||0)}}));

  const placeOrder=()=>{
    const lines=Object.entries(form.cart).filter(([,q])=>q>0).map(([id,qty])=>{
      const item=items.find(i=>i.id===parseInt(id));
      return{id:parseInt(id),name:item?.name,qty,unit:item?.sellUnit,price:item?.price};
    });
    if(!lines.length||!form.name) return;
    setOrders(os=>[...os,{id:Date.now(),...form,lineItems:lines,status:"pending",placedAt:new Date().toLocaleString()}]);
    setSubmitted(true);
  };

  return(
    <div className="fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:4}}>
        <h1 style={{fontSize:22,fontWeight:700}}>Public & Orders</h1>
        {isAdmin&&<button className="btn btn-ghost btn-sm" onClick={()=>setShowSettings(true)}>⚙️ Settings</button>}
      </div>
      <p className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:14}}>WEBSITE · PRE-ORDERS · VISIBILITY</p>

      <div style={{display:"flex",background:"#ede8e0",borderRadius:12,padding:4,marginBottom:16,gap:4}}>
        {[{k:"availability",l:"Availability"},{k:"order",l:"Pre-Order"},{k:"orders",l:`Orders (${pending})`}].map(v=>(
          <button key={v.k} onClick={()=>setView(v.k)} style={{flex:1,padding:"8px 4px",border:"none",borderRadius:9,background:view===v.k?"#fff":"none",color:view===v.k?"#1a4a0a":"#9a8a72",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",fontWeight:view===v.k?600:400,boxShadow:view===v.k?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.15s"}}>
            {v.l}
          </button>
        ))}
      </div>

      {view==="availability"&&(
        <div>
          {isAdmin&&<div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:10,padding:"9px 13px",marginBottom:12}}><span className="mono" style={{fontSize:11,color:"#1a4a0a"}}>🔓 Admin: toggle Show and Order per item</span></div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {items.map(i=>(
              <div key={i.id} className="card" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:10,opacity:i.publicVisible?1:0.45}}>
                <span style={{fontSize:20}}>{i.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{i.name}</div>
                  <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
                    <span className="mono" style={{fontSize:10,color:"#9a8a72"}}>${i.price}/{i.sellUnit} · {displayQty(i)}</span>
                    {i.orderable&&<span className="tag tag-fresh" style={{fontSize:9}}>orderable</span>}
                  </div>
                </div>
                {isAdmin&&(
                  <div style={{display:"flex",flexDirection:"column",gap:7,alignItems:"flex-end"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span className="mono" style={{fontSize:9,color:"#9a8a72"}}>SHOW</span>
                      <button className={`toggle ${i.publicVisible?"on":""}`} onClick={()=>updateItem(i.id,{publicVisible:!i.publicVisible})} />
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span className="mono" style={{fontSize:9,color:"#9a8a72"}}>ORDER</span>
                      <button className={`toggle ${i.orderable?"on":""}`} onClick={()=>updateItem(i.id,{orderable:!i.orderable})} disabled={!i.publicVisible} style={{opacity:i.publicVisible?1:0.4}} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view==="order"&&(
        <div>
          <div style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:12,padding:"13px 14px",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:15,color:"#1a4a0a",marginBottom:2}}>🌿 Going Rogue Farms</div>
            <div className="mono" style={{fontSize:11,color:"#3a7010"}}>Order by {settings.orderDeadline}</div>
            <div className="mono" style={{fontSize:11,color:"#3a7010"}}>Pickup: {settings.pickupLocation}</div>
          </div>
          {!submitted?(
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <input placeholder="Your name *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
              <input placeholder="Phone / text" inputMode="tel" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
              <input placeholder="Pickup time preference" value={form.pickup} onChange={e=>setForm(f=>({...f,pickup:e.target.value}))} />
              <div className="mono" style={{fontSize:11,color:"#9a8a72",marginTop:4}}>SELECT ITEMS:</div>
              {orderable.length===0&&<p style={{fontSize:13,color:"#9a8a72",fontStyle:"italic"}}>No items available for pre-order right now.</p>}
              {orderable.map(i=>(
                <div key={i.id} className="card" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{i.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{i.name}</div>
                    <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>${i.price}/{i.sellUnit}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <button className="btn-icon" style={{background:"#fee2e2",borderRadius:8,padding:"5px 9px"}} onClick={()=>setCart(i.id,(form.cart[i.id]||0)-1)}>−</button>
                    <span className="mono" style={{fontSize:15,minWidth:22,textAlign:"center",fontWeight:600}}>{form.cart[i.id]||0}</span>
                    <button className="btn-icon" style={{background:"#dcfce7",borderRadius:8,padding:"5px 9px"}} onClick={()=>setCart(i.id,(form.cart[i.id]||0)+1)}>+</button>
                  </div>
                </div>
              ))}
              <textarea rows={2} placeholder="Notes or requests" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
              <button className="btn btn-green" style={{padding:15,fontSize:14}} onClick={placeOrder} disabled={!form.name||!Object.values(form.cart).some(q=>q>0)}>Place Pre-Order →</button>
            </div>
          ):(
            <div className="card" style={{padding:30,textAlign:"center"}}>
              <div style={{fontSize:52,marginBottom:12}}>🎉</div>
              <h3 style={{fontSize:18,fontWeight:700,color:"#1a4a0a",marginBottom:8}}>Order Received!</h3>
              <p style={{fontSize:13,color:"#6a5a42"}}>We'll reach out to confirm pickup.</p>
              <button className="btn btn-ghost btn-sm" style={{marginTop:14}} onClick={()=>{setSubmitted(false);setForm({name:"",phone:"",pickup:"",notes:"",cart:{}});}}>Place Another</button>
            </div>
          )}
        </div>
      )}

      {view==="orders"&&(
        <div>
          {!isAdmin&&<div className="warn-bar" style={{marginBottom:14}}><span>🔒</span><span className="mono" style={{fontSize:11,color:"#713f12",marginLeft:8}}>ADMIN ACCESS REQUIRED</span></div>}
          {isAdmin&&orders.length===0&&<div style={{textAlign:"center",paddingTop:50,color:"#9a8a72"}}><div style={{fontSize:48,marginBottom:10}}>🛒</div><p className="mono" style={{fontSize:12}}>No orders yet.</p></div>}
          {isAdmin&&orders.map(o=>(
            <div key={o.id} className="card" style={{padding:14,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{o.name}</div>
                  <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{o.phone} · {o.pickup}</div>
                  <div className="mono" style={{fontSize:10,color:"#9a8a72"}}>{o.placedAt}</div>
                </div>
                <div style={{display:"flex",gap:7}}>
                  <button className="btn btn-green btn-sm" style={{background:o.status==="confirmed"?"#14420a":"#1a4a0a"}} onClick={()=>setOrders(os=>os.map(x=>x.id===o.id?{...x,status:"confirmed"}:x))}>{o.status==="confirmed"?"✅":"Confirm"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setOrders(os=>os.filter(x=>x.id!==o.id))}>✕</button>
                </div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:o.notes?8:0}}>
                {o.lineItems.map(li=>(
                  <span key={li.id} style={{background:"#f0fae8",border:"1px solid #9dd87a",borderRadius:6,padding:"3px 9px",fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>
                    {li.qty}× {li.name}
                  </span>
                ))}
              </div>
              {o.notes&&<p style={{fontSize:13,color:"#6a5a42",fontStyle:"italic"}}>"{o.notes}"</p>}
            </div>
          ))}
        </div>
      )}

      {showSettings&&isAdmin&&<FarmSettingsModal settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)} />}
    </div>
  );
}

// ─── EDIT ITEM MODAL ──────────────────────────────────────────────────────────
function EditItemModal({item,onSave,onDelete,onClose}){
  const [f,setF]=useState({...item});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  return(
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:17,fontWeight:700}}>Edit — {item.name}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          <div style={{display:"flex",gap:9}}>
            <input style={{width:58}} value={f.emoji} onChange={e=>s("emoji",e.target.value)} placeholder="emoji" />
            <input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Name" />
          </div>
          <div style={{display:"flex",gap:9}}>
            <input type="number" inputMode="decimal" value={f.price} onChange={e=>s("price",parseFloat(e.target.value)||0)} placeholder="Price $" />
            <input value={f.sellUnit} onChange={e=>s("sellUnit",e.target.value)} placeholder="Sell unit" />
          </div>
          <div style={{display:"flex",gap:9}}>
            <input type="number" inputMode="numeric" value={f.qty} onChange={e=>s("qty",parseInt(e.target.value)||0)} placeholder="Qty" />
            <select value={f.cat} onChange={e=>s("cat",e.target.value)}>
              {ALL_CATS.slice(1).map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="mono" style={{fontSize:11,color:"#9a8a72",marginTop:4}}>HARVEST UNIT SETTINGS</div>
          <div style={{display:"flex",gap:9}}>
            <input value={f.harvestUnit} onChange={e=>s("harvestUnit",e.target.value)} placeholder="Harvest unit (crate, bundle…)" />
            <input type="number" inputMode="numeric" value={f.harvestToSellRatio} onChange={e=>s("harvestToSellRatio",parseInt(e.target.value)||1)} placeholder="Ratio" style={{width:70}} />
          </div>
          <div style={{display:"flex",gap:9}}>
            <input value={f.altSellUnit||""} onChange={e=>s("altSellUnit",e.target.value)} placeholder="Alt sell unit (flat, case…)" />
            <input type="number" inputMode="numeric" value={f.altSellRatio||""} onChange={e=>s("altSellRatio",parseInt(e.target.value)||0)} placeholder="Per alt" style={{width:70}} />
          </div>

          {f.cat==="Micro Greens"&&(
            <div>
              <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>GRAMS PER PACKAGE</div>
              <input type="number" inputMode="decimal" value={f.gramsPerPackage||""} onChange={e=>s("gramsPerPackage",parseFloat(e.target.value)||0)} placeholder="e.g. 50" />
            </div>
          )}

          <select value={f.freshnessType} onChange={e=>s("freshnessType",e.target.value)}>
            {Object.keys(FW).map(t=><option key={t} value={t}>{t} · fresh {FW[t].fresh}d</option>)}
          </select>

          <div>
            <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:6}}>HARVEST / MADE DATE</div>
            <input type="date" value={f.harvestedOn||""} onChange={e=>s("harvestedOn",e.target.value)} style={{colorScheme:"light"}} />
          </div>

          <div style={{display:"flex",gap:9}}>
            <button style={{flex:1,padding:"10px 0",border:"none",borderRadius:10,background:f.publicVisible?"#1a4a0a":"#e5ddd0",color:f.publicVisible?"#e8f5d8":"#9a8a72",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer"}} onClick={()=>s("publicVisible",!f.publicVisible)}>
              {f.publicVisible?"👁 Visible":"👁 Hidden"}
            </button>
            <button style={{flex:1,padding:"10px 0",border:"none",borderRadius:10,background:f.orderable?"#1a4a0a":"#e5ddd0",color:f.orderable?"#e8f5d8":"#9a8a72",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",opacity:f.publicVisible?1:0.5}} onClick={()=>f.publicVisible&&s("orderable",!f.orderable)}>
              {f.orderable?"🛒 Orderable":"🛒 Not Orderable"}
            </button>
          </div>
          <button className="btn btn-green" style={{width:"100%",padding:13,marginTop:4}} onClick={()=>onSave(f)}>Save Changes</button>
          <button className="btn btn-red btn-sm" style={{width:"100%"}} onClick={onDelete}>Delete Item</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD ITEM MODAL ───────────────────────────────────────────────────────────
function AddItemModal({onAdd,onClose}){
  const [f,setF]=useState({name:"",emoji:"🌱",cat:"Greens",freshnessType:"greens",qty:0,harvestUnit:"bundle",harvestToSellRatio:1,sellUnit:"bundle",altSellUnit:"",altSellRatio:0,gramsPerPackage:0,price:0,harvestedOn:"",publicVisible:true,orderable:false});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  return(
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:17,fontWeight:700}}>Add New Item</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          <div style={{display:"flex",gap:9}}>
            <input style={{width:58}} value={f.emoji} onChange={e=>s("emoji",e.target.value)} placeholder="emoji" />
            <input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Product name *" />
          </div>
          <div style={{display:"flex",gap:9}}>
            <input type="number" inputMode="decimal" value={f.price||""} onChange={e=>s("price",parseFloat(e.target.value)||0)} placeholder="Price $" />
            <input value={f.sellUnit} onChange={e=>s("sellUnit",e.target.value)} placeholder="Sell unit" />
          </div>
          <div style={{display:"flex",gap:9}}>
            <input value={f.harvestUnit} onChange={e=>s("harvestUnit",e.target.value)} placeholder="Harvest unit" />
            <input type="number" inputMode="numeric" value={f.harvestToSellRatio} onChange={e=>s("harvestToSellRatio",parseInt(e.target.value)||1)} placeholder="Ratio" style={{width:70}} />
          </div>
          <div style={{display:"flex",gap:9}}>
            <select value={f.cat} onChange={e=>s("cat",e.target.value)}>
              {ALL_CATS.slice(1).map(c=><option key={c}>{c}</option>)}
            </select>
            <select value={f.freshnessType} onChange={e=>s("freshnessType",e.target.value)}>
              {Object.keys(FW).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn btn-green" style={{width:"100%",padding:13}} onClick={()=>f.name&&onAdd(f)}>Add Product</button>
        </div>
      </div>
    </div>
  );
}

// ─── FARM SETTINGS MODAL ──────────────────────────────────────────────────────
function FarmSettingsModal({settings,setSettings,onClose}){
  const [f,setF]=useState({...settings,crew:[...(settings.crew||[])]});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const [newCrew,setNewCrew]=useState("");

  const addCrew=()=>{
    if(!newCrew.trim()) return;
    setF(x=>({...x,crew:[...x.crew,newCrew.trim()]}));
    setNewCrew("");
  };
  const removeCrew=(name)=>setF(x=>({...x,crew:x.crew.filter(c=>c!==name)}));

  return(
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:17,fontWeight:700}}>Farm Settings</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[
            {k:"farmName",      label:"FARM NAME",       ph:"Going Rogue Farms"},
            {k:"orderDeadline", label:"ORDER DEADLINE",  ph:"Thursday at 5pm"},
            {k:"pickupLocation",label:"PICKUP LOCATION", ph:"Saturday Farmers Market"},
            {k:"phone",         label:"PHONE",           ph:"(337) 529-6761"},
          ].map(({k,label,ph})=>(
            <div key={k}>
              <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:5}}>{label}</div>
              <input value={f[k]||""} onChange={e=>s(k,e.target.value)} placeholder={ph} />
            </div>
          ))}

          <div>
            <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:5}}>ADMIN PASSWORD</div>
            <input type="password" value={f.adminPassword} onChange={e=>s("adminPassword",e.target.value)} placeholder="Password" />
          </div>

          <div>
            <div className="mono" style={{fontSize:11,color:"#9a8a72",marginBottom:8}}>CREW MEMBERS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
              {(f.crew||[]).map(name=>(
                <div key={name} className="crew-pill">
                  {name}
                  <button onClick={()=>removeCrew(name)} style={{background:"none",border:"none",cursor:"pointer",color:"#5a8a30",fontSize:14,padding:0,lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={newCrew} onChange={e=>setNewCrew(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCrew()} placeholder="Add crew member…" />
              <button className="btn btn-green btn-sm" onClick={addCrew}>Add</button>
            </div>
          </div>

          <button className="btn btn-green" style={{width:"100%",padding:13,marginTop:4}} onClick={()=>{setSettings(f);onClose();}}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
