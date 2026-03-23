import{createClient}from'https://esm.sh/@supabase/supabase-js@2'
const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,x-api-key,content-type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'}
const G='https://graph.facebook.com/v21.0'
Deno.serve(async(req)=>{
if(req.method==='OPTIONS')return new Response('ok',{headers:H})
if(req.method==='GET'){const u=new URL(req.url),m=u.searchParams.get('hub.mode'),t=u.searchParams.get('hub.verify_token'),c=u.searchParams.get('hub.challenge');if(m==='subscribe'&&t===Deno.env.get('INSTAGRAM_VERIFY_TOKEN'))return new Response(c,{status:200,headers:H});return new Response('Forbidden',{status:403,headers:H})}
if(req.method!=='POST')return new Response('',{status:405,headers:H})
try{
const raw=await req.text()
const body=JSON.parse(raw)
if(body.object!=='instagram')return new Response('ok',{status:200,headers:H})
const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
let tk='';try{const{data}=await sb.rpc('get_secret',{secret_name:'INSTAGRAM_ACCESS_TOKEN'});if(data)tk=data}catch{}
let ig='';try{const{data}=await sb.rpc('get_secret',{secret_name:'META_IG_ACCOUNT_ID'});if(data)ig=data}catch{}
for(const entry of body.entry||[]){
for(const ch of entry.changes||[]){
if(ch.field!=='comments'||ch.value?.verb!=='add'||ch.value?.item!=='comment')continue
if(ch.value.parent_id)continue
const{comment_id,from,media,text}=ch.value
const mid=media?.id||''
const{data:result}=await sb.rpc('process_ig_comment',{p_comment_id:comment_id,p_username:from.username,p_user_id:from.id,p_media_id:mid,p_comment_text:text})
if(!result||!result.matched)continue
if(tk&&result.comment_reply){try{await fetch(G+'/'+comment_id+'/replies',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'message='+encodeURIComponent(result.comment_reply)+'&access_token='+encodeURIComponent(tk)})}catch{}}
if(tk&&ig&&result.dm_message){try{let dt=result.dm_message;if(result.dm_link)dt+='\n\n'+result.dm_link;const r=await fetch(G+'/'+ig+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recipient:{id:from.id},message:{text:dt},access_token:tk})});const d=await r.json();if(!d.error)await sb.from('instagram_comment_logs').update({dm_sent:true}).eq('comment_id',comment_id)}catch{}}
}}
return new Response('{"success":true}',{status:200,headers:{...H,'Content-Type':'application/json'}})
}catch(e){return new Response('{"ok":true}',{status:200,headers:{...H,'Content-Type':'application/json'}})}
})
