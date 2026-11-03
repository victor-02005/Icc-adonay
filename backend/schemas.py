
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginEntrada(BaseModel):
    nombre_usuario: str = Field(min_length=1, max_length=50)
    contrasena: str = Field(min_length=1, max_length=128)


class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ActividadEntrada(BaseModel):
    categoria: str = Field(min_length=1, max_length=50)
    titulo: str = Field(min_length=1, max_length=150)
    descripcion: str = Field(min_length=1, max_length=3000)
    fecha: str = Field(min_length=1, max_length=100)
    publicada: bool = True


class ActividadRespuesta(ActividadEntrada):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SolicitudOrientacionEntrada(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    contacto: str = Field(min_length=5, max_length=150)
    modalidad: Literal["presencial", "virtual", "por-confirmar"]
    disponibilidad: str = Field(min_length=2, max_length=200)
    mensaje: str | None = Field(default=None, max_length=2000)


class SolicitudOrientacionRespuesta(BaseModel):
    id: int
    estado: str

    model_config = ConfigDict(from_attributes=True)


class CambioEstadoSolicitud(BaseModel):
    estado: Literal["pendiente", "contactada", "cerrada"]


class SolicitudOrientacionPrivada(SolicitudOrientacionRespuesta):
    nombre: str
    contacto: str
    modalidad: str
    disponibilidad: str
    mensaje: str | None = None
