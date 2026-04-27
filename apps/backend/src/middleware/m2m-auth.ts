import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';

/**
 * Middleware para validar la cabecera X-Organization-API-Key en peticiones M2M (Webhooks y Sincronizaciones).
 * Busca la Api Key en texto plano, encuentra la organización y comprueba usando bcrypt.
 */
export const requireApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawKey = req.header('X-Organization-API-Key');

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing X-Organization-API-Key header',
      });
    }

    // Las keys tendrán un prefijo para poder buscar a qué organización pertenece de forma rápida
    // Estructura esperada: "sk_live_1234..." 
    // Por motivos de eficiencia (las keys reales no están en texto plano), buscaremos todas las keys activas 
    // y utilizaremos bcrypt.compare.
    // NOTA PARA PRODUCCION: Debería estructurarse la key como "orgId_secreto_..." para búsqueda rápida del orgId.

    // Extraer orgId de alguna manera (idealmente enviado como `X-Organization-ID`)
    const orgId = req.header('X-Organization-ID');

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Missing X-Organization-ID header required for webhook processing.',
      });
    }

    // Buscar las keys activas de esa organización
    const apiKeys = await prisma.organizationApiKey.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
    });

    if (!apiKeys || apiKeys.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API Key or Organization ID',
      });
    }

    let validKey = null;

    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(rawKey, apiKey.keyHash);
      if (isValid) {
        validKey = apiKey;
        break;
      }
    }

    if (!validKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API Key',
      });
    }

    // Verificar expiración
    if (validKey.expiresAt && validKey.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'API Key has expired',
      });
    }

    // Actualizar `lastUsedAt` (no esperar a la bbdd para seguir)
    prisma.organizationApiKey.update({
      where: { id: validKey.id },
      data: { lastUsedAt: new Date() }
    }).catch(e => console.error("Error updating lastUsedAt on ApiKey", e));

    // Inyectar organizationId en el objeto request para que los controladores no dependan de JWT
    req.body.organizationId = orgId;
    (req as any).user = { orgId, type: 'm2m' }; // Mock object representing system user

    next();
  } catch (error) {
    console.error('API Key validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while validating API Key',
    });
  }
};
