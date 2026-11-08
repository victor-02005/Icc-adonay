(function(){
var D=window.ICC||{},$=function(i){return document.getElementById(i)},C=D.contacto||{};
function e(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function u(s){return /^\s*javascript:/i.test(s||"")?"#":e(s)}
function soon(){return '<p class="lead">Próximamente.</p>'}
function ph(f,alt,em){return '<div class="ph">'+(f?'<img src="'+u(f)+'" alt="'+e(alt)+'" loading="lazy" width="640" height="360">':'<span aria-hidden="true">'+(em||"⛪")+'</span>')+'</div>'}
function fmt(d){try{return new Date(d+"T00:00:00").toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}catch(x){return d}}
function ytid(s){var m=String(s||"").match(/(?:v=|youtu\.be\/|embed\/)?([\w-]{11})(?:[?&].*)?$/);return m?m[1]:""}
var t=new Date(),today=t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");
function set(id,h){var n=$(id);if(n)n.innerHTML=h}

/* Portada */
if($("inicio")&&D.portada)$("inicio").style.backgroundImage='linear-gradient(rgba(21,43,64,.78),rgba(21,43,64,.78)),url("'+encodeURI(D.portada)+'")',$("inicio").style.backgroundSize="cover",$("inicio").style.backgroundPosition="center";

/* Nosotros */
var N=D.nosotros||{},nh="";
[["Historia","historia"],["Misión","mision"],["Visión","vision"],["Valores y principios","valores"]].forEach(function(x){if(N[x[1]])nh+='<div class="card"><div class="b"><h3>'+x[0]+'</h3><p>'+e(N[x[1]])+'</p></div></div>'});
set("ng",nh||soon());

/* Ministerios */
var Mi=D.ministerios||[];
set("mg",Mi.map(function(m,i){return '<article class="card">'+ph(m.foto,m.nombre,m.emoji)+'<div class="b"><h3>'+e(m.nombre)+'</h3>'+(m.desc?'<p>'+e(m.desc.length>110?m.desc.slice(0,110)+"…":m.desc)+'</p>':'')+'<button class="btn d more" data-i="'+i+'">Ver más</button></div></article>'}).join("")||soon());
var dlg=$("dlg");
if($("mg")&&dlg)$("mg").addEventListener("click",function(ev){var b=ev.target.closest(".more");if(!b)return;var m=Mi[b.dataset.i];
$("dc").innerHTML=ph(m.foto,m.nombre,m.emoji)+'<h3>'+e(m.nombre)+'</h3>'+(m.desc?'<p>'+e(m.desc)+'</p>':'<p>Pronto más información.</p>')+(m.lider?'<p><strong>Responsable:</strong> '+e(m.lider)+'</p>':'');dlg.showModal()});
if(dlg)dlg.addEventListener("click",function(ev){if(ev.target===dlg)dlg.close()});

/* Iglesias */
set("ig",(D.iglesias||[]).map(function(c){return '<article class="card">'+ph(c.foto,c.nombre,"⛪")+'<div class="b"><h3>'+e(c.nombre)+'</h3>'+(c.ubicacion?'<p>📍 '+e(c.ubicacion)+'</p>':'')+(c.lider?'<p>Responsable: '+e(c.lider)+'</p>':'')+(c.contacto?'<p>'+e(c.contacto)+'</p>':'')+'</div></article>'}).join("")||soon());

/* Eventos */
function evc(x){return '<article class="card">'+ph(x.foto,x.titulo,"📅")+'<div class="b">'+(x.destacado?'<span class="tag">Destacado</span> ':'')+'<h3>'+e(x.titulo)+'</h3><p>'+e(fmt(x.fecha))+(x.hora?' · '+e(x.hora):'')+'</p>'+(x.lugar?'<p>📍 '+e(x.lugar)+'</p>':'')+(x.desc?'<p>'+e(x.desc)+'</p>':'')+'</div></article>'}
var ev=(D.eventos||[]).filter(function(x){return x.estado==="publicado"});
var up=ev.filter(function(x){return x.fecha>=today}).sort(function(a,b){return a.fecha<b.fecha?-1:1});
var pa=ev.filter(function(x){return x.fecha<today}).sort(function(a,b){return a.fecha<b.fecha?1:-1});
set("evu",up.map(evc).join("")||soon());set("evp",pa.map(evc).join(""));
if($("evb")){if(!pa.length)$("evb").hidden=true;$("evb").onclick=function(){var h=$("evp").hidden=!$("evp").hidden;$("evb").textContent=h?"Ver actividades anteriores":"Ocultar actividades anteriores";$("evb").setAttribute("aria-expanded",!h)}}

/* Videos y bosquejos */
set("vg",(D.videos||[]).map(function(v){var id=ytid(v.youtube);return '<article class="card">'+(id?'<button class="vt" data-y="'+e(id)+'" aria-label="Reproducir: '+e(v.titulo)+'"><img src="https://i.ytimg.com/vi/'+e(id)+'/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span aria-hidden="true">▶</span></button>':ph("",v.titulo,"▶️"))+'<div class="b">'+(v.cat?'<span class="tag">'+e(v.cat)+'</span>':'')+'<h3>'+e(v.titulo)+'</h3><p>'+e(v.predicador||"")+(v.fecha?' · '+e(fmt(v.fecha)):'')+'</p>'+(v.desc?'<p>'+e(v.desc)+'</p>':'')+'</div></article>'}).join("")||soon());
if($("vg"))$("vg").addEventListener("click",function(ev){var b=ev.target.closest(".vt");if(!b)return;b.outerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+b.dataset.y+'?autoplay=1" title="Video de YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>'});
function sec(h,x){return x?'<h4>'+h+'</h4><p>'+e(x).replace(/\n/g,"<br>")+'</p>':''}
set("bg",(D.bosquejos||[]).map(function(b){return '<details class="card"><summary><strong>'+e(b.titulo)+'</strong><br><small>'+e(b.autor||"")+(b.fecha?' · '+e(fmt(b.fecha)):'')+(b.pasaje?' · '+e(b.pasaje):'')+'</small></summary><div class="b">'+sec("Introducción",b.intro)+sec("Desarrollo",b.desarrollo)+sec("Conclusión",b.conclusion)+sec("Referencias",b.referencias)+(b.pdf?'<a class="btn d" href="'+u(b.pdf)+'" download>Descargar PDF</a>':'')+'</div></details>'}).join("")||soon());
if($("q"))$("q").addEventListener("input",function(){var q=this.value.toLowerCase();document.querySelectorAll("#vg .card,#bg .card").forEach(function(c){c.hidden=q&&c.textContent.toLowerCase().indexOf(q)<0})});

/* Instituto */
var I=D.instituto||{},ih="";
if(I.info)ih+='<div class="card"><div class="b"><h3>Sobre el instituto</h3><p>'+e(I.info)+'</p></div></div>';
if((I.oferta||[]).length)ih+='<div class="card"><div class="b"><h3>Oferta formativa</h3><ul>'+I.oferta.map(function(o){return '<li>'+e(o)+'</li>'}).join("")+'</ul></div></div>';
if((I.noticias||[]).length)ih+='<div class="card"><div class="b"><h3>Noticias y fechas</h3><ul>'+I.noticias.map(function(o){return '<li>'+e(o)+'</li>'}).join("")+'</ul></div></div>';
ih+='<div class="card"><div class="b"><h3>Campus virtual</h3><p>Servicio independiente: aquí no se guardan credenciales académicas.</p>'+(I.campus?'<a class="btn d" href="'+u(I.campus)+'" target="_blank" rel="noopener">Ir al campus virtual</a>':'<p><em>Enlace próximamente.</em></p>')+'</div></div>';
set("inst",ih);

/* Donaciones */
var Dn=D.donaciones||{};
set("don",(Dn.info?'<p>'+e(Dn.info)+'</p>':'')+'<div class="grid">'+(Dn.medios||[]).map(function(m){return '<div class="card"><div class="b"><h3>'+e(m.n)+'</h3><p>'+e(m.d)+'</p></div></div>'}).join("")+'</div>'+((Dn.info||(Dn.medios||[]).length)?'':soon()));

/* Contacto */
var ch="";
function cc(h,x){if(x)ch+='<div class="card"><div class="b"><h3>'+h+'</h3><p>'+x+'</p></div></div>'}
cc("📍 Dirección",e(C.direccion));cc("📞 Teléfono",C.telefono?'<a href="tel:'+e(C.telefono.replace(/[^\d+]/g,""))+'">'+e(C.telefono)+'</a>':"");
cc("💬 WhatsApp",C.whatsapp?'<a href="https://wa.me/'+e(C.whatsapp.replace(/\D/g,""))+'" target="_blank" rel="noopener">Escribir por WhatsApp</a>':"");
cc("✉️ Correo",C.email?'<a href="mailto:'+e(C.email)+'">'+e(C.email)+'</a>':"");cc("🕒 Horarios",e(C.horarios).replace(/\n/g,"<br>"));
cc("🔗 Redes",(C.redes||[]).map(function(r){return '<a href="'+u(r.u)+'" target="_blank" rel="noopener">'+e(r.n)+'</a>'}).join(" · "));
set("cg",ch||soon());
if($("mapa")&&C.mapa)$("mapa").innerHTML='<iframe src="'+u(C.mapa)+'" title="Mapa de ubicación" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';

/* Datos para privacidad y pie */
document.querySelectorAll("[data-f]").forEach(function(n){var k=n.dataset.f,P=D.privacidad||{},v={responsable:P.responsable,email:P.email||C.email,telefono:C.telefono,direccion:C.direccion,fecha:P.actualizacion}[k];n.textContent=v||"[por definir por la iglesia]"});
if($("yr"))$("yr").textContent=t.getFullYear();
if(C.direccion||C.telefono){var s=document.createElement("script");s.type="application/ld+json";s.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Church","name":"ICC Adonay - Iglesia Cruzada Cristiana Adonay","address":C.direccion||undefined,"telephone":C.telefono||undefined,"email":C.email||undefined});document.head.appendChild(s)}

/* Menú y pestañas */
var mb=$("mb"),nv=$("nav");
if(mb){mb.onclick=function(){var o=nv.classList.toggle("open");mb.setAttribute("aria-expanded",o)};nv.addEventListener("click",function(x){if(x.target.tagName=="A"){nv.classList.remove("open");mb.setAttribute("aria-expanded","false")}})}
var tb=[].slice.call(document.querySelectorAll("[role=tab]"));
function sel(b){tb.forEach(function(x){var on=x===b;x.setAttribute("aria-selected",on);x.tabIndex=on?0:-1;$(x.getAttribute("aria-controls")).hidden=!on});b.focus()}
tb.forEach(function(b,i){b.onclick=function(){sel(b)};b.onkeydown=function(k){if(k.key=="ArrowRight")sel(tb[(i+1)%tb.length]);if(k.key=="ArrowLeft")sel(tb[(i+tb.length-1)%tb.length])}});

/* Formulario de orientación */
var f=$("f"),sent=0,last=0;
if(f)f.onsubmit=function(x){x.preventDefault();var s=$("msg"),n=$("n").value.trim(),c=$("c").value.trim(),m=$("m").value;
function er(t){s.className="err";s.textContent=t}
if($("web").value)return;
if(!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)||c.replace(/\D/g,"").length>=7))return er("Escribe un correo o un teléfono válido.");
if(!m)return er("Selecciona el motivo general.");
if(!$("a").checked)return er("Debes aceptar el tratamiento de datos para continuar.");
if(Date.now()-last<15000||sent>=3)return er("Espera un momento antes de enviar otra solicitud.");
var txt="Solicitud ICC Adonay\nMotivo: "+m+"\nContacto: "+c+(n?"\nNombre: "+n:"");
function ok(t){last=Date.now();sent++;s.className="";s.textContent=t;f.reset()}
var ep=(D.formulario||{}).endpoint;
if(ep){fetch(ep,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({nombre:n,contacto:c,motivo:m})}).then(function(r){r.ok?ok("Gracias. Recibimos tu solicitud y te contactaremos."):er("No se pudo enviar. Inténtalo más tarde o usa los canales de contacto.")}).catch(function(){er("No se pudo enviar. Revisa tu conexión.")})}
else if(C.whatsapp){window.open("https://wa.me/"+C.whatsapp.replace(/\D/g,"")+"?text="+encodeURIComponent(txt),"_blank","noopener");ok("Se abrió WhatsApp con tu solicitud lista para enviar.")}
else if(C.email){location.href="mailto:"+C.email+"?subject="+encodeURIComponent("Solicitud de orientación")+"&body="+encodeURIComponent(txt);ok("Se abrió tu correo con la solicitud lista para enviar.")}
else er("El canal de recepción aún no está configurado. Escríbenos por los canales de Contacto.")};

/* Asistente */
var cb=$("chatb"),cw=$("chat"),cl=$("cl");
function norm(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function say(t,c){var p=document.createElement("p");if(c)p.className=c;p.textContent=t;cl.appendChild(p);cl.scrollTop=cl.scrollHeight}
var more="Si necesitas hablar con una persona, usa Atención y orientación o los canales de Contacto.";
var K=[[/emergenc|suicid|morir|matarme|hacerme dano|peligro|crisis|abuso/,"Si tú o alguien está en peligro, llama ya a la línea de emergencias 123 y busca a una persona de confianza. Yo no reemplazo a un pastor ni a servicios de emergencia."],
[/horario|culto|reunion|cuando/,function(){return C.horarios||"Los horarios aún no están publicados."}],
[/donde|direccion|ubicacion|lugar|mapa/,function(){return C.direccion||"La dirección aún no está publicada."}],
[/ministerio|joven|alabanza|danza|pareja|evangel|diacon/,function(){return "Ministerios: "+Mi.map(function(m){return m.nombre}).join(", ")+"."}],
[/evento|actividad|anuncio|proxim/,function(){return up.length?"Próximos: "+up.slice(0,3).map(function(x){return x.titulo+" ("+x.fecha+")"}).join("; ")+".":"No hay eventos próximos publicados."}],
[/instituto|campus|curso|estudiar/,function(){return I.campus?"Accede al campus virtual desde la sección Instituto.":"Consulta la sección Instituto."}],
[/predica|bosquejo|video|ensenanza/,"Encuentra videos y bosquejos en la sección Predicaciones."],
[/donar|donacion|ofrenda|diezmo/,"La sección Donaciones explica los medios oficiales."],
[/contacto|telefono|correo|whatsapp|llamar/,function(){return [C.telefono,C.email].filter(Boolean).join(" · ")||"Consulta la sección Contacto."}],
[/orientacion|oracion|consejeria|pastor|persona|ayuda/,"Puedes enviar una solicitud privada en Atención y orientación. "+more]];
function ask(q){say(q,"u");var n=norm(q),r=null;for(var i=0;i<K.length;i++)if(K[i][0].test(n)){r=K[i][1];break}
r=r?(typeof r=="function"?r():r):"No tengo esa información. "+more;say(r)}
if(cb){cb.onclick=function(){var o=cw.classList.toggle("open");cb.setAttribute("aria-expanded",o)};
cw.querySelector(".q").addEventListener("click",function(x){var k=x.target.getAttribute("data-k");if(k)ask(k)});
$("cf").onsubmit=function(x){x.preventDefault();var v=$("ci").value.trim();if(v){ask(v);$("ci").value=""}}}
})();
