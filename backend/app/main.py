"""API de ICC Adonay: contenido, autenticación con roles, solicitudes privadas y auditoría."""
import json, os, secrets, time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from itsdangerous import BadSignature, URLSafeTimedSerializer
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DB = os.getenv("DATABASE_URL", "sqlite:///./icc.db")
if DB.startswith("postgres://"):
    DB = DB.replace("postgres://", "postgresql://", 1)
SECRET = os.getenv("SECRET_KEY") or secrets.token_hex(32)
ORIGINS = [o.strip() for o in os.getenv("SITE_ORIGINS", "http://localhost:8080").split(",") if o.strip()]
SECURE = os.getenv("COOKIE_SECURE", "1") == "1"
SESSION_SECONDS = 8 * 3600
TIPOS = {"ministerio", "iglesia", "evento", "video", "bosquejo"}
ESTADOS = {"borrador", "revision", "publicado", "archivado"}
ROLES = {"admin", "secretaria", "editor"}

engine = create_engine(DB, pool_pre_ping=True, connect_args={"check_same_thread": False} if DB.startswith("sqlite") else {})
Session_ = sessionmaker(bind=engine)
Base = declarative_base()
ph = PasswordHasher()  # Argon2id por defecto
ser = URLSafeTimedSerializer(SECRET, salt="icc-session")


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(160), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    pw = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    ver_solicitudes = Column(Boolean, default=False)
    active = Column(Boolean, default=True)


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    tipo = Column(String(20), index=True, nullable=False)
    estado = Column(String(20), default="borrador", nullable=False)
    orden = Column(Integer, default=0)
    data = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now, onupdate=now)
    updated_by = Column(String(160))


class Config(Base):
    __tablename__ = "config"
    key = Column(String(40), primary_key=True)
    value = Column(Text, nullable=False)


class Solicitud(Base):
    __tablename__ = "solicitudes"
    id = Column(Integer, primary_key=True)
    created = Column(DateTime(timezone=True), default=now)
    nombre = Column(String(80))
    contacto = Column(String(120), nullable=False)
    motivo = Column(String(60), nullable=False)
    atendida = Column(Boolean, default=False)


class Log(Base):
    __tablename__ = "log"
    id = Column(Integer, primary_key=True)
    ts = Column(DateTime(timezone=True), default=now)
    user = Column(String(160))
    accion = Column(String(60))
    detalle = Column(String(200))


MINISTERIOS = [("Evangelismo", "🕊️"), ("Diáconos", "🤝"), ("MIA", "🌿"), ("Alabanza", "🎶"), ("Danza", "💃"),
               ("Consolidación", "🧱"), ("Audiovisuales", "🎥"), ("Jóvenes", "🔥"), ("Parejas", "💞"),
               ("Altar de Avivamiento", "🙏"), ("Labor Social", "❤️")]


def init():
    Base.metadata.create_all(engine)
    with Session_() as s:
        if not s.query(User).first() and os.getenv("ADMIN_EMAIL") and os.getenv("ADMIN_PASSWORD"):
            s.add(User(email=os.environ["ADMIN_EMAIL"].lower(), name="Administrador", role="admin",
                       pw=ph.hash(os.environ["ADMIN_PASSWORD"]), ver_solicitudes=True))
        if not s.query(Item).filter_by(tipo="ministerio").first():
            for i, (n, e) in enumerate(MINISTERIOS):
                s.add(Item(tipo="ministerio", estado="publicado", orden=i,
                           data=json.dumps({"nombre": n, "emoji": e, "desc": "", "foto": "", "lider": ""}, ensure_ascii=False)))
        s.commit()


app = FastAPI(title="ICC Adonay API", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
    ],
)

@app.on_event("startup")
def _start():
    init()


@app.middleware("http")
async def headers(request: Request, call_next):
    r = await call_next(request)
    r.headers["X-Content-Type-Options"] = "nosniff"
    r.headers["Referrer-Policy"] = "same-origin"
    r.headers["X-Frame-Options"] = "DENY"
    if request.url.path.startswith("/admin"):
        r.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'"
        r.headers["Cache-Control"] = "no-store"
    return r


def db():
    s = Session_()
    try:
        yield s
    finally:
        s.close()


# ---------- limitación de frecuencia (en memoria) ----------
HITS = defaultdict(list)


def limit(key, n, secs):
    t = time.time()
    HITS[key] = [x for x in HITS[key] if t - x < secs]
    if len(HITS[key]) >= n:
        raise HTTPException(429, "Demasiados intentos. Espera un momento.")
    HITS[key].append(t)


def ip(r: Request):
    return (r.headers.get("x-forwarded-for") or (r.client.host if r.client else "?")).split(",")[0].strip()


def log(s: Session, user, accion, detalle=""):
    s.add(Log(user=user, accion=accion, detalle=detalle[:200]))
    s.commit()


# ---------- autenticación y permisos ----------
def current(request: Request, s: Session = Depends(db)) -> User:
    if request.method not in ("GET", "HEAD") and request.headers.get("x-requested-with") != "fetch":
        raise HTTPException(403, "Solicitud no permitida")
    try:
        uid = ser.loads(request.cookies.get("sess", ""), max_age=SESSION_SECONDS)
    except BadSignature:
        raise HTTPException(401, "Sesión no válida")
    u = s.get(User, uid)
    if not u or not u.active:
        raise HTTPException(401, "Sesión no válida")
    return u


def need(*roles):
    def dep(u: User = Depends(current)):
        if u.role not in roles:
            raise HTTPException(403, "No tienes permiso para esta acción")
        return u
    return dep


class LoginIn(BaseModel):
    email: str = Field(max_length=160)
    password: str = Field(max_length=200)


@app.post("/api/login")
def login(b: LoginIn, request: Request, response: Response, s: Session = Depends(db)):
    email = b.email.strip().lower()
    limit("login:" + ip(request), 10, 900)
    limit("loginmail:" + email, 5, 900)
    u = s.query(User).filter_by(email=email).first()
    ok = False
    if u and u.active:
        try:
            ok = ph.verify(u.pw, b.password)
        except VerifyMismatchError:
            ok = False
    else:
        try:
            ph.verify(ph.hash("x"), "y")  # tiempo similar si la cuenta no existe
        except VerifyMismatchError:
            pass
    if not ok:
        log(s, email, "login_fallido")
        raise HTTPException(401, "Correo o contraseña incorrectos")
    response.set_cookie("sess", ser.dumps(u.id), max_age=SESSION_SECONDS, httponly=True, secure=SECURE, samesite="strict", path="/")
    log(s, u.email, "login")
    return {"ok": True}


@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie("sess", path="/")
    return {"ok": True}


@app.get("/api/me")
def me(u: User = Depends(current)):
    return {"email": u.email, "name": u.name, "role": u.role, "ver_solicitudes": bool(u.ver_solicitudes or u.role == "admin")}


# ---------- contenido público ----------
def out(i: Item):
    d = json.loads(i.data)
    d["estado"] = i.estado
    return d


@app.get("/api/public")
def public(s: Session = Depends(db)):
    r = {}
    for t, k in [("ministerio", "ministerios"), ("iglesia", "iglesias"), ("evento", "eventos"), ("video", "videos"), ("bosquejo", "bosquejos")]:
        r[k] = [out(i) for i in s.query(Item).filter_by(tipo=t, estado="publicado").order_by(Item.orden, Item.id)]
    c = s.get(Config, "site")
    if c:
        r.update(json.loads(c.value))
    return Response(json.dumps(r, ensure_ascii=False), media_type="application/json", headers={"Cache-Control": "public, max-age=60"})


class SolIn(BaseModel):
    nombre: Optional[str] = Field(default="", max_length=80)
    contacto: str = Field(min_length=5, max_length=120)
    motivo: str = Field(min_length=2, max_length=60)


@app.post("/api/solicitudes")
def crear_solicitud(b: SolIn, request: Request, s: Session = Depends(db)):
    limit("sol:" + ip(request), 5, 3600)
    s.add(Solicitud(nombre=b.nombre.strip(), contacto=b.contacto.strip(), motivo=b.motivo.strip()))
    s.commit()
    return {"ok": True}


# ---------- gestión de contenido ----------
class ItemIn(BaseModel):
    estado: str = "borrador"
    orden: int = 0
    data: dict


def check(b: ItemIn, u: User):
    if b.estado not in ESTADOS:
        raise HTTPException(422, "Estado no válido")
    if len(json.dumps(b.data)) > 30000:
        raise HTTPException(422, "Contenido demasiado largo")
    if u.role == "editor" and b.estado in ("publicado", "archivado"):
        raise HTTPException(403, "Un editor solo puede guardar borradores o enviar a revisión")


@app.get("/api/items/{tipo}")
def listar(tipo: str, u: User = Depends(current), s: Session = Depends(db)):
    if tipo not in TIPOS:
        raise HTTPException(404)
    return [{"id": i.id, "estado": i.estado, "orden": i.orden, "data": json.loads(i.data), "updated_at": i.updated_at.isoformat() if i.updated_at else "", "updated_by": i.updated_by}
            for i in s.query(Item).filter_by(tipo=tipo).order_by(Item.orden, Item.id)]


@app.post("/api/items/{tipo}")
def crear(tipo: str, b: ItemIn, u: User = Depends(current), s: Session = Depends(db)):
    if tipo not in TIPOS:
        raise HTTPException(404)
    check(b, u)
    i = Item(tipo=tipo, estado=b.estado, orden=b.orden, data=json.dumps(b.data, ensure_ascii=False), updated_by=u.email)
    s.add(i); s.commit()
    log(s, u.email, "crear_" + tipo, str(i.id))
    return {"id": i.id}


@app.put("/api/items/{iid}")
def editar(iid: int, b: ItemIn, u: User = Depends(current), s: Session = Depends(db)):
    i = s.get(Item, iid)
    if not i:
        raise HTTPException(404)
    if u.role == "editor" and i.estado in ("publicado", "archivado"):
        raise HTTPException(403, "Un editor no puede modificar contenido ya publicado")
    check(b, u)
    i.estado, i.orden, i.data, i.updated_by = b.estado, b.orden, json.dumps(b.data, ensure_ascii=False), u.email
    s.commit()
    log(s, u.email, "editar_" + i.tipo, f"{iid} -> {b.estado}")
    return {"ok": True}


@app.delete("/api/items/{iid}")
def borrar(iid: int, u: User = Depends(need("admin", "secretaria")), s: Session = Depends(db)):
    i = s.get(Item, iid)
    if not i:
        raise HTTPException(404)
    s.delete(i); s.commit()
    log(s, u.email, "borrar_" + i.tipo, str(iid))
    return {"ok": True}


@app.get("/api/config")
def get_config(u: User = Depends(need("admin", "secretaria")), s: Session = Depends(db)):
    c = s.get(Config, "site")
    return json.loads(c.value) if c else {}


@app.put("/api/config")
def put_config(b: dict, u: User = Depends(need("admin", "secretaria")), s: Session = Depends(db)):
    v = json.dumps(b, ensure_ascii=False)
    if len(v) > 60000:
        raise HTTPException(422, "Contenido demasiado largo")
    c = s.get(Config, "site")
    if c:
        c.value = v
    else:
        s.add(Config(key="site", value=v))
    s.commit()
    log(s, u.email, "editar_config")
    return {"ok": True}


# ---------- solicitudes privadas ----------
def can_sol(u: User = Depends(current)):
    if not (u.role == "admin" or u.ver_solicitudes):
        raise HTTPException(403, "No tienes permiso para ver solicitudes")
    return u


@app.get("/api/solicitudes")
def sols(u: User = Depends(can_sol), s: Session = Depends(db)):
    log(s, u.email, "ver_solicitudes")
    return [{"id": x.id, "created": x.created.isoformat(), "nombre": x.nombre, "contacto": x.contacto, "motivo": x.motivo, "atendida": x.atendida}
            for x in s.query(Solicitud).order_by(Solicitud.id.desc()).limit(300)]


@app.post("/api/solicitudes/{sid}/atendida")
def atender(sid: int, u: User = Depends(can_sol), s: Session = Depends(db)):
    x = s.get(Solicitud, sid)
    if not x:
        raise HTTPException(404)
    x.atendida = True; s.commit()
    return {"ok": True}


@app.post("/api/solicitudes/{sid}/eliminar")
def eliminar_sol(sid: int, u: User = Depends(can_sol), s: Session = Depends(db)):
    x = s.get(Solicitud, sid)
    if x:
        s.delete(x); s.commit()
        log(s, u.email, "eliminar_solicitud", str(sid))
    return {"ok": True}


# ---------- usuarios (solo administrador) ----------
class UserIn(BaseModel):
    email: str = Field(max_length=160)
    name: str = Field(max_length=80)
    role: str
    password: str = Field(default="", max_length=200)
    ver_solicitudes: bool = False
    active: bool = True


def pwcheck(p):
    if len(p) < 12:
        raise HTTPException(422, "La contraseña debe tener al menos 12 caracteres")


@app.get("/api/users")
def users(u: User = Depends(need("admin")), s: Session = Depends(db)):
    return [{"id": x.id, "email": x.email, "name": x.name, "role": x.role, "ver_solicitudes": x.ver_solicitudes, "active": x.active} for x in s.query(User)]


@app.post("/api/users")
def new_user(b: UserIn, u: User = Depends(need("admin")), s: Session = Depends(db)):
    if b.role not in ROLES:
        raise HTTPException(422, "Rol no válido")
    pwcheck(b.password)
    if s.query(User).filter_by(email=b.email.lower()).first():
        raise HTTPException(422, "Ese correo ya existe")
    s.add(User(email=b.email.lower(), name=b.name, role=b.role, pw=ph.hash(b.password), ver_solicitudes=b.ver_solicitudes))
    s.commit()
    log(s, u.email, "crear_usuario", b.email)
    return {"ok": True}


@app.put("/api/users/{uid}")
def edit_user(uid: int, b: UserIn, u: User = Depends(need("admin")), s: Session = Depends(db)):
    x = s.get(User, uid)
    if not x or b.role not in ROLES:
        raise HTTPException(404)
    if x.id == u.id and (b.role != "admin" or not b.active):
        raise HTTPException(422, "No puedes quitarte tu propio acceso de administrador")
    x.name, x.role, x.ver_solicitudes, x.active = b.name, b.role, b.ver_solicitudes, b.active
    if b.password:
        pwcheck(b.password)
        x.pw = ph.hash(b.password)
    s.commit()
    log(s, u.email, "editar_usuario", x.email)
    return {"ok": True}


@app.get("/api/log")
def get_log(u: User = Depends(need("admin")), s: Session = Depends(db)):
    return [{"ts": x.ts.isoformat(), "user": x.user, "accion": x.accion, "detalle": x.detalle} for x in s.query(Log).order_by(Log.id.desc()).limit(100)]


# ---------- panel ----------
STATIC = os.path.join(os.path.dirname(__file__), "static")


@app.get("/admin")
def admin():
    return FileResponse(os.path.join(STATIC, "admin.html"))


@app.get("/admin.js")
def adminjs():
    return FileResponse(os.path.join(STATIC, "admin.js"), media_type="text/javascript")


@app.get("/")
def root():
    return {"servicio": "ICC Adonay API"}
