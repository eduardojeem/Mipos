import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';

const router = express.Router();

// Get today's sales statistics (simple implementation)
router.get('/today', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get today's sales using findMany and calculate manually
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay.toISOString(),
          lte: endOfDay.toISOString()
        }
      }
    });

    // Calculate statistics manually
    const totalSales = todaySales.length;
    const totalRevenue = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    res.json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        date: startOfDay.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error getting today sales stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del día',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get general sales overview (simple implementation)
router.get('/overview', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  try {
    // Get all sales and calculate manually
    const allSales = await prisma.sale.findMany({});

    // Calculate statistics manually
    const totalSales = allSales.length;
    const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    res.json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error getting sales overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen general',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;