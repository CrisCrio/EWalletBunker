const { fakerES: faker } = require('@faker-js/faker');

// Generar historial de transacciones simulando transferencias bancarias reales
function generateTransactionHistory(count) {
  const transactions = [];
  
  for (let i = 0; i < count; i++) {
    transactions.push({
      id: faker.string.uuid(), 
      accountNumber: faker.finance.accountNumber(), 
      type: faker.helpers.arrayElement(['Ingreso', 'Retiro']), 
      amount: parseFloat(faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 })),
      date: faker.date.recent({ days: 30 }), 
      status: faker.helpers.arrayElement(['Completado', 'Pendiente', 'Rechazado']) 
    });
  }
  
  return transactions;
}

// Regla de negocio: Sumar ingresos y restar retiros siempre y cuando estén COMPLETADOS
function calculateNetBalance(transactions) {
  return transactions.reduce((balance, tx) => {
    if (tx.status === 'Completado') {
      if (tx.type === 'Ingreso') {
        return balance + tx.amount;
      } else if (tx.type === 'Retiro') {
        return balance - tx.amount;
      }
    }
    return balance;
  }, 0);
}

// Aprendiz 2: Cashback - Calcula puntos ADSO (1% de transacciones Completadas > $50.000)
function calcularPuntosADSO(transactions) {
  return transactions.reduce((puntos, tx) => {
    if (tx.status === 'Completado' && tx.amount > 50000) {
      return puntos + tx.amount * 0.01;
    }
    return puntos;
  }, 0);
}

// ── Aprendiz 1: Módulo de Moneda Extranjera ─────────────────────────

function generarTasaCambio() {
  return parseFloat(faker.number.float({ min: 3900, max: 4300, fractionDigits: 0 }));
}

function comprarUSDT(saldoCOP, montoCOP) {
  if (montoCOP <= 0) {
    return { estado: 'Rechazado', motivo: 'El monto debe ser mayor a 0', usdt: 0, tasa: null };
  }
  if (montoCOP > saldoCOP) {
    return { estado: 'Rechazado', motivo: 'Saldo COP insuficiente', usdt: 0, tasa: null };
  }
  const tasa = generarTasaCambio();
  const usdt = parseFloat((montoCOP / tasa).toFixed(6));
  return {
    estado: 'Aprobado',
    usdt,
    tasa,
    montoCOPUsado: montoCOP,
    nuevoSaldoCOP: saldoCOP - montoCOP,
  };
}

// ── Aprendiz 3: Piggy Bank ──────────────────────────────────────────

// Genera 3 metas de ahorro con nombres y montos aleatorios usando Faker
function generarMetasAhorro() {
  return [1, 2, 3].map(() => ({
    id: faker.string.uuid(),
    nombre: faker.finance.accountName(),
    meta: parseFloat(faker.number.float({ min: 500000, max: 5000000, fractionDigits: 0 })),
    ahorrado: parseFloat(faker.number.float({ min: 0, max: 499999, fractionDigits: 0 })),
  }));
}

// Transfiere un monto del saldo disponible hacia una meta de ahorro
function transferirAMeta(saldoDisponible, meta, monto) {
  if (monto <= 0) {
    return { error: 'El monto debe ser mayor a 0' };
  }
  if (monto > saldoDisponible) {
    return { error: 'Saldo insuficiente para realizar la transferencia' };
  }
  return {
    nuevoSaldo: saldoDisponible - monto,
    meta: { ...meta, ahorrado: meta.ahorrado + monto },
  };
}

module.exports = {
  generateTransactionHistory,
  calculateNetBalance,
  calcularPuntosADSO,
  generarTasaCambio,
  comprarUSDT,
  generarMetasAhorro,
  transferirAMeta,
};