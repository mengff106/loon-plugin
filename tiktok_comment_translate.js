const targetLang = "zh-CN";
const mode = "append";
const maxTranslate = 30;

let body = $response.body;

function done(b){$done({body:b});}
function parse(s){try{return JSON.parse(s);}catch(e){return null;}}
function enc(s){return encodeURIComponent(s);}

function translate(text){
  return new Promise(resolve=>{
    const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${enc(text)}`;
    $httpClient.get(url,(err,resp,data)=>{
      if(err||!data)return resolve("");
      try{
        const j=JSON.parse(data);
        const t=j[0].map(i=>i[0]).join("");
        resolve(t||"");
      }catch(e){resolve("");}
    });
  });
}

(async()=>{
  const json=parse(body);
  if(!json||!Array.isArray(json.comments)) return done(body);

  let count=0;
  for(const c of json.comments){
    if(count>=maxTranslate) break;
    if(!c.text||c.text.length<=1) continue;

    const original=c.text;
    const tr=await translate(original);
    if(!tr) continue;

    if(mode==="replace"){
      c.text=tr;
    }else{
      if(!original.includes("\n[中] "))
        c.text=original+"\n[中] "+tr;
    }
    count++;
  }

  done(JSON.stringify(json));
})();
