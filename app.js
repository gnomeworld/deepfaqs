
const D=window.DEEPFAQS_DATA, $=s=>document.querySelector(s);
const catMap=Object.fromEntries(D.categories.map(c=>[c.id,c]));
let resourceOffset=0; // Always begin with the first community resources.

function esc(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function faqHTML(f){
 const table=f.table?`<table class="faq-data-table"><thead><tr>${f.table.headers.map(h=>`<th>${esc(String(h))}</th>`).join("")}</tr></thead><tbody>${f.table.rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>`:"";
 const bullets=f.bullets?`<ul class="faq-bullets">${f.bullets.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>`:"";
 const links=(f.links||[]).map(l=>`<span class="faq-link-item">See the <a class="faq-link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></span>`).join("");
 return `<div class="faq" id="faq-${esc(f.id)}"><b>${esc(f.question)}</b>${f.answer?`${f.paragraphs?f.paragraphs.map(p=>`<p>${esc(p)}</p>`).join(""):`<p>${esc(f.answer)}</p>`}${bullets}${table}${links?`<div class="faq-links">${links}</div>`:""}`:`<span class="pending">${esc(catMap[f.category]?.name||"FAQ")} • Answer coming soon</span>`}</div>`
}

// Search-only accordion: category pages continue using their existing full answers.
function searchFaqHTML(f){
 const full=faqHTML(f);
 const start=full.indexOf('>',full.indexOf('class="faq"'))+1;
 const body=full.slice(start,full.lastIndexOf('</div>'));
 // Remove only the leading question title; keep the original answer markup.
 const answer=body.replace(/^<b>[\s\S]*?<\/b>/,'');
 return `<details class="faq search-faq" id="faq-${esc(f.id)}"><summary>${esc(f.question)}</summary><div class="search-faq-answer">${answer}</div></details>`;
}

function renderCategories(){
 $("#categoryGrid").innerHTML=D.categories.map(c=>{
   const n=D.faqs.filter(f=>(f.category===c.id||(f.secondaryCategories||[]).includes(c.id))).length;
   return `<button class="cat" data-cat="${c.id}"><span class="ico">${c.icon}</span>${esc(c.name)}<small style="display:block;color:#8aa0a7;margin-top:5px">${n} questions</small></button>`
 }).join("");
 document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>openCategory(b.dataset.cat));
}
function orderedFaqs(id){
 const order=D.faqOrder?.[id]||[];
 const ranks=new Map(order.map((fid,i)=>[fid,i]));
 return D.faqs.filter(f=>(f.category===id||(f.secondaryCategories||[]).includes(id))).sort((a,b)=>(ranks.get(a.id)??10000)-(ranks.get(b.id)??10000));
}
function openCategory(id){
 const c=catMap[id]; $("#categoryTitle").textContent=`${c.icon} ${c.name}`;
 $("#categoryQuestions").innerHTML=orderedFaqs(id).map(faqHTML).join("");
 $("#categoryPanel").classList.remove("hidden"); $("#categoryPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
$("#closeCategory").onclick=()=>$("#categoryPanel").classList.add("hidden");

function renderResources(){
 const shown=[0,1,2].map(i=>D.resources[(resourceOffset+i)%D.resources.length]);
 $("#resourceCards").innerHTML=shown.map(r=>`<a class="resource-card" target="_blank" rel="noopener" href="${r.url}"><span class="resource-icon">${r.icon}</span><span><b>${esc(r.name)}</b><small>${esc(r.description)} ↗</small></span></a>`).join("");
}
$("#next").onclick=()=>{resourceOffset=(resourceOffset+1)%D.resources.length;renderResources()};
$("#prev").onclick=()=>{resourceOffset=(resourceOffset-1+D.resources.length)%D.resources.length;renderResources()};

// Season acronyms are case-insensitive search concepts, never ordinary substrings.
// "is" and "IS" both mean In Season; "oos" and "OOS" mean Out of Season.
const STOP_WORDS=new Set(["a","an","and","are","as","at","be","by","can","could","do","does","for","from","how","i","in","it","my","of","on","or","the","to","was","were","what","when","where","which","who","why","will","with","you","your"]);
function searchWords(value){
 return (String(value||"").toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
}
function termMatches(term,words){
 return words.some(w=>w===term||(term.length>=4&&w.startsWith(term)));
}
function faqSearchText(f){
 return [f.question,f.answer,...(f.searchAliases||[]),...(f.paragraphs||[]),...(f.bullets||[]),...(f.table?f.table.rows.flat():[])].join(" ");
}
function seasonMatches(f,acronym){
 const content=faqSearchText(f);
 // Explicit acronyms must be uppercase in FAQ content, or use the expanded phrase.
 // Lowercase "is" in English prose must never count as the IS acronym.
 return acronym==="is" ? /\bIS\b/.test(content)||/\bin[\s-]+season\b/i.test(content)
                       : /\bOOS\b/i.test(content)||/\bout[\s-]+of[\s-]+season\b/i.test(content);
}
function seasonQuestionScore(f,acronym){
 const pattern=acronym==="is"?/\bIS\b|\bin[\s-]+season\b/i:/\bOOS\b|\bout[\s-]+of[\s-]+season\b/i;
 return pattern.test(f.question)?150:pattern.test((f.searchAliases||[]).join(" "))?110:30;
}
function search(rawQuery){
 const panel=$("#searchPanel");
 const raw=rawQuery.trim();
 if(!raw){panel.classList.add("hidden");return}
 const input=searchWords(raw);
 // In conversational questions, "is" acts as grammar ("what is OOS").
 // As a lone query, or with topical terms ("IS fish"), it means In Season.
 const wantsOOS=input.includes("oos");
 const wantsIS=input.includes("is")&&!(wantsOOS&&input.length>1);
 const terms=input.filter(t=>t!=="is"&&t!=="oos"&&!STOP_WORDS.has(t));
 if(!terms.length&&!wantsIS&&!wantsOOS){
   $("#resultCount").textContent="Try a more specific search";
   $("#results").innerHTML='<div class="faq"><b>Try a more specific search term 🎣</b><p>Search for a topic such as IS, OOS, monsters, lures, or clans.</p></div>';
   panel.classList.remove("hidden");return;
 }
 const scored=D.faqs.filter(f=>f.published!==false&&f.answer).map(f=>{
   if(wantsIS&&!seasonMatches(f,"is"))return null;
   if(wantsOOS&&!seasonMatches(f,"oos"))return null;
   const c=catMap[f.category]?.name||"";
   const question=searchWords(f.question);
   const aliases=searchWords((f.searchAliases||[]).join(" "));
   const answer=searchWords([f.answer,(f.paragraphs||[]).join(" "),(f.bullets||[]).join(" "),f.table?f.table.rows.flat().join(" "):""].join(" "));
   const category=searchWords(c+" "+(f.secondaryCategories||[]).map(id=>catMap[id]?.name||"").join(" "));
   if(!terms.every(t=>[question,aliases,answer,category].some(words=>termMatches(t,words))))return null;
   const score=terms.reduce((sum,t)=>sum+(question.includes(t)?100:termMatches(t,question)?80:aliases.includes(t)?65:termMatches(t,aliases)?55:answer.includes(t)?30:termMatches(t,answer)?20:termMatches(t,category)?5:0),0)
     +(wantsIS?seasonQuestionScore(f,"is"):0)+(wantsOOS?seasonQuestionScore(f,"oos"):0);
   return {f,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score);
 const matches=scored.map(x=>x.f);
 $("#resultCount").textContent=`${matches.length} question${matches.length===1?"":"s"} found`;
 $("#results").innerHTML=matches.length?matches.map(searchFaqHTML).join(""):`<div class="faq"><b>Nothing biting for that search 🎣</b><span class="pending">Try another phrase.</span></div>`;
 panel.classList.remove("hidden");
}

$("#searchInput").addEventListener("input",e=>search(e.target.value));
document.querySelectorAll(".try button").forEach(b=>b.onclick=()=>{$("#searchInput").value=b.textContent;search(b.textContent);$("#searchPanel").scrollIntoView({behavior:"smooth"})});
$("#clearSearch").onclick=()=>{$("#searchInput").value="";$("#searchPanel").classList.add("hidden")};

// Curated Featured Questions: 25 useful FAQs, eight varied picks per page load.
const featuredIds=[
 "getting-started-1","getting-started-12","fish-fishing-2","fish-fishing-3",
 "getting-started-22","maps-travel-1","buildings-7","buildings-3",
 "npcs-7","quests-5","lures-baits-1","skills-2",
 "economy-1","xp-progression-1","seasons-1","seasons-2",
 "q77","dna-01","dna-07","vip-maps-3",
 "clans-7","pvp-2","tournaments-1","events-1","game-settings-4"
];
// If a curated ID changes, omit it rather than showing a missing question.
const featuredPool=featuredIds.map(id=>D.faqs.find(f=>f.id===id)).filter(f=>f&&f.answer&&f.published!==false);
function selectFeatured(pool,count){
 const shuffled=[...pool].sort(()=>Math.random()-.5);
 const selected=[],categories=new Set();
 for(const f of shuffled){if(!categories.has(f.category)){selected.push(f);categories.add(f.category);if(selected.length===count)return selected}}
 for(const f of shuffled){if(!selected.includes(f)){selected.push(f);if(selected.length===count)break}}
 return selected;
}
const featuredFaqs=selectFeatured(featuredPool,8);
$("#popularGrid").innerHTML=featuredFaqs.map(f=>`<button type="button" class="popular-item" data-faq="${esc(f.id)}">${esc(f.question)} <span aria-hidden="true">›</span></button>`).join("");
function openFaq(id){
 const f=D.faqs.find(item=>item.id===id);if(!f)return;
 openCategory(f.category);
 // Allow the category panel to become visible before positioning the target.
 requestAnimationFrame(()=>{
   const target=document.getElementById("faq-"+id);
   if(!target)return;
   target.classList.add("faq-highlight");
   target.scrollIntoView({behavior:"smooth",block:"center"});
   window.setTimeout(()=>target.classList.remove("faq-highlight"),4000);
 });
}
document.querySelectorAll("[data-faq]").forEach(b=>b.addEventListener("click",()=>openFaq(b.dataset.faq)));
// Unique published questions, not duplicated for secondary categories.
$("#totalFaqCount").textContent = new Set(D.faqs.filter(f=>f.published !== false && f.answer).map(f=>f.id)).size;
renderCategories();renderResources();
// Rotate the three cards gently, while keeping manual navigation available.
window.setInterval(()=>{resourceOffset=(resourceOffset+1)%D.resources.length;renderResources()},7000);
