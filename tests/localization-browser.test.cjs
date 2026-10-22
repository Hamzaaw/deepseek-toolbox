// Real Chrome i18n with a disposable copy/profile. The test-only manifest fallback
// selects each catalog; no production language override or saved-data migration.
const {chromium} = require('playwright');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const source = path.resolve(process.env.EXTENSION_UNDER_TEST || path.join(__dirname,'../extension'));
const chat='11111111-1111-1111-1111-111111111111';
const fixture=`<!doctype html><html lang="en" dir="ltr"><head><style>body{font-family:Arial}aside{width:240px}textarea._27c9245{width:600px;height:80px}.ec4f5d61{display:flex}</style></head><body><aside><div><button class="_5a8ac7a">New chat</button></div><div class="_77cdc67"><a class="_546d736 cefc9c43" href="/a/chat/s/${chat}"><span class="c08e6e93">My unchanged chat</span></a></div></aside><main><div class="_4f9bf79" data-virtual-list-item-key="2"><div class="ds-message">Original English chat content</div><div class="_965abe9"></div></div></main><textarea class="_27c9245" placeholder="Message DeepSeek"></textarea><div class="ec4f5d61"></div></body></html>`;
(async()=>{
 const evidence=path.join(__dirname,'../test-results/locales');await fs.mkdir(evidence,{recursive:true});
 for(const locale of ['fa','bn','ar']){
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'ds-locale-')),extension=path.join(temp,'extension');let context;
  try{
   await fs.cp(source,extension,{recursive:true});
   const manifest=JSON.parse(await fs.readFile(path.join(extension,'manifest.json')));manifest.default_locale=locale;
   await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify(manifest));
   // Keep English fallback for legacy Arabic; Persian/Bengali must be complete.
   if(locale!=='ar')for(const name of await fs.readdir(path.join(extension,'_locales')))if(name!==locale)await fs.rm(path.join(extension,'_locales',name),{recursive:true});
   if(locale==='ar')await fs.cp(path.join(extension,'_locales/ar/messages.json'),path.join(extension,'_locales/en/messages.json'));
   context=await chromium.launchPersistentContext(path.join(temp,'profile'),{...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chromium'}),headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--no-first-run'],viewport:{width:1280,height:900}});
   await context.route('https://chat.deepseek.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:fixture}));
   const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
   const seed={ds_install_id:'locale-existing-customer',ds_entitlements_cache:{data:{plan:'premium',subscription:{status:'active',interval:'year',id:'yearly-locale-fixture'}},ts:Date.now()},dsToolboxPrompts:{'my-prompts':[{id:'saved',title:'My saved English title',content:'Keep {literal} $& فارسی বাংলা',variables:[]}]}};
   await worker.evaluate(async seed=>{self.fetch=async()=>{throw new Error('Offline locale fixture');};await chrome.storage.local.set(seed);},seed);
   const page=await context.newPage();page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const cdp=await context.newCDPSession(page);let isolated;
   cdp.on('Runtime.executionContextCreated',({context:c})=>{if(c.origin.startsWith('chrome-extension://'))isolated=c.id;});await cdp.send('Runtime.enable');
   await page.goto('https://chat.deepseek.com/a/chat/s/'+chat);await page.locator('.ds-toolbox-btn').waitFor();
   const evaluate=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,contextId:isolated,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
   const direction=locale==='bn'?'ltr':'rtl';assert.equal(await evaluate('ToolboxI18n.locale'),locale);
   assert.equal(await page.locator('.ds-toolbox-btn').getAttribute('dir'),direction);
   const screenshot=async(name, selector)=>{await page.waitForFunction(selector=>{const root=document.querySelector(selector)?.closest('[data-toolbox-ui]');return root&&getComputedStyle(root).opacity==='1';},selector);await page.screenshot({path:path.join(evidence,locale+'-'+name+'.png'),animations:'disabled'});};
   const menu=action=>page.locator(`[data-action="${action}"]`).evaluate(e=>e.click());
   await page.locator('textarea._27c9245').fill('My original draft فارسی বাংলা');
   await menu('folders');await page.locator('#ds-add-folder').waitFor();
   const folders=page.locator('[data-toolbox-ui]').filter({has:page.locator('#ds-add-folder')});
   assert.equal(await folders.getAttribute('dir'),direction);
   if(locale!=='ar')assert.ok(!(await folders.innerText()).includes('Manage Folders'));
   await page.locator('#ds-add-folder').click();const name='پوشه বাংলা <img src=x> $&';await page.locator('.ds-dialog-input').fill(name);await page.locator('.ds-dialog-confirm').click();
   await page.getByText(name,{exact:true}).waitFor();assert.equal(await folders.locator('img').count(),0);
   assert.equal(await folders.evaluate(e=>e.scrollWidth>e.clientWidth+2),false);
   await screenshot('folders','#ds-add-folder');await page.locator('#ds-modal-done').click();
   await menu('prompts');await page.locator('#ds-prompt-search').waitFor();
   if(locale!=='ar')assert.ok(!((await page.locator('#ds-categories-sidebar').innerText()).includes('My Prompts')));
   await page.getByText('My saved English title',{exact:true}).waitFor();
   await page.locator('#ds-add-prompt-btn').click();await page.locator('#ds-prompt-title').waitFor();
   const placeholder=await page.locator('#ds-prompt-content').getAttribute('placeholder');assert.ok(placeholder.includes('{topic}')&&placeholder.includes('{audience}')&&placeholder.includes('{tone}'));
   assert.equal(await page.locator('#ds-prompt-content').getAttribute('dir'),direction);
   await page.locator('#ds-prompt-content').fill('My literal {topic}');assert.equal(await page.locator('#ds-prompt-content').getAttribute('dir'),'auto');await page.locator('#ds-prompt-content').fill('');
   await screenshot('prompt-editor','#ds-prompt-title');await page.locator('#ds-editor-cancel').click();
   await page.locator('[data-tab="chaining"]').click();await page.locator('#ds-create-chain-btn').click();await page.locator('.ds-step-content').first().waitFor();
   assert.ok((await page.locator('.ds-step-content').first().getAttribute('placeholder')).includes('{{variable}}'));
   await screenshot('chain','#ds-chain-title');await page.locator('#ds-chain-cancel').click();await page.locator('#ds-library-close').click();
   await menu('bulk-delete');await page.locator('#ds-bulk-select-all').check();await page.locator('#ds-bulk-delete').click();await page.locator('#ds-confirm-cancel').waitFor();
   const confirm=page.locator('[data-toolbox-ui]').filter({has:page.locator('#ds-confirm-cancel')}).last();
   assert.equal(await confirm.getAttribute('dir'),direction);if(locale!=='ar')assert.ok(!(await confirm.innerText()).includes('cannot be undone'));
   await screenshot('delete-confirm','#ds-confirm-cancel');await page.locator('#ds-confirm-cancel').click();await page.locator('#ds-bulk-cancel').click();
   await menu('export');await page.locator('#ds-export-close').waitFor();await screenshot('export','#ds-export-close');await page.locator('#ds-export-close').click();
   await menu('settings');await page.locator('#ds-settings-modal').waitFor();await screenshot('settings','#ds-settings-modal');
   assert.equal(await page.locator('html').getAttribute('dir'),'ltr');assert.equal(await page.locator('main').innerText(),'Original English chat content');assert.equal(await page.locator('textarea._27c9245').inputValue(),'My original draft فارسی বাংলা');
   assert.deepEqual(await worker.evaluate(async keys=>chrome.storage.local.get(keys),Object.keys(seed)),seed);
   assert.deepEqual(errors,[]);console.log('PASS '+locale+': actual i18n, menus, editors, confirmations, RTL scope, literal user data and customer storage');
  } finally {await context?.close();await fs.rm(temp,{recursive:true,force:true});}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
