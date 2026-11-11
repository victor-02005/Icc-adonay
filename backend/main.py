
from contextlib import asynccontextmanager
from typing import Annotated

import jwt
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Response,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, obtener_db, settings
from models import Actividad, SolicitudOrientacion, Usuario
from schemas import (
    ActividadEntrada,
    ActividadRespuesta,
    CambioEstadoSolicitud,
    LoginEntrada,
    SolicitudOrientacionEntrada,
    SolicitudOrientacionPrivada,
    SolicitudOrientacionRespuesta,
    TokenRespuesta,
)
from security import (
    crear_hash,
    crear_token,
    leer_token,
    verificar_contrasena,
)


# -----------------------------------------
# INICIALIZACIÓN Y CICLO DE VIDA
# -----------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear las tablas para desarrollo local.
    # En producción se recomienda utilizar migraciones.
    Base.metadata.create_all(bind=engine)

    # Crear el administrador inicial si no existe.
    with SessionLocal() as db:
        usuario = db.scalar(
            select(Usuario).where(
                Usuario.nombre_usuario == settings.ADMIN_USERNAME
            )
        )

        if usuario is None:
            if settings.ADMIN_ROLE not in {"pastor", "secretaria"}:
                raise RuntimeError(
                    "ADMIN_ROLE debe ser pastor o secretaria."
                )

            usuario = Usuario(
                nombre_usuario=settings.ADMIN_USERNAME,
                contrasena_hash=crear_hash(settings.ADMIN_PASSWORD),
                rol=settings.ADMIN_ROLE,
                activo=True,
            )

            db.add(usuario)
            db.commit()

    # Permitir que FastAPI comience a recibir peticiones.
    yield


app = FastAPI(
    title="API ICC Adonay",
    description="API para actividades y orientación pastoral.",
    version="1.0.0",
    lifespan=lifespan,
)


# -----------------------------------------
# CONFIGURACIÓN CORS
# -----------------------------------------

origenes = [
    origen.strip()
    for origen in settings.FRONTEND_ORIGINS.split(",")
    if origen.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


# -----------------------------------------
# DEPENDENCIAS DE BASE DE DATOS Y SEGURIDAD
# -----------------------------------------

EsquemaDB = Annotated[Session, Depends(obtener_db)]
bearer = HTTPBearer(auto_error=False)


def usuario_actual(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer),
    ],
    db: EsquemaDB,
) -> Usuario:
    if credenciales is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Debes iniciar sesión.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        datos = leer_token(credenciales.credentials)
        nombre_usuario = datos.get("sub")

        if not nombre_usuario:
            raise ValueError("Token sin usuario")

    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o vencido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    usuario = db.scalar(
        select(Usuario).where(
            Usuario.nombre_usuario == nombre_usuario
        )
    )

    if usuario is None or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inexistente o desactivado.",
        )

    return usuario


UsuarioAutenticado = Annotated[
    Usuario,
    Depends(usuario_actual),
]


def exigir_administrador(
    usuario: UsuarioAutenticado,
) -> Usuario:
    if usuario.rol not in {"pastor", "secretaria"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para esta operación.",
        )

    return usuario


Administrador = Annotated[
    Usuario,
    Depends(exigir_administrador),
]


# -----------------------------------------
# RUTAS GENERALES
# -----------------------------------------

@app.get("/")
def inicio():
    return {
        "mensaje": "API de ICC Adonay funcionando.",
        "documentacion": "/docs",
    }


@app.get("/api/salud")
def salud():
    return {"estado": "ok"}


# -----------------------------------------
# AUTENTICACIÓN
# -----------------------------------------

@app.post(
    "/api/auth/login",
    response_model=TokenRespuesta,
)
def iniciar_sesion(
    datos: LoginEntrada,
    db: EsquemaDB,
):
    usuario = db.scalar(
        select(Usuario).where(
            Usuario.nombre_usuario == datos.nombre_usuario
        )
    )

    if (
        usuario is None
        or not usuario.activo
        or not verificar_contrasena(
            datos.contrasena,
            usuario.contrasena_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos.",
        )

    token = crear_token(
        usuario.nombre_usuario,
        usuario.rol,
    )

    return TokenRespuesta(access_token=token)


@app.get("/api/auth/me")
def consultar_usuario(
    usuario: UsuarioAutenticado,
):
    return {
        "nombre_usuario": usuario.nombre_usuario,
        "rol": usuario.rol,
    }


# -----------------------------------------
# ACTIVIDADES PÚBLICAS
# -----------------------------------------

@app.get(
    "/api/actividades",
    response_model=list[ActividadRespuesta],
)
def listar_actividades(
    db: EsquemaDB,
):
    consulta = (
        select(Actividad)
        .where(Actividad.publicada.is_(True))
        .order_by(Actividad.id.desc())
    )

    return db.scalars(consulta).all()


# -----------------------------------------
# ADMINISTRACIÓN DE ACTIVIDADES
# -----------------------------------------

@app.get(
    "/api/admin/actividades",
    response_model=list[ActividadRespuesta],
)
def listar_todas_las_actividades(
    db: EsquemaDB,
    usuario: Administrador,
):
    consulta = select(Actividad).order_by(Actividad.id.desc())
    return db.scalars(consulta).all()


@app.post(
    "/api/admin/actividades",
    response_model=ActividadRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_actividad(
    datos: ActividadEntrada,
    db: EsquemaDB,
    usuario: Administrador,
):
    actividad = Actividad(
        **datos.model_dump(),
        creada_por=usuario.id,
    )

    db.add(actividad)
    db.commit()
    db.refresh(actividad)

    return actividad


@app.put(
    "/api/admin/actividades/{actividad_id}",
    response_model=ActividadRespuesta,
)
def editar_actividad(
    actividad_id: int,
    datos: ActividadEntrada,
    db: EsquemaDB,
    usuario: Administrador,
):
    actividad = db.get(Actividad, actividad_id)

    if actividad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Actividad no encontrada.",
        )

    for campo, valor in datos.model_dump().items():
        setattr(actividad, campo, valor)

    db.commit()
    db.refresh(actividad)

    return actividad


@app.patch(
    "/api/admin/actividades/{actividad_id}/publicacion",
    response_model=ActividadRespuesta,
)
def cambiar_publicacion(
    actividad_id: int,
    publicada: bool,
    db: EsquemaDB,
    usuario: Administrador,
):
    actividad = db.get(Actividad, actividad_id)

    if actividad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Actividad no encontrada.",
        )

    actividad.publicada = publicada
    db.commit()
    db.refresh(actividad)

    return actividad


@app.delete(
    "/api/admin/actividades/{actividad_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def eliminar_actividad(
    actividad_id: int,
    db: EsquemaDB,
    usuario: Administrador,
):
    actividad = db.get(Actividad, actividad_id)

    if actividad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Actividad no encontrada.",
        )

    db.delete(actividad)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# -----------------------------------------
# SOLICITUDES DE ORIENTACIÓN PASTORAL
# -----------------------------------------

@app.post(
    "/api/orientacion",
    response_model=SolicitudOrientacionRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_solicitud_orientacion(
    datos: SolicitudOrientacionEntrada,
    db: EsquemaDB,
):
    solicitud = SolicitudOrientacion(
        **datos.model_dump(),
    )

    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)

    return solicitud


@app.get(
    "/api/admin/orientacion",
    response_model=list[SolicitudOrientacionPrivada],
)
def listar_solicitudes_orientacion(
    db: EsquemaDB,
    usuario: Administrador,
):
    consulta = (
        select(SolicitudOrientacion)
        .order_by(SolicitudOrientacion.id.desc())
    )

    return db.scalars(consulta).all()


@app.patch(
    "/api/admin/orientacion/{solicitud_id}/estado",
    response_model=SolicitudOrientacionRespuesta,
)
def cambiar_estado_solicitud(
    solicitud_id: int,
    datos: CambioEstadoSolicitud,
    db: EsquemaDB,
    usuario: Administrador,
):
    solicitud = db.get(SolicitudOrientacion, solicitud_id)

    if solicitud is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada.",
        )

    solicitud.estado = datos.estado
    db.commit()
    db.refresh(solicitud)

    return solicitud
