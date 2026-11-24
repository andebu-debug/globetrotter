// Globetrotter – offline-støtte
// Lagrer spillet, ikonene, verdenskartet og skriftene på enheten, slik at alt virker uten nett.
const CACHE='globetrotter-v10';
const CORE=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png'];
const EXTRA=[
  'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/world.js',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800&family=Noto+Color+Emoji&display=swap'
];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await c.addAll(CORE);
    // Kart og skrift fra andre nettsteder – prøv, men ikke stopp hvis det feiler
    await Promise.all(EXTRA.map(u=>fetch(new Request(u,{mode:'no-cors'})).then(r=>c.put(u,r)).catch(()=>{})));
  })());
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});

const timeout=(ms)=>new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms));

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  // Selve spillsiden: prøv nett først (for oppdateringer), ellers lagret versjon
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{
        const r=await Promise.race([fetch(req),timeout(4000)]);
        if(r&&r.ok)c.put('index.html',r.clone());
        return r;
      }catch(err){
        return (await c.match('index.html'))||(await c.match('./'))||Response.error();
      }
    })());
    return;
  }
  // Alt annet: bruk lagret kopi med en gang, og oppdater i bakgrunnen
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const hit=await c.match(req);
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r;}).catch(()=>hit||Response.error());
    return hit||net;
  })());
});
