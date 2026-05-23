// Salimos de 'utils' con '../', entramos a 'src/Screens/' y cargamos el walletEngine
const { generateTransactionHistory, calculateNetBalance, calcularPuntosADSO } = require('../src/Screens/walletEngine');
describe('Pruebas Unitarias del Motor Financiero (WalletEngine)', () => {
  
  test('1. Si pido 50 transacciones, el array debe tener exactamente longitud 50', () => {
    const data = generateTransactionHistory(50);
    expect(data.length).toBe(50);
  });

  test('2. El monto (amount) debe ser siempre un número positivo y nunca cero', () => {
    const data = generateTransactionHistory(50);
    data.forEach(tx => {
      expect(tx.amount).toBeGreaterThan(0);
    });
  });

  test('3. No deben existir campos con valor undefined en el objeto generado', () => {
    const data = generateTransactionHistory(10);
    data.forEach(tx => {
      expect(tx.id).toBeDefined();
      expect(tx.accountNumber).toBeDefined();
      expect(tx.type).toBeDefined();
      expect(tx.amount).toBeDefined();
      expect(tx.date).toBeDefined();
      expect(tx.status).toBeDefined();
    });
  });

  test('4. Prueba de Regla de Negocio: Calcular correctamente el Saldo Neto Total', () => {
    const mockTransactions = [
      { type: 'Ingreso', amount: 300000, status: 'Completado' },
      { type: 'Retiro', amount: 100000, status: 'Completado' },
      { type: 'Ingreso', amount: 150000, status: 'Pendiente' } 
    ];
    expect(calculateNetBalance(mockTransactions)).toBe(200000);
  });
  test('5. Transacciones menores a $50.000 COP acumulan exactamente 0 puntos', () => {
    const txs = [
      { type: 'Ingreso', amount: 49999,  status: 'Completado' },
      { type: 'Retiro',  amount: 30000,  status: 'Completado' },
      { type: 'Ingreso', amount: 10000,  status: 'Completado' },
    ];
    expect(calcularPuntosADSO(txs)).toBe(0);
  });

  test('6. Transacciones con estado Rechazado no acumulan puntos, aunque superen $50.000', () => {
    const txs = [
      { type: 'Retiro',  amount: 200000, status: 'Rechazado' },
      { type: 'Ingreso', amount: 150000, status: 'Rechazado' },
    ];
    expect(calcularPuntosADSO(txs)).toBe(0);
  });

  test('7. Transacciones con estado Pendiente no acumulan puntos, aunque superen $50.000', () => {
    const txs = [
      { type: 'Retiro',  amount: 300000, status: 'Pendiente' },
      { type: 'Ingreso', amount: 100000, status: 'Pendiente' },
    ];
    expect(calcularPuntosADSO(txs)).toBe(0);
  });

  test('8. Una transacción Completada de $100.000 debe otorgar exactamente $1.000 en puntos (1%)', () => {
    const txs = [
      { type: 'Ingreso', amount: 100000, status: 'Completado' },
    ];
    expect(calcularPuntosADSO(txs)).toBe(1000);
  });

  test('9. Mix: solo las Completadas > $50.000 acumulan puntos; el resto suma 0', () => {
    const txs = [
      { type: 'Ingreso', amount: 200000, status: 'Completado' },  // 2000 pts
      { type: 'Retiro',  amount: 80000,  status: 'Completado' },  // 800 pts
      { type: 'Ingreso', amount: 40000,  status: 'Completado' },  // 0 pts (< 50k)
      { type: 'Retiro',  amount: 300000, status: 'Rechazado'  },  // 0 pts
      { type: 'Ingreso', amount: 150000, status: 'Pendiente'  },  // 0 pts
    ];
    // 200000*0.01 + 80000*0.01 = 2000 + 800 = 2800
    expect(calcularPuntosADSO(txs)).toBe(2800);
  });
});