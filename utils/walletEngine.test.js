// Salimos de 'utils' con '../', entramos a 'src/Screens/' y cargamos el walletEngine
const { generateTransactionHistory, calculateNetBalance } = require('../src/Screens/walletEngine');
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
});