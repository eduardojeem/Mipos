import { Router } from 'express';
import { z } from 'zod';
import { reportsService, ReportFilter } from '../services/reports';
import { logger } from '../middleware/logger';
import { 
  EnhancedAuthenticatedRequest, 
  requirePermission, 
  requireAnyPermission,
  hasPermission 
} from '../middleware/enhanced-auth';
import { reportsRateLimit } from '../middleware/rate-limiter';
import { validateQuery, sanitize } from '../middleware/input-validator';
import { exportQueueService, ExportJob } from '../services/export-queue';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schemas
const reportFilterSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  since: z.string().optional().transform(val => val ? new Date(val) : undefined),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional()
});

const queryReportFilterSchema = z.object({
  type: z.enum(['sales', 'inventory', 'customers', 'financial']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  since: z.string().optional(),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional()
});

const exportFormatSchema = z.enum(['pdf', 'excel', 'csv', 'json']);
const exportEnqueueSchema = z.object({
  type: z.enum(['sales', 'inventory', 'customers', 'financial']),
  format: exportFormatSchema,
  filters: reportFilterSchema,
});

// Comparative Reports schema
const compareQuerySchema = z.object({
  start_date_a: z.string(),
  end_date_a: z.string(),
  start_date_b: z.string(),
  end_date_b: z.string(),
  dimension: z.enum(['overall', 'product', 'category']).default('overall'),
  groupBy: z.enum(['day', 'month']).default('day'),
  details: z.coerce.boolean().default(true),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  userId: z.string().optional(),
});

// General Reports Endpoint (GET)
router.get('/', 
  requireAnyPermission([
    { resource: 'reports', action: 'view' },
    { resource: 'inventory', action: 'read' },
    { resource: 'customers', action: 'read' }
  ]),
  async (req, res) => {
  try {
    const queryParams = queryReportFilterSchema.parse(req.query);
    
    // Convert query params to filter format
    const filters: ReportFilter = {
      startDate: queryParams.start_date ? new Date(queryParams.start_date) : undefined,
      endDate: queryParams.end_date ? new Date(queryParams.end_date) : undefined,
      since: queryParams.since ? new Date(queryParams.since) : undefined,
      productId: queryParams.productId,
      categoryId: queryParams.categoryId,
      customerId: queryParams.customerId,
      supplierId: queryParams.supplierId,
      userId: queryParams.userId,
      status: queryParams.status
    };
    
    logger.info('Generating report via GET endpoint', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      type: queryParams.type,
      filters 
    });

    let reportData;
    
    switch (queryParams.type) {
      case 'sales':
        reportData = await reportsService.generateSalesReport(filters);
        break;
      case 'inventory':
        reportData = await reportsService.generateInventoryReport(filters);
        break;
      case 'customers':
        reportData = await reportsService.generateCustomerReport(filters);
        break;
      case 'financial':
        reportData = await reportsService.generateFinancialReport(filters);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    res.json({
      success: true,
      data: reportData,
      message: `${queryParams.type} report generated successfully`
    });

  } catch (error) {
    logger.error('Error generating report via GET endpoint', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
});

// Background Export Queue Endpoints
router.post('/export/enqueue', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
    try {
      const body = exportEnqueueSchema.parse(req.body);
      const job = exportQueueService.enqueue(body.type, body.format, body.filters);
      res.json({ success: true, jobId: job.id, status: job.status, progress: job.progress });
    } catch (error) {
      logger.error('Error enqueuing export job', {
        error: error instanceof Error ? error.message : error,
        userId: (req as EnhancedAuthenticatedRequest).user?.id,
      });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ success: false, message: 'Error enqueuing export job' });
    }
  }
);

router.get('/export/status/:id', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
    try {
      const job = exportQueueService.get(req.params.id);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      res.json({ success: true, job });
    } catch (error) {
      logger.error('Error getting export job status', {
        error: error instanceof Error ? error.message : error,
        userId: (req as EnhancedAuthenticatedRequest).user?.id,
      });
      res.status(500).json({ success: false, message: 'Error getting job status' });
    }
  }
);

router.get('/export/download/:id', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
    try {
      const job = exportQueueService.get(req.params.id);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      if (job.status !== 'completed' || !job.result?.buffer) {
        return res.status(400).json({ success: false, message: 'Job not completed yet' });
      }
      res.setHeader('Content-Type', job.result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${job.result.filename}"`);
      res.send(job.result.buffer);
    } catch (error) {
      logger.error('Error downloading export job result', {
        error: error instanceof Error ? error.message : error,
        userId: (req as EnhancedAuthenticatedRequest).user?.id,
      });
      res.status(500).json({ success: false, message: 'Error downloading job result' });
    }
  }
);

// Cancel export job
router.delete('/export/cancel/:id',
  reportsRateLimit,
  requirePermission('reports', 'export'),
  async (req, res) => {
    try {
      const ok = exportQueueService.cancel(req.params.id);
      if (!ok) {
        return res.status(404).json({ success: false, message: 'Job not found or already finished' });
      }
      res.json({ success: true, message: 'Job cancelled' });
    } catch (error) {
      logger.error('Error cancelling export job', {
        error: error instanceof Error ? error.message : error,
        userId: (req as EnhancedAuthenticatedRequest).user?.id,
      });
      res.status(500).json({ success: false, message: 'Error cancelling job' });
    }
  }
);

// Delete export job
router.delete('/export/:id',
  reportsRateLimit,
  requirePermission('reports', 'export'),
  async (req, res) => {
    try {
      const ok = exportQueueService.delete(req.params.id);
      if (!ok) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      res.json({ success: true, message: 'Job deleted' });
    } catch (error) {
      logger.error('Error deleting export job', {
        error: error instanceof Error ? error.message : error,
        userId: (req as EnhancedAuthenticatedRequest).user?.id,
      });
      res.status(500).json({ success: false, message: 'Error deleting job' });
    }
  }
);

// List recent export jobs
router.get('/export/jobs',
  reportsRateLimit,
  requirePermission('reports', 'export'),
  async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const jobs = exportQueueService.list(Math.min(Math.max(limit, 1), 200));
      res.json({ success: true, jobs });
    } catch (error) {
      logger.error('Error listing export jobs', {
        error: error instanceof Error ? error.message : error,
        userId: (req as EnhancedAuthenticatedRequest).user?.id,
      });
      res.status(500).json({ success: false, message: 'Error listing jobs' });
    }
  }
);

// Comparative Reports Endpoint (GET)
router.get('/compare', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
  try {
    const params = compareQuerySchema.parse(req.query);

    const filtersA: ReportFilter = {
      startDate: new Date(params.start_date_a),
      endDate: new Date(params.end_date_a),
      productId: params.productId,
      categoryId: params.categoryId,
      customerId: params.customerId,
      supplierId: params.supplierId,
      userId: params.userId,
    };

    const filtersB: ReportFilter = {
      startDate: new Date(params.start_date_b),
      endDate: new Date(params.end_date_b),
      productId: params.productId,
      categoryId: params.categoryId,
      customerId: params.customerId,
      supplierId: params.supplierId,
      userId: params.userId,
    };

    logger.info('Generating comparison report', {
      userId: (req as EnhancedAuthenticatedRequest).user?.id,
      dimension: params.dimension,
      groupBy: params.groupBy,
      periodA: { start: filtersA.startDate, end: filtersA.endDate },
      periodB: { start: filtersB.startDate, end: filtersB.endDate },
    });

    const data = await reportsService.generateComparisonReport(filtersA, filtersB, {
      dimension: params.dimension,
      groupBy: params.groupBy,
      details: params.details,
    });

    res.json({
      success: true,
      data,
      message: 'Comparison report generated successfully',
    });
  } catch (error) {
    logger.error('Error generating comparison report', {
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating comparison report',
    });
  }
});

// Generate Sales Report
router.post('/sales', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
  try {
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Generating sales report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      filters 
    });

    const reportData = await reportsService.generateSalesReport(filters);

    res.json({
      success: true,
      data: reportData,
      message: 'Sales report generated successfully'
    });

  } catch (error) {
    logger.error('Error generating sales report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating sales report'
    });
  }
});

// Generate Inventory Report
router.post('/inventory', 
  reportsRateLimit,
  requirePermission('inventory', 'read'),
  async (req, res) => {
  try {
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Generating inventory report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      filters 
    });

    const reportData = await reportsService.generateInventoryReport(filters);

    res.json({
      success: true,
      data: reportData,
      message: 'Inventory report generated successfully'
    });

  } catch (error) {
    logger.error('Error generating inventory report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating inventory report'
    });
  }
});

// Generate Customer Report
router.post('/customers', 
  reportsRateLimit,
  requirePermission('customers', 'read'),
  async (req, res) => {
  try {
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Generating customer report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      filters 
    });

    const reportData = await reportsService.generateCustomerReport(filters);

    res.json({
      success: true,
      data: reportData,
      message: 'Customer report generated successfully'
    });

  } catch (error) {
    logger.error('Error generating customer report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating customer report'
    });
  }
});

// Generate Financial Report
router.post('/financial', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
  try {
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Generating financial report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      filters 
    });

    const reportData = await reportsService.generateFinancialReport(filters);

    res.json({
      success: true,
      data: reportData,
      message: 'Financial report generated successfully'
    });

  } catch (error) {
    logger.error('Error generating financial report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating financial report'
    });
  }
});

// Export Sales Report
router.post('/sales/export/:format', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
  try {
    const { format } = req.params;
    const exportFormat = exportFormatSchema.parse(format);
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Exporting sales report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      format: exportFormat,
      filters 
    });

    // Generate report data
    const reportData = await reportsService.generateSalesReport(filters);

    // Export to requested format
    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (exportFormat) {
      case 'pdf':
        buffer = await reportsService.exportToPDF('Sales', reportData, filters);
        contentType = 'application/pdf';
        filename = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      case 'excel':
        buffer = await reportsService.exportToExcel('Sales', reportData, filters);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'csv':
        buffer = await reportsService.exportToCSV('Sales', reportData, filters);
        contentType = 'text/csv';
        filename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'json':
        buffer = await reportsService.exportToJSON(reportData);
        contentType = 'application/json';
        filename = `sales-report-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('Error exporting sales report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error exporting sales report'
    });
  }
});

// Export Inventory Report
router.post('/inventory/export/:format', 
  reportsRateLimit,
  requirePermission('inventory', 'read'),
  async (req, res) => {
  try {
    const { format } = req.params;
    const exportFormat = exportFormatSchema.parse(format);
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Exporting inventory report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      format: exportFormat,
      filters 
    });

    const reportData = await reportsService.generateInventoryReport(filters);

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (exportFormat) {
      case 'pdf':
        buffer = await reportsService.exportToPDF('Inventory', reportData, filters);
        contentType = 'application/pdf';
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      case 'excel':
        buffer = await reportsService.exportToExcel('Inventory', reportData, filters);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'csv':
        buffer = await reportsService.exportToCSV('Inventory', reportData, filters);
        contentType = 'text/csv';
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'json':
        buffer = await reportsService.exportToJSON(reportData);
        contentType = 'application/json';
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('Error exporting inventory report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error exporting inventory report'
    });
  }
});

// Export Customer Report
router.post('/customers/export/:format', 
  reportsRateLimit,
  requirePermission('customers', 'read'),
  async (req, res) => {
  try {
    const { format } = req.params;
    const exportFormat = exportFormatSchema.parse(format);
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Exporting customer report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      format: exportFormat,
      filters 
    });

    const reportData = await reportsService.generateCustomerReport(filters);

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (exportFormat) {
      case 'pdf':
        buffer = await reportsService.exportToPDF('Customer', reportData, filters);
        contentType = 'application/pdf';
        filename = `customer-report-${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      case 'excel':
        buffer = await reportsService.exportToExcel('Customer', reportData, filters);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `customer-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'csv':
        buffer = await reportsService.exportToCSV('Customer', reportData, filters);
        contentType = 'text/csv';
        filename = `customer-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'json':
        buffer = await reportsService.exportToJSON(reportData);
        contentType = 'application/json';
        filename = `customer-report-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('Error exporting customer report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error exporting customer report'
    });
  }
});

// Export Financial Report
router.post('/financial/export/:format', 
  reportsRateLimit,
  requirePermission('reports', 'view'),
  async (req, res) => {
  try {
    const { format } = req.params;
    const exportFormat = exportFormatSchema.parse(format);
    const filters = reportFilterSchema.parse(req.body);
    
    logger.info('Exporting financial report', { 
      userId: (req as EnhancedAuthenticatedRequest).user?.id, 
      format: exportFormat,
      filters 
    });

    const reportData = await reportsService.generateFinancialReport(filters);

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (exportFormat) {
      case 'pdf':
        buffer = await reportsService.exportToPDF('Financial', reportData, filters);
        contentType = 'application/pdf';
        filename = `financial-report-${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      case 'excel':
        buffer = await reportsService.exportToExcel('Financial', reportData, filters);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `financial-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'csv':
        buffer = await reportsService.exportToCSV('Financial', reportData, filters);
        contentType = 'text/csv';
        filename = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'json':
        buffer = await reportsService.exportToJSON(reportData);
        contentType = 'application/json';
        filename = `financial-report-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('Error exporting financial report', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error exporting financial report'
    });
  }
});

// Get Available Report Types
router.get('/types', 
  requireAnyPermission([
    { resource: 'reports', action: 'view' },
    { resource: 'inventory', action: 'read' },
    { resource: 'customers', action: 'read' }
  ]),
  async (req, res) => {
  try {
    const reportTypes = [
      {
        id: 'sales',
        name: 'Sales Report',
        description: 'Comprehensive sales analysis with revenue, top products, and trends',
        exportFormats: ['pdf', 'excel', 'csv', 'json']
      },
      {
        id: 'inventory',
        name: 'Inventory Report',
        description: 'Stock levels, low stock alerts, and inventory valuation',
        exportFormats: ['pdf', 'excel', 'csv', 'json']
      },
      {
        id: 'customers',
        name: 'Customer Report',
        description: 'Customer analytics, segmentation, and retention metrics',
        exportFormats: ['pdf', 'excel', 'csv', 'json']
      },
      {
        id: 'financial',
        name: 'Financial Report',
        description: 'Revenue, costs, profit analysis, and financial trends',
        exportFormats: ['pdf', 'excel', 'csv', 'json']
      }
    ];

    res.json({
      success: true,
      data: reportTypes,
      message: 'Report types retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving report types', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    res.status(500).json({
      success: false,
      message: 'Error retrieving report types'
    });
  }
});

// Get Report Filters Schema
router.get('/filters/schema', 
  requireAnyPermission([
    { resource: 'reports', action: 'view' },
    { resource: 'inventory', action: 'read' },
    { resource: 'customers', action: 'read' }
  ]),
  async (req, res) => {
  try {
    const filtersSchema = {
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Start date for the report period (YYYY-MM-DD)',
        required: false
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'End date for the report period (YYYY-MM-DD)',
        required: false
      },
      productId: {
        type: 'string',
        description: 'Filter by specific product ID',
        required: false
      },
      categoryId: {
        type: 'string',
        description: 'Filter by product category ID',
        required: false
      },
      customerId: {
        type: 'string',
        description: 'Filter by specific customer ID',
        required: false
      },
      supplierId: {
        type: 'string',
        description: 'Filter by supplier ID',
        required: false
      },
      userId: {
        type: 'string',
        description: 'Filter by user/employee ID',
        required: false
      },
      status: {
        type: 'string',
        description: 'Filter by status (varies by report type)',
        required: false
      }
    };

    res.json({
      success: true,
      data: filtersSchema,
      message: 'Report filters schema retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving filters schema', { 
      error: error instanceof Error ? error.message : error,
      userId: (req as EnhancedAuthenticatedRequest).user?.id 
    });

    res.status(500).json({
      success: false,
      message: 'Error retrieving filters schema'
    });
  }
});

export default router;