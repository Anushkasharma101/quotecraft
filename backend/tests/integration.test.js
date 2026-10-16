import {MongoMemoryServer} from 'mongodb-memory-server';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
const root=new URL('../',import.meta.url);const temp=mkdtempSync(join(tmpdir(),'quotecraft-test-'));
let mongo;
let processRef;let port;
// Reserve a fixed ephemeral port for the application, independent of the mock AI.
async function call(path,method='GET',body,headers={}){let r=await fetch('http://127.0.0.1:'+processRef.appPort+'/api/'+path,{method,headers:{'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
async function launch(appPort){processRef=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(appPort),MONGODB_URI:mongo.getUri(),MONGODB_DB:'quotecraft_test',OLLAMA_URL:`http://127.0.0.1:${port}`},stdio:['ignore','pipe','pipe']});processRef.appPort=appPort;await new Promise((resolve,reject)=>{processRef.stdout.once('data',resolve);processRef.once('error',reject);processRef.once('exit',c=>reject(Error('Server exited '+c)))})}
async function stop(){let p=processRef;await new Promise(resolve=>{p.once('exit',resolve);p.kill()})}
test('full API workflow, server arithmetic, AI contract, and persistence',async()=>{
 mongo=await MongoMemoryServer.create({instance:{dbPath:temp}});
 let mock=http.createServer(async(req,res)=>{let b='';for await(let c of req)b+=c;let data=JSON.parse(b);assert.equal(data.stream,false);assert.equal(data.format.type,'object');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:JSON.stringify({items:[{productId:1,quantity:3}],warnings:['Check size with customer.']})}}))});await new Promise(r=>mock.listen(0,'127.0.0.1',r));port=mock.address().port;
 let reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));let appPort=reserve.address().port;await new Promise(r=>reserve.close(r));
 try{await launch(appPort);let b=await call('bootstrap');assert.equal(b.status,200);assert.equal(b.body.products.length,0);
 let product=await call('products','POST',{name:'Test carpet',detail:'Blue',price:100});assert.equal(product.status,201);let pid=product.body.id;
 assert.equal((await call('products','POST',{name:'Invalid',price:-1})).status,400);
 let customer=await call('customers','POST',{name:'Test Customer',email:'test@example.com',phone:'123',address:'Jaipur'});assert.equal(customer.status,201);let cid=customer.body.id;
 let quote=await call('quotes','POST',{customerId:cid,items:[{productId:pid,name:'Test carpet',detail:'Blue',quantity:2,rate:100}],taxRate:5,validDays:15,terms:'Advance',delivery:'7 days',total:1});assert.equal(quote.status,201);assert.equal(quote.body.total,210);let qid=quote.body.id;
 await call('products/'+pid,'PUT',{name:'Renamed',detail:'Changed',price:200});let saved=await call('quotes/'+qid);assert.equal(saved.body.items[0].rate,100);assert.equal(saved.body.items[0].name,'Test carpet');
 let update=await call('quotes/'+qid,'PUT',{...saved.body,status:'Accepted'});assert.equal(update.body.status,'Accepted');
 assert.equal((await call('customers/'+cid,'DELETE')).status,409);
 let demo=await call('draft','POST',{enquiry:'2 carpets changed',mode:'demo'});assert.equal(demo.status,200);assert.equal(demo.body.items[0].quantity,2);assert.equal(demo.body.mode,'demo');
 await call('products/'+pid,'PUT',{name:'Wool carpet',detail:'Beige',price:100});
 let ai=await call('draft','POST',{enquiry:'Three wool carpets',mode:'ollama'});assert.equal(ai.status,200);assert.equal(ai.body.items[0].quantity,3);assert.equal(ai.body.mode,'ollama');
 assert.equal((await call('products','POST',{name:'Attack',price:1},{Origin:'https://evil.example'})).status,403);
 assert.equal((await call('quotes/9999')).status,404);
 assert.equal((await call('health','GET',undefined,{Origin:'http://localhost:5173'})).status,200);
 let cors=await fetch('http://127.0.0.1:'+appPort+'/api/products',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST'}});assert.equal(cors.status,204);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),'http://localhost:5173');
 await stop();await launch(appPort);assert.equal((await call('quotes/'+qid)).body.total,210);
 await new Promise(r=>mock.close(r));let unavailable=await call('draft','POST',{enquiry:'Two carpets',mode:'ollama'});assert.equal(unavailable.status,503);assert.match(unavailable.body.error,/unavailable/);
 assert.equal((await call('quotes/'+qid,'DELETE')).status,200);assert.equal((await call('customers/'+cid,'DELETE')).status,200);assert.equal((await call('products/'+pid,'DELETE')).status,200);
 }finally{if(processRef?.exitCode===null)await stop();mock.close();await mongo.stop();rmSync(temp,{recursive:true,force:true})}
});
