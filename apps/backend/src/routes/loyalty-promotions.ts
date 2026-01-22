import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

// In-memory store for links between loyalty tiers and promotions
// NOTE: This is ephemeral and should be replaced with persistent storage (DB) later.
type TierId = string; // use string to be flexible; convert from number as needed
type PromotionId = string;

const linksByTier: Map<TierId, Set<PromotionId>> = new Map();

// Persistence helpers
const DATA_DIR = path.join(process.cwd(), 'apps', 'backend', 'data');
const DATA_FILE = path.join(DATA_DIR, 'loyalty_promotion_links.json');

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function checkValidation(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
}

function serializeAllLinks() {
  const all: Array<{ tierId: string; promotionId: string }> = [];
  for (const [tierId, set] of linksByTier.entries()) {
    for (const promotionId of set.values()) {
      all.push({ tierId, promotionId });
    }
  }
  return all;
}

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const arr: Array<{ tierId: string; promotionId: string }> = JSON.parse(raw);
    linksByTier.clear();
    for (const { tierId, promotionId } of arr) {
      const key = String(tierId);
      const set = linksByTier.get(key) || new Set<PromotionId>();
      set.add(String(promotionId));
      linksByTier.set(key, set);
    }
  } catch {}
}

function saveToDisk() {
  ensureDataDir();
  const data = serializeAllLinks();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const router = Router();

// Initialize from disk once
loadFromDisk();

// Apply authentication to all routes
router.use(authenticateToken);

// List all links
router.get('/promotions-links', (req: Request, res: Response) => {
  return res.json({ success: true, data: serializeAllLinks() });
});

// List links for a specific tier
router.get('/tiers/:tierId/promotions-links',
  [param('tierId').notEmpty().withMessage('tierId es requerido')],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { tierId } = req.params;
    const set = linksByTier.get(String(tierId));
    const data = set ? Array.from(set).map((promotionId) => ({ tierId: String(tierId), promotionId })) : [];
    return res.json({ success: true, data });
  }
);

// Create a new link
router.post('/promotions-links',
  [
    body('tierId').notEmpty().withMessage('tierId es requerido'),
    body('promotionId').notEmpty().withMessage('promotionId es requerido')
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { tierId, promotionId } = req.body as { tierId: string | number; promotionId: string };
    const key = String(tierId);
    const existing = linksByTier.get(key) || new Set<PromotionId>();
    existing.add(String(promotionId));
    linksByTier.set(key, existing);
    saveToDisk();
    return res.status(201).json({ success: true, message: 'Vínculo creado', data: { tierId: key, promotionId: String(promotionId) } });
  }
);

// Upsert a link and persist to disk
router.put('/promotions-links',
  [
    body('tierId').notEmpty().withMessage('tierId es requerido'),
    body('promotionId').notEmpty().withMessage('promotionId es requerido')
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { tierId, promotionId } = req.body as { tierId: string | number; promotionId: string };
    const key = String(tierId);
    const set = linksByTier.get(key) || new Set<PromotionId>();
    set.add(String(promotionId));
    linksByTier.set(key, set);
    saveToDisk();
    return res.json({ success: true, message: 'Vínculo actualizado', data: { tierId: key, promotionId: String(promotionId) } });
  }
);

// Delete a link
router.delete('/promotions-links/:tierId/:promotionId',
  [
    param('tierId').notEmpty().withMessage('tierId es requerido'),
    param('promotionId').notEmpty().withMessage('promotionId es requerido')
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { tierId, promotionId } = req.params;
    const key = String(tierId);
    const set = linksByTier.get(key);
    if (!set || !set.has(String(promotionId))) {
      return res.status(404).json({ success: false, message: 'Vínculo no encontrado' });
    }
    set.delete(String(promotionId));
    linksByTier.set(key, set);
    saveToDisk();
    return res.json({ success: true, message: 'Vínculo eliminado', data: { tierId: key, promotionId: String(promotionId) } });
  }
);

// Persist current in-memory map explicitly
router.post('/promotions-links/persist', (_req: Request, res: Response) => {
  try {
    saveToDisk();
    return res.json({ success: true, message: 'Enlaces de promociones guardados' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error al persistir enlaces' });
  }
});

export default router;