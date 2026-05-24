// Salimos de 'utils' con '../', entramos a 'src/Screens/' y cargamos el walletEngine
const { 
  generateTransactionHistory, 
  calculateNetBalance, 
  calcularPuntosADSO,
  generarTasaCambio,
  comprarUSDT,
  generarMetasAhorro,
  transferirAMeta,
  clasificarGasto,
  generarDatosCriticos
} = require('../src/Screens/walletEngine');

describe('Pruebas Unitarias del Motor Financiero (WalletEngine)', () => {
  
  // ─── BASE ───────────────────────────────────────────────────────────────────
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

  // ─── APRENDIZ 1: MONEDA EXTRANJERA (USDT) ───────────────────────────────────
  test('4b. comprarUSDT debe calcular la conversión correcta y restar el saldo en COP', () => {
    const saldoInicial = 50000;
    const montoAComprar = 40000;
    const resultado = comprarUSDT(saldoInicial, montoAComprar);

    expect(resultado.estado).toBe('Aprobado');
    expect(resultado.tasa).toBeGreaterThanOrEqual(3900);
    expect(resultado.tasa).toBeLessThanOrEqual(4300);
    expect(resultado.nuevoSaldoCOP).toBe(saldoInicial - montoAComprar);
    expect(resultado.usdt).toBe(parseFloat((montoAComprar / resultado.tasa).toFixed(6)));
  });

  test('4c. comprarUSDT debe rechazar la transacción si el saldo es insuficiente', () => {
    const resultado = comprarUSDT(10000, 30000);
    expect(resultado.estado).toBe('Rechazado');
    expect(resultado.motivo).toBe('Saldo COP insuficiente');
  });

  // ─── APRENDIZ 2: CASHBACK ───────────────────────────────────────────────────
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
    expect(calcularPuntosADSO(txs)).toBe(2800);
  });

  // ─── APRENDIZ 3: PIGGY BANK (METAS DE AHORRO) ───────────────────────────────
  test('10. generarMetasAhorro debe retornar un array de 3 metas estructuradas', () => {
    const metas = generarMetasAhorro();
    expect(metas).toHaveLength(3);
    metas.forEach(meta => {
      expect(meta.id).toBeDefined();
      expect(meta.nombre).toBeDefined();
      expect(meta.meta).toBeGreaterThan(0);
      expect(meta.ahorrado).toBeGreaterThanOrEqual(0);
    });
  });

  test('11. transferirAMeta exitoso debe restar del disponible, sumar al acumulado y conservar la masa monetaria total', () => {
    const saldoDisponibleInicial = 500000;
    const metaInicial = { id: 'meta-test', nombre: 'Fondo de Emergencia', meta: 1000000, ahorrado: 200000 };
    const montoATransferir = 100000;

    // Suma de control antes de la operación
    const dineroTotalInicial = saldoDisponibleInicial + metaInicial.ahorrado;

    const resultado = transferirAMeta(saldoDisponibleInicial, metaInicial, montoATransferir);

    // Validaciones de balances individuales
    expect(resultado.nuevoSaldo).toBe(400000);
    expect(resultado.meta.ahorrado).toBe(300000);
    expect(resultado.error).toBeUndefined();

    // Verificación reina: El dinero no se destruye ni se duplica en el sistema
    const dineroTotalFinal = resultado.nuevoSaldo + resultado.meta.ahorrado;
    expect(dineroTotalFinal).toBe(dineroTotalInicial);
  });

  test('12. transferirAMeta debe rechazar la operación si no hay saldo suficiente', () => {
    const metaInicial = { id: 'meta-test', nombre: 'Fondo de Emergencia', meta: 1000000, ahorrado: 200000 };
    const resultado = transferirAMeta(20000, metaInicial, 50000);

    expect(resultado.error).toBe('Saldo insuficiente para realizar la transferencia');
    expect(resultado.nuevoSaldo).toBeUndefined();
  });

  // ─── APRENDIZ 4: BUDGETING (ALERTAS DE GASTO CRÍTICO) ───────────────────────
  test('13. clasificarGasto debe retornar "Gasto Crítico" si los retiros alcanzan o superan el 70%', () => {
    const transaccionesCriticas = [
      { type: 'Ingreso', amount: 200000, status: 'Completado' },
      { type: 'Retiro',  amount: 150000, status: 'Completado' } // 75% del ingreso
    ];
    expect(clasificarGasto(transaccionesCriticas)).toBe('Gasto Crítico');
  });

  test('14. clasificarGasto debe retornar "Estable" si los gastos controlados no tocan el 70%', () => {
    const transaccionesEstables = [
      { type: 'Ingreso', amount: 200000, status: 'Completado' },
      { type: 'Retiro',  amount: 100000, status: 'Completado' } // 50% del ingreso
    ];
    expect(clasificarGasto(transaccionesEstables)).toBe('Estable');
  });
});