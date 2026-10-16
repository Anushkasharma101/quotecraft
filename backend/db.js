import {MongoClient} from 'mongodb';
export async function connectDatabase(){
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017';
 const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
 await client.connect();const db=client.db(process.env.MONGODB_DB||'quotecraft');
 await db.collection('quotes').createIndex({customerId:1});
 await db.collection('settings').updateOne({_id:'business'},{$setOnInsert:{businessName:'Artisan Studio',address:'Jaipur, Rajasthan',taxRate:5,terms:'50% advance to confirm your order.',delivery:'10–14 business days'}},{upsert:true});
 const publicDoc=doc=>{if(!doc)return null;const {_id,...fields}=doc;return {id:_id,...fields}};
 const repo={
  list:async name=>(await db.collection(name).find({}).sort({_id:-1}).toArray()).map(publicDoc),
  get:async(name,id)=>publicDoc(await db.collection(name).findOne({_id:id})),
  insert:async(name,data)=>{const counter=await db.collection('counters').findOneAndUpdate({_id:name},{$inc:{seq:1}},{upsert:true,returnDocument:'after',includeResultMetadata:false});const doc={_id:counter.seq,...data};await db.collection(name).insertOne(doc);return publicDoc(doc)},
  update:async(name,id,data)=>publicDoc(await db.collection(name).findOneAndUpdate({_id:id},{$set:data},{returnDocument:'after',includeResultMetadata:false})),
  delete:async(name,id)=>(await db.collection(name).deleteOne({_id:id})).deletedCount,
  hasQuotes:async id=>Boolean(await db.collection('quotes').findOne({customerId:id},{projection:{_id:1}})),
  settings:async()=>{const {_id,...s}=await db.collection('settings').findOne({_id:'business'});return s},
  saveSettings:async s=>{await db.collection('settings').updateOne({_id:'business'},{$set:s});return s},
 };
 return {client,db,repo};
}
