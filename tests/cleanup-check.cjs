/* Browser regression check (no app dependencies added).
 * npm install --prefix /tmp/hp-check playwright
 * NODE_PATH=/tmp/hp-check/node_modules node tests/cleanup-check.cjs
 * Run `npx --prefix /tmp/hp-check playwright install chromium` first if needed,
 * or set CHROMIUM_PATH to an installed Chromium executable.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');

(async()=>{
  // Expose internals only in the test response, never in the shipped application.
  const html=(await fs.readFile(path.join(root,'index.html'),'utf8')).replace(
    /\r?\n<\/script>\r?\n<\/body>/,
    '\nwindow.__cleanup={idbKV,otsuThreshold,traceImageSize,underlayGray,thumbCtxGet,prevCtxGet,deflateB64,showRenderResult,'+
    'getTool:()=>tool,setThree:value=>{three=value;thumbCtx=prevCtx=null;}};\n</script>\n</body>');
  assert.ok(html.includes('window.__cleanup='),'Test hooks must be injected for LF and CRLF checkouts');
  const server=http.createServer(async(req,res)=>{
    const name=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
    if(!name.startsWith(root+path.sep) && name!==root){ res.writeHead(403).end(); return; }
    try{
      const page=name===root||name===path.join(root,'index.html');
      const body=page?html:await fs.readFile(name);
      res.setHeader('Content-Type',page?'text/html':name.endsWith('.js')?'text/javascript':'application/octet-stream');
      res.end(body);
    }catch{ res.writeHead(404).end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
    const context=await browser.newContext({serviceWorkers:'block'});
    const origin=`http://127.0.0.1:${server.address().port}`;
    // Exercise offline 2D without reporting test errors to the production telemetry endpoint.
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(()=>window.__cleanup);
    const click=id=>page.evaluate(id=>document.getElementById(id).click(),id);
    const isOpen=id=>page.$eval('#'+id,e=>e.open);

    assert.equal(await isOpen('introModal'),true);
    await page.mouse.click(1,1); // Welcome never dismissed on backdrop click.
    assert.equal(await isOpen('introModal'),true);
    for(const choice of ['introReno','introNew']){
      await click(choice);
      assert.equal(await isOpen('introModal'),false);
      assert.equal(await page.$eval('#guideBar',e=>getComputedStyle(e).display),'flex');
      for(let i=0;i<2;i++) await click('gNext');
      for(let i=0;i<3;i++) await click('gBack');
      assert.equal(await isOpen('introModal'),true);
    }
    await page.keyboard.press('Escape');
    assert.equal(await isOpen('introModal'),false);
    assert.equal(await page.$eval('#guideBar',e=>getComputedStyle(e).display),'none');
    assert.equal(await page.locator('#gReno,#gNew').count(),0);

    // Seed a real plan so roof, description, gallery and version dialogs have useful content.
    await click('introBtn'); await click('introDemo');
    await page.waitForFunction(()=>planAPI.get().base.walls.length>0&&!document.querySelector('#introModal').open);
    const dialogs=[['settingsBtn','settingsModal','setCancel'],['versionsBtn','versionsModal','verClose'],
      ['roofDialogBtn','roofModal','roofClose'],['estimateBtn','estimateModal','estClose'],
      ['galleryBtn','galleryModal','galleryClose'],['renderGuideBtn','renderGuideModal','rgClose'],
      ['reportBtn','reportDlg','repCancel'],['lightsMenuBtn','lightModal','lightsClose'],['describeBtn','modal','modalClose']];
    for(const [button,dialog,close] of dialogs){
      await click(button); assert.equal(await isOpen(dialog),true,dialog);
      assert.equal(await page.$eval('#'+dialog,e=>!!document.getElementById(e.getAttribute('aria-labelledby'))),true);
      for(let i=0;i<18;i++){
        await page.keyboard.press('Tab');
        assert.equal(await page.$eval('#'+dialog,e=>e.contains(document.activeElement)||document.activeElement===document.body),true,'focus stays modal');
      }
      const before=await page.evaluate(()=>({plan:planAPI.get(),tool:__cleanup.getTool()}));
      await page.keyboard.press('w'); await page.keyboard.press('Delete'); await page.keyboard.press('Control+z');
      assert.deepEqual(await page.evaluate(()=>({plan:planAPI.get(),tool:__cleanup.getTool()})),before,'no editor shortcuts in '+dialog);
      await page.keyboard.press('Escape'); assert.equal(await isOpen(dialog),false);
      await click(button);
      const box=await page.locator('#'+dialog).boundingBox();
      await page.mouse.click(box.x+2,box.y+2); assert.equal(await isOpen(dialog),true,'padding is not backdrop');
      await page.mouse.click(1,1); assert.equal(await isOpen(dialog),false,'backdrop closes '+dialog);
      await click(button); await click(close); assert.equal(await isOpen(dialog),false);
    }
    await click('settingsBtn'); await click('setRoof');
    assert.equal(await isOpen('settingsModal'),false); assert.equal(await isOpen('roofModal'),true);
    await click('roofClose');
    await page.evaluate(()=>{const s=document.getElementById('wallTypeSel');s.value='addcustom';s.dispatchEvent(new Event('change'));});
    assert.equal(await isOpen('customWallModal'),true);
    await page.fill('#cwName','Regression wall'); await click('cwSave');
    assert.equal(await isOpen('customWallModal'),false);
    assert.match(await page.$eval('#wallTypeSel',e=>e.selectedOptions[0].textContent),/Regression wall/);

    // Actual IndexedDB: all stores, structured clones, missing keys and failed/aborted writes.
    assert.equal(await page.evaluate(async()=>{
      const db=__cleanup.idbKV;
      await db.set('test',{nested:[1,2]});
      if(JSON.stringify(await db.get('test'))!=='{"nested":[1,2]}' || await db.get('missing')!==undefined) return false;
      const recs=[['v',{t:123,plan:'test'}],['m',{id:'test',data:new Uint8Array([1,2]).buffer}],['g',{id:'test',blob:new Blob(['picture'])}]];
      for(const [prefix,rec] of recs){
        await db[prefix+'put'](rec);
        const all=await db[prefix+'all']();
        if(!all.some(r=>(r.id||r.t)===(rec.id||rec.t))) return false;
        await db[prefix+'del'](rec.id||rec.t);
        if((await db[prefix+'all']()).some(r=>(r.id||r.t)===(rec.id||rec.t))) return false;
      }
      try{await db.mput({bad:'missing key'});return false;}catch(e){if(e.name!=='DataError') throw e;}
      const connection=await db.open(), transact=connection.transaction.bind(connection);
      connection.transaction=(...args)=>{
        const tx=transact(...args);
        // Abort after the put request succeeds: the promise must NOT have resolved yet.
        const objectStore=tx.objectStore.bind(tx);
        tx.objectStore=name=>{
          const store=objectStore(name), put=store.put.bind(store);
          store.put=(...args)=>{const rq=put(...args);rq.onsuccess=()=>tx.abort();return rq;};
          return store;
        };
        return tx;
      };
      try{await db.set('aborted','never committed');return false;}catch(e){if(e.name!=='AbortError') throw e;}
      finally{delete connection.transaction;}
      return await db.get('aborted')===undefined;
    }),true);

    // Nested result dialog closes back to the gallery, not the editor.
    await click('galleryBtn');
    await page.evaluate(()=>__cleanup.showRenderResult(document.querySelector('#c2d').toDataURL()));
    assert.equal(await isOpen('renderResult'),true);
    await click('rrGallery');
    await page.waitForFunction(()=>document.querySelector('#rrGallery').disabled);
    await page.keyboard.press('Escape');
    assert.equal(await isOpen('renderResult'),false); assert.equal(await isOpen('galleryModal'),true);
    await click('galleryClose');

    // Real Three.js API shape mocked only to inspect initialization, caching and distinct contexts.
    assert.equal(await page.evaluate(()=>{
      const api=__cleanup;
      if(api.thumbCtxGet()!==null||api.prevCtxGet()!==null) return false;
      class Node{constructor(...args){this.args=args;this.children=[];this.position={set:(...v)=>this.pos=v};}add(n){this.children.push(n);}}
      class Renderer{constructor(options){this.options=options;}setSize(...size){this.size=size;}}
      api.setThree({THREE:{WebGLRenderer:Renderer,Scene:Node,PerspectiveCamera:Node,HemisphereLight:Node,DirectionalLight:Node}});
      try{
        const a=api.thumbCtxGet(),b=api.prevCtxGet();
        return a!==b&&a===api.thumbCtxGet()&&b===api.prevCtxGet()&&a.r.size.join()==='164,164,false'&&b.r.size.join()==='260,220,false'
          &&!a.r.options.canvas&&b.r.options.canvas.id==='furnPrevC'&&b.cam.args[1]===260/220
          &&a.sc.children.length===2&&b.sc.children[1].pos.join()==='2.2,3,2.6';
      }finally{api.setThree(null);}
    }),true);
    assert.deepEqual(await page.evaluate(()=>[[],[0,0],[255,255],[10,10,200,200]].map(a=>__cleanup.otsuThreshold(new Float32Array(a)))),[127,127,127,10]);

    // Reuse the existing tracer benchmark with repeatable noise; compare geometry scores, not timing.
    await page.addScriptTag({url:origin+'/tests/trace-bench.js'});
    const scores=await page.evaluate(async()=>{
      const random=Math.random;let seed=12345;
      Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
      try{return (await __bench.runAll()).map(({ms,...score})=>score);}finally{Math.random=random;}
    });
    for(const {name,walls,recall,precision} of scores) assert.deepEqual({walls,recall,precision},{walls:7,recall:100,precision:100},name);
    console.log('PASS: all seven synthetic trace cases retain 100% recall and precision');

    // First-visit share links take priority over onboarding; dismiss returns to onboarding.
    const payload=await page.evaluate(()=>__cleanup.deflateB64(JSON.stringify(planAPI.get())));
    await context.clearCookies();
    await page.evaluate(()=>localStorage.clear());
    await page.goto('about:blank');
    await page.goto(origin+'/#plan='+payload);
    await page.waitForSelector('#sharedPlan[open]');
    assert.equal(await isOpen('introModal'),false);
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.getElementById('sharedPlan'));
    assert.equal(await isOpen('introModal'),true);
    assert.equal(new URL(page.url()).hash,'');
    await page.goto('about:blank');
    await page.goto(origin+'/#plan='+payload);
    await page.waitForSelector('#sharedPlan[open]'); await click('shOpen');
    await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
    assert.equal(await page.evaluate(()=>planAPI.get().base.walls.length>0),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: onboarding, dialogs, keyboard isolation, IndexedDB, previews, tracing and share links');
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
