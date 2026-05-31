import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwtService';

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        usuario_id: string;
        cliente_id: string;
        email: string;
        rol: string;
        es_admin_sistema?: boolean;
      };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const payload = jwtService.verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    req.usuario = payload;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error validando token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ message: 'Rol insuficiente' });
    }

    next();
  };
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token inválido' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expirado' });
  }

  res.status(500).json({ message: err.message || 'Error interno' });
};

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}
