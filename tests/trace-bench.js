/* Benchmark for ✨ Find walls (the underlay auto-tracer).
 *
 * Run: start the app via the launcher (House Planner.cmd), open the browser console and paste:
 *     const s=document.createElement('script'); s.src='tests/trace-bench.js'; document.head.append(s);
 *     await __bench.runAll()
 *
 * Synthetic cases draw a known 12×8 m house in several drafting styles (solid CAD
 * walls, double-line, thin single-line, hand-drawn with hatching/noise/dashed module
 * grid, low-res photo simulations), run the tracer through planAPI and score:
 *   recall    = % of true wall length found (within 0.30 m)
 *   precision = % of traced wall length that is real (within 0.35 m)
 *
 * Real fixtures: put {photo.png, truth.json, underlay.json} in tests/fixtures/<name>/
 * where truth.json is a normal house-plan file with the walls drawn by hand and
 * underlay.json is {"x":…, "y":…, "mppx":…} (world position of the photo's top-left
 * corner and metres per pixel — copy the values from localStorage key hrp2_underlay
 * after calibrating the photo in the app). Then: await __bench.runFixture('<name>')
 */
window.__bench = (() => {
  const GT = {
    walls: [
      {a:[0,0], b:[12,0], t:0.35}, {a:[12,0], b:[12,8], t:0.35},
      {a:[12,8], b:[0,8], t:0.35}, {a:[0,8], b:[0,0], t:0.35},
      {a:[4,0], b:[4,8], t:0.10}, {a:[8,0], b:[8,4], t:0.10}, {a:[4,4], b:[12,4], t:0.10},
    ],
    openings: [
      {i:0, at:2, w:1.2, type:'win'}, {i:0, at:9.5, w:1.2, type:'win'},
      {i:2, at:6, w:1.2, type:'win'}, {i:1, at:6, w:1.2, type:'win'},
      {i:3, at:4, w:0.9, type:'door'},
      {i:4, at:2, w:0.9, type:'door'}, {i:4, at:6, w:0.9, type:'door'},
      {i:5, at:2, w:0.9, type:'door'}, {i:6, at:6, w:0.9, type:'door'},
    ],
  };
  function render(style, pxm, opts={}){
    const M=3, Wm=12+2*M, Hm=8+2*M;
    const c=document.createElement('canvas');
    c.width=Math.round(Wm*pxm); c.height=Math.round(Hm*pxm);
    const g=c.getContext('2d');
    g.fillStyle='#f4f1ea'; g.fillRect(0,0,c.width,c.height);
    const X=x=>(x+M)*pxm, Y=y=>(y+M)*pxm, W=v=>v*pxm;
    const wob=opts.wobble||0;
    const jitter=()=>(Math.random()*2-1)*wob*pxm;
    g.strokeStyle='#1c1c1c'; g.fillStyle='#1c1c1c';
    const segs=[];
    GT.walls.forEach((w,i)=>{
      const L=Math.hypot(w.b[0]-w.a[0], w.b[1]-w.a[1]);
      const ux=(w.b[0]-w.a[0])/L, uy=(w.b[1]-w.a[1])/L;
      const gaps=GT.openings.filter(o=>o.i===i).sort((p,q)=>p.at-q.at);
      let cur=0; const parts=[];
      for(const o of gaps){ parts.push([cur,o.at-o.w/2]); cur=o.at+o.w/2; }
      parts.push([cur,L]);
      for(const [s0,s1] of parts){
        if(s1-s0<0.05) continue;
        segs.push({x1:w.a[0]+ux*s0, y1:w.a[1]+uy*s0, x2:w.a[0]+ux*s1, y2:w.a[1]+uy*s1, t:w.t, vert:Math.abs(uy)>0.5});
      }
      for(const o of gaps){ if(o.type!=='win') continue;
        const cx=w.a[0]+ux*o.at, cy=w.a[1]+uy*o.at;
        g.lineWidth=Math.max(1,pxm*0.02);
        for(const off of [-w.t/4, w.t/4]){
          g.beginPath();
          g.moveTo(X(cx-ux*o.w/2-uy*off), Y(cy-uy*o.w/2+ux*off));
          g.lineTo(X(cx+ux*o.w/2-uy*off), Y(cy+uy*o.w/2+ux*off));
          g.stroke();
        }
      }
    });
    for(const s of segs){
      if(style==='thin'){
        g.lineWidth=Math.max(1.5,pxm*0.03);
        g.beginPath(); g.moveTo(X(s.x1)+jitter(),Y(s.y1)+jitter()); g.lineTo(X(s.x2)+jitter(),Y(s.y2)+jitter()); g.stroke();
      } else if(style==='double'){
        g.lineWidth=Math.max(1.2,pxm*0.025);
        const nx=s.vert?1:0, ny=s.vert?0:1;
        for(const sgn of [-1,1]){
          const off=sgn*s.t/2;
          g.beginPath();
          g.moveTo(X(s.x1+nx*off)+jitter(), Y(s.y1+ny*off)+jitter());
          g.lineTo(X(s.x2+nx*off)+jitter(), Y(s.y2+ny*off)+jitter());
          g.stroke();
        }
      } else {
        const x1=Math.min(s.x1,s.x2)-(s.vert?s.t/2:0), x2=Math.max(s.x1,s.x2)+(s.vert?s.t/2:0);
        const y1=Math.min(s.y1,s.y2)-(s.vert?0:s.t/2), y2=Math.max(s.y1,s.y2)+(s.vert?0:s.t/2);
        if(style==='hand' && s.t>0.2){
          g.lineWidth=Math.max(1,pxm*0.02);
          g.strokeRect(X(x1),Y(y1),W(x2-x1),W(y2-y1));
          g.save(); g.beginPath(); g.rect(X(x1),Y(y1),W(x2-x1),W(y2-y1)); g.clip();
          const step=Math.max(2,pxm*0.08);
          for(let d=X(x1)-W(y2-y1); d<X(x2); d+=step){
            g.beginPath(); g.moveTo(d,Y(y2)); g.lineTo(d+W(y2-y1),Y(y1)); g.stroke();
          }
          g.restore();
        } else {
          g.fillRect(X(x1),Y(y1),W(x2-x1),W(y2-y1));
        }
      }
    }
    g.fillStyle='#1c1c1c';
    g.font=Math.round(pxm*0.3)+'px sans-serif'; g.textAlign='center';
    for(const [t,x,y] of [['STUE',2,6],['KØKKEN',6,2],['BAD',10,2],['VÆRELSE',8,6],['1958 BYGGESAG',6,-1.6]])
      g.fillText(t, X(x), Y(y));
    g.lineWidth=Math.max(1,pxm*0.015);
    g.beginPath(); g.moveTo(X(0),Y(-0.8)); g.lineTo(X(12),Y(-0.8)); g.stroke();
    for(const x of [0,4,8,12]){ g.beginPath(); g.moveTo(X(x),Y(-1.0)); g.lineTo(X(x),Y(-0.6)); g.stroke(); }
    g.font=Math.round(pxm*0.25)+'px sans-serif';
    for(const [t,x] of [['400',2],['400',6],['400',10]]) g.fillText(t,X(x),Y(-0.95));
    if(opts.grid){
      g.save(); g.setLineDash([pxm*0.2,pxm*0.15]); g.lineWidth=Math.max(1,pxm*0.02);
      for(const x of [2,6,10]){ g.beginPath(); g.moveTo(X(x),0); g.lineTo(X(x),c.height); g.stroke(); }
      g.restore();
    }
    if(opts.noise){
      const id=g.getImageData(0,0,c.width,c.height), d=id.data;
      for(let i=0;i<d.length;i+=4){
        const n=(Math.random()*2-1)*opts.noise*255;
        d[i]+=n; d[i+1]+=n; d[i+2]+=n;
      }
      g.putImageData(id,0,0);
    }
    let out=c, outPxm=pxm;
    if(opts.downTo){
      const k=opts.downTo/pxm;
      const c2=document.createElement('canvas');
      c2.width=Math.round(c.width*k); c2.height=Math.round(c.height*k);
      c2.getContext('2d').drawImage(c,0,0,c2.width,c2.height);
      out=c2; outPxm=opts.downTo;
    }
    return {dataUrl:out.toDataURL('image/png'), mppx:1/outPxm, origin:-M};
  }
  function distToSegs(p, segs){
    let best=1e9;
    for(const s of segs){
      const dx=s[2]-s[0], dy=s[3]-s[1], L2=dx*dx+dy*dy;
      let t=L2? ((p[0]-s[0])*dx+(p[1]-s[1])*dy)/L2 : 0;
      t=Math.max(0,Math.min(1,t));
      best=Math.min(best, Math.hypot(p[0]-(s[0]+dx*t), p[1]-(s[1]+dy*t)));
    }
    return best;
  }
  function scoreAgainst(gtSegs){
    const walls=window.planAPI.get().base.walls.filter(w=>/auto-traced/.test(w.notes||''));
    const trSegs=walls.map(w=>[w.from[0],w.from[1],w.to[0],w.to[1]]);
    const samp=(segs)=>{ const pts=[]; for(const s of segs){ const L=Math.hypot(s[2]-s[0],s[3]-s[1]); const n=Math.max(1,Math.round(L/0.1)); for(let i=0;i<=n;i++) pts.push([s[0]+(s[2]-s[0])*i/n, s[1]+(s[3]-s[1])*i/n]); } return pts; };
    const gtPts=samp(gtSegs), trPts=samp(trSegs);
    const rec = gtPts.filter(p=>distToSegs(p,trSegs)<0.3).length/gtPts.length;
    const prec = trPts.length ? trPts.filter(p=>distToSegs(p,gtSegs)<0.35).length/trPts.length : 0;
    return {walls:walls.length, recall:+(rec*100).toFixed(1), precision:+(prec*100).toFixed(1)};
  }
  function resetPlan(){
    const p=window.planAPI.get();
    p.base.walls=[]; p.base.openings=[]; p.meta.activeVariant='nutid';
    window.planAPI.set(p);
  }
  async function runCase(name, style, pxm, opts){
    resetPlan();
    const img=render(style,pxm,opts||{});
    window.planAPI.underlayPatch(null);
    window.planAPI.underlayPatch({dataUrl:img.dataUrl, x:img.origin, y:img.origin, mppx:img.mppx, opacity:45});
    await new Promise(r=>setTimeout(r,300));
    window.planAPI.traceWalls();
    const s=scoreAgainst(GT.walls.map(w=>[w.a[0],w.a[1],w.b[0],w.b[1]]));
    const d=window.planAPI.traceReport()||{};
    return {name, ...s, ms:d.ms};
  }
  async function runAll(){
    const out=[];
    out.push(await runCase('thick @70','thick',70,{}));
    out.push(await runCase('thick lowres @22','thick',70,{downTo:22}));
    out.push(await runCase('double @70','double',70,{}));
    out.push(await runCase('thin @50','thin',50,{}));
    out.push(await runCase('hand+grid+noise @70','hand',70,{wobble:0.015,noise:0.05,grid:true}));
    out.push(await runCase('hand lowres @25','hand',80,{wobble:0.015,noise:0.05,grid:true,downTo:25}));
    console.table(out);
    return out;
  }
  /* real fixture: tests/fixtures/<name>/{photo.png, truth.json, underlay.json} */
  async function runFixture(name){
    const base='tests/fixtures/'+name+'/';
    const truth=await (await fetch(base+'truth.json')).json();
    const cal=await (await fetch(base+'underlay.json')).json();
    const blob=await (await fetch(base+'photo.png')).blob();
    const dataUrl=await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(blob); });
    resetPlan();
    window.planAPI.underlayPatch(null);
    window.planAPI.underlayPatch({dataUrl, x:cal.x, y:cal.y, mppx:cal.mppx, opacity:45});
    await new Promise(r=>setTimeout(r,500));
    window.planAPI.traceWalls();
    const gtSegs=truth.base.walls.map(w=>[w.from[0],w.from[1],w.to[0],w.to[1]]);
    const s=scoreAgainst(gtSegs);
    const d=window.planAPI.traceReport()||{};
    const res={name:'fixture:'+name, ...s, ms:d.ms};
    console.table([res]);
    return res;
  }
  /* wall-by-wall diff — the strict view. Matches traced walls to truth walls by
   * orientation + tight lateral offset, then reports what a human sees as errors:
   *   - per truth wall: covered %, number of traced fragments, mean lateral offset
   *   - MISSING walls (coverage < 70%), OFFSET walls (>0.12 m sideways)
   *   - SPURIOUS traced walls (mostly not near any truth wall)
   *   - DUPLICATES (two traced walls claiming the same truth wall side by side)
   */
  function wallDiff(truthWalls, opts={}){
    const latTol=opts.latTol??0.30, strictLat=opts.strictLat??0.12;
    const traced=window.planAPI.get().base.walls.filter(w=>/auto-traced/.test(w.notes||''));
    const axis=s=>Math.abs(s[2]-s[0])>=Math.abs(s[3]-s[1])?'h':'v';
    const T=traced.map(w=>({s:[w.from[0],w.from[1],w.to[0],w.to[1]], w}));
    const G=truthWalls.map(w=>({id:w.id, s:[w.from[0],w.from[1],w.to[0],w.to[1]], t:w.t}));
    const per=[];
    for(const g of G){
      const a=axis(g.s), di=a==='h'?0:1, fi=a==='h'?1:0;
      const g1=Math.min(g.s[di],g.s[di+2]), g2=Math.max(g.s[di],g.s[di+2]);
      const gc=(g.s[fi]+g.s[fi+2])/2, L=g2-g1;
      const ivs=[]; const offs=[];
      for(const t of T){
        if(axis(t.s)!==a) continue;
        const tc=(t.s[fi]+t.s[fi+2])/2;
        if(Math.abs(tc-gc)>latTol) continue;
        const t1=Math.min(t.s[di],t.s[di+2]), t2=Math.max(t.s[di],t.s[di+2]);
        const o1=Math.max(g1,t1), o2=Math.min(g2,t2);
        if(o2-o1<0.1) continue;
        ivs.push([o1,o2]); offs.push({off:tc-gc, len:o2-o1});
        (t.hits??=[]).push({id:g.id, len:o2-o1});
      }
      ivs.sort((p,q)=>p[0]-q[0]);
      let cov=0, cur=-1e9, pieces=0;
      for(const [a1,b1] of ivs){
        if(a1>cur){ pieces++; cov+=b1-a1; cur=b1; }
        else if(b1>cur){ cov+=b1-cur; cur=b1; }
      }
      const meanOff=offs.length? offs.reduce((s2,o)=>s2+o.off*o.len,0)/offs.reduce((s2,o)=>s2+o.len,0) : null;
      per.push({id:g.id, len:+L.toFixed(1), covPct:+(cov/L*100).toFixed(0), pieces:ivs.length,
                latOff: meanOff===null?null:+meanOff.toFixed(2)});
    }
    const spurious=[];
    for(const t of T){
      const L=Math.hypot(t.s[2]-t.s[0], t.s[3]-t.s[1]);
      const matched=(t.hits||[]).reduce((s2,h)=>s2+h.len,0);
      if(matched < 0.5*L) spurious.push({wall:`(${t.w.from})→(${t.w.to})`, len:+L.toFixed(1), matchedPct:+(matched/L*100).toFixed(0)});
    }
    // duplicates: >1 traced piece overlapping the same truth stretch on clearly different lateral lines
    const report={
      truthWalls:G.length, tracedWalls:T.length,
      missing:per.filter(p=>p.covPct<70),
      offset:per.filter(p=>p.covPct>=70 && p.latOff!==null && Math.abs(p.latOff)>strictLat),
      fragmented:per.filter(p=>p.covPct>=70 && p.pieces>2),
      spurious,
      ok:per.filter(p=>p.covPct>=70 && Math.abs(p.latOff??0)<=strictLat).length,
      perWall:per,
    };
    console.table(report.perWall);
    return report;
  }
  async function diffFixture(name){
    const truth=await (await fetch('tests/fixtures/'+name+'/truth.json')).json();
    return wallDiff(truth.base.walls);
  }
  return {render, runCase, runAll, runFixture, scoreAgainst, wallDiff, diffFixture, GT};
})();
