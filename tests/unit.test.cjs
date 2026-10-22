const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../extension');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const quiet={log(){},warn(){},error(){}};
function setup(seed={}) {
 const store=structuredClone(seed),listeners=[];
 const local={async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(store[k])]));},async set(patch){const changes={};for(const [k,v] of Object.entries(patch)){changes[k]={oldValue:store[k],newValue:structuredClone(v)};store[k]=structuredClone(v);}for(const fn of listeners)fn(changes,'local');}};
 const worker=vm.createContext({chrome:{storage:{local}},console:quiet});vm.runInContext(read('storageMutations.js'),worker);
 function tab(){
  const ctx=vm.createContext({console:quiet,crypto,window:{},log(){},chrome:{storage:{local,onChanged:{addListener(fn){listeners.push(fn);}}},runtime:{id:'stable-extension',sendMessage(message,cb){const promise=message.type==='STORAGE_MUTATION'?vm.runInContext('queueToolboxMutation',worker)(message.data).then(data=>({success:true,data}),error=>({success:false,error:error.message})):Promise.resolve({success:false,error:'offline'});if(cb)promise.then(cb);return promise;}}}});
  for(const file of ['featureAccess.js','config.js','deepseekDOM.js','storageService.js','folderService.js','promptLibraryService.js','promptChainService.js','pinnedMessagesService.js','apiClient.js'])vm.runInContext(read(file),ctx,{filename:file});
  return {ctx,run:code=>vm.runInContext(code,ctx)};
 }
 return {store,worker,tab};
}
const seed={ds_install_id:'existing-paying-install',ds_entitlements_cache:{data:{plan:'premium',subscription:{status:'active',interval:'year',id:'yearly-purchase-fixture',expires_at:'2027-10-22T00:00:00Z'}},ts:Date.now()-180000},ds_toolbox_settings:{pinMessagesEnabled:false,enhancePromptEnabled:false},ds_toolbox_folders:[{id:'existing',name:'Saved folder'}],dsToolboxPrompts:{'my-prompts':[{id:'old',title:'Saved',content:'Hello',variables:[]}]},dsToolboxPromptChains:[{id:'old-chain',title:'Saved chain',steps:['a','b']}],deepseekToolboxPinnedMessages:{p1:{id:'p1',messageId:'chat-msg-0',conversationId:'chat'}}};
test('permission declarations exactly match v1.0.1',()=>{
 const manifest=JSON.parse(read('manifest.json')),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'permissions-baseline.json')));
 for(const key of Object.keys(baseline))assert.deepEqual(manifest[key]||[],baseline[key]);
 assert.equal(manifest.version,'1.0.2');
});
test('offline upgrade preserves premium identity and all existing data',async()=>{
 const {store,tab}=setup(seed);const t=tab();await t.run('apiClient.initPromise');
 const status=await t.run('apiClient.getMeStatus({force:true})');assert.equal(status.plan,'premium');
 for(const feature of ['folders','pinnedMessages','promptChains','customPrompts','bulkDelete']){
  const limit=await t.run(`apiClient.checkFeatureLimit('${feature}')`);assert.equal(limit.isPremium,true);assert.equal(limit.allowed,true);assert.equal(limit.limit,-1);
 }
 assert.deepEqual(store,seed);
});
test('free features keep accurate counts without caps or deleting saved records',async()=>{
 const input={...seed,ds_entitlements_cache:{data:{plan:'free'},ts:Date.now()},ds_toolbox_folders:[{id:'1'},{id:'2'},{id:'3'}],deepseekToolboxPinnedMessages:{a:{id:'a'},b:{id:'b'}}};
 const {tab,store}=setup(input);const t=tab();await t.run('apiClient.initPromise');
 for(const [feature,count] of [['folders',3],['pinnedMessages',2],['promptChains',1]]){const limit=await t.run(`apiClient.checkFeatureLimit('${feature}')`);assert.equal(limit.current,count);assert.equal(limit.allowed,true);assert.equal(limit.limit,-1);}
 assert.deepEqual(store,input);
});
test('grace is bounded and a successful response is authoritative',async()=>{
 const {tab}=setup(seed);const t=tab();await t.run('apiClient.initPromise');
 t.run('apiClient.meCacheTimestamp=Date.now()-8*24*60*60*1000');assert.equal((await t.run('apiClient.getMeStatus({force:true})')).plan,'free');
 t.run("apiClient.sendMessageSafely=async()=>({success:true,data:{plan:'premium'}})");assert.equal((await t.run('apiClient.getMeStatus({force:true})')).plan,'premium');
});
test('concurrent tabs merge prompt changes instead of replacing collections',async()=>{
 const {tab,store}=setup(seed);const a=tab(),b=tab();await Promise.all([a.run('PromptLibraryService.init()'),b.run('PromptLibraryService.init()')]);
 await Promise.all([a.run("PromptLibraryService.addPrompt({title:'A',content:'Alpha'})"),b.run("PromptLibraryService.addPrompt({title:'B',content:'Beta'})")]);
 assert.deepEqual(store.dsToolboxPrompts['my-prompts'].map(p=>p.title).sort(),['A','B','Saved']);
 await Promise.all([a.run("PromptLibraryService.updatePrompt('old',{title:'Edited'})"),b.run("PromptLibraryService.addPrompt({title:'C',content:'Gamma'})")]);
 assert.equal(store.dsToolboxPrompts['my-prompts'].length,4);assert.equal(store.dsToolboxPrompts['my-prompts'][0].title,'Edited');
 assert.equal(store.ds_install_id,seed.ds_install_id);assert.deepEqual(store.ds_entitlements_cache,seed.ds_entitlements_cache);
});
test('simultaneous pins and folder deletion preserve unrelated data',async()=>{
 const {tab,store}=setup({...seed,ds_toolbox_chat_folders:{a:'existing',b:'other'}});const a=tab(),b=tab();await Promise.all([a.run('PinnedMessagesService.init()'),b.run('PinnedMessagesService.init()')]);
 await Promise.all([a.run("PinnedMessagesService.createPin({messageId:'m2',conversationId:'chat'})"),b.run("PinnedMessagesService.createPin({messageId:'m3',conversationId:'chat'})")]);
 assert.equal(Object.keys(store.deepseekToolboxPinnedMessages).length,3);
 await a.run("FolderService.deleteFolder('existing')");assert.deepEqual(store.ds_toolbox_chat_folders,{b:'other'});
});
test('mutation endpoint cannot write premium or identity storage',async()=>{
 const {worker,store}=setup(seed);
 await assert.rejects(vm.runInContext('queueToolboxMutation',worker)({collection:'ds_install_id',operation:'clear'}));assert.deepEqual(store,seed);
});
test('variable substitution accepts regex characters and literal dollar signs',()=>{
 const {tab}=setup();const t=tab();assert.deepEqual(Array.from(t.run("DeepSeekDOM.replaceVariables(['{{a+b}} {{price}}'],{'a+b':'literal $&','price':'$10'})")),['literal $& $10']);
});
test('export retains repeat messages and common prefixes',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('chatExporter.js'),ctx);const exporter=new ctx.window.ChatExporter();
 exporter.messages=[{role:'user',content:'Continue'},{role:'user',content:'Continue'},{role:'assistant',content:'x'.repeat(100)+'A'},{role:'assistant',content:'x'.repeat(100)+'B'}];exporter.removeDuplicates();assert.equal(exporter.messages.length,4);
});
test('chain waits for a new response and cancellation invalidates delayed work',()=>{
 let interval,timer,send=0;let signature='old';
 const ctx=vm.createContext({window:{},location:{pathname:'/a/chat/s/qa'},console:quiet,log(){},setInterval:fn=>(interval=fn,1),clearInterval(){},setTimeout:fn=>(timer=fn,2),clearTimeout(){},DeepSeekDOM:{assistantSignature:()=>signature,stopVisible:()=>false,sendButton:()=>({})}});
 vm.runInContext(read('promptChainExecutor.js'),ctx);const executor=new ctx.window.PromptChainExecutor();executor.currentChain={steps:['1','2']};executor.isRunning=true;executor.startedPath=ctx.location.pathname;executor.responseBaseline='old';executor.updateIndicatorStatus=executor.showToast=()=>{};executor.executeStep=()=>send++;
 executor.startResponseDetection();for(let i=0;i<8;i++)interval();assert.equal(timer,undefined);
 signature='new response';for(let i=0;i<6;i++)interval();assert.equal(typeof timer,'function');executor.stopChain();timer();assert.equal(send,0);assert.equal(executor.currentChain,null);
});

test('malformed successful responses do not replace a valid paid cache',async()=>{
 const {tab,store}=setup(seed);const t=tab();await t.run('apiClient.initPromise');
 t.run("apiClient.sendMessageSafely=async()=>({success:true,data:{unexpected:true}})");
 assert.equal((await t.run('apiClient.getMeStatus({force:true})')).plan,'premium');assert.deepEqual(store,seed);
});
test('existing lifetime access survives a temporary API failure',async()=>{
 const lifetime={...seed,ds_entitlements_cache:{data:{plan:'lifetime'},ts:Date.now()-180000}};
 const {tab,store}=setup(lifetime);const t=tab();await t.run('apiClient.initPromise');
 assert.equal((await t.run('apiClient.getMeStatus({force:true})')).plan,'lifetime');
 assert.equal((await t.run("apiClient.checkFeatureLimit('folders')")).limit,-1);assert.deepEqual(store,lifetime);
});

test('all current features work without a subscription or entitlement API',async()=>{
 const {tab,store}=setup({ds_install_id:'free-existing'});const t=tab();await t.run('apiClient.initPromise');
 t.run("apiClient.getMeStatus=()=>{throw new Error('Feature access must not request billing status')};apiClient.getFeatureUsage=async()=>1000");
 for(const feature of require('../extension/featureAccess').freeFeatures){
  const result=await t.run(`apiClient.checkFeatureLimit('${feature}')`);assert.equal(result.allowed,true);assert.equal(result.limit,-1);assert.equal(result.isPremium,false);
 }
 assert.deepEqual(store,{ds_install_id:'free-existing'});
});
test('future paid features require explicit registration and entitlement or chosen plan',()=>{
 const access=require('../extension/featureAccess');
 const policy={futureSync:{entitlement:'cloud_sync',includedPlans:['premium','lifetime']},futureAI:{entitlement:'ai_pack'}};
 assert.equal(access.resolve('futureSync',{plan:'free'},0,policy).allowed,false);
 assert.equal(access.resolve('futureSync',{plan:'premium'},0,policy).allowed,true);
 assert.equal(access.resolve('futureAI',{plan:'premium'},0,policy).allowed,false);
 assert.equal(access.resolve('futureAI',{plan:'free',entitlements:{ai_pack:true}},0,policy).allowed,true);
 assert.equal(access.resolve('typo',{plan:'premium'},0,policy).allowed,false);
 assert.equal(access.resolve('folders',{},999,{folders:{entitlement:'paid_folders'}}).allowed,true);
});
test('new checkouts and unknown features are blocked without changing yearly purchase cache',async()=>{
 const {tab,store}=setup(seed);const t=tab();await t.run('apiClient.initPromise');
 await assert.rejects(t.run("apiClient.createCheckout('yearly')"),/free/);
 assert.equal((await t.run("apiClient.checkFeatureLimit('unknownFutureFeature')")).allowed,false);
 assert.deepEqual(store,seed);
});
test('paywall entry points never advertise current free features or old prices',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('paywallModal.js'),ctx);
 for(const feature of require('../extension/featureAccess').freeFeatures)assert.equal(ctx.window.paywallModal.show(feature),false);
 assert.equal(ctx.window.paywallModal.modal,null);
});
