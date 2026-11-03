
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


def fecha_actual():
    return datetime.now(timezone.utc)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    nombre_usuario: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )
    contrasena_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20), default="secretaria")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Actividad(Base):
    __tablename__ = "actividades"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    categoria: Mapped[str] = mapped_column(String(50))
    titulo: Mapped[str] = mapped_column(String(150))
    descripcion: Mapped[str] = mapped_column(Text)
    fecha: Mapped[str] = mapped_column(String(100))
    publicada: Mapped[bool] = mapped_column(Boolean, default=True)
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=fecha_actual
    )
    creada_por: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id"), nullable=True
    )


class SolicitudOrientacion(Base):
    __tablename__ = "solicitudes_orientacion"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    nombre: Mapped[str] = mapped_column(String(120))
    contacto: Mapped[str] = mapped_column(String(150))
    modalidad: Mapped[str] = mapped_column(String(30))
    disponibilidad: Mapped[str] = mapped_column(String(200))
    mensaje: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    estado: Mapped[str] = mapped_column(
        String(30), default="pendiente"
    )
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=fecha_actual
    )
