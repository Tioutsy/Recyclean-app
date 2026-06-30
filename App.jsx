import { useState, useRef, useEffect, useCallback } from "react";

const BRAND = {
  darkGreen: "#1B5E20", midGreen: "#2E7D32", brightGreen: "#66BB6A",
  lightBg: "#F1F8E9", white: "#FFFFFF", black: "#1A1A1A", gray: "#6B7280",
};

const CATEGORIES = [
  { id:"pet", label:"PET Plastic", emoji:"🍶", color:"#1565C0", bg:"#E3F2FD", border:"#90CAF9",
    tagline:"Transparent • Empty • Cap on",
    accept:["Water bottles","Soft drink bottles","Rice containers","Oil bottles"], reject:[],
    rule:"Must be TRANSPARENT, EMPTY, preferably with cap on.",
    co2PerItem:0.05, weightPerItem:0.025 },
  { id:"hdpe", label:"HDPE Plastic", emoji:"🧴", color:"#6A1B9A", bg:"#F3E5F5", border:"#CE93D8",
    tagline:"Empty • Cap on",
    accept:["Soap containers","Ice cream containers","Yop & Perrette bottles","Shampoo bottles","Javel bottles & gallons","Big yogurt containers"], reject:[],
    rule:"Must be EMPTY, preferably with cap on.",
    co2PerItem:0.08, weightPerItem:0.04 },
  { id:"glass", label:"Glass", emoji:"🍾", color:"#2E7D32", bg:"#E8F5E9", border:"#A5D6A7",
    tagline:"Empty • Rinsed • Not broken",
    accept:["Wine bottles","Soft drinks","Water","Beers","Alcohol bottles","Jam jars","Mayonnaise jars","Olive jars"],
    reject:["Mirrors","Drinking glass","Plates","Kitchen bowls","Windows"],
    rule:"Must be EMPTY, RINSED, NOT BROKEN.",
    co2PerItem:0.31, weightPerItem:0.30 },
  { id:"paper", label:"Paper", emoji:"📰", color:"#5D4037", bg:"#EFEBE9", border:"#BCAAA4",
    tagline:"Dry • Clean • Not greasy",
    accept:["Newspapers","Magazines","Envelopes","Paper bags","Wrapping paper","Office paper","Notebooks"],
    reject:["Tissues","Kitchen paper","Food-soiled paper","Tetrapacks"],
    rule:"Must be DRY and CLEAN — no greasy, wet, or food-soiled paper. No tissues.",
    co2PerItem:0.06, weightPerItem:0.05 },
  { id:"carton", label:"Carton", emoji:"📦", color:"#E65100", bg:"#FFF3E0", border:"#FFCC80",
    tagline:"Dry • Clean • Flattened",
    accept:["Cereal boxes","Toilet paper rolls","Carton boxes","Powder milk boxes","Biscuit boxes","Egg tray","Shoe boxes","Tissue boxes"],
    reject:["Tetrapacks"],
    rule:"Must be DRY, CLEAN, FLATTENED. ⚠️ Tetrapacks NOT recyclable.",
    co2PerItem:0.09, weightPerItem:0.08 },
];

function generateFortnightly(startDateStr, count=60) {
  const dates=[]; const start=new Date(startDateStr+"T00:00:00");
  for(let i=0;i<count;i++){const d=new Date(start);d.setDate(start.getDate()+i*14);
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);}
  return dates;
}

const REGIONS = [
  {id:"zone_a",label:"Zone A — West Coast",area:"West Coast",day:"Monday",dates:generateFortnightly("2026-05-25",60),
   localities:[
     {name:"Tamarin",covered:true},
     {name:"Black River",covered:true},
  ]},
  {id:"zone_b",label:"Zone B — West Coast",area:"West Coast",day:"Tuesday",dates:generateFortnightly("2026-05-26",60),
   localities:[
     {name:"Tamarin",covered:true},
     {name:"Flic en Flac",covered:true},
     {name:"Cascavelle",covered:true},
     {name:"Albion",covered:true},
  ]},
  {id:"zone_c",label:"Zone C — Centre Town",area:"Centre Town",day:"Wednesday",dates:generateFortnightly("2026-05-27",60),
   localities:[
     {name:"Curepipe",covered:true},
     {name:"Floreal",covered:true},
     {name:"Ebene",covered:true},
  ]},
  {id:"zone_d",label:"Zone D — Port Louis / Pailles",area:"Port Louis/Pailles",day:"Thursday",dates:generateFortnightly("2026-05-28",60),
   localities:[
     {name:"Port Louis",covered:true},
     {name:"Pailles",covered:true},
  ]},
  {id:"zone_e",label:"Zone E — East Coast",area:"East Coast",day:"Friday",dates:generateFortnightly("2026-05-29",60),
   localities:[
     {name:"Ferney",covered:true},
     {name:"Trou d'Eau Douce",covered:true},
     {name:"Roches Noires",covered:true},
  ]},
];

// Zones open for new prospect sign-ups — remove a zone ID to close it
const PROSPECT_VALID_ZONES=["zone_a","zone_b","zone_c","zone_d","zone_e"];

const DAYS_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

function toLocalDateStr(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function getBaseDates(schedule){
  if(!schedule)return[];
  if(schedule.mode==="region")return REGIONS.find(r=>r.id===(schedule.regionId||schedule.region_id))?.dates||[];
  if(schedule.mode==="custom"&&(schedule.customStart||schedule.custom_start))return generateFortnightly(schedule.customStart||schedule.custom_start,60);
  return[];
}
function applyOverrides(dates,overrides){
  if(!overrides||overrides.length===0)return[...dates];
  const skipSet=new Set(); const addedDates=[];
  overrides.forEach(o=>{skipSet.add(o.originalDate);if(o.type==="reschedule"&&o.newDate)addedDates.push(o.newDate);});
  return dates.filter(d=>!skipSet.has(d)).concat(addedDates).sort();
}
function getNextCollections(dates,count=8){const today=toLocalDateStr(new Date());return dates.filter(d=>d>=today).slice(0,count);}
function daysUntil(dateStr){const today=new Date();today.setHours(0,0,0,0);return Math.round((new Date(dateStr+"T00:00:00")-today)/86400000);}
function fmtDate(dateStr,opts){return new Date(dateStr+"T00:00:00").toLocaleDateString("en-GB",opts);}
function urlB64ToUint8(b64){const pad="=".repeat((4-b64.length%4)%4);const s=atob((b64+pad).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...s].map(c=>c.charCodeAt(0)));}
function calcImpact(entries){
  let co2=0,weight=0;
  entries.forEach(e=>{const cat=CATEGORIES.find(c=>c.id===e.category);if(cat){co2+=cat.co2PerItem;weight+=cat.weightPerItem;}});
  return{co2:Math.round(co2*100)/100,weight:Math.round(weight*100)/100,items:entries.length};
}

// ── API helpers ──────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "";

async function api(path, opts = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #C8E6C9",
  borderRadius: 10,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  outline: "none",
  marginBottom: 12,
  background: BRAND.lightBg,
  color: BRAND.black,
};

// ── Auth screen ──────────────────────────────────────
function AuthScreen({ onAuth, onProspect }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = mode === "login"
        ? { email, password }
        : { email, password, name, zone };

      const data = await api(`/auth/${mode}`, {
        method: "POST",
        body
      });

      if (data?.user) {
        onAuth(data.user);
        return;
      }

      setError("Login failed. Please try again.");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${BRAND.darkGreen},${BRAND.midGreen})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:52,marginBottom:8}}>♻️</div>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"center"}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:700,color:"#fff"}}>RECY</span>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:400,color:"#fff"}}>CLEAN</span>
        </div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase"}}>AT YOUR DOOR STEP</p>
      </div>

      <div style={{background:"#fff",borderRadius:24,padding:"28px 24px",width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",background:BRAND.lightBg,borderRadius:10,padding:3,marginBottom:22}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:mode===m?"#fff":"transparent",color:mode===m?BRAND.darkGreen:BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all 0.15s",textTransform:"capitalize"}}>
              {m==="login"?"Log In":"Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode==="signup"&&<input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} style={inputStyle} required/>}
          <input placeholder="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} required/>
          <input placeholder="Password (min 6 characters)" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} required/>

          {mode==="signup"&&(
            <select value={zone} onChange={e=>setZone(e.target.value)} style={inputStyle}>
              <option value="">Select your collection zone (optional)</option>
              {REGIONS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          )}

          {error&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#C62828",marginBottom:10,textAlign:"center"}}>{error}</p>}

          <button type="submit" disabled={loading} style={{width:"100%",padding:"14px",borderRadius:50,border:"none",background:loading?"#C8E6C9":BRAND.darkGreen,color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700,cursor:loading?"default":"pointer",transition:"all 0.2s"}}>
            {loading?"Please wait…":mode==="login"?"Log In →":"Create Account →"}
          </button>
        </form>

        {onProspect&&(
          <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #F1F8E9",textAlign:"center"}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray,marginBottom:8}}>Pas encore client Recyclean ?</p>
            <button onClick={onProspect} style={{width:"100%",padding:"11px",borderRadius:50,border:`1px solid ${BRAND.brightGreen}`,background:BRAND.lightBg,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:BRAND.darkGreen,cursor:"pointer"}}>
              Demander à m'abonner →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prospect sign-up form ─────────────────────────────
function ProspectForm({onBack,onSuccess}){
  const [form,setForm]=useState({name:"",email:"",phone:"",address:"",zone_id:"",locality:"",message:""});
  const [localityCovered,setLocalityCovered]=useState(true);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const validRegions=REGIONS.filter(r=>PROSPECT_VALID_ZONES.includes(r.id));
  const selectedRegion=REGIONS.find(r=>r.id===form.zone_id);

  const handleZone=val=>{
    setForm(p=>({...p,zone_id:val,locality:""}));
    setLocalityCovered(true);
  };
  const handleLocality=val=>{
    const loc=selectedRegion?.localities?.find(l=>l.name===val);
    setLocalityCovered(!val||loc?.covered!==false);
    setForm(p=>({...p,locality:val}));
  };

  const submit=async e=>{
    e.preventDefault();
    if(!form.zone_id||!form.locality)return setError("Veuillez sélectionner une zone et un quartier.");
    setError("");setLoading(true);
try{
  const res=await fetch(`${API_URL}/api/prospects`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...form,locality_covered:localityCovered})});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"Erreur");
  onSuccess({...form,locality_covered:localityCovered});
}catch(err){setError(err.message);}
finally{setLoading(false);}
  };
  const inp={...inputStyle,marginBottom:10};
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${BRAND.darkGreen},${BRAND.midGreen})`,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 20px 40px",overflowY:"auto"}}>
      <div style={{textAlign:"center",marginBottom:20,marginTop:16}}>
        <div style={{fontSize:44}}>♻️</div>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"center"}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:700,color:"#fff"}}>RECY</span>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:400,color:"#fff"}}>CLEAN</span>
        </div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase"}}>AT YOUR DOOR STEP</p>
      </div>
      <div style={{background:"#fff",borderRadius:24,padding:"24px 20px",width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer",padding:0,marginBottom:10}}>← Retour</button>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:19,fontWeight:700,color:BRAND.darkGreen,marginBottom:4}}>Devenir client Recyclean</h2>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray,marginBottom:16}}>Remplissez ce formulaire. Notre équipe vous contactera dans 24-48h avec les détails d'abonnement.</p>
        <form onSubmit={submit}>
          <input placeholder="Nom complet *" value={form.name} onChange={set("name")} style={inp} required/>
          <input placeholder="Email *" type="email" value={form.email} onChange={set("email")} style={inp} required/>
          <input placeholder="Téléphone *" type="tel" value={form.phone} onChange={set("phone")} style={inp} required/>
          <input placeholder="Adresse complète *" value={form.address} onChange={set("address")} style={inp} required/>

          <select value={form.zone_id} onChange={e=>handleZone(e.target.value)} style={inp}>
            <option value="">Sélectionnez votre zone *</option>
            {validRegions.map(r=><option key={r.id} value={r.id}>{r.label} — collecte le {r.day}</option>)}
          </select>

          {selectedRegion&&(()=>{
            const covered=selectedRegion.localities?.filter(l=>l.covered)||[];
            const notCovered=selectedRegion.localities?.filter(l=>!l.covered)||[];
            return(<>
              <select value={form.locality} onChange={e=>handleLocality(e.target.value)} style={inp}>
                <option value="">Sélectionnez votre quartier *</option>
                {covered.length>0&&<optgroup label={"✓ Couverts par Recyclean ("+covered.length+")"}>
                  {covered.map(l=><option key={l.name} value={l.name}>{l.name}</option>)}
                </optgroup>}
                {notCovered.length>0&&<optgroup label={"— Pas encore desservis ("+notCovered.length+")"}>
                  {notCovered.map(l=><option key={l.name} value={l.name}>{l.name}</option>)}
                </optgroup>}
                <option value="Autre (non listé)">Autre — mon quartier n'est pas listé</option>
              </select>
              {form.locality&&localityCovered&&(
                <div style={{background:"#E8F5E9",border:"1px solid #A5D6A7",borderRadius:10,padding:"8px 14px",marginBottom:10,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.darkGreen}}>
                  ✅ <strong>{form.locality}</strong> est couvert par Recyclean !
                </div>
              )}
              {form.locality&&!localityCovered&&(
                <div style={{background:"#FFF8E1",border:"1px solid #FFE082",borderRadius:10,padding:"10px 14px",marginBottom:10,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#F57F17"}}>
                  🚧 <strong>{form.locality}</strong> n'est pas encore desservi. Votre demande sera enregistrée et notre équipe vous contactera dès que ce quartier sera couvert.
                </div>
              )}
            </>);
          })()}

          <textarea placeholder="Message ou remarque (optionnel)" value={form.message} onChange={set("message")} style={{...inp,minHeight:64,resize:"vertical"}}/>
          {error&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#C62828",marginBottom:10,textAlign:"center"}}>{error}</p>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"14px",borderRadius:50,border:"none",background:loading?"#C8E6C9":BRAND.darkGreen,color:loading?BRAND.gray:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700,cursor:loading?"default":"pointer",transition:"all 0.2s"}}>
            {loading?"Envoi…":"Envoyer ma demande →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Prospect success screen ───────────────────────────
function ProspectSuccess({data,onBack}){
  const zone=REGIONS.find(r=>r.id===data.zone_id);
  const ref=`RECYCLEAN-${(data.zone_id||"").replace("zone_","").toUpperCase()}-${(data.name||"").split(" ")[0].toUpperCase()}`;
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${BRAND.darkGreen},${BRAND.midGreen})`,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 20px 40px",overflowY:"auto"}}>
      <div style={{textAlign:"center",marginBottom:20,marginTop:16}}>
        <div style={{fontSize:52,marginBottom:4}}>✅</div>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"center"}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:700,color:"#fff"}}>RECY</span>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:400,color:"#fff"}}>CLEAN</span>
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:24,padding:"24px 20px",width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:BRAND.darkGreen,marginBottom:6}}>Demande envoyée! 🎉</h2>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray}}>Notre équipe vous contactera à <strong>{data.email}</strong> dans 24 à 48 heures.</p>
        </div>
        <div style={{background:BRAND.lightBg,borderRadius:14,padding:"14px 16px",marginBottom:14,border:"1px solid #C8E6C9"}}>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,color:BRAND.darkGreen,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Votre inscription</div>
          {[["Nom",data.name],["Email",data.email],["Téléphone",data.phone],["Zone",zone?.label||data.zone_id],
            ["Quartier",data.locality+(data.locality_covered===false?" 🚧":"")],
            ["Collecte",zone?`Tous les ${zone.day} (semaine sur deux)`:""]]
            .filter(([,v])=>v).map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #E8F5E9"}}>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray}}>{l}</span>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:BRAND.black,textAlign:"right",maxWidth:"60%"}}>{v}</span>
            </div>))}
        </div>
        <div style={{background:"#E8EAF6",borderRadius:14,padding:"14px 16px",marginBottom:16,border:"1px solid #C5CAE9"}}>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,color:"#283593",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>💳 Infos de paiement</div>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#3949AB",marginBottom:10}}>Préparez un virement bancaire avec cette référence. Le montant et les coordonnées complètes vous seront communiqués par email.</p>
          {[["Mode","Virement bancaire"],["Référence",ref]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #C5CAE9"}}>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#5C6BC0"}}>{l}</span>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,color:"#283593"}}>{v}</span>
            </div>))}
        </div>
        <button onClick={onBack} style={{width:"100%",padding:"13px",borderRadius:50,border:"none",background:BRAND.darkGreen,color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>Retour à la connexion</button>
      </div>
    </div>
  );
}

// ── Camera components ────────────────────────────────
function BarcodeScanner({onDetect,onClose}){
  const videoRef=useRef(null),streamRef=useRef(null),rafRef=useRef(null);
  const [error,setError]=useState(null);
  useEffect(()=>{
    async function start(){
      try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
        streamRef.current=stream;if(videoRef.current)videoRef.current.srcObject=stream;
        if("BarcodeDetector" in window){const det=new window.BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","qr_code"]});
          const scan=async()=>{try{const c=await det.detect(videoRef.current);if(c.length>0){onDetect({type:"barcode",value:c[0].rawValue});return;}}catch{}rafRef.current=requestAnimationFrame(scan);};
          rafRef.current=requestAnimationFrame(scan);}else setError("BarcodeDetector not supported. Use Chrome Android or Safari iOS 17+.");}
      catch(e){setError("Camera denied: "+e.message);}}
    start();return()=>{cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[]);
  return(<div style={{position:"fixed",inset:0,background:"#000",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
    <div style={{width:"100%",maxWidth:480,position:"relative"}}><video ref={videoRef} autoPlay playsInline muted style={{width:"100%",borderRadius:12}}/>
      <div style={{position:"absolute",top:"25%",left:"10%",right:"10%",height:"50%",border:"2px solid #66BB6A",borderRadius:8}}/></div>
    {error&&<p style={{color:"#FFAB91",padding:16,textAlign:"center",fontSize:13}}>{error}</p>}
    {!error&&<p style={{color:"#A5D6A7",margin:"16px 0",fontFamily:"'DM Sans',sans-serif",fontSize:14}}>Point camera at barcode</p>}
    <button onClick={onClose} style={{padding:"10px 32px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:50,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
  </div>);
}

function PhotoCapture({onCapture,onClose}){
  const videoRef=useRef(null),canvasRef=useRef(null),streamRef=useRef(null);
  const [error,setError]=useState(null);
  useEffect(()=>{
    async function start(){try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:1280,height:720}});
      streamRef.current=stream;if(videoRef.current)videoRef.current.srcObject=stream;}catch(e){setError("Camera denied: "+e.message);}}
    start();return()=>streamRef.current?.getTracks().forEach(t=>t.stop());
  },[]);
  const snap=()=>{const v=videoRef.current,c=canvasRef.current;if(!v||!c)return;c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);onCapture({type:"photo",value:c.toDataURL("image/jpeg",0.7)});};
  return(<div style={{position:"fixed",inset:0,background:"#000",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
    <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",maxWidth:480,borderRadius:12}}/><canvas ref={canvasRef} style={{display:"none"}}/>
    {error&&<p style={{color:"#FFAB91",padding:16}}>{error}</p>}
    <div style={{display:"flex",gap:12,marginTop:20}}>
      <button onClick={onClose} style={{padding:"12px 28px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:50,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
      <button onClick={snap} style={{padding:"12px 32px",background:"#66BB6A",border:"none",color:"#fff",borderRadius:50,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700}}>📸 Capture</button>
    </div>
  </div>);
}

// ── AI classify ──────────────────────────────────────
async function classifyWithAI(scan){
  const systemPrompt=`You are a recycling classification assistant for Mauritius.
Identify items and determine if they are recyclable, and which category.
Categories:
1. PET Plastic (id:"pet") — transparent plastic bottles. Must be transparent.
2. HDPE Plastic (id:"hdpe") — opaque plastic containers (soap, shampoo, Yop, Javel, ice cream).
3. Glass (id:"glass") — glass bottles/jars. NOT broken glass, mirrors, or drinking glasses.
4. Paper (id:"paper") — flat paper only: newspapers, magazines, envelopes, paper bags, office paper. Must be dry and not greasy. NOT tissues, kitchen paper, or Tetrapacks.
5. Carton (id:"carton") — cardboard boxes: cereal boxes, toilet paper rolls, egg trays, shoe boxes, powder milk boxes. Must be dry, clean, flattened. NOT Tetrapacks.
Respond ONLY with valid JSON:
{"recyclable":true/false,"categoryId":"pet"|"hdpe"|"glass"|"paper"|"carton"|null,"itemName":"brief name","confidence":"high"|"medium"|"low","reason":"one sentence","tip":"one short tip"}`;
  let userContent;
  if(scan.type==="photo"){userContent=[{type:"image_url",image_url:{url:scan.value,detail:"low"}},{type:"text",text:"Is this recyclable? Which category?"}];}
  else{userContent=[{type:"text",text:`Barcode: ${scan.value}. What product is this likely to be? Is it recyclable?`}];}
  const res=await fetch(`${API_URL}/api/classify`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-4o",messages:[{role:"system",content:systemPrompt},{role:"user",content:userContent}],max_tokens:300})});
  if(!res.ok)throw new Error("AI request failed");
  const data=await res.json();
  const text=data.choices?.[0]?.message?.content||"";
  const json=text.match(/\{[\s\S]*\}/)?.[0];
  if(!json)throw new Error("No JSON in response");
  return JSON.parse(json);
}

// ── CategoryPicker with AI ───────────────────────────
function CategoryPicker({scan,onSave,onCancel}){
  const [selected,setSelected]=useState(null);
  const [note,setNote]=useState("");
  const [aiResult,setAiResult]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState(null);
  const [aiDone,setAiDone]=useState(false);
  const cat=CATEGORIES.find(c=>c.id===selected);
  useEffect(()=>{
    let cancelled=false;
    async function run(){setAiLoading(true);setAiError(null);
      try{const r=await classifyWithAI(scan);if(cancelled)return;setAiResult(r);if(r.recyclable&&r.categoryId)setSelected(r.categoryId);}
      catch(e){if(!cancelled)setAiError("AI unavailable — please select manually.");}
      finally{if(!cancelled){setAiLoading(false);setAiDone(true);}}}
    run();return()=>{cancelled=true;};
  },[]);
  const confColor=aiResult?.confidence==="high"?BRAND.darkGreen:aiResult?.confidence==="medium"?"#E65100":"#9C27B0";
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:150,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:36,height:36,background:BRAND.lightBg,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
          <div><h3 style={{fontFamily:"'Syne',sans-serif",fontSize:17,color:BRAND.darkGreen,lineHeight:1}}>AI Classifier</h3>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray}}>{aiLoading?"Analysing item…":aiDone?"Review & confirm below":"Classify this item"}</p></div>
          {aiLoading&&<div style={{marginLeft:"auto",width:20,height:20,border:`2px solid ${BRAND.brightGreen}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>}
        </div>
        {scan.type==="barcode"&&<div style={{background:BRAND.lightBg,borderRadius:10,padding:"8px 14px",marginBottom:12,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.darkGreen}}>📊 Barcode: <strong style={{fontFamily:"monospace"}}>{scan.value}</strong></div>}
        {scan.type==="photo"&&<img src={scan.value} alt="item" style={{width:"100%",maxHeight:120,objectFit:"cover",borderRadius:12,marginBottom:12}}/>}
        {aiResult&&(<div style={{borderRadius:14,padding:"12px 14px",marginBottom:12,background:aiResult.recyclable?"#E8F5E9":"#FFEBEE",border:`1px solid ${aiResult.recyclable?"#A5D6A7":"#FFCDD2"}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,color:aiResult.recyclable?BRAND.darkGreen:"#C62828"}}>{aiResult.recyclable?"✅ Recyclable":"❌ Not recyclable"}{aiResult.itemName?` — ${aiResult.itemName}`:""}</div>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,color:confColor,background:"#fff",borderRadius:20,padding:"2px 8px",border:`1px solid ${confColor}22`}}>{aiResult.confidence} confidence</span>
          </div>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#444",marginBottom:aiResult.tip?6:0}}>{aiResult.reason}</p>
          {aiResult.tip&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.midGreen,fontWeight:600}}>💡 {aiResult.tip}</p>}
        </div>)}
        {aiError&&<div style={{background:"#FFF3E0",borderRadius:10,padding:"10px 14px",marginBottom:12,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#E65100"}}>⚠️ {aiError}</div>}
        {(aiResult?.recyclable!==false||aiError)&&(<>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:BRAND.black,marginBottom:8}}>{aiResult?.recyclable?"Confirm category:":"Select category:"}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {CATEGORIES.map((c,idx)=>(<button key={c.id} onClick={()=>setSelected(c.id)} style={{padding:"12px 10px",borderRadius:14,textAlign:"left",cursor:"pointer",border:selected===c.id?`2px solid ${c.color}`:`1px solid ${c.border}`,background:selected===c.id?c.bg:"#FAFAFA",boxShadow:selected===c.id?`0 0 0 3px ${c.color}22`:"none",transition:"all 0.15s",position:"relative",gridColumn:idx===CATEGORIES.length-1&&CATEGORIES.length%2!==0?"1 / -1":"auto"}}>
              {aiResult?.categoryId===c.id&&<span style={{position:"absolute",top:6,right:8,fontSize:9,fontWeight:700,color:BRAND.darkGreen,background:"#C8E6C9",borderRadius:6,padding:"1px 5px"}}>AI</span>}
              <div style={{fontSize:20,marginBottom:3}}>{c.emoji}</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:c.color}}>{c.label}</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:BRAND.gray,marginTop:2}}>{c.tagline}</div>
            </button>))}
          </div>
          {cat&&<div style={{background:cat.bg,border:`1px solid ${cat.border}`,borderRadius:10,padding:"10px 14px",marginBottom:12}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:cat.color,fontWeight:600,marginBottom:4}}>✅ {cat.rule}</p>
            {cat.reject.length>0&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#C62828"}}>❌ NOT accepted: {cat.reject.join(", ")}</p>}
          </div>}
        </>)}
        <input placeholder="Optional note (e.g. Evian 1.5L)" value={note} onChange={e=>setNote(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",border:"1px solid #C8E6C9",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",marginBottom:12,background:BRAND.lightBg}}/>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"13px",borderRadius:50,border:"1px solid #C8E6C9",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,cursor:"pointer",color:BRAND.gray}}>Cancel</button>
          {aiResult?.recyclable===false&&!aiError
            ?<button onClick={onCancel} style={{flex:2,padding:"13px",borderRadius:50,border:"none",background:"#C62828",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",color:"#fff"}}>Not recyclable — discard</button>
            :<button onClick={()=>selected&&onSave({...scan,category:selected,note,date:new Date().toISOString(),aiResult})} disabled={!selected} style={{flex:2,padding:"13px",borderRadius:50,border:"none",background:selected?BRAND.darkGreen:"#C8E6C9",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,cursor:selected?"pointer":"default",color:selected?"#fff":BRAND.gray,transition:"all 0.2s"}}>✓ Save Entry</button>}
        </div>
      </div>
    </div>
  );
}

// ── Quick log ────────────────────────────────────────
function QuickLog({onSave,onCancel}){
  const [counts,setCounts]=useState({pet:0,hdpe:0,glass:0,paper:0});
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const adjust=(id,delta)=>setCounts(p=>({...p,[id]:Math.max(0,p[id]+delta)}));
  const handleSave=()=>{
    const entries=[];
    CATEGORIES.forEach(cat=>{for(let i=0;i<counts[cat.id];i++)entries.push({type:"quick",value:"quick-log",category:cat.id,note:"Quick log",date:new Date().toISOString()});});
    onSave(entries);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:150,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:520}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:18,color:BRAND.darkGreen}}>⚡ Quick Log</h3>
          <button onClick={onCancel} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:BRAND.gray}}>×</button>
        </div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray,marginBottom:20}}>How many items are you putting out for collection?</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {CATEGORIES.map(cat=>(
            <div key={cat.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:14,border:`1px solid ${cat.border}`,background:cat.bg}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}}>{cat.emoji}</span>
                <div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:cat.color}}>{cat.label}</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:BRAND.gray}}>{cat.tagline}</div></div></div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>adjust(cat.id,-1)} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${cat.border}`,background:"#fff",fontSize:18,cursor:"pointer",color:cat.color,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:cat.color,minWidth:24,textAlign:"center"}}>{counts[cat.id]}</span>
                <button onClick={()=>adjust(cat.id,+1)} style={{width:32,height:32,borderRadius:"50%",border:"none",background:cat.color,fontSize:18,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"13px",borderRadius:50,border:"1px solid #C8E6C9",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,cursor:"pointer",color:BRAND.gray}}>Cancel</button>
          <button onClick={handleSave} disabled={total===0} style={{flex:2,padding:"13px",borderRadius:50,border:"none",background:total>0?BRAND.darkGreen:"#C8E6C9",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,cursor:total>0?"pointer":"default",color:total>0?"#fff":BRAND.gray}}>✓ Log {total} item{total!==1?"s":""}</button>
        </div>
      </div>
    </div>
  );
}

function EntryCard({entry,onDelete}){
  const cat=CATEGORIES.find(c=>c.id===entry.category)||CATEGORIES[0];
  const d=new Date(entry.created_at||entry.date);
  const label=d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})+" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  return(
    <div style={{background:cat.bg,border:`1px solid ${cat.border}`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:44,height:44,background:"#fff",borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{cat.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:cat.color}}>{cat.label}{entry.ai_item_name?` — ${entry.ai_item_name}`:""}</div>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.note||(entry.type==="barcode"?entry.value:entry.type==="quick"?"Quick log":"Photo")}</div>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#9CA3AF"}}>{label}</div>
      </div>
      <button onClick={()=>onDelete(entry.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:20,padding:4,flexShrink:0,lineHeight:1}}>×</button>
    </div>
  );
}

// ── Impact dashboard ─────────────────────────────────
function ImpactDash({entries}){
  const{co2,weight,items}=calcImpact(entries);
  const trees=(co2/21).toFixed(2);
  return(
    <div style={{background:`linear-gradient(135deg,${BRAND.darkGreen},${BRAND.midGreen})`,borderRadius:18,padding:"16px 20px",marginBottom:20,color:"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700}}>Your Impact</span>
        <span style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"3px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600}}>{items} item{items!==1?"s":""}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[{emoji:"🌿",value:`${co2} kg`,label:"CO₂ saved"},{emoji:"♻️",value:`${weight} kg`,label:"recycled"},{emoji:"🌳",value:trees,label:"tree CO₂ days"}].map(s=>(
          <div key={s.label} style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:2}}>{s.emoji}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:800,lineHeight:1}}>{s.value}</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,opacity:0.75,marginTop:2,lineHeight:1.2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
        {CATEGORIES.map(c=>{const count=entries.filter(e=>e.category===c.id).length;return(
          <div key={c.id} style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:13}}>{c.emoji}</span><span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600}}>{count}</span>
          </div>);})}
      </div>
    </div>
  );
}

// ── Guide modal ──────────────────────────────────────
function GuideModal({cat,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:150,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:520,maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:20,color:cat.color}}>{cat.emoji} {cat.label}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:BRAND.gray}}>×</button>
        </div>
        <div style={{background:cat.bg,border:`1px solid ${cat.border}`,borderRadius:12,padding:"12px 16px",marginBottom:14}}>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:cat.color,fontWeight:700}}>📋 Requirements</p>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.black,marginTop:4}}>{cat.rule}</p>
        </div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:BRAND.darkGreen,marginBottom:8}}>✅ Accepted:</p>
        {cat.accept.map((a,i)=><p key={i} style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.black,padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>· {a}</p>)}
        {cat.reject.length>0&&<><p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:"#C62828",margin:"12px 0 8px"}}>❌ NOT accepted:</p>
          {cat.reject.map((r,i)=><p key={i} style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#C62828",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>· {r}</p>)}</>}
      </div>
    </div>
  );
}

// ── Region setup ─────────────────────────────────────
function RegionSetupModal({current,onSave,onClose}){
  const [mode,setMode]=useState(current?.mode||"region");
  const [regionId,setRegionId]=useState(current?.regionId||current?.region_id||"");
  const [customStart,setCustomStart]=useState(current?.customStart||current?.custom_start||"");
  const canSave=mode==="region"?!!regionId:!!customStart;
  const handleSave=()=>{if(mode==="region")onSave({mode,regionId});else onSave({mode,customStart});};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:150,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:19,color:BRAND.darkGreen}}>📅 Collection Schedule</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:BRAND.gray}}>×</button>
        </div>
        <div style={{display:"flex",background:BRAND.lightBg,borderRadius:10,padding:3,marginBottom:18}}>
          {[{id:"region",label:"Select Zone"},{id:"custom",label:"Custom Date"}].map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:mode===m.id?"#fff":"transparent",color:mode===m.id?BRAND.darkGreen:BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:mode===m.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all 0.15s"}}>{m.label}</button>
          ))}
        </div>
        {mode==="region"&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {REGIONS.map(r=>{const next=getNextCollections(r.dates,1)[0];const isSel=regionId===r.id;return(
            <button key={r.id} onClick={()=>setRegionId(r.id)} style={{padding:"14px 16px",borderRadius:14,textAlign:"left",cursor:"pointer",border:isSel?`2px solid ${BRAND.darkGreen}`:"1px solid #C8E6C9",background:isSel?BRAND.lightBg:"#FAFAFA",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:BRAND.darkGreen}}>{r.label}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray,marginTop:2}}>Every other {r.day}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:BRAND.brightGreen,fontWeight:600}}>Next</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.darkGreen,fontWeight:700}}>{next?fmtDate(next,{day:"2-digit",month:"short"}):"—"}</div></div>
            </button>);})}
        </div>}
        {mode==="custom"&&<div>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:BRAND.black,marginBottom:8}}>First collection date:</p>
          <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"12px 14px",border:"1px solid #C8E6C9",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:"none",marginBottom:14,background:BRAND.lightBg,color:BRAND.black}}/>
        </div>}
        <button onClick={handleSave} disabled={!canSave} style={{width:"100%",padding:"14px",borderRadius:50,border:"none",background:canSave?BRAND.darkGreen:"#C8E6C9",color:canSave?"#fff":BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700,cursor:canSave?"pointer":"default"}}>✓ Save Schedule</button>
      </div>
    </div>
  );
}

// ── Holiday modal ────────────────────────────────────
function HolidayModal({schedule,overrides,onSave,onClose}){
  const baseDates=getBaseDates(schedule);
  const today=toLocalDateStr(new Date());
  const upcoming=baseDates.filter(d=>d>=today).slice(0,12);
  const [localOverrides,setLocalOverrides]=useState(overrides);
  const [expandedDate,setExpandedDate]=useState(null);
  const [rescheduleInput,setRescheduleInput]=useState({});
  const [reasonInput,setReasonInput]=useState({});
  const localMap={};localOverrides.forEach(o=>{localMap[o.originalDate]=o;});
  const skipDate=d=>{setLocalOverrides([...localOverrides.filter(o=>o.originalDate!==d),{originalDate:d,type:"skip"}]);setExpandedDate(null);};
  const restoreDate=d=>{setLocalOverrides(localOverrides.filter(o=>o.originalDate!==d));setExpandedDate(null);};
  const rescheduleDate=d=>{const nd=rescheduleInput[d];if(!nd)return;setLocalOverrides([...localOverrides.filter(o=>o.originalDate!==d),{originalDate:d,type:"reschedule",newDate:nd,reason:reasonInput[d]||""}]);setExpandedDate(null);};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:160,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:18,color:BRAND.darkGreen}}>🗓 Holiday & Skip Dates</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:BRAND.gray}}>×</button>
        </div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray,marginBottom:16}}>Mark collection dates as skipped or rescheduled.</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {upcoming.map(date=>{const ov=localMap[date];const isExpanded=expandedDate===date;return(
            <div key={date} style={{borderRadius:14,border:`1px solid ${ov?.type==="skip"?"#FFCDD2":ov?.type==="reschedule"?"#FFE0B2":"#C8E6C9"}`,background:ov?.type==="skip"?"#FFEBEE":ov?.type==="reschedule"?"#FFF8E1":"#fff",overflow:"hidden"}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:ov?.type==="skip"?"#C62828":ov?.type==="reschedule"?"#E65100":BRAND.darkGreen,textDecoration:ov?.type==="skip"?"line-through":"none"}}>{fmtDate(date,{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</div>
                  {ov?.type==="skip"&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#C62828",marginTop:2}}>❌ Skipped</div>}
                  {ov?.type==="reschedule"&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#E65100",marginTop:2}}>📅 Moved to {fmtDate(ov.newDate,{day:"2-digit",month:"short"})}</div>}
                  {!ov&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray,marginTop:2}}>✅ Normal collection</div>}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  {ov?<button onClick={()=>restoreDate(date)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid #C8E6C9",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.darkGreen,cursor:"pointer",fontWeight:600}}>Restore</button>
                    :<><button onClick={()=>skipDate(date)} style={{padding:"5px 10px",borderRadius:20,border:"1px solid #FFCDD2",background:"#FFEBEE",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#C62828",cursor:"pointer",fontWeight:600}}>Skip</button>
                      <button onClick={()=>setExpandedDate(isExpanded?null:date)} style={{padding:"5px 10px",borderRadius:20,border:"1px solid #FFE0B2",background:"#FFF8E1",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#E65100",cursor:"pointer",fontWeight:600}}>{isExpanded?"Cancel":"Move"}</button></>}
                </div>
              </div>
              {isExpanded&&!ov&&(<div style={{padding:"0 14px 14px",borderTop:"1px solid #F1F8E9"}}>
                <input type="date" value={rescheduleInput[date]||""} onChange={e=>setRescheduleInput(p=>({...p,[date]:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:"1px solid #C8E6C9",borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",marginBottom:8,marginTop:10,background:BRAND.lightBg}}/>
                <input type="text" placeholder="Reason (e.g. Public holiday)" value={reasonInput[date]||""} onChange={e=>setReasonInput(p=>({...p,[date]:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:"1px solid #C8E6C9",borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",marginBottom:10,background:BRAND.lightBg}}/>
                <button onClick={()=>rescheduleDate(date)} disabled={!rescheduleInput[date]} style={{width:"100%",padding:"10px",borderRadius:50,border:"none",background:rescheduleInput[date]?BRAND.darkGreen:"#C8E6C9",color:rescheduleInput[date]?"#fff":BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,cursor:rescheduleInput[date]?"pointer":"default"}}>✓ Confirm Reschedule</button>
              </div>)}
            </div>);})}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:50,border:"1px solid #C8E6C9",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,cursor:"pointer",color:BRAND.gray}}>Discard</button>
          <button onClick={()=>onSave(localOverrides)} style={{flex:2,padding:"13px",borderRadius:50,border:"none",background:BRAND.darkGreen,color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>✓ Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ── Mini Calendar ────────────────────────────────────
function MiniCalendar({effectiveDates,skippedDates,rescheduledFromDates,rescheduledToDates,missedDates}){
  const today=new Date();today.setHours(0,0,0,0);
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const todayStr=toLocalDateStr(today);
  const effectiveSet=new Set(effectiveDates),skippedSet=new Set(skippedDates),reschFromSet=new Set(rescheduledFromDates),reschToSet=new Set(rescheduledToDates),missedSet=new Set(missedDates);
  const firstDay=new Date(year,month,1).getDay(),daysInMonth=new Date(year,month+1,0).getDate();
  const cells=[];for(let i=0;i<firstDay;i++)cells.push(null);for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  return(
    <div style={{background:"#fff",borderRadius:18,padding:"16px",border:"1px solid #C8E6C9",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button onClick={prevMonth} style={{background:"none",border:"1px solid #C8E6C9",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:BRAND.darkGreen,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <span style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:BRAND.darkGreen}}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{background:"none",border:"1px solid #C8E6C9",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:BRAND.darkGreen,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
        {DAYS_SHORT.map(d=><div key={d} style={{textAlign:"center",fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,color:BRAND.gray,padding:"4px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((d,i)=>{if(!d)return<div key={i}/>;
          const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isToday=ds===todayStr,isCol=effectiveSet.has(ds),isSkip=skippedSet.has(ds),isReschTo=reschToSet.has(ds),isMissed=missedSet.has(ds),isPast=ds<todayStr;
          let bg="transparent",color=isPast?"#C5C9D0":BRAND.black,border="1px solid transparent",fw=400;
          if(isToday&&!isCol&&!isSkip){bg=BRAND.lightBg;color=BRAND.darkGreen;border=`1px solid ${BRAND.brightGreen}`;fw=700;}
          if(isCol&&!isPast){bg=BRAND.brightGreen;color="#fff";fw=700;}
          if(isCol&&isPast){bg="#C8E6C9";color=BRAND.midGreen;fw=600;}
          if(isCol&&isToday){bg=BRAND.darkGreen;color="#fff";fw=700;}
          if(isSkip){bg="#FFEBEE";color="#C62828";border="1px solid #FFCDD2";fw=600;}
          if(isReschTo){bg="#E8F5E9";color=BRAND.darkGreen;border=`1px solid ${BRAND.brightGreen}`;fw=700;}
          if(isMissed&&isPast){bg="#F3E5F5";color="#6A1B9A";border="1px solid #CE93D8";fw=600;}
          return(<div key={i} style={{textAlign:"center",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:fw,padding:"6px 2px",borderRadius:"50%",background:bg,color,border}}>{d}</div>);
        })}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12,justifyContent:"center"}}>
        {[{bg:BRAND.brightGreen,label:"Collection"},{bg:"#FFEBEE",border:"1px solid #FFCDD2",label:"Skipped"},{bg:"#FFF8E1",border:"1px solid #FFE0B2",label:"Moved"},{bg:"#F3E5F5",border:"1px solid #CE93D8",label:"Missed"}].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:9,height:9,borderRadius:"50%",background:l.bg,border:l.border}}/><span style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:BRAND.gray}}>{l.label}</span></div>
        ))}
      </div>
    </div>
  );
}

// ── Schedule tab ─────────────────────────────────────
function ScheduleTab({schedule,overrides,missedDates,onSetupOpen,onHolidayOpen,onReportMissed}){
  const [notifStatus,setNotifStatus]=useState(()=>{if(!("Notification" in window))return"unsupported";return Notification.permission;});
  const baseDates=getBaseDates(schedule);
  const effectiveDates=applyOverrides(baseDates,overrides);
  const upcoming=getNextCollections(effectiveDates,8);
  const next=upcoming[0];
  const daysLeft=next?daysUntil(next):null;
  const skippedDates=overrides.filter(o=>o.type==="skip").map(o=>o.originalDate);
  const rescheduledFromDates=overrides.filter(o=>o.type==="reschedule").map(o=>o.originalDate);
  const rescheduledToDates=overrides.filter(o=>o.type==="reschedule").map(o=>o.newDate);
  const overrideCount=overrides.length;
  const today=toLocalDateStr(new Date());
  const isCollectionToday=effectiveDates.includes(today);
  const alreadyReported=missedDates.includes(today);
  const regionLabel=schedule?.mode==="region"?REGIONS.find(r=>r.id===(schedule.regionId||schedule.region_id))?.label:"Custom";

  const requestNotifications=async()=>{
    if(!("Notification" in window))return;
    const perm=await Notification.requestPermission();setNotifStatus(perm);
    if(perm!=="granted")return;
    try{const reg=await navigator.serviceWorker.ready;
      reg.showNotification("♻️ Recyclean — Reminders Active",{body:next?`Next: ${fmtDate(next,{weekday:"long",day:"2-digit",month:"long"})}`:"Reminders enabled.",icon:"/favicon.svg",badge:"/favicon.svg",tag:"recyclean-setup"});}
    catch{if(next)new Notification("♻️ Recyclean",{body:`Reminders enabled! Next: ${fmtDate(next,{weekday:"long",day:"2-digit",month:"long"})}`});}
  };
  const testNotification=async()=>{
    try{const reg=await navigator.serviceWorker.ready;reg.showNotification("🚛 Recyclean — Test",{body:next?`Next: ${fmtDate(next,{weekday:"long",day:"2-digit",month:"long"})}.`:"Test.",icon:"/favicon.svg",tag:"recyclean-test"});}
    catch{if("Notification" in window)new Notification("🚛 Recyclean",{body:"Test reminder."});}
  };

  if(!schedule)return(
    <div style={{textAlign:"center",padding:"48px 20px"}}>
      <div style={{fontSize:52,marginBottom:16}}>📅</div>
      <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:20,color:BRAND.darkGreen,marginBottom:8}}>Set up your schedule</h3>
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray,marginBottom:24,lineHeight:1.6}}>Select your zone to get fortnightly collection reminders.</p>
      <button onClick={onSetupOpen} style={{padding:"14px 32px",borderRadius:50,border:"none",background:BRAND.darkGreen,color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer"}}>Get Started →</button>
    </div>
  );

  return(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      {daysLeft!==null&&(<div style={{borderRadius:16,padding:"14px 18px",marginBottom:16,background:daysLeft===0?`linear-gradient(135deg,${BRAND.darkGreen},${BRAND.midGreen})`:daysLeft===1?"linear-gradient(135deg,#E65100,#EF6C00)":`linear-gradient(135deg,${BRAND.midGreen},#388E3C)`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,opacity:0.85,marginBottom:2}}>{daysLeft===0?"🚛 Collection TODAY!":daysLeft===1?"⚠️ Collection TOMORROW!":"🗓 Next Collection"}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700}}>{fmtDate(next,{weekday:"long",day:"2-digit",month:"long"})}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,opacity:0.75,marginTop:2}}>{regionLabel}</div></div>
        <div style={{textAlign:"center",background:"rgba(255,255,255,0.18)",borderRadius:12,padding:"8px 14px",minWidth:52}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,lineHeight:1}}>{daysLeft}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,opacity:0.85}}>{daysLeft===1?"day":"days"}</div>
        </div>
      </div>)}
      {isCollectionToday&&!alreadyReported&&(<div style={{background:"#E8F5E9",border:"1px solid #A5D6A7",borderRadius:14,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:BRAND.darkGreen,marginBottom:8}}>🚛 Collection day! Did collection happen?</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onReportMissed(today,"missed")} style={{flex:1,padding:"10px",borderRadius:20,border:"1px solid #FFCDD2",background:"#FFEBEE",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",color:"#C62828"}}>❌ No — missed</button>
          <button onClick={()=>onReportMissed(today,"collected")} style={{flex:1,padding:"10px",borderRadius:20,border:"none",background:BRAND.darkGreen,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",color:"#fff"}}>✅ Yes — collected</button>
        </div>
      </div>)}
      {isCollectionToday&&alreadyReported&&(<div style={{background:"#FFEBEE",border:"1px solid #FFCDD2",borderRadius:12,padding:"10px 14px",marginBottom:16,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#C62828"}}>⚠️ You reported today's collection as <strong>missed</strong>.</div>)}
      <MiniCalendar effectiveDates={effectiveDates} skippedDates={skippedDates} rescheduledFromDates={rescheduledFromDates} rescheduledToDates={rescheduledToDates} missedDates={missedDates}/>
      <div style={{background:"#fff",borderRadius:16,padding:"14px 16px",border:"1px solid #C8E6C9",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen}}>Upcoming collections</span>
          {overrideCount>0&&<span style={{background:"#FFF8E1",border:"1px solid #FFE0B2",borderRadius:20,padding:"2px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#E65100",fontWeight:600}}>{overrideCount} override{overrideCount!==1?"s":""}</span>}
        </div>
        {upcoming.length===0?<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray,textAlign:"center",padding:"12px 0"}}>No upcoming dates</p>
          :upcoming.map((d,i)=>{const dd=daysUntil(d);const isReschTo=rescheduledToDates.includes(d);return(
            <div key={d} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<upcoming.length-1?"1px solid #F1F8E9":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:i===0?BRAND.darkGreen:BRAND.lightBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:i===0?"#fff":BRAND.darkGreen}}>{new Date(d+"T00:00:00").getDate()}</span>
                </div>
                <div><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:BRAND.black}}>{fmtDate(d,{weekday:"long",day:"2-digit",month:"long"})}</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:isReschTo?"#E65100":BRAND.gray}}>{isReschTo?"📅 Rescheduled":fmtDate(d,{year:"numeric"})}</div></div>
              </div>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,borderRadius:20,padding:"3px 10px",background:dd===0?"#E8F5E9":dd===1?"#FFF3E0":BRAND.lightBg,color:dd===0?BRAND.darkGreen:dd===1?"#E65100":BRAND.midGreen}}>{dd===0?"Today":dd===1?"Tomorrow":`${dd}d`}</span>
            </div>);})}
      </div>
      <button onClick={onHolidayOpen} style={{width:"100%",padding:"13px",borderRadius:50,border:"1px solid #FFE0B2",background:"#FFF8E1",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",color:"#E65100",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>🗓 Manage Holidays & Skip Dates {overrideCount>0?`(${overrideCount})`:""}</button>
      {notifStatus!=="unsupported"&&notifStatus!=="granted"&&(<button onClick={requestNotifications} style={{width:"100%",padding:"13px",borderRadius:50,border:"1px solid #C8E6C9",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",color:BRAND.darkGreen,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>🔔 Enable Push Reminders</button>)}
      {notifStatus==="granted"&&(<div style={{background:"#E8F5E9",border:"1px solid #A5D6A7",borderRadius:14,padding:"12px 16px",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:BRAND.darkGreen}}>🔔 Push reminders active</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.midGreen,marginTop:2}}>You'll be notified before each collection</div></div>
          <button onClick={testNotification} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${BRAND.brightGreen}`,background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",color:BRAND.darkGreen,flexShrink:0}}>Test</button>
        </div>
      </div>)}
      <button onClick={onSetupOpen} style={{width:"100%",padding:"13px",borderRadius:50,border:"1px solid #C8E6C9",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,cursor:"pointer",color:BRAND.gray}}>⚙️ Change zone / date</button>
    </div>
  );
}

// ── Admin dashboard ──────────────────────────────────
function AdminTab({onCountChange}){
  const [stats,setStats]=useState(null);
  const [view,setView]=useState("overview");
  const [users,setUsers]=useState([]);
  const [missed,setMissed]=useState([]);
  const [prospects,setProspects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [pushEnabled,setPushEnabled]=useState(false);
  const [pushLoading,setPushLoading]=useState(false);
  const pushSupported="serviceWorker" in navigator&&"PushManager" in window;

  useEffect(()=>{
    api("/admin/stats").then(setStats).catch(e=>setError(e.message)).finally(()=>setLoading(false));
    // Check existing subscription
    if(pushSupported){
      navigator.serviceWorker.ready.then(reg=>
        reg.pushManager.getSubscription().then(sub=>setPushEnabled(!!sub))
      ).catch(()=>{});
    }
  },[]);

  const togglePush=async()=>{
    if(pushLoading||!pushSupported)return;
    setPushLoading(true);
    try{
      if(Notification.permission==="denied")
        return alert("Les notifications sont bloquées dans votre navigateur. Veuillez les autoriser dans les paramètres.");
      const reg=await navigator.serviceWorker.ready;
      if(pushEnabled){
        const sub=await reg.pushManager.getSubscription();
        if(sub){
          await api("/push/unsubscribe",{method:"POST",body:{endpoint:sub.endpoint}});
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      }else{
        if(Notification.permission!=="granted"){
          const perm=await Notification.requestPermission();
          if(perm!=="granted")return;
        }
        const {key}=await api("/push/vapid-public-key");
        const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64ToUint8(key)});
        await api("/push/subscribe",{method:"POST",body:{subscription:sub.toJSON()}});
        setPushEnabled(true);
      }
    }catch(e){console.error(e);alert("Erreur push: "+e.message);}
    finally{setPushLoading(false);}
  };

  const loadUsers=async()=>{if(users.length)return;const d=await api("/admin/users");setUsers(d);};
  const loadMissed=async()=>{if(missed.length)return;const d=await api("/admin/missed");setMissed(d);};
  const loadProspects=async()=>{const d=await api("/prospects");setProspects(d);};

  const switchView=async(v)=>{
    setView(v);
    if(v==="users")await loadUsers();
    if(v==="missed")await loadMissed();
    if(v==="prospects")await loadProspects();
  };

  const changeStatus=async(id,status)=>{
    await api(`/prospects/${id}`,{method:"PATCH",body:{status}});
    setProspects(p=>p.map(pr=>pr.id===id?{...pr,status}:pr));
    onCountChange?.();
  };

  const statusMeta={
    pending:{label:"En attente",bg:"#FFF3E0",color:"#E65100"},
    contacted:{label:"Contacté",bg:"#E3F2FD",color:"#1565C0"},
    approved:{label:"Approuvé",bg:"#E8F5E9",color:"#2E7D32"},
    rejected:{label:"Refusé",bg:"#FFEBEE",color:"#C62828"},
  };

  if(loading)return<div style={{textAlign:"center",padding:40,fontFamily:"'DM Sans',sans-serif",color:BRAND.gray}}>Chargement…</div>;
  if(error)return<div style={{textAlign:"center",padding:40,fontFamily:"'DM Sans',sans-serif",color:"#C62828"}}>Erreur: {error}</div>;

  const pendingCount=view==="prospects"?prospects.filter(p=>p.status==="pending").length:0;

  return(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{background:`linear-gradient(135deg,#1A237E,#283593)`,borderRadius:18,padding:"16px 20px",marginBottom:16,color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>🛡 Admin Dashboard</div>
          {pushSupported&&(<button onClick={togglePush} disabled={pushLoading} title={pushEnabled?"Désactiver les notifications prospects":"Activer les notifications prospects"} style={{background:pushEnabled?"rgba(102,187,106,0.35)":"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"5px 14px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:pushLoading?"default":"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
            <span style={{fontSize:14}}>{pushEnabled?"🔔":"🔕"}</span>
            {pushLoading?"…":pushEnabled?"Notifs ON":"Notifs OFF"}
          </button>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[{emoji:"👥",value:stats?.totalUsers||0,label:"users"},{emoji:"♻️",value:stats?.totalEntries||0,label:"entries"},{emoji:"⚠️",value:stats?.totalMissed||0,label:"missed reports"}].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:2}}>{s.emoji}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,lineHeight:1}}>{s.value}</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,opacity:0.75,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",background:"#fff",borderRadius:12,padding:3,border:"1px solid #C8E6C9",marginBottom:16,gap:2}}>
        {[{id:"overview",label:"📊 Vue"},{id:"prospects",label:"🌱 Prospects"},{id:"users",label:"👥 Users"},{id:"missed",label:"⚠️ Missed"}].map(v=>(
          <button key={v.id} onClick={()=>switchView(v.id)} style={{flex:1,padding:"9px 2px",borderRadius:9,border:"none",background:view===v.id?v.id==="prospects"?BRAND.darkGreen:"#1A237E":"transparent",color:view===v.id?"#fff":BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:600,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>{v.label}</button>
        ))}
      </div>

      {view==="overview"&&(<>
        <div style={{background:"#fff",borderRadius:16,padding:"14px 16px",border:"1px solid #C8E6C9",marginBottom:12}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen,marginBottom:10}}>Items by category</div>
          {stats?.byCategory?.map(r=>{const cat=CATEGORIES.find(c=>c.id===r.category);return(
            <div key={r.category} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F1F8E9"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{cat?.emoji||"♻️"}</span><span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.black}}>{cat?.label||r.category}</span></div>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen}}>{r.count}</span>
            </div>);})}
        </div>
        <div style={{background:"#fff",borderRadius:16,padding:"14px 16px",border:"1px solid #C8E6C9",marginBottom:12}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen,marginBottom:10}}>Activity by zone</div>
          {stats?.byZone?.length===0&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray}}>No zone data yet</p>}
          {stats?.byZone?.map(r=>(
            <div key={r.zone} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F1F8E9"}}>
              <div><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:BRAND.black}}>{REGIONS.find(rg=>rg.id===r.zone)?.label||r.zone}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray}}>{r.users} user{r.users!==1?"s":""}</div></div>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen}}>{r.entries} items</span>
            </div>))}
        </div>
        <div style={{background:"#fff",borderRadius:16,padding:"14px 16px",border:"1px solid #C8E6C9"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen,marginBottom:10}}>Recent missed collections</div>
          {stats?.recentMissed?.length===0&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray}}>No missed collections reported yet</p>}
          {stats?.recentMissed?.slice(0,8).map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F1F8E9"}}>
              <div><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:"#C62828"}}>{fmtDate(r.date,{weekday:"short",day:"2-digit",month:"short"})}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray}}>{r.name||r.email} · {r.zone||"no zone"}</div></div>
              <span style={{fontSize:16}}>⚠️</span>
            </div>))}
        </div>
      </>)}

      {view==="prospects"&&(<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen}}>Demandes ({prospects.length}){pendingCount>0&&<span style={{marginLeft:8,background:"#FFF3E0",color:"#E65100",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px"}}>{pendingCount} en attente</span>}</div>
          <button onClick={loadProspects} style={{background:"none",border:"none",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.midGreen,cursor:"pointer"}}>↻ Actualiser</button>
        </div>
        {prospects.length===0&&<div style={{textAlign:"center",padding:"32px 20px",fontFamily:"'DM Sans',sans-serif",color:BRAND.gray}}><div style={{fontSize:40,marginBottom:8}}>🌱</div><p>Aucune demande pour l'instant</p></div>}
        {prospects.map(pr=>{
          const sm=statusMeta[pr.status]||statusMeta.pending;
          const zone=REGIONS.find(r=>r.id===pr.zone_id);
          return(
            <div key={pr.id} style={{background:"#fff",borderRadius:16,padding:"14px 16px",border:"1px solid #C8E6C9",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,color:BRAND.black}}>{pr.name}</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray}}>{pr.email} · {pr.phone}</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.midGreen,marginTop:2}}>
                    {zone?.label||pr.zone_id}
                    {pr.locality&&<> — <strong style={{color:pr.locality_covered===false?"#E65100":BRAND.darkGreen}}>{pr.locality}</strong></>}
                    {pr.locality_covered===false&&<span style={{marginLeft:6,background:"#FFF3E0",color:"#E65100",fontSize:9,padding:"1px 6px",borderRadius:10,fontWeight:700}}>hors zone</span>}
                  </div>
                </div>
                <span style={{background:sm.bg,color:sm.color,fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,borderRadius:20,padding:"3px 10px",flexShrink:0,marginLeft:8}}>{sm.label}</span>
              </div>
              {pr.address&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray,marginBottom:6}}>📍 {pr.address}</div>}
              {pr.message&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.black,background:BRAND.lightBg,borderRadius:8,padding:"6px 10px",marginBottom:8}}>💬 {pr.message}</div>}
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:BRAND.gray,marginBottom:8}}>{new Date(pr.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {pr.status==="pending"&&<>
                  <button onClick={()=>changeStatus(pr.id,"contacted")} style={{padding:"6px 12px",borderRadius:20,border:"none",background:"#E3F2FD",color:"#1565C0",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>📞 Contacté</button>
                  <button onClick={()=>changeStatus(pr.id,"approved")} style={{padding:"6px 12px",borderRadius:20,border:"none",background:"#E8F5E9",color:"#2E7D32",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>✅ Approuver</button>
                  <button onClick={()=>changeStatus(pr.id,"rejected")} style={{padding:"6px 12px",borderRadius:20,border:"none",background:"#FFEBEE",color:"#C62828",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>❌ Refuser</button>
                </>}
                {pr.status==="contacted"&&<>
                  <button onClick={()=>changeStatus(pr.id,"approved")} style={{padding:"6px 12px",borderRadius:20,border:"none",background:"#E8F5E9",color:"#2E7D32",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>✅ Approuver</button>
                  <button onClick={()=>changeStatus(pr.id,"rejected")} style={{padding:"6px 12px",borderRadius:20,border:"none",background:"#FFEBEE",color:"#C62828",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>❌ Refuser</button>
                </>}
                {(pr.status==="approved"||pr.status==="rejected")&&<button onClick={()=>changeStatus(pr.id,"pending")} style={{padding:"6px 12px",borderRadius:20,border:"1px solid #C8E6C9",background:"#fff",color:BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:11,cursor:"pointer"}}>↩ Réinitialiser</button>}
              </div>
            </div>);
        })}
      </div>)}

      {view==="users"&&(<div style={{background:"#fff",borderRadius:16,padding:"14px 16px",border:"1px solid #C8E6C9"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen,marginBottom:10}}>All users ({users.length})</div>
        {users.length===0&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray}}>No users yet</p>}
        {users.map(u=>(
          <div key={u.id} style={{padding:"10px 0",borderBottom:"1px solid #F1F8E9"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:BRAND.black}}>{u.name||"(no name)"}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray}}>{u.email}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray}}>{REGIONS.find(r=>r.id===u.zone)?.label||u.zone||"No zone"} · Joined {new Date(u.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:BRAND.darkGreen}}>{u.entry_count}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:BRAND.gray}}>items</div>
                {u.missed_count>0&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#C62828",fontWeight:700}}>{u.missed_count} missed</div>}
              </div>
            </div>
          </div>))}
      </div>)}

      {view==="missed"&&(<div style={{background:"#fff",borderRadius:16,padding:"14px 16px",border:"1px solid #C8E6C9"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:BRAND.darkGreen,marginBottom:10}}>All missed collection reports</div>
        {missed.length===0&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray}}>No missed collections reported yet</p>}
        {missed.map(r=>(
          <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F1F8E9"}}>
            <div><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:"#C62828"}}>{fmtDate(r.date,{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:BRAND.gray}}>{r.name||r.email} · {REGIONS.find(rg=>rg.id===(r.zone||r.user_zone))?.label||r.zone||r.user_zone||"No zone"}</div></div>
            <span style={{fontSize:20}}>⚠️</span>
          </div>))}
      </div>)}
    </div>
  );
}

// ── Root app ─────────────────────────────────────────
export default function RecycleanApp(){
  const [user,setUser]=useState(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [entries,setEntries]=useState([]);
  const [mode,setMode]=useState(null);
  const [pendingScan,setPendingScan]=useState(null);
  const [showQuickLog,setShowQuickLog]=useState(false);
  const [filterCat,setFilterCat]=useState("all");
  const [tab,setTab]=useState("scan");
  const [guideOpen,setGuideOpen]=useState(null);
  const [schedule,setSchedule]=useState(null);
  const [overrides,setOverrides]=useState([]);
  const [missedDates,setMissedDates]=useState([]);
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [holidayOpen,setHolidayOpen]=useState(false);
  const [prospectView,setProspectView]=useState(null);
  const [prospectCount,setProspectCount]=useState(0);
  const [schedule, setSchedule] = useState(null);
  const loadUserData=async(u)=>{
    if(!u)return;
    const [ents,sched,miss]=await Promise.all([
      api("/entries").catch(()=>[]),
      api("/schedule").catch(()=>null),
      api("/missed").catch(()=>[]),
    ]);
    setEntries(ents||[]);
    if(sched)setSchedule(sched);
    setMissedDates(miss||[]);
  };

  const handleAuth = (u) => {
  setUser(u);
  setTab("scan");
};

  const refreshProspectCount=()=>{if(user?.isAdmin)api("/prospects/count").then(d=>setProspectCount(d.count||0)).catch(()=>{});};

  const handleLogout=async()=>{
    try{await api("/auth/logout",{method:"POST"});}catch{}
    setUser(null);setEntries([]);setSchedule(null);setOverrides([]);setMissedDates([]);setTab("scan");
  };

  const handleScan=scan=>{setMode(null);setPendingScan(scan);};

  const handleSave=async(entry)=>{
    try{
      const saved=await api("/entries",{method:"POST",body:{
        type:entry.type,value:entry.type==="photo"?"[photo]":entry.value,
        category:entry.category,note:entry.note,
        ai_item_name:entry.aiResult?.itemName||"",ai_confidence:entry.aiResult?.confidence||""
      }});
      setEntries(p=>[saved,...p]);setPendingScan(null);setTab("history");
    }catch(e){alert("Failed to save: "+e.message);}
  };

  const handleQuickSave=async(newEntries)=>{
    try{
      const saved=await api("/entries/bulk",{method:"POST",body:{entries:newEntries.map(e=>({type:e.type,value:e.value,category:e.category,note:e.note}))}});
      setEntries(p=>[...saved,...p]);setShowQuickLog(false);setTab("history");
    }catch(e){alert("Failed to save: "+e.message);}
  };

  const handleDelete=async(id)=>{
    await api(`/entries/${id}`,{method:"DELETE"});
    setEntries(p=>p.filter(e=>e.id!==id));
  };

  const sanitizeCSVCell=v=>{const s=String(v??"");return /^[=+\-@|%\t\r]/.test(s)?`\t${s}`:s;};
  const exportCSV=()=>{
    const rows=[["id","type","category","note","date","aiItem","aiConfidence"]];
    entries.forEach(e=>rows.push([e.id,e.type,e.category,e.note||"",e.created_at,e.ai_item_name||"",e.ai_confidence||""].map(sanitizeCSVCell)));
    const csv=rows.map(r=>r.map(v=>`"${v.replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    a.download=`recyclean_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  };

  const handleSaveSchedule=async(s)=>{
    await api("/schedule",{method:"POST",body:{mode:s.mode,region_id:s.regionId||null,custom_start:s.customStart||null}});
    setSchedule(s);setScheduleOpen(false);
  };

  const handleReportMissed=async(date,result)=>{
    if(result==="missed"){
      await api("/missed", {
  method: "POST",
  body: { date, zone: schedule?.regionId || schedule?.region_id || "" }
});
      setMissedDates(p=>[...p.filter(d=>d!==date),date]);
    }
  };

  const baseDates=getBaseDates(schedule);
  const effectiveDates=applyOverrides(baseDates,overrides);
  const nextCollection=getNextCollections(effectiveDates,1)[0];
  const daysToNext=nextCollection?daysUntil(nextCollection):null;
  const filtered=filterCat==="all"?entries:entries.filter(e=>e.category===filterCat);

  const TABS=[/* eslint-disable-line */
    {id:"scan",label:"📷 Scan"},
    {id:"guide",label:"📖 Guide"},
    {id:"history",label:`📋 (${entries.length})`},
    {id:"schedule",label:"📅 Cal"},
    ...(user?.isAdmin?[{id:"admin",label:`🛡 Admin${prospectCount>0?" ("+prospectCount+")":""}`}]:[]),
  ];

  if(!authChecked)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${BRAND.darkGreen},${BRAND.midGreen})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:48}}>♻️</div>
    </div>
  );
  if(!user){
    if(prospectView==="form")return<ProspectForm onBack={()=>setProspectView(null)} onSuccess={d=>setProspectView({success:true,...d})}/>;
    if(prospectView?.success)return<ProspectSuccess data={prospectView} onBack={()=>setProspectView(null)}/>;
    return<AuthScreen onAuth={handleAuth} onProspect={()=>setProspectView("form")}/>;
  }

  return(
    <>
      <style>{`*{margin:0;padding:0;box-sizing:border-box;}body{background:#F1F8E9;-webkit-font-smoothing:antialiased;}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",background:"#F1F8E9",maxWidth:520,margin:"0 auto",paddingBottom:20}}>

        <div style={{background:`linear-gradient(160deg,${BRAND.darkGreen} 0%,${BRAND.midGreen} 100%)`,padding:"28px 24px 24px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:160,height:160,background:"rgba(102,187,106,0.07)",borderRadius:"50%",pointerEvents:"none"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:58,height:58,background:"rgba(255,255,255,0.12)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>♻️</div>
              <div>
                <div style={{display:"flex",alignItems:"baseline"}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:700,color:"#fff",letterSpacing:-0.5}}>RECY</span>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:400,color:"#fff",letterSpacing:-0.5}}>CLEAN</span>
                </div>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.55)",letterSpacing:2,textTransform:"uppercase",marginTop:-2}}>AT YOUR DOOR STEP</p>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              {daysToNext!==null&&(<div onClick={()=>setTab("schedule")} style={{cursor:"pointer",background:daysToNext===0?"rgba(102,187,106,0.3)":daysToNext===1?"rgba(239,108,0,0.35)":"rgba(255,255,255,0.15)",borderRadius:12,padding:"8px 12px",textAlign:"center",minWidth:52,border:daysToNext<=1?"1px solid rgba(255,255,255,0.3)":"none"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",lineHeight:1}}>{daysToNext}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:"rgba(255,255,255,0.75)",marginTop:1}}>days</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:"rgba(255,255,255,0.75)"}}>to collect</div>
              </div>)}
              <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"rgba(255,255,255,0.8)",cursor:"pointer"}}>Log out</button>
            </div>
          </div>
          {user&&<div style={{marginTop:8,fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.55)"}}>👋 {user.name||user.email}</div>}
        </div>

        <div style={{padding:"20px 16px 0"}}>
          <ImpactDash entries={entries}/>
          <div style={{display:"flex",background:"#fff",borderRadius:14,padding:4,border:"1px solid #C8E6C9",marginBottom:20}}>
            {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 2px",borderRadius:10,border:"none",background:tab===t.id?t.id==="admin"?"#1A237E":BRAND.darkGreen:"transparent",color:tab===t.id?"#fff":BRAND.gray,fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}>{t.label}</button>))}
          </div>

          {tab==="scan"&&(<div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:12}}>
              <button onClick={()=>setMode("photo")} style={{padding:"22px",borderRadius:20,border:"none",background:`linear-gradient(135deg,${BRAND.darkGreen},${BRAND.midGreen})`,color:"#fff",cursor:"pointer",textAlign:"left",boxShadow:"0 8px 20px rgba(27,94,32,0.3)"}}>
                <div style={{fontSize:32,marginBottom:6}}>📸</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700}}>Take Photo</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:3}}>AI will identify the item and classify it instantly</div>
              </button>
              <button onClick={()=>setMode("barcode")} style={{padding:"22px",borderRadius:20,border:"2px solid #C8E6C9",background:"#fff",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:32,marginBottom:6}}>📊</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:BRAND.darkGreen}}>Scan Barcode</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray,marginTop:3}}>AI looks up the product and checks if it's recyclable</div>
              </button>
              <button onClick={()=>setShowQuickLog(true)} style={{padding:"18px 22px",borderRadius:20,border:"2px solid #C8E6C9",background:"#fff",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:28}}>⚡</div>
                <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:BRAND.darkGreen}}>Quick Log</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray,marginTop:2}}>Count your bags without scanning each item</div></div>
              </button>
            </div>
            <div style={{background:"#E8F5E9",borderRadius:14,padding:"12px 16px",border:"1px solid #C8E6C9",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>🤖</span>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.darkGreen}}><strong>AI-powered:</strong> Take a photo and the AI will tell you which bin to use.</p>
            </div>
          </div>)}

          {tab==="guide"&&(<div style={{animation:"fadeUp 0.3s ease"}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:BRAND.gray,marginBottom:14}}>Tap a category to see what's accepted.</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CATEGORIES.map(c=>(<button key={c.id} onClick={()=>setGuideOpen(c)} style={{padding:"16px",borderRadius:16,border:`1px solid ${c.border}`,background:c.bg,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:28,flexShrink:0}}>{c.emoji}</span>
                <div style={{flex:1}}><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,color:c.color}}>{c.label}</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:BRAND.gray,marginTop:2}}>{c.tagline}</div></div>
                <span style={{color:BRAND.gray,fontSize:18}}>›</span>
              </button>))}
            </div>
          </div>)}

          {tab==="history"&&(<div style={{animation:"fadeUp 0.3s ease"}}>
            {entries.length>0&&(<div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
              {[{id:"all",label:"All"},...CATEGORIES.map(c=>({id:c.id,label:`${c.emoji} ${c.label}`}))].map(f=>(
                <button key={f.id} onClick={()=>setFilterCat(f.id)} style={{padding:"6px 12px",borderRadius:20,whiteSpace:"nowrap",background:filterCat===f.id?BRAND.darkGreen:"#fff",color:filterCat===f.id?"#fff":BRAND.black,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,cursor:"pointer",border:filterCat===f.id?"none":"1px solid #C8E6C9"}}>{f.label}</button>
              ))}
            </div>)}
            {filtered.length===0?(<div style={{textAlign:"center",padding:"48px 20px",color:BRAND.gray,fontFamily:"'DM Sans',sans-serif"}}>
              <div style={{fontSize:48,marginBottom:12}}>📭</div><p>No items yet</p><p style={{fontSize:12,marginTop:4}}>Start by scanning a product!</p>
            </div>):<div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.map(e=><EntryCard key={e.id} entry={e} onDelete={handleDelete}/>)}</div>}
            {entries.length>0&&(<button onClick={exportCSV} style={{width:"100%",marginTop:16,padding:"13px",borderRadius:50,border:"1px solid #C8E6C9",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",color:BRAND.darkGreen}}>⬇️ Export CSV</button>)}
          </div>)}

          {tab==="schedule"&&(<ScheduleTab schedule={schedule} overrides={overrides} missedDates={missedDates} onSetupOpen={()=>setScheduleOpen(true)} onHolidayOpen={()=>setHolidayOpen(true)} onReportMissed={handleReportMissed}/>)}

          {tab==="admin"&&user?.isAdmin&&<AdminTab onCountChange={refreshProspectCount}/>}
        </div>
      </div>

      {mode==="barcode"&&<BarcodeScanner onDetect={handleScan} onClose={()=>setMode(null)}/>}
      {mode==="photo"&&<PhotoCapture onCapture={handleScan} onClose={()=>setMode(null)}/>}
      {pendingScan&&<CategoryPicker scan={pendingScan} onSave={handleSave} onCancel={()=>setPendingScan(null)}/>}
      {showQuickLog&&<QuickLog onSave={handleQuickSave} onCancel={()=>setShowQuickLog(false)}/>}
      {guideOpen&&<GuideModal cat={guideOpen} onClose={()=>setGuideOpen(null)}/>}
      {scheduleOpen&&<RegionSetupModal current={schedule} onSave={handleSaveSchedule} onClose={()=>setScheduleOpen(false)}/>}
      {holidayOpen&&schedule&&<HolidayModal schedule={schedule} overrides={overrides} onSave={o=>setOverrides(o)} onClose={()=>setHolidayOpen(false)}/>}
    </>
  );
}
