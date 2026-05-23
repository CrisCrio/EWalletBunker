import { faker } from '@faker-js/faker/locale/es';

// ─── HISTORIAL DE TRANSACCIONES ──────────────────────────────────────────────

export function generateTransactionHistory(count) {
  const transactions = [];
  for (let i = 0; i < count; i++) {
    transactions.push({
      id: faker.string.uuid(),
      accountNumber: faker.finance.accountNumber(),
      type: faker.helpers.arrayElement(['Ingreso', 'Retiro']),
      amount: parseFloat(faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 })),
      date: faker.date.recent({ days: 30 }),
      status: faker.helpers.arrayElement(['Completado', 'Pendiente', 'Rechazado']),
    });
  }
  return transactions;
}

// ─── BALANCE NETO ─────────────────────────────────────────────────────────────

export function calculateNetBalance(transactions) {
  return transactions.reduce((balance, tx) => {
    if (tx.status === 'Completado') {
      if (tx.type === 'Ingreso') return balance + tx.amount;
      if (tx.type === 'Retiro')  return balance - tx.amount;
    }
    return balance;
  }, 0);
}

// ─── TASA DE CAMBIO ───────────────────────────────────────────────────────────

export function generarTasaCambio() {
  return faker.number.float({ min: 3900, max: 4300, fractionDigits: 2 });
}

// ─── COMPRA USDT ──────────────────────────────────────────────────────────────

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

// ─── CONVERSIÓN COP → USDT ────────────────────────────────────────────────────

export function convertirCOPaUSDT(montoCOP, tasa) {
  if (!tasa || tasa <= 0) return 0;
  return parseFloat((montoCOP / tasa).toFixed(6));
}