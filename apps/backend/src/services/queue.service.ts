/// <reference types="node" />
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../index';

// Configuración de conexión Redis opcional (desactivada si no hay REDIS_URL)
const REDIS_URL = process.env.REDIS_URL;
const connection = REDIS_URL
  ? (new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    }) as any)
  : null;

// Create the Queue (noop fallback si Redis no está configurado)
export const syncQueue = connection
  ? new Queue('saas-sync', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    })
  : {
      add: async (name: string, payload: any) => {
        console.warn('[Queue disabled] Redis no configurado, job en noop:', name);
        return { id: 'noop', name, data: payload } as any;
      },
    } as any;

export interface SyncSaleJobPayload {
  saleId: string;
  organizationId: string;
}

// Processing Logic
const syncProcessor = async (job: Job<SyncSaleJobPayload>) => {
  const { saleId, organizationId } = job.data;
  console.log(`[Worker saas-sync] Processing job ${job.id} for sale ${saleId}...`);

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: {
          include: { product: true }
        },
        customer: true,
      }
    });

    if (!sale) {
      console.warn(`Sale ${saleId} not found, ignoring sync.`);
      return;
    }

    // Aquí construirías el Payload para el SaaS
    const payload = {
      externalId: sale.id,
      organizationId: sale.organizationId,
      subtotal: sale.subtotal,
      total: sale.total,
      tax: sale.tax,
      discount: sale.discount,
      items: sale.saleItems.map(item => ({
        externalProductId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sku: item.product?.sku
      })),
      timestamp: sale.createdAt.toISOString()
    };

    // Obtenemos la API Key activa para esta organización (si la hay)
    // Esto es solo un ejemplo de cómo buscarla para autenticar la petición saliente
    /*
    const apiKey = await prisma.organizationApiKey.findFirst({
      where: { organizationId, isActive: true },
    });
    const authHeader = apiKey ? apiKey.id : 'DUMMY_KEY_FOR_TESTS'; // En prod usar una clave real
    */

    // Llamada HTTP simulada al SaaS central
    // const response = await fetch('https://saas-central.example.com/api/ingest/sales', {
    //  method: 'POST',
    //  headers: {
    //    'Content-Type': 'application/json',
    //    'X-Organization-API-Key': 'SECRET', // Obtener del enviroment o de la bd
    //    'Idempotency-Key': sale.idempotencyKey || sale.id 
    //  },
    //  body: JSON.stringify(payload)
    // });
    
    // if (!response.ok) throw new Error(`SaaS responded with status ${response.status}`);

    // Simular trabajo
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`[Worker saas-sync] Successfully synced sale ${saleId}.`);
    
  } catch (error) {
    console.error(`[Worker saas-sync] Error syncing sale ${saleId}:`, error);
    
    const errMessage = error instanceof Error ? error.message : String(error);

    // Si falló y es el último intento, guardarlo en la tabla SyncFailure (auditoría)
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
        await prisma.syncFailure.create({
            data: {
               entityType: 'SALE',
               entityId: saleId,
               action: 'SYNC_TO_SAAS',
               error: errMessage,
               retryCount: job.attemptsMade,
               lastRetryAt: new Date()
            }
        }).catch(err => console.error('Error logging sync failure', err));
    }

    throw error; // Esto activa el retry de BullMQ
  }
};

// Create the Worker (only if we're not running CLI tools or scripts)
let worker: Worker | null = null;
if (connection && process.env.NODE_ENV !== 'test') {
  worker = new Worker('saas-sync', syncProcessor, {
    connection,
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });
}
