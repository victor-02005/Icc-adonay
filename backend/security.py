
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from database import settings


ALGORITMO_JWT = "HS256"
hash_contrasena = PasswordHash.recommended()


def crear_hash(contrasena: str) -> str:
    return hash_contrasena.hash(contrasena)


def verificar_contrasena(
    contrasena: str,
    contrasena_hash: str,
) -> bool:
    return hash_contrasena.verify(
        contrasena,
        contrasena_hash,
    )


def crear_token(nombre_usuario: str, rol: str) -> str:
    ahora = datetime.now(timezone.utc)

    datos = {
        "sub": nombre_usuario,
        "rol": rol,
        "iat": ahora,
        "exp": ahora + timedelta(
            minutes=settings.JWT_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        datos,
        settings.JWT_SECRET_KEY,
        algorithm=ALGORITMO_JWT,
    )


def leer_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[ALGORITMO_JWT],
        options={"require": ["sub", "exp"]},
    )
