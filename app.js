
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

function search(q){
 q=q.trim().toLowerCase(); const panel=$("#searchPanel");
 if(!q){panel.classList.add("hidden");return}
 const terms=q.split(/\s+/);
 const matches=D.faqs.filter(f=>{
   const c=catMap[f.category]?.name||"";
   const hay=(f.question+" "+f.answer+" "+(f.searchAliases||[]).join(" ")+" "+c+" "+(f.table?f.table.rows.flat().join(" "):"")).toLowerCase();
   return terms.every(t=>hay.includes(t));
 });
 $("#resultCount").textContent=`${matches.length} question${matches.length===1?"":"s"} found`;
 $("#results").innerHTML=matches.length?matches.map(faqHTML).join(""):`<div class="faq"><b>Nothing biting for that search 🎣</b><span class="pending">Try another phrase.</span></div>`;
 panel.classList.remove("hidden");
}
$("#searchInput").addEventListener("input",e=>search(e.target.value));
document.querySelectorAll(".try button").forEach(b=>b.onclick=()=>{$("#searchInput").value=b.textContent;search(b.textContent);$("#searchPanel").scrollIntoView({behavior:"smooth"})});
$("#clearSearch").onclick=()=>{$("#searchInput").value="";$("#searchPanel").classList.add("hidden")};

// Popular shortcuts point to real, answered FAQs (not placeholders).
const popularIds=["seasons-1","lures-baits-1","economy-1","clans-7","fish-fishing-2","maps-travel-1","dna-01","dna-07"];
const popularFaqs=popularIds.map(id=>D.faqs.find(f=>f.id===id)).filter(f=>f&&f.answer);
$("#popularGrid").innerHTML=popularFaqs.map(f=>`<button type="button" class="popular-item" data-faq="${esc(f.id)}">${esc(f.question)} <span aria-hidden="true">›</span></button>`).join("");
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
renderCategories();renderResources();
// Rotate the three cards gently, while keeping manual navigation available.
window.setInterval(()=>{resourceOffset=(resourceOffset+1)%D.resources.length;renderResources()},7000);
