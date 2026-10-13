import { demoConversion } from './demo-data.js';
import { effectivePolicy, effectiveDailyRate, effectiveAgreement } from './configuration.js';
import { rentalDays } from './periods.js';

export function createDemoQuote(vehicle, policyId, startAt, endAt, currency = 'COP', company = '') {
  const policy = effectivePolicy(policyId);
  const days = rentalDays(startAt, endAt);
  if (!vehicle || !policy || !days || !['COP', 'USD', 'EUR'].includes(currency)) throw new Error('No se pudo calcular la cotización de demostración.');
  const dailyPrice = effectiveDailyRate(vehicle);
  const rental = dailyPrice * days;
  const policyCost = policy.dailyPrice * days;
  const agreement = effectiveAgreement(company);
  const discount = agreement ? Math.round(rental * Number(agreement.discountPercent) / 100) : 0;
  const totalCop = rental - discount + policyCost;
  const rate = currency === 'COP' ? 1 : demoConversion[currency];
  return { vehicleId: vehicle.id, policyId, days, dailyPrice, policyDailyPrice: policy.dailyPrice,
    rental, policyCost, discount, agreementId:agreement?.id ?? null, totalCop, currency, conversionRateDemo: rate, displayedTotal: Number((totalCop / rate).toFixed(2)),
    pricingMode: 'demo-started-24h-blocks', depositStatus: 'pending-at-delivery' };
}
