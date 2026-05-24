/**
 * EWalletBunker - Motor Financiero (walletEngine.js)
 * Lógica de negocio y procesamiento de saldos, metas, cashback y alertas.
 */

// --- BASE ---

/**
 * Genera un historial de transacciones aleatorias con fines de prueba.
 * @param {number} count - Cantidad de transacciones a generar.
 */
function generateTransactionHistory(count = 10) {
  const types = ['Ingreso', 'Retiro'];
  const statuses = ['Completado', 'Pendiente', 'Rechazado'];
  const history = [];

  for (let i = 0; i < count; i++) {
    history.push({
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      accountNumber: `ACC-${Math.floor(100000 + Math.random() * 900000)}`,
      type: types[Math.floor(Math.random() * types.length)],
      amount: Math.floor(Math.random() * 450000) + 5000, // Siempre positivo y mayor a cero
      date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)]
    });
  }
  return history;
}

/**
 * Calcula el saldo neto total considerando únicamente los Ingresos y Retiros completados.
 * Los estados 'Pendiente' o 'Rechazado' se ignoran.
 * @param {Array} transactions 
 */
function calculateNetBalance(transactions = []) {
  return transactions.reduce((balance, tx) => {
    if (tx.status !== 'Completado') return balance;
    
    if (tx.type === 'Ingreso') {
      return balance + tx.amount;
    } else if (tx.type === 'Retiro') {
      return balance - tx.amount;
    }
    return balance;
  }, 0);
}

// --- APRENDIZ 1: MONEDA EXTRANJERA (USDT) ---

/**
 * Genera una tasa de cambio aleatoria simulada para el dólar/USDT en pesos colombianos.
 */
function generarTasaCambio() {
  // Retorna un valor entre 3900 y 4300 COP por USDT
  return Math.floor(Math.random() * (4300 - 3900 + 1)) + 3900;
}

/**
 * Permite la compra de saldos USDT descontando el valor equivalente en COP.
 * @param {number} saldoCOP - Saldo actual libre en pesos del usuario.
 * @param {number} montoAComprar - Cuánto dinero en COP va a destinar a la compra.
 */
function comprarUSDT(saldoCOP, montoAComprar) {
  if (saldoCOP < montoAComprar) {
    return {
      estado: 'Rechazado',
      motivo: 'Saldo COP insuficiente'
    };
  }

  const tasa = generarTasaCambio();
  // Calculamos el valor exacto en cripto fijando 6 decimales de precisión comercial
  const usdt = parseFloat((montoAComprar / tasa).toFixed(6));

  return {
    estado: 'Aprobado',
    tasa: tasa,
    nuevoSaldoCOP: saldoCOP - montoAComprar,
    usdt: usdt
  };
}

// --- APRENDIZ 2: CASHBACK (PUNTOS ADSO) ---

/**
 * Calcula el acumulado de puntos ADSO basado en transacciones Completadas superiores a $50.000 COP.
 * Entrega un retorno del 1% del valor procesado.
 * @param {Array} transactions 
 */
function calcularPuntosADSO(transactions = []) {
  return transactions.reduce((puntos, tx) => {
    if (tx.status === 'Completado' && tx.amount >= 50000) {
      return puntos + Math.floor(tx.amount * 0.01);
    }
    return puntos;
  }, 0);
}

// --- APRENDIZ 3: PIGGY BANK (METAS DE AHORRO) ---

/**
 * Inicializa un juego por defecto de 3 metas estructuradas para el usuario.
 */
function generarMetasAhorro() {
  return [
    { id: 'meta-1', nombre: 'Fondo de Emergencia', meta: 1000000, ahorrado: 200000 },
    { id: 'meta-2', nombre: 'Para la Moto', meta: 3000000, ahorrado: 150000 },
    { id: 'meta-3', nombre: 'Curso de Especialización', meta: 800000, ahorrado: 50000 }
  ];
}

/**
 * Traslada de manera segura capital del balance disponible hacia el cofre de una meta.
 * Respeta rigurosamente el principio de conservación de saldos.
 * @param {number} saldoDisponible - Saldo actual en COP de la cuenta.
 * @param {Object} metaObj - Estructura de la meta destino.
 * @param {number} monto - Capital a mover.
 */
function transferirAMeta(saldoDisponible, metaObj, monto) {
  if (saldoDisponible < monto) {
    return {
      error: 'Saldo insuficiente para realizar la transferencia'
    };
  }

  // Clonamos el objeto de la meta para no mutar el estado global de forma inesperada antes del retorno
  const metaModificada = { ...metaObj };
  metaModificada.ahorrado += monto;

  return {
    nuevoSaldo: saldoDisponible - monto,
    meta: metaModificada
  };
}

// --- APRENDIZ 4: BUDGETING (ALERTAS DE GASTO CRÍTICO) ---

/**
 * Evalúa los hábitos financieros del historial. Dispara una alarma si la suma
 * de los retiros iguala o sobrepasa el 70% del dinero ingresado.
 * @param {Array} transactions 
 */
function clasificarGasto(transactions = []) {
  const ingresosCompletados = transactions
    .filter(tx => tx.type === 'Ingreso' && tx.status === 'Completado')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const retirosCompletados = transactions
    .filter(tx => tx.type === 'Retiro' && tx.status === 'Completado')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (ingresosCompletados === 0) {
    return retirosCompletados > 0 ? 'Gasto Crítico' : 'Estable';
  }

  const porcentajeGasto = (retirosCompletados / ingresosCompletados) * 100;

  return porcentajeGasto >= 70 ? 'Gasto Crítico' : 'Estable';
}

/**
 * Generador auxiliar de mocks críticos para despliegues visuales en la interfaz.
 */
function generarDatosCriticos() {
  return [
    { type: 'Ingreso', amount: 200000, status: 'Completado' },
    { type: 'Retiro',  amount: 150000, status: 'Completado' }
  ];
}

// Exportamos todos los módulos requeridos por la suite de pruebas unitarias
module.exports = {
  generateTransactionHistory,
  calculateNetBalance,
  generarTasaCambio,
  comprarUSDT,
  calcularPuntosADSO,
  generarMetasAhorro,
  transferirAMeta,
  clasificarGasto,
  generarDatosCriticos
};