/* Carga el contenido desde la API (si está configurada) y luego inicia el sitio. Si la API falla, usa js/data.js. */
(function(){
var A=(window.ICC_API||"").replace(/\/$/,"");
function go(){var s=document.createElement("script");s.src="js/main.js";document.body.appendChild(s)}
if(!A){go();return}
fetch(A+"/api/public",{cache:"no-store"}).then(function(r){return r.ok?r.json():Promise.reject()}).then(function(d){
var D=window.ICC;for(var k in d){if(d[k]&&typeof d[k]=="object"&&!Array.isArray(d[k]))D[k]=Object.assign({},D[k],d[k]);else if(d[k]!=null&&d[k]!=="")D[k]=d[k]}
if(!d.ministerios)delete d.ministerios;D.formulario={endpoint:A+"/api/solicitudes"}}).catch(function(){}).then(go)})();
