# Dynamic Pricing System

## Overview

The dynamic pricing system calculates optimal car rental prices in real-time based on multiple factors including supply & demand, seasonality, car performance, rental duration, and customer loyalty.

## Architecture

### Core Components

1. **Calculators** (`src/pricing/calculators/`)
   - `base-price.calculator.js` - Calculates foundational price from costs
   - `demand.calculator.js` - Supply/demand multiplier per city
   - `seasonal.calculator.js` - Time-based adjustments (holidays, weekends)
   - `utilization.calculator.js` - Car performance-based pricing
   - `duration.calculator.js` - Rental length discounts
   - `customer.calculator.js` - Loyalty and history-based discounts

2. **Main Service** (`src/pricing/pricing.service.js`)
   - Orchestrates all calculators
   - Applies pricing rules and constraints
   - Saves pricing snapshots for analytics

3. **Background Jobs** (`src/pricing/pricing.jobs.js`)
   - Updates city demand metrics every 15 minutes
   - Updates car utilization rates daily
   - Cleans up old pricing snapshots

4. **API Endpoints**
   - Public pricing API (`src/pricing/pricing.routes.js`)
   - Admin pricing management (`src/pricing/admin.pricing.routes.js`)

### Database Models

- `Car` - Enhanced with pricing configuration fields
- `Contract` - Enhanced with pricing breakdown tracking
- `PricingSnapshot` - Historical pricing data for analytics
- `CityDemandMetrics` - Cached city-level demand scores
- `SeasonalFactor - Configurable seasonal pricing rules
- `PricingRule` - Admin override rules

## API Endpoints

### Public Endpoints

#### Calculate Price
```
POST /api/pricing/calculate
Body: {
  carId: number,
  startDate: string (ISO date),
  endDate: string (ISO date),
  userId?: number (optional, for loyalty pricing)
}

Response: {
  carId: number,
  pricePerDay: number,
  totalPrice: number,
  duration: number,
  breakdown: {
    base: number,
    multipliers: {
      demand: number,
      seasonal: number,
      utilization: number,
      duration: number,
      customer: number
    }
  }
}
```

#### Get Price Preview
```
GET /api/pricing/preview/:carId?startDate=...&endDate=...

Response: {
  carId: number,
  pricePerDay: number,
  totalPrice: number,
  duration: number
}
```

#### Get City Demand
```
GET /api/pricing/demand/:cityId

Response: {
  totalCars: number,
  availableCars: number,
  utilizationRate: number,
  demandScore: number
}
```

#### Get Customer Loyalty Info
```
GET /api/pricing/loyalty
Headers: Authorization: Bearer <token>

Response: {
  tier: string,
  discount: number,
  rentalsCount: number,
  lifetimeValue: number
}
```

### Admin Endpoints (Require ADMIN role)

#### Get Pricing Analytics
```
GET /api/admin/pricing/analytics?startDate=...&endDate=...&cityId=...

Response: {
  period: { start, end },
  revenue: {
    total: number,          // €100 - Actual earned revenue
    totalContracts: number, // 3 - Completed bookings
    avgPerContract: number, // €33.33
    avgPricePerDay: number
  },
  pricingPerformance: {
    dynamicPricingUsage: number, // % of contracts using dynamic pricing
    contractsWithPricing: number,
    revenueImpact: number,       // % revenue change from dynamic pricing
    avgDemandMultiplier: number,
    avgSeasonalMultiplier: number
  },
  recentContracts: [...],        // Last 10 contracts with pricing data
  pricingInsights: {
    totalCalculations: number,   // Number of price calculations
    recentCalculations: [...]   // Price calculation history
  }
}
```

#### Get Revenue Analytics
```
GET /api/admin/pricing/revenue?startDate=...&endDate=...&cityId=...&groupBy=city

Response: {
  period: { start, end },
  summary: {
    totalRevenue: number,         // €100 - Completed contracts
    pendingRevenue: number,       // €500 - Active contracts
    lostRevenue: number,          // €0 - Cancelled contracts
    completedContracts: number,
    activeContracts: number,
    cancelledContracts: number,
    avgRevenuePerContract: number
  },
  topCars: [{
    car: string,
    revenue: number,
    contracts: number
  }],
  revenueByCity: {              // Only if groupBy=city
    "Vilnius": {
      revenue: number,
      contracts: number,
      avgRevenue: number
    }
  }
}
```

#### Get Car Performance
```
GET /api/admin/pricing/performance?cityId=...

Response: {
  totalCars: number,
  cars: [{
    id: number,
    make: string,
    model: string,
    utilizationRate: number,
    performanceRating: string
  }]
}
```

#### Update Car Pricing Config
```
PUT /api/admin/pricing/cars/:id/config
Body: {
  useDynamicPricing?: boolean,
  basePricePerDay?: number,
  minPricePerDay?: number,
  maxPricePerDay?: number,
  dailyOperatingCost?: number,
  monthlyFinancingCost?: number,
  purchasePrice?: number
}
```

#### Create/Manage Pricing Rules
```
POST /api/admin/pricing/rules
GET /api/admin/pricing/rules
PUT /api/admin/pricing/rules/:id
DELETE /api/admin/pricing/rules/:id

Body: {
  name: string,
  description?: string,
  carId?: number,
  cityId?: number,
  startDate?: string,
  endDate?: string,
  fixedPrice?: number,
  multiplier?: number,
  priority?: number
}
```

#### Create/Get Seasonal Factors
```
POST /api/admin/pricing/seasonal-factors
GET /api/admin/pricing/seasonal-factors

Body: {
  name: string,
  startDate: string,
  endDate: string,
  multiplier: number,
  cityId?: number
}
```

#### Refresh Pricing Data
```
POST /api/admin/pricing/refresh

Manually triggers all background jobs
```

## Pricing Algorithm

### Step-by-Step Calculation

1. **Base Price** - Cost foundation
   - Daily operating costs (insurance, maintenance)
   - Financing costs (loan payments)
   - Depreciation
   - Profit margin (default 40%)

2. **Demand Multiplier** (0.6x - 2.5x)
   - High availability (70%+) → 0.7-0.8x (discount)
   - Normal availability (40-70%) → 0.9-1.1x
   - Low availability (<20%) → 1.8-2.5x (premium)

3. **Seasonal Multiplier** (0.85x - 1.3x)
   - Summer months → 1.3x (+30%)
   - Winter months → 0.85x (-15%)
   - Weekends (short rentals) → 1.15x
   - Holidays → 1.25x
   - Last-minute bookings → 1.15x

4. **Utilization Multiplier** (0.75x - 1.25x)
   - Low utilization (<30%) → 0.75x (move inventory)
   - High utilization (>90%) → 1.25x (premium)
   - Target is 75% utilization

5. **Duration Discount** (0.65x - 1.0x)
   - 1-2 days → 1.0x (full price)
   - 3-6 days → 0.95x (-5%)
   - 7-13 days → 0.88x (-12%)
   - 14-20 days → 0.82x (-18%)
   - 21-29 days → 0.75x (-25%)
   - 30+ days → 0.65x (-35%)

6. **Customer Loyalty** (0.88x - 1.0x)
   - First booking → 1.0x
   - 2-5 rentals → 0.95x (-5%)
   - 6-10 rentals → 0.92x (-8%)
   - 11+ rentals OR €5000+ spent → 0.88x (-12%)

7. **Apply Constraints**
   - Minimum price: 60% of base
   - Maximum price: 250% of base

8. **Apply Admin Rules** (if any)
   - Fixed price overrides
   - Custom multipliers
   - Special promotions

### Example Calculation

```
Base: €40/day
Demand: 1.6x (low availability)
Seasonal: 1.3x (summer)
Utilization: 1.1x (popular car)
Duration: 0.88x (weekly rental)
Customer: 0.95x (returning customer)

Price = €40 × 1.6 × 1.3 × 1.1 × 0.88 × 0.95
      = €66.33/day
```

## Background Jobs

### Update City Demand Metrics
**Schedule**: Every 15 minutes
**Function**: `updateAllCityDemandMetrics()`
- Counts available cars per city
- Calculates utilization rates
- Updates demand scores
- Caches results in `CityDemandMetrics` table

### Update Car Utilization Rates
**Schedule**: Daily at 2 AM
**Function**: `updateUtilizationRates()`
- Analyzes last 90 days of contracts per car
- Calculates utilization percentage
- Updates `Car.utilizationRate` field

### Cleanup Old Snapshots
**Schedule**: Daily at 3 AM
**Function**: `cleanupOldSnapshots()`
- Deletes pricing snapshots older than 90 days
- Keeps database size manageable

## Configuration

### Enable/Disable Dynamic Pricing Per Car

```javascript
await prisma.car.update({
  where: { id: carId },
  data: {
    useDynamicPricing: true, // or false
    basePricePerDay: 45.00,
    minPricePerDay: 27.00,  // 60% of base
    maxPricePerDay: 112.50, // 250% of base
  }
});
```

### Create Seasonal Campaign

```javascript
await prisma.seasonalFactor.create({
  data: {
    name: "Summer 2026 Premium",
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-31'),
    multiplier: 1.4, // 40% increase
    isActive: true,
  }
});
```

### Create Promotional Rule

```javascript
await prisma.pricingRule.create({
  data: {
    name: "Weekend Special - 20% Off SUVs in Vilnius",
    cityId: vilniusId,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-31'),
    multiplier: 0.8, // 20% discount
    priority: 10,
    isActive: true,
  }
});
```

## Testing

### Manual Price Calculation
```bash
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "carId": 1,
    "startDate": "2026-07-01",
    "endDate": "2026-07-08"
  }'
```

### Check City Demand
```bash
curl http://localhost:3000/api/pricing/demand/1
```

### Trigger Background Jobs (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/pricing/refresh \
  -H "Authorization: Bearer <admin_token>"
```

## Performance Considerations

1. **Caching**: City demand metrics cached for 15 minutes
2. **Bulk Calculations**: Use `/bulk-calculate` for listing pages
3. **Snapshots**: Only saved when `saveSnapshot: true`
4. **Database Indexes**: Added on frequently queried fields

## Future Enhancements

- [ ] Machine learning for demand prediction
- [ ] Competitor price scraping
- [ ] Weather-based adjustments
- [ ] Event calendar integration
- [ ] A/B testing framework
- [ ] Real-time WebSocket price updates
- [ ] Email alerts for price changes

## Troubleshooting

### Prices seem too high/low
- Check `minPricePerDay` and `maxPricePerDay` constraints
- Review active `PricingRule` items
- Verify `basePricePerDay` calculation

### Background jobs not running
- Ensure scheduler is initialized in `index.js`
- Check logs for error messages
- Manually trigger with `/api/admin/pricing/refresh`

### Database performance issues
- Run `cleanupOldSnapshots()` manually
- Add indexes if needed
- Consider archiving old snapshots

## Support

For issues or questions, contact the development team or create an issue in the repository.
