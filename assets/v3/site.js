
(function(){
  var html=document.documentElement,body=document.body,qs=new URLSearchParams(location.search),P="sv:"+location.pathname+":";
  var tiers=["spark","surge","supernova"],reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  function store(k,v){try{localStorage.setItem(P+k,v)}catch(e){}}
  function read(k){try{return localStorage.getItem(P+k)}catch(e){return null}}
  var panel=document.querySelector(".vpanel"),vbtn=document.querySelector(".vbtn"),fonts={};
  try{fonts=JSON.parse(panel.getAttribute("data-fonts"))}catch(e){}
  var tier=qs.get("v")||read("tier")||html.getAttribute("data-tier")||"supernova";if(tiers.indexOf(tier)<0)tier="supernova";
  var color=(qs.get("c")||read("accent")||"").replace("#","");color=/^[0-9a-f]{6}$/i.test(color)?"#"+color.toLowerCase():"";
  var font=qs.get("f")||read("font")||"";if(!fonts[font])font="";
  var accent=color||body.getAttribute("data-accent");
  function inkFor(c){var n=parseInt(c.slice(1),16);return (0.299*(n>>16&255)+0.587*(n>>8&255)+0.114*(n&255))>160?"#111827":"#ffffff"}
  function loadCss(id,css){if(document.getElementById(id))return;var l=document.createElement("link");l.rel="stylesheet";l.id=id;l.href="https://fonts.googleapis.com/css2?"+css+"&display=swap";document.head.appendChild(l)}
  function apply(sync){
    html.setAttribute("data-tier",tier);
    if(color){html.style.setProperty("--accent",color);html.style.setProperty("--accent-ink",inkFor(color))}
    accent=color||body.getAttribute("data-accent");
    // Supernova uses the bold display font unless the visitor picked one
    var fk=font||(tier==="supernova"?"bold":body.getAttribute("data-font")),f=fonts[fk];
    if(f){loadCss("font-"+fk,f.css);html.style.setProperty("--display",'"'+f.d+'"');html.style.setProperty("--body",'"'+f.b+'"');html.style.setProperty("--display-weight",f.w);html.style.setProperty("--display-case",f.u?"uppercase":"none")}
    document.querySelectorAll(".tier").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-t")===tier)});
    document.querySelectorAll(".swatches button").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-c").toLowerCase()===accent.toLowerCase())});
    document.querySelectorAll(".fonts button").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-f")===fk)});
    var name=((document.querySelector('.tier[data-t="'+tier+'"] b span')||{}).textContent||tier).replace(/^V\d/,"");
    document.querySelectorAll("[data-wa-tier]").forEach(function(a){a.href=a.getAttribute("data-wa-base")+encodeURIComponent(" I like the "+name+" version.")});
    if(sync&&history.replaceState){var u=new URL(location.href);u.searchParams.set("v",tier);if(color)u.searchParams.set("c",color.slice(1));if(font)u.searchParams.set("f",font);history.replaceState(null,"",u.pathname+u.search+u.hash)}
    if(tier==="supernova")splitHeadline();
    story();
  }
  function splitHeadline(){var h=document.querySelector(".hero h1");if(!h||h.getAttribute("data-split"))return;h.setAttribute("data-split","1");
    var words=h.textContent.split(" ");h.textContent="";words.forEach(function(w,i){var s=document.createElement("span");s.className="w";s.style.animationDelay=(i*0.08)+"s";s.textContent=w;h.appendChild(s);h.appendChild(document.createTextNode(" "))})}
  // Supernova: the pinned hero crossfades its three story bands as you scroll
  var hero=document.querySelector(".hero"),bands=[].slice.call(document.querySelectorAll(".hero .band")),cue=document.querySelector(".cue");
  function story(){
    if(!hero)return;
    if(tier!=="supernova"||innerWidth<961){bands.forEach(function(b){b.style.opacity="";b.style.transform="";b.style.pointerEvents=""});return}
    var total=hero.offsetHeight-innerHeight,p=total>0?Math.min(1,Math.max(0,-hero.getBoundingClientRect().top/total)):0,f=.06;
    bands.forEach(function(b){var a=+b.getAttribute("data-a"),z=+b.getAttribute("data-b"),o=1;
      if(p<a)o=Math.max(0,1-(a-p)/f);else if(p>z)o=Math.max(0,1-(p-z)/f);
      b.style.opacity=o;b.style.pointerEvents=o>.5?"auto":"none";
      var shift=(p<a?1:-1)*(1-o)*40;b.style.transform=(b.classList.contains("b1")?"":"translateY(-50%) ")+"translateY("+shift+"px)"});
    if(cue)cue.style.opacity=p>.9?0:1;
  }
  apply(false);
  // the customise panel: open when a visitor arrives; once they close it, it stays closed for that visit
  function closedThisVisit(){try{return sessionStorage.getItem(P+"panel-closed")==="1"}catch(e){return false}}
  function openPanel(o,byUser){if(!panel)return;panel.classList.toggle("open",o);vbtn.setAttribute("aria-expanded",o);
    if(!o&&byUser){try{sessionStorage.setItem(P+"panel-closed","1")}catch(e){}}
    if(o){var all={};Object.keys(fonts).forEach(function(k){fonts[k].css.split("&").forEach(function(p){all[p]=1})});loadCss("font-all",Object.keys(all).join("&"))}}
  if(vbtn)vbtn.addEventListener("click",function(){openPanel(!panel.classList.contains("open"),true)});
  document.querySelectorAll("[data-open-panel]").forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();openPanel(true)})});
  var vx=document.querySelector(".vp-x");if(vx)vx.addEventListener("click",function(){openPanel(false,true)});
  if(!closedThisVisit())openPanel(true);
  document.querySelectorAll(".tier").forEach(function(b){b.addEventListener("click",function(){tier=b.getAttribute("data-t");store("tier",tier);apply(true);revealVisible()})});
  document.querySelectorAll(".swatches button").forEach(function(b){b.addEventListener("click",function(){color=b.getAttribute("data-c").toLowerCase();store("accent",color);apply(true)})});
  document.querySelectorAll(".fonts button").forEach(function(b){b.addEventListener("click",function(){font=b.getAttribute("data-f");store("font",font);apply(true)})});
  // header, mobile menu, active section
  var hdr=document.querySelector(".hdr"),nav=document.querySelector(".nav"),burger=document.querySelector(".burger"),bar=document.querySelector(".progress"),slidesBox=document.querySelector(".slides");
  function closeNav(){if(nav){nav.classList.remove("open");burger.setAttribute("aria-expanded","false")}}
  if(burger)burger.addEventListener("click",function(){nav.classList.toggle("open");burger.setAttribute("aria-expanded",nav.classList.contains("open"))});
  if(nav)nav.querySelectorAll("a").forEach(function(a){a.addEventListener("click",closeNav)});
  function onScroll(){var y=window.scrollY;if(hdr)hdr.classList.toggle("solid",y>30);
    if(bar){var h=document.documentElement.scrollHeight-innerHeight;bar.style.width=(h>0?y/h*100:0)+"%"}
    if(slidesBox)slidesBox.style.transform=tier==="surge"&&!reduce?"translateY("+Math.min(y,900)*0.3+"px)":"";
    story()}
  addEventListener("scroll",onScroll,{passive:true});addEventListener("resize",story);onScroll();
  var links={};document.querySelectorAll('.nav a[href^="#"]').forEach(function(a){links[a.getAttribute("href").slice(1)]=a});
  if("IntersectionObserver" in window){
    var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&links[e.target.id]){Object.keys(links).forEach(function(k){links[k].removeAttribute("aria-current")});links[e.target.id].setAttribute("aria-current","true")}})},{rootMargin:"-45% 0px -50% 0px"});
    Object.keys(links).forEach(function(id){var s=document.getElementById(id);if(s)so.observe(s)});
  }
  // Surge: the hero photos slide across every 5s
  var slides=[].slice.call(document.querySelectorAll(".slides .bg")),si=0;
  if(slides.length>1&&!reduce)setInterval(function(){if(tier!=="surge"||document.hidden)return;
    var cur=slides[si];si=(si+1)%slides.length;var nx=slides[si];
    nx.style.transition="none";nx.classList.remove("out");void nx.offsetWidth;nx.style.transition="";
    cur.classList.remove("on");cur.classList.add("out");nx.classList.add("on");
    setTimeout(function(){cur.style.transition="none";cur.classList.remove("out");void cur.offsetWidth;cur.style.transition=""},1400)},5000);
  // services rail arrows (supernova)
  document.querySelectorAll("[data-rail]").forEach(function(b){b.addEventListener("click",function(){var r=document.querySelector("#services .rail"),c=r&&r.firstElementChild;if(c)r.scrollBy({left:(+b.getAttribute("data-rail"))*(c.offsetWidth+18),behavior:"smooth"})})});
  // reveal on scroll
  var reveals=[].slice.call(document.querySelectorAll(".reveal"));
  function revealVisible(){reveals.forEach(function(el){if(el.getBoundingClientRect().top<innerHeight)el.classList.add("in")})}
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12});
    reveals.forEach(function(el,i){el.style.transitionDelay=(tier==="spark"?0:(i%4)*90)+"ms";io.observe(el)});
  }else reveals.forEach(function(el){el.classList.add("in")});
  // status HUD
  var chip=document.querySelector(".chip"),hs=chip&&chip.querySelector(".hud-s");
  if(hs){var states=[];try{states=JSON.parse(chip.getAttribute("data-states")||"[]")}catch(e){}var n=0;if(states.length>1)setInterval(function(){n=(n+1)%states.length;hs.textContent=states[n]},2600)}
  // counters (animated in surge + supernova)
  if("IntersectionObserver" in window){
    var co=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;co.unobserve(e.target);var el=e.target,raw=el.getAttribute("data-count"),to=parseFloat(raw),dec=(raw.split(".")[1]||"").length;
      if(tier==="spark"||reduce){el.textContent=to.toFixed(dec);return}var t0=performance.now();
      (function step(t){var p=Math.min(1,(t-t0)/1500);el.textContent=(to*(1-Math.pow(1-p,3))).toFixed(dec);if(p<1)requestAnimationFrame(step)})(t0)})},{threshold:.5});
    document.querySelectorAll("[data-count]").forEach(function(el){co.observe(el)});
  }
  // Supernova: drifting dust + cursor glow
  if(!reduce){
    var cv=document.createElement("canvas");cv.className="dust";cv.setAttribute("aria-hidden","true");body.insertBefore(cv,body.firstChild);
    var cx=cv.getContext("2d"),W=0,H=0,dots=[];
    function size(){var r=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*r;cv.height=H*r;cx.setTransform(r,0,0,r,0,0)}
    size();addEventListener("resize",size);
    for(var i=0;i<70;i++)dots.push({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.4,vx:(Math.random()-.5)*.00012,vy:-(Math.random()*.00025+.00005),a:Math.random()*.5+.15});
    (function draw(){requestAnimationFrame(draw);if(tier!=="supernova"||document.hidden)return;cx.clearRect(0,0,W,H);cx.fillStyle=accent;
      dots.forEach(function(d){d.x+=d.vx;d.y+=d.vy;if(d.y<-.02){d.y=1.02;d.x=Math.random()}if(d.x<0)d.x=1;if(d.x>1)d.x=0;cx.globalAlpha=d.a;cx.beginPath();cx.arc(d.x*W,d.y*H,d.r,0,6.283);cx.fill()})})();
    if(matchMedia("(pointer:fine)").matches){var g=document.createElement("div");g.className="glow";g.setAttribute("aria-hidden","true");body.appendChild(g);
      addEventListener("mousemove",function(e){g.style.transform="translate("+e.clientX+"px,"+e.clientY+"px)"},{passive:true})}
  }
  // policies open as overlays on the same page
  function openLegal(id){var el=id&&document.getElementById(id);if(!el||!el.classList.contains("legal"))return false;el.classList.add("open");body.style.overflow="hidden";return true}
  function closeLegal(){document.querySelectorAll(".legal.open").forEach(function(el){el.classList.remove("open")});body.style.overflow=""}
  document.querySelectorAll('a[href^="#"]').forEach(function(a){var id=a.getAttribute("href").slice(1);
    if(a.closest(".legal")&&id===""){a.addEventListener("click",function(e){e.preventDefault();closeLegal()});return}
    var t=id&&document.getElementById(id);if(t&&t.classList.contains("legal"))a.addEventListener("click",function(e){e.preventDefault();openLegal(id)})});
  addEventListener("keydown",function(e){if(e.key==="Escape"){closeLegal();openPanel(false,true)}});
  if(location.hash)openLegal(location.hash.slice(1));
  // cookie notice
  var ck=document.querySelector(".cookie");
  if(ck&&!read("cookies-ok")){ck.classList.add("show");ck.querySelector("button").addEventListener("click",function(){store("cookies-ok","1");ck.classList.remove("show")})}
  // contact form -> WhatsApp
  var form=document.querySelector("form.contact");
  if(form)form.addEventListener("submit",function(ev){ev.preventDefault();var d=new FormData(form);
    var msg="Hi, I'm "+(d.get("name")||"")+(d.get("phone")?" ("+d.get("phone")+")":"")+". "+(d.get("message")||"");
    window.open(form.getAttribute("data-wa")+encodeURIComponent(msg),"_blank")});
})();
