
(function(){
  var html=document.documentElement, qs=new URLSearchParams(location.search);
  var tiers=["spark","surge","supernova"];
  function store(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function read(k){try{return localStorage.getItem(k)}catch(e){return null}}
  var tier=qs.get("v")||read("tier")||html.getAttribute("data-tier")||"supernova";
  if(tiers.indexOf(tier)<0)tier="supernova";
  var color=qs.get("c")?"#"+qs.get("c").replace("#",""):read("accent");
  function apply(){
    html.setAttribute("data-tier",tier);
    if(color)html.style.setProperty("--accent",color);
    document.querySelectorAll(".tier").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-t")===tier)});
    document.querySelectorAll(".swatches button").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-c")===(color||""))});
    document.querySelectorAll("[data-wa-tier]").forEach(function(a){
      var name=(document.querySelector('.tier[data-t="'+tier+'"] b span')||{}).textContent||tier;
      a.href=a.getAttribute("data-wa-base")+encodeURIComponent(" I like the "+name+" version.");
    });
  }
  apply();
  // keep the chosen version/colour on every internal link
  document.querySelectorAll("a[data-in]").forEach(function(a){
    a.addEventListener("click",function(){var u=new URL(a.href);u.searchParams.set("v",tier);if(color)u.searchParams.set("c",color.replace("#",""));a.href=u.toString();});
  });
  document.querySelectorAll(".tier").forEach(function(b){b.addEventListener("click",function(){tier=b.getAttribute("data-t");store("tier",tier);apply();if(tier==="supernova")splitHeadline();})});
  document.querySelectorAll(".swatches button").forEach(function(b){b.addEventListener("click",function(){color=b.getAttribute("data-c");store("accent",color);apply();})});
  var vbtn=document.querySelector(".vbtn"),vpanel=document.querySelector(".vpanel");
  if(vbtn&&vpanel)vbtn.addEventListener("click",function(){vpanel.classList.toggle("open")});
  // header + mobile menu
  var hdr=document.querySelector(".hdr"),nav=document.querySelector(".nav"),burger=document.querySelector(".burger"),bar=document.querySelector(".progress");
  if(burger)burger.addEventListener("click",function(){nav.classList.toggle("open");burger.setAttribute("aria-expanded",nav.classList.contains("open"))});
  function onScroll(){
    var y=window.scrollY;if(hdr)hdr.classList.toggle("solid",y>40);
    if(bar){var h=document.documentElement.scrollHeight-innerHeight;bar.style.width=(h>0?y/h*100:0)+"%"}
    var bg=document.querySelector(".hero .bg");if(bg&&tier==="surge")bg.style.transform="translateY("+y*0.25+"px) scale(1.06)";
  }
  addEventListener("scroll",onScroll,{passive:true});onScroll();
  // reveal on scroll
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll(".reveal").forEach(function(el,i){el.style.transitionDelay=(tier==="spark"?0:(i%4)*90)+"ms";io.observe(el)});
  // headline word-by-word (supernova)
  function splitHeadline(){
    var h=document.querySelector(".hero h1");if(!h||h.getAttribute("data-split"))return;h.setAttribute("data-split","1");
    h.innerHTML=h.textContent.split(" ").map(function(w,i){return '<span class="w" style="animation-delay:'+(i*0.09)+'s">'+w+'</span>'}).join(" ");
  }
  if(tier==="supernova")splitHeadline();
  // live status chip (supernova)
  var chip=document.querySelector(".chip");
  if(chip){var states=JSON.parse(chip.getAttribute("data-states")||"[]"),n=0;if(states.length){chip.textContent=states[0];setInterval(function(){n=(n+1)%states.length;chip.textContent=states[n]},2600)}}
  // counters (supernova; others show the number)
  var co=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;co.unobserve(e.target);var el=e.target,to=parseFloat(el.getAttribute("data-count")),dec=(el.getAttribute("data-count").split(".")[1]||"").length;
    if(tier!=="supernova"){el.textContent=to.toFixed(dec);return}var t0=performance.now();
    (function step(t){var p=Math.min(1,(t-t0)/1400);el.textContent=(to*(1-Math.pow(1-p,3))).toFixed(dec);if(p<1)requestAnimationFrame(step)})(t0);})},{threshold:.5});
  document.querySelectorAll("[data-count]").forEach(function(el){co.observe(el)});
  // cookie notice
  var ck=document.querySelector(".cookie");
  if(ck&&!read("cookies-ok")){ck.classList.add("show");ck.querySelector("button").addEventListener("click",function(){store("cookies-ok","1");ck.classList.remove("show")})}
  // contact form -> WhatsApp
  var form=document.querySelector("form.contact");
  if(form)form.addEventListener("submit",function(ev){ev.preventDefault();var d=new FormData(form);
    var msg="Hi, I'm "+(d.get("name")||"")+" ("+(d.get("phone")||"")+"). "+(d.get("message")||"");
    window.open(form.getAttribute("data-wa")+encodeURIComponent(msg),"_blank")});
})();
