(function(){
var app=document.getElementById("app"),nav=document.getElementById("nav"),ME=null;
function h(t,a){var n=document.createElement(t);a=a||{};for(var k in a){if(k=="on")for(var ev in a.on)n.addEventListener(ev,a.on[ev]);else if(k=="text")n.textContent=a[k];else n.setAttribute(k,a[k])}
for(var i=2;i<arguments.length;i++){var c=arguments[i];if(c!=null)n.appendChild(typeof c=="string"?document.createTextNode(c):c)}return n}
function api(m,p,b){return fetch("/api"+p,{method:m,headers:{"Content-Type":"application/json","X-Requested-With":"fetch"},body:b?JSON.stringify(b):undefined}).then(function(r){
if(r.status==401&&p!="/login"){ME=null;login();throw new Error("auth")}
return r.json().catch(function(){return{}}).then(function(j){if(!r.ok)throw new Error(typeof j.detail=="string"?j.detail:"No se pudo completar la acción");return j})})}
var S={
ministerio:{t:"Ministerios",f:[["nombre","Nombre"],["emoji","Emoji"],["desc","Descripción","area"],["foto","Ruta o enlace de la foto"],["lider","Responsable (opcional)"]]},
iglesia:{t:"Iglesias hijas",f:[["nombre","Nombre"],["ubicacion","Ubicación general"],["foto","Foto"],["contacto","Contacto autorizado"],["lider","Responsable"]]},
evento:{t:"Eventos",f:[["titulo","Título"],["fecha","Fecha","date"],["hora","Hora","time"],["lugar","Lugar"],["desc","Descripción","area"],["foto","Foto"],["destacado","Destacado","check"]]},
video:{t:"Videos",f:[["titulo","Título"],["predicador","Predicador"],["fecha","Fecha","date"],["youtube","Enlace o ID de YouTube"],["desc","Descripción","area"],["cat","Categoría"]]},
bosquejo:{t:"Bosquejos",f:[["titulo","Título"],["autor","Autor"],["fecha","Fecha","date"],["pasaje","Pasaje principal"],["intro","Introducción","area"],["desarrollo","Desarrollo","area"],["conclusion","Conclusión","area"],["referencias","Referencias","area"],["pdf","Ruta o enlace del PDF"]]}};
var CFG=[["portada","Foto de portada (ruta)"],["nosotros.historia","Historia","area"],["nosotros.mision","Misión","area"],["nosotros.vision","Visión","area"],["nosotros.valores","Valores","area"],
["contacto.direccion","Dirección"],["contacto.telefono","Teléfono"],["contacto.whatsapp","WhatsApp (solo números con indicativo)"],["contacto.email","Correo"],["contacto.horarios","Horarios","area"],["contacto.mapa","Enlace del mapa (embed de Google Maps)"],["contacto.redes","Redes: una por línea, Nombre|Enlace","pairs:n:u"],
["instituto.info","Instituto: información","area"],["instituto.oferta","Oferta formativa (una por línea)","lines"],["instituto.noticias","Noticias (una por línea)","lines"],["instituto.campus","Enlace al campus virtual"],
["donaciones.info","Donaciones: información","area"],["donaciones.medios","Medios: Nombre|Detalle por línea","pairs:n:d"],
["privacidad.responsable","Responsable de datos"],["privacidad.email","Correo de privacidad"],["privacidad.actualizacion","Fecha de actualización"]];
function get(o,p){return p.split(".").reduce(function(a,k){return a&&a[k]},o)}
function put(o,p,v){var k=p.split(".");for(var i=0;i<k.length-1;i++)o=o[k[i]]=o[k[i]]||{};o[k[k.length-1]]=v}
function field(f,val){var k=f[0],t=f[2]||"text",w=h("div"),id="f_"+k.replace(/\W/g,"_"),inp;
if(t=="area"||t=="lines"||t.indexOf("pairs")==0){inp=h("textarea",{id:id});
if(t=="lines")inp.value=(val||[]).join("\n");else if(t.indexOf("pairs")==0){var p=t.split(":");inp.value=(val||[]).map(function(x){return x[p[1]]+"|"+(x[p[2]]||"")}).join("\n")}else inp.value=val||""}
else if(t=="check"){inp=h("input",{id:id,type:"checkbox"});inp.checked=!!val}
else{inp=h("input",{id:id,type:t});inp.value=val||""}
w.appendChild(h("label",{for:id,text:f[1]}));w.appendChild(inp);
w.read=function(){if(t=="check")return inp.checked;if(t=="lines")return inp.value.split("\n").map(function(x){return x.trim()}).filter(Boolean);
if(t.indexOf("pairs")==0){var p=t.split(":");return inp.value.split("\n").map(function(x){return x.trim()}).filter(Boolean).map(function(x){var a=x.split("|"),o={};o[p[1]]=(a[0]||"").trim();o[p[2]]=(a.slice(1).join("|")||"").trim();return o})}return inp.value.trim()};return w}
function msg(n,t,ok){n.className=ok?"ok":"err";n.textContent=t}
function login(){nav.hidden=true;document.getElementById("who").textContent="";app.innerHTML="";
var m=h("p"),e=h("input",{type:"email",autocomplete:"username"}),p=h("input",{type:"password",autocomplete:"current-password"});
var f=h("form",{class:"card",on:{submit:function(x){x.preventDefault();api("POST","/login",{email:e.value,password:p.value}).then(start).catch(function(er){msg(m,er.message)})}}},h("h2",{text:"Iniciar sesión"}),h("label",{text:"Correo"}),e,h("label",{text:"Contraseña"}),p,h("p"),h("button",{class:"b",text:"Entrar"}),m);app.appendChild(f)}
function start(){api("GET","/me").then(function(u){ME=u;document.getElementById("who").textContent=u.name+" ("+u.role+") ";
var o=document.getElementById("who");o.appendChild(h("button",{class:"b s",text:"Salir",on:{click:function(){api("POST","/logout").then(login).catch(login)}}}));
var tabs=Object.keys(S).map(function(k){return[k,S[k].t,function(){lista(k)}]});
if(u.role!="editor")tabs.push(["sitio","Sitio",sitio]);if(u.ver_solicitudes)tabs.push(["sol","Solicitudes",sols]);if(u.role=="admin"){tabs.push(["usr","Usuarios",usuarios]);tabs.push(["log","Registro",registro])}
nav.innerHTML="";nav.hidden=false;tabs.forEach(function(t){nav.appendChild(h("button",{text:t[1],id:"tab_"+t[0],on:{click:function(){nav.querySelectorAll("button").forEach(function(b){b.className=""});this.className="on";t[2]()}}}))});
nav.firstChild.click()}).catch(function(){})}
function lista(tipo){app.innerHTML="";var top=h("div",{class:"row"},h("h2",{text:S[tipo].t}),h("button",{class:"b",text:"+ Nuevo",on:{click:function(){form(tipo,null)}}}));app.appendChild(top);
api("GET","/items/"+tipo).then(function(r){if(!r.length)app.appendChild(h("p",{text:"Aún no hay registros."}));r.forEach(function(i){var d=i.data,n=d.nombre||d.titulo||"(sin título)";
var c=h("div",{class:"card row"},h("div",{},h("strong",{text:n})," ",h("span",{class:"tag",text:i.estado}),h("br"),h("small",{text:(d.fecha||"")+" "+(i.updated_by?"· "+i.updated_by:"")})),
h("div",{},h("button",{class:"b s",text:"Editar",on:{click:function(){form(tipo,i)}}})," ",ME.role!="editor"?h("button",{class:"b r",text:"Borrar",on:{click:function(){if(confirm("¿Borrar «"+n+"»?"))api("DELETE","/items/"+i.id).then(function(){lista(tipo)}).catch(function(er){alert(er.message)})}}}):null));app.appendChild(c)})}).catch(function(){})}
function form(tipo,it){app.innerHTML="";var d=it?it.data:{},fs=S[tipo].f.map(function(f){return field(f,d[f[0]])}),m=h("p");
var es=h("select");(ME.role=="editor"?["borrador","revision"]:["borrador","revision","publicado","archivado"]).forEach(function(s){var o=h("option",{value:s,text:s});es.appendChild(o)});es.value=it?it.estado:"borrador";
var or=h("input",{type:"number"});or.value=it?it.orden:0;
var f=h("form",{class:"card",on:{submit:function(x){x.preventDefault();var o={};S[tipo].f.forEach(function(ff,i){o[ff[0]]=fs[i].read()});
var b={estado:es.value,orden:parseInt(or.value)||0,data:o};(it?api("PUT","/items/"+it.id,b):api("POST","/items/"+tipo,b)).then(function(){lista(tipo)}).catch(function(er){msg(m,er.message)})}}},h("h2",{text:it?"Editar":"Nuevo"}));
fs.forEach(function(x){f.appendChild(x)});f.appendChild(h("label",{text:"Estado"}));f.appendChild(es);f.appendChild(h("label",{text:"Orden (número menor aparece primero)"}));f.appendChild(or);
f.appendChild(h("p"));f.appendChild(h("button",{class:"b",text:"Guardar"}));f.appendChild(document.createTextNode(" "));f.appendChild(h("button",{class:"b s",type:"button",text:"Cancelar",on:{click:function(){lista(tipo)}}}));f.appendChild(m);app.appendChild(f)}
function sitio(){app.innerHTML="";api("GET","/config").then(function(c){var fs=CFG.map(function(f){return field(f,get(c,f[0]))}),m=h("p");
var f=h("form",{class:"card",on:{submit:function(x){x.preventDefault();var o={};CFG.forEach(function(ff,i){put(o,ff[0],fs[i].read())});api("PUT","/config",o).then(function(){msg(m,"Guardado. Se verá en el sitio en un minuto.",1)}).catch(function(er){msg(m,er.message)})}}},h("h2",{text:"Información del sitio"}));
fs.forEach(function(x){f.appendChild(x)});f.appendChild(h("p"));f.appendChild(h("button",{class:"b",text:"Guardar"}));f.appendChild(m);app.appendChild(f)}).catch(function(){})}
function sols(){app.innerHTML="";app.appendChild(h("h2",{text:"Solicitudes privadas"}));api("GET","/solicitudes").then(function(r){if(!r.length)app.appendChild(h("p",{text:"No hay solicitudes."}));
r.forEach(function(s){app.appendChild(h("div",{class:"card row"},h("div",{},h("strong",{text:s.motivo})," ",h("span",{class:"tag",text:s.atendida?"atendida":"pendiente"}),h("br"),h("span",{text:(s.nombre||"Sin nombre")+" · "+s.contacto}),h("br"),h("small",{text:new Date(s.created).toLocaleString()})),
h("div",{},s.atendida?null:h("button",{class:"b s",text:"Marcar atendida",on:{click:function(){api("POST","/solicitudes/"+s.id+"/atendida").then(sols)}}})," ",h("button",{class:"b r",text:"Eliminar",on:{click:function(){if(confirm("¿Eliminar esta solicitud?"))api("POST","/solicitudes/"+s.id+"/eliminar").then(sols)}}}))))})}).catch(function(){})}
function usuarios(){app.innerHTML="";app.appendChild(h("h2",{text:"Usuarios"}));var m=h("p");
var em=h("input",{type:"email"}),nm=h("input"),pw=h("input",{type:"password",placeholder:"Mínimo 12 caracteres"}),ro=h("select");["secretaria","editor","admin"].forEach(function(r){ro.appendChild(h("option",{value:r,text:r}))});var vs=h("input",{type:"checkbox"});
app.appendChild(h("form",{class:"card",on:{submit:function(x){x.preventDefault();api("POST","/users",{email:em.value,name:nm.value,role:ro.value,password:pw.value,ver_solicitudes:vs.checked}).then(usuarios).catch(function(er){msg(m,er.message)})}}},h("h3",{text:"Nuevo usuario"}),h("label",{text:"Correo"}),em,h("label",{text:"Nombre"}),nm,h("label",{text:"Contraseña"}),pw,h("label",{text:"Rol"}),ro,h("label",{},vs," Puede ver solicitudes privadas"),h("p"),h("button",{class:"b",text:"Crear"}),m));
api("GET","/users").then(function(r){r.forEach(function(u){var ro2=h("select");["admin","secretaria","editor"].forEach(function(x){ro2.appendChild(h("option",{value:x,text:x}))});ro2.value=u.role;var v2=h("input",{type:"checkbox"});v2.checked=u.ver_solicitudes;var a2=h("input",{type:"checkbox"});a2.checked=u.active;var p2=h("input",{type:"password",placeholder:"Nueva contraseña (opcional)"});
app.appendChild(h("div",{class:"card"},h("strong",{text:u.name+" · "+u.email}),h("br"),ro2,h("label",{},v2," Ve solicitudes"),h("label",{},a2," Activo"),p2,h("p"),h("button",{class:"b s",text:"Guardar",on:{click:function(){api("PUT","/users/"+u.id,{email:u.email,name:u.name,role:ro2.value,ver_solicitudes:v2.checked,active:a2.checked,password:p2.value}).then(function(){alert("Guardado")}).catch(function(er){alert(er.message)})}}})))})}).catch(function(){})}
function registro(){app.innerHTML="";app.appendChild(h("h2",{text:"Registro de actividad"}));api("GET","/log").then(function(r){r.forEach(function(l){app.appendChild(h("div",{class:"card"},h("small",{text:new Date(l.ts).toLocaleString()+" · "+l.user}),h("br"),h("span",{text:l.accion+" "+(l.detalle||"")})))})}).catch(function(){})}
api("GET","/me").then(start).catch(login);
})();
