import { faker } from '@faker-js/faker/locale/es';

// ─── HISTORIAL DE TRANSACCIONES (Base + Aprendiz 2) ──────────────────────────

export function generateTransactionHistory(count) {
  const transactions = [];
  for (let i = 0; i < count; i++) {
    const status = faker.helpers.arrayElement(['Completado', 'Pendiente', 'Rechazado']);
    const type   = faker.helpers.arrayElement(['Ingreso', 'Retiro']);
    const amount = parseFloat(
      faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 })
    );

    // Cashback: 1% si es Completado y monto > 50.000
    const puntosADSO =
      status === 'Completado' && amount > 50000
        ? parseFloat((amount * 0.01).toFixed(2))
        : 0;

    transactions.push({
      id: faker.string.uuid(),
      accountNumber: faker.finance.accountNumber(),
      type,
      amount,
      date: faker.date.recent({ days: 30 }),
      status,
      puntosADSO,
    });
  }
  return transactions;
}

// ─── BALANCE NETO (Base) ──────────────────────────────────────────────────────

export function calculateNetBalance(transactions) {
  return transactions.reduce((balance, tx) => {
    if (tx.status === 'Completado') {
      if (tx.type === 'Ingreso') return balance + tx.amount;
      if (tx.type === 'Retiro')  return balance - tx.amount;
    }
    return balance;
  }, 0);
}

// ─── PUNTOS ADSO ACUMULADOS (Aprendiz 2) ──────────────────────────────────────

export function calcularPuntosADSO(transactions) {
  return transactions.reduce((total, tx) => {
    const puntos =
      tx.status === 'Completado' && tx.amount > 50000
        ? parseFloat((tx.amount * 0.01).toFixed(2))
        : 0;
    return parseFloat((total + puntos).toFixed(2));
  }, 0);
}

// ─── TASA DE CAMBIO (Aprendiz 1) ──────────────────────────────────────────────

export function generarTasaCambio() {
  return faker.number.float({ min: 3900, max: 4300, fractionDigits: 2 });
}

// ─── COMPRA USDT (Aprendiz 1) ─────────────────────────────────────────────────

export function comprarUSDT(saldoCOP, montoCOP) {
  if (typeof saldoCOP !== 'number' || typeof montoCOP !== 'number') {
    return { estado: 'Rechazado', motivo: 'Los valores deben ser numéricos', usdt: 0, tasa: null };
  }
  if (montoCOP <= 0) {
    return { estado: 'Rechazado', motivo: 'El monto debe ser mayor a cero', usdt: 0, tasa: null };
  }
  if (saldoCOP < montoCOP) {
    return { estado: 'Rechazado', motivo: 'Saldo COP insuficiente', usdt: 0, tasa: null };
  }

  const tasa = generarTasaCambio();
  const usdt = parseFloat((montoCOP / tasa).toFixed(6));

  return {
    estado: 'Aprobado',
    usdt,
    tasa: parseFloat(tasa.toFixed(2)),
    montoCOPUsado: montoCOP,
    nuevoSaldoCOP: parseFloat((saldoCOP - montoCOP).toFixed(2)),
  };
}

// ─── CONVERSIÓN COP → USDT (Aprendiz 1) ───────────────────────────────────────

export function convertirCOPaUSDT(montoCOP, tasa) {
  if (!tasa || tasa <= 0) return 0;
  return parseFloat((montoCOP / tasa).toFixed(6));
}

// ─── PIGGY BANK / METAS (Aprendiz 3) ──────────────────────────────────────────

export function generarMetasAhorro() {
  return [1, 2, 3].map(() => ({
    id: faker.string.uuid(),
    nombre: faker.finance.accountName(),
    meta: parseFloat(faker.number.float({ min: 500000, max: 5000000, fractionDigits: 0 })),
    ahorrado: parseFloat(faker.number.float({ min: 0, max: 499999, fractionDigits: 0 })),
  }));
}

export function transferirAMeta(saldoDisponible, meta, monto) {
  if (monto <= 0) {
    return { error: 'El monto debe ser mayor a 0' };
  }
  if (monto > saldoDisponible) {
    return { error: 'Saldo insuficiente para realizar la transferencia' };
  }
  return {
    nuevoSaldo: parseFloat((saldoDisponible - monto).toFixed(2)),
    meta: { ...meta, ahorrado: parseFloat((meta.ahorrado + monto).toFixed(2)) },
  };
}

// ─── BUDGETING / ALERTAS CRÍTICAS (Aprendiz 4) ────────────────────────────────

export function clasificarGasto(transactions) {
  const completadas = transactions.filter(tx => tx.status === 'Completado');
  const totalIngresos = completadas
    .filter(tx => tx.type === 'Ingreso')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalRetiros = completadas
    .filter(tx => tx.type === 'Retiro')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (totalIngresos === 0) return 'Gasto Crítico';
  
  const porcentaje = (totalRetiros / totalIngresos) * 100;
  return porcentaje >= 70 ? 'Gasto Crítico' : 'Estable';
}

export function generarDatosCriticos() {
  return [
    { type: 'Ingreso', amount: 500000, status: 'Completado' },
    { type: 'Retiro',  amount: 300000, status: 'Completado' },
    { type: 'Retiro',  amount: 200000, status: 'Completado' },
    { type: 'Retiro',  amount: 100000, status: 'Completado' },
  ];
}