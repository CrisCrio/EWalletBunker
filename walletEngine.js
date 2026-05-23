const { fakerES: faker } = require('@faker-js/faker');

// Generar historial de transacciones simulando transferencias bancarias reales
function generateTransactionHistory(count) {
  const transactions = [];
  
  for (let i = 0; i < count; i++) {
    transactions.push({
      id: faker.string.uuid(), 
      accountNumber: faker.finance.accountNumber(), 
      type: faker.helpers.arrayElement(['Ingreso', 'Retiro']), 
      // Monto flotante entre $10.000 y $500.000 COP
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

module.exports = {
  generateTransactionHistory,
  calculateNetBalance
};