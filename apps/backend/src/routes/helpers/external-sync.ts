// Temporary: Using console until logger API is fixed
const logger = console;

interface AuthHeaders extends Record<string, string> {
    'Content-Type': string;
}

/**
 * Build authentication headers for external API calls
 */
function buildAuthHeaders(): AuthHeaders {
    const headers: AuthHeaders = { 'Content-Type': 'application/json' };

    const apiKey = process.env.EXTERNAL_SAAS_API_KEY;
    const bearer = process.env.EXTERNAL_SAAS_BEARER_TOKEN;
    const basicUser = process.env.EXTERNAL_SAAS_BASIC_USER;
    const basicPass = process.env.EXTERNAL_SAAS_BASIC_PASS;

    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    if (bearer) {
        headers['Authorization'] = `Bearer ${bearer}`;
    }

    if (basicUser && basicPass) {
        const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
        headers['Authorization'] = `Basic ${b64}`;
    }

    return headers;
}

/**
 * Build payload for return sync based on action type
 */
function buildReturnPayload(returnData: any, action: 'create' | 'update'): any {
    if (action === 'create') {
        return {
            records: [{
                id: returnData.id,
                originalSaleId: returnData.originalSaleId,
                customerId: returnData.customerId || null,
                total: returnData.total,
                reason: returnData.reason,
                refundMethod: returnData.refundMethod,
                status: returnData.status,
                items: (returnData.items || []).map((it: any) => ({
                    productId: it.productId,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    originalSaleItemId: it.originalSaleItemId
                }))
            }]
        };
    }

    // Update action
    const payload: any = {
        records: [{
            id: returnData.id,
            status: returnData.status,
            notes: returnData.notes || null
        }]
    };

    // Include full details for COMPLETED status
    if (returnData.status === 'COMPLETED' && returnData.returnItems) {
        payload.records[0].items = returnData.returnItems.map((it: any) => ({
            productId: it.productId,
            sku: it.product?.sku,
            name: it.product?.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice
        }));
    }

    return payload;
}

/**
 * Sync return data to external SaaS system
 * @param returnData - Return data to sync
 * @param action - Type of action (create or update)
 */
export async function syncReturnToExternalSystem(
    returnData: any,
    action: 'create' | 'update'
): Promise<void> {
    try {
        const base = process.env.EXTERNAL_SAAS_BASE_URL?.replace(/\/$/, '');

        if (!base) {
            logger.debug('External SaaS URL not configured, skipping sync');
            return;
        }

        const url = `${base}/returns`;
        const headers = buildAuthHeaders();
        const payload = buildReturnPayload(returnData, action);

        logger.info('Syncing return to external system', {
            returnId: returnData.id,
            action
        });

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.error('External sync failed', {
                status: response.status,
                statusText: response.statusText,
                returnId: returnData.id
            });
        } else {
            logger.info('External sync successful', { returnId: returnData.id });
        }
    } catch (error) {
        logger.error('External sync error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            returnId: returnData.id
        });
    }
}
