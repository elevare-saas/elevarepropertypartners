/* Elevare concierge data, ported verbatim from src/demo/demo.html */

export type Mode = "rent" | "buy";
export type PropType = "villa" | "condo" | "townhouse";
/** [key, label, must-haves it adds, suggested area, people (friends only)] */
export type Vibe = [string, string, string[], string, number?];
export interface Persona {
  l: string; d: string;
  def: { type: PropType; beds: number; lease: number; budget: number; must: string[] };
  area: string; q: string; vibes: Vibe[]; show: string[];
}
export interface Listing {
  id: string; mode: Mode; name: string; area: string; type: PropType; beds: number; sqm: number; price: number;
  own?: string; rent?: number; am: string[]; ex: string[]; hue: number; line: string;
}

export const CONFIG = {
  brand: "Elevare",
  whatsapp: "",     // digits only, international format, e.g. "66812345678"
  sms: "",          // e.g. "+66812345678"
  email: "",        // e.g. "hello@elevare.com"
  leadEndpoint: "", // optional: your website URL that receives each lead as JSON (POST)
  replyWindow: "between 9:00 and 21:00 Phuket time",
  avgYield: 0.055,
  marketNote: "Indicative Phuket market figures, Oct 2026. Replace with your own comparables."
};
/* Market estimates (THB). Rent: monthly asking rent by bedrooms for a furnished pool villa. Sale: price per sqm by type. */
export const RENT_BASE = {1:35000,2:55000,3:80000,4:120000,5:170000,6:230000};
export const TYPE_RENT = {villa:1, condo:.55, townhouse:.7};
export const SQM_BASE = {villa:75000, condo:110000, townhouse:55000};
export const AREAS = [
  {k:"Kata",f:1.10,d:"Surf beach, cafés and restaurants on foot"},
  {k:"Karon",f:1.00,d:"Long, easy-going beach"},
  {k:"Rawai",f:0.85,d:"Expat village feel, gyms, good value"},
  {k:"Nai Harn",f:1.00,d:"Calm lagoon beach, green and quiet"},
  {k:"Chalong",f:0.80,d:"Central, Muay Thai and fitness camps"},
  {k:"Phuket Town",f:0.70,d:"Business hub, old town, hospitals"},
  {k:"Patong",f:0.95,d:"Nightlife, shopping, energy"},
  {k:"Kamala",f:1.15,d:"Relaxed bay, ocean-view homes"},
  {k:"Surin",f:1.35,d:"Prestige beach address"},
  {k:"Bang Tao",f:1.25,d:"Laguna, beach clubs, international schools"},
  {k:"Cape Yamu",f:1.40,d:"Private headland, bay views"}
];
export const TYPES: Record<string, string> = {villa:"Pool villa", condo:"Condo", townhouse:"Townhouse"};
export const AMEN: Record<string, string> = {
  pool:"Private pool", fibre:"Fast fibre internet", workspace:"Dedicated desk", cowork:"Near coworking & cafés", seaview:"Sea view",
  beach:"Near the beach", quiet:"Quiet & private", amenities:"Walk to shops & restaurants", gym:"Gym nearby", school:"Near international schools",
  pets:"Pet friendly", cleaning:"Weekly cleaning", invoice:"Company lease & tax invoice", commute:"Easy commute to town & airport", furnished:"Fully furnished"
};
/* Who's renting: each persona carries defaults, a tailored follow-up question and the must-haves it shows first */
export const PERSONAS: Record<string, Persona> = {
  nomad:{l:"Digital nomad",d:"Remote work, fast wifi, flexible lease",def:{type:"condo",beds:1,lease:3,budget:35000,must:["fibre","workspace"]},area:"Rawai",
    q:"How do you like to work?",vibes:[["home","Home office, total focus",["workspace","quiet"],"Nai Harn"],["cafe","Cafés & coworking nearby",["cowork","amenities"],"Rawai"],["beach","Laptop by the beach",["beach"],"Kata"],["mix","A bit of everything",["cowork","workspace"],"Rawai"]],
    show:["fibre","workspace","cowork","quiet","gym","beach","amenities","cleaning","pool"]},
  couple:{l:"Couple",d:"A beautiful base for two",def:{type:"villa",beds:1,lease:6,budget:50000,must:["pool"]},area:"Kata",
    q:"What does your ideal day look like?",vibes:[["sunset","Beach days & sunsets",["beach","seaview"],"Kata"],["private","Quiet & private",["quiet","pool"],"Nai Harn"],["dining","Dining & nightlife",["amenities"],"Bang Tao"],["wellness","Wellness & training",["gym"],"Rawai"]],
    show:["pool","seaview","beach","quiet","amenities","gym","cleaning","pets","fibre"]},
  solo:{l:"Solo",d:"Your own place, on your terms",def:{type:"condo",beds:1,lease:6,budget:25000,must:["gym"]},area:"Kata",
    q:"What matters most to you?",vibes:[["social","Meeting people",["amenities","cowork"],"Kata"],["calm","Peace and quiet",["quiet"],"Nai Harn"],["value","Keeping costs low",[],"Chalong"],["fit","Fitness & training",["gym"],"Chalong"]],
    show:["gym","amenities","quiet","beach","fibre","cowork","pool","cleaning","pets"]},
  business:{l:"Business",d:"Relocation, secondment or staff housing",def:{type:"condo",beds:2,lease:12,budget:60000,must:["invoice","furnished"]},area:"Phuket Town",
    q:"What’s the stay for?",vibes:[["relocate","Relocating for work",["commute","furnished"],"Bang Tao"],["project","A project or secondment",["cleaning","invoice"],"Phuket Town"],["staff","Housing for staff",["invoice","commute"],"Phuket Town"],["exec","Executive home",["pool","cleaning","seaview"],"Kamala"]],
    show:["invoice","commute","furnished","cleaning","fibre","workspace","gym","pool","seaview"]},
  family:{l:"Family",d:"Space, schools and a safe garden",def:{type:"villa",beds:3,lease:12,budget:90000,must:["pool","school"]},area:"Bang Tao",
    q:"Who’s coming along?",vibes:[["little","Little ones under 5",["quiet","pool"],"Nai Harn"],["school","School-age kids",["school"],"Bang Tao"],["teens","Teenagers",["amenities","beach"],"Kata"],["pets","Kids and pets",["pets","school"],"Rawai"]],
    show:["school","pool","quiet","pets","beach","amenities","cleaning","furnished","gym"]},
  retire:{l:"Retiring",d:"Easy living, close to care",def:{type:"villa",beds:2,lease:12,budget:55000,must:["quiet"]},area:"Rawai",
    q:"What pace suits you?",vibes:[["calm","Calm & green",["quiet"],"Nai Harn"],["care","Near hospitals & shops",["commute","amenities"],"Chalong"],["sea","By the sea",["seaview","beach"],"Kamala"],["active","Active & social",["gym","amenities"],"Rawai"]],
    show:["quiet","amenities","commute","pool","seaview","beach","cleaning","pets","gym"]},
  friends:{l:"Friends sharing",d:"Split a bigger home, live better",def:{type:"villa",beds:3,lease:6,budget:90000,must:["pool"]},area:"Kamala",
    q:"How many of you?",vibes:[["2","Two of us",[],"Kata",2],["3","Three",[],"Kamala",3],["4","Four",[],"Kamala",4],["5","Five or more",[],"Bang Tao",5]],
    show:["pool","fibre","amenities","beach","cleaning","gym","quiet","pets","seaview"]}
};
export const BUYERS = [{k:"home",l:"Main residence",d:"A home to live in full time"},{k:"holiday",l:"Holiday home",d:"Use it yourself, rent it when away"},{k:"invest",l:"Investment",d:"Rental income and capital growth"}];
export const BUY_REC = {home:"Nai Harn",holiday:"Kamala",invest:"Bang Tao"};

/* SAMPLE listings: replace with Elevare's real rentals (THB/month) and sales (THB) */
export const LISTINGS: Listing[] = [
  {id:"RWS",mode:"rent",name:"Rawai Studio Loft",area:"Rawai",type:"condo",beds:1,sqm:45,price:17500,am:["fibre","workspace","cowork","gym","furnished","amenities"],ex:["Fibre 1 Gbps included","Monthly cleaning"],hue:300,line:"Bright one-bed loft with a proper desk, two minutes from Rawai’s cafés and coworking."},
  {id:"KTC",mode:"rent",name:"Kata Hill Condo 2A",area:"Kata",type:"condo",beds:1,sqm:58,price:24000,am:["seaview","beach","gym","fibre","amenities","furnished","cowork"],ex:["Building pool & gym","Wifi included"],hue:195,line:"Sea-view one-bed above Kata, a short walk to the beach and restaurants."},
  {id:"CHL",mode:"rent",name:"Chalong Fit Residence",area:"Chalong",type:"condo",beds:1,sqm:40,price:13500,am:["gym","fibre","amenities","furnished","commute"],ex:["Gym membership included","Water included"],hue:20,line:"Compact one-bed on Soi Ta-iad, next to the island’s best training camps."},
  {id:"PTE",mode:"rent",name:"Old Town Executive Suites",area:"Phuket Town",type:"condo",beds:2,sqm:85,price:38000,am:["invoice","commute","furnished","cleaning","fibre","workspace","gym","amenities"],ex:["Company lease & tax invoice","Weekly cleaning"],hue:240,line:"Serviced two-bed in Phuket Town, 15 minutes to the hospitals and business district."},
  {id:"NHV",mode:"rent",name:"Nai Harn Pool Hideaway",area:"Nai Harn",type:"villa",beds:1,sqm:110,price:42000,am:["pool","quiet","workspace","fibre","pets","furnished"],ex:["Pool & garden care","Fibre internet installed"],hue:150,line:"One-bed pool villa behind the lake, built for two."},
  {id:"SAL",mode:"rent",name:"Villa Sala Lagoon",area:"Rawai",type:"villa",beds:3,sqm:220,price:60000,am:["pool","quiet","workspace","furnished","pets","fibre"],ex:["Pool & garden care","Fibre internet installed"],hue:170,line:"Garden pool villa on a quiet lane, ten minutes from Nai Harn."},
  {id:"KRD",mode:"rent",name:"Baan Kata Ridge",area:"Kata",type:"villa",beds:4,sqm:340,price:118000,am:["pool","seaview","beach","furnished","amenities","cleaning"],ex:["Pool & garden care","Twice-weekly housekeeping"],hue:195,line:"Hillside villa with an infinity pool over Kata Bay."},
  {id:"LGH",mode:"rent",name:"Laguna Grove House",area:"Bang Tao",type:"villa",beds:4,sqm:360,price:128000,am:["pool","school","gym","furnished","pets","amenities","commute"],ex:["Pool & garden care","School-run driver on request"],hue:130,line:"Family villa by the Laguna lakes, eight minutes from the international schools."},
  {id:"BTT",mode:"rent",name:"Bang Tao Townhouse 7",area:"Bang Tao",type:"townhouse",beds:3,sqm:160,price:52000,am:["pool","school","pets","commute","furnished","quiet"],ex:["Shared pool upkeep","Pet deposit waived"],hue:110,line:"Gated three-bed townhouse with a shared pool, close to schools and the airport road."},
  {id:"KMC",mode:"rent",name:"Kamala Bay Residence 3B",area:"Kamala",type:"condo",beds:2,sqm:98,price:31000,am:["seaview","gym","furnished","amenities","beach","workspace","fibre"],ex:["Building pool & gym","Water and wifi included"],hue:205,line:"Top-floor sea-view two-bed a short walk from Kamala beach."},
  {id:"KMV",mode:"rent",name:"Kamala Shared Pool Villa",area:"Kamala",type:"villa",beds:4,sqm:300,price:88000,am:["pool","fibre","amenities","beach","cleaning","furnished"],ex:["Weekly cleaning","Fibre internet installed"],hue:260,line:"Four equal en-suite bedrooms around a big pool. Built for sharing."},
  {id:"SRP",mode:"rent",name:"The Surin Pavilion",area:"Surin",type:"villa",beds:3,sqm:280,price:92000,am:["pool","seaview","beach","furnished","quiet","cleaning"],ex:["Pool & garden care","Weekly housekeeping"],hue:25,line:"Tropical-modern pavilion three minutes from Surin Beach."},

  {id:"CYP",mode:"buy",name:"Cape Yamu Point",area:"Cape Yamu",type:"villa",beds:5,sqm:600,price:56500000,own:"Leasehold 30 + 30 years",rent:290000,am:["pool","seaview","quiet","gym"],ex:["Legal due-diligence referral","Rental management available"],hue:220,line:"Headland estate facing Phang Nga Bay, fully staffed."},
  {id:"AMY",mode:"buy",name:"Villa Amaya",area:"Kamala",type:"villa",beds:4,sqm:420,price:32500000,own:"Leasehold 30 + 30 years",rent:180000,am:["pool","seaview","furnished","gym"],ex:["Furniture package included","Rental management available"],hue:205,line:"Four ocean-view suites and a 15 m pool above Kamala Bay."},
  {id:"BTL",mode:"buy",name:"Bang Tao Lagoon Villa",area:"Bang Tao",type:"villa",beds:3,sqm:300,price:25200000,own:"Leasehold or company freehold",rent:140000,am:["pool","school","furnished","amenities"],ex:["Furniture package included","Legal due-diligence referral"],hue:130,line:"Modern three-bed villa near Laguna and the international schools."},
  {id:"RGV",mode:"buy",name:"Rawai Garden Villa",area:"Rawai",type:"villa",beds:3,sqm:260,price:14900000,own:"Leasehold 30 + 30 years",rent:70000,am:["pool","quiet","pets","workspace"],ex:["Legal due-diligence referral"],hue:170,line:"Private pool villa on a large garden plot in a quiet soi."},
  {id:"KSC",mode:"buy",name:"Kata Sea View Condo",area:"Kata",type:"condo",beds:2,sqm:95,price:10400000,own:"Foreign freehold",rent:55000,am:["seaview","beach","gym","furnished","amenities"],ex:["Furniture package included","Rental management available"],hue:195,line:"Freehold two-bed with a wraparound sea-view terrace."},
  {id:"SBC",mode:"buy",name:"Surin Beach Condo",area:"Surin",type:"condo",beds:1,sqm:62,price:8300000,own:"Foreign freehold",rent:48000,am:["beach","seaview","gym","furnished"],ex:["Rental management available"],hue:25,line:"One-bed freehold, a two-minute walk to Surin Beach."},
  {id:"NHT2",mode:"buy",name:"Nai Harn Townhouse",area:"Nai Harn",type:"townhouse",beds:3,sqm:180,price:8900000,own:"Freehold (Thai company) or leasehold",rent:45000,am:["pool","school","pets","quiet"],ex:["Legal due-diligence referral"],hue:150,line:"Gated three-bed townhouse with a shared pool near the lake."}
];
