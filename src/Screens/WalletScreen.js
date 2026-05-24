import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  SafeAreaView, TextInput, Modal, ScrollView,
} from 'react-native';
import {
  generateTransactionHistory,
  calculateNetBalance,
  comprarUSDT,
  generarTasaCambio,
  calcularPuntosADSO,
  generarMetasAhorro,
  transferirAMeta,
} from './walletEngine';

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
const formatUSDT = (value) =>
  `${parseFloat(value).toFixed(6)} USDT`;

// ── MODAL PIGGY BANK ────────────────────────────────────────────────
function PiggyBankModal({ visible, saldoCOP, onClose, onTransferir }) {
  const [metas, setMetas] = useState(() => generarMetasAhorro());
  const [metaSeleccionada, setMetaSeleccionada] = useState(null);
  const [monto, setMonto] = useState('');
  const [resultado, setResultado] = useState(null);

  const handleClose = useCallback(() => {
    setMetaSeleccionada(null);
    setMonto('');
    setResultado(null);
    onClose();
  }, [onClose]);

  const handleTransferir = useCallback(() => {
    const valor = parseFloat(monto.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      setResultado({ error: 'Ingresa un monto válido' });
      return;
    }
    const res = transferirAMeta(saldoCOP, metaSeleccionada, valor);
    if (res.error) {
      setResultado({ error: res.error });
      return;
    }
    setMetas(prev => prev.map(m =>
      m.id === metaSeleccionada.id ? res.meta : m
    ));
    setResultado({ ok: true, nuevoSaldo: res.nuevoSaldo, meta: res.meta });
    onTransferir(valor, metaSeleccionada.nombre);
    setTimeout(() => {
      setMetaSeleccionada(null);
      setMonto('');
      setResultado(null);
    }, 1800);
  }, [monto, saldoCOP, metaSeleccionada, onTransferir]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={[modal.sheet, { maxHeight: '85%' }]}>
          {/* Header */}
          <View style={modal.header}>
            <View style={[modal.usdtBadge, { backgroundColor: '#f59e0b' }]}>
              <Text style={modal.usdtBadgeText}>🐷</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.title}>Metas de Ahorro</Text>
              <Text style={modal.subtitle}>Transfiere a tus alcancías digitales</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={modal.closeBtn}>
              <Text style={modal.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Saldo disponible */}
          <View style={modal.balanceRow}>
            <Text style={modal.balanceLabel}>Saldo disponible:</Text>
            <Text style={modal.balanceValue}>{formatCOP(saldoCOP)}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Lista de metas */}
            {metas.map((meta) => {
              const porcentaje = Math.min((meta.ahorrado / meta.meta) * 100, 100);
              const isSelected = metaSeleccionada?.id === meta.id;
              return (
                <TouchableOpacity
                  key={meta.id}
                  style={[piggy.metaCard, isSelected && piggy.metaCardSelected]}
                  onPress={() => {
                    setMetaSeleccionada(isSelected ? null : meta);
                    setMonto('');
                    setResultado(null);
                  }}
                >
                  <View style={piggy.metaHeader}>
                    <Text style={piggy.metaNombre}>{meta.nombre}</Text>
                    <Text style={piggy.metaPorcentaje}>{porcentaje.toFixed(1)}%</Text>
                  </View>
                  <View style={piggy.progressBar}>
                    <View style={[piggy.progressFill, { width: `${porcentaje}%` }]} />
                  </View>
                  <View style={piggy.metaRow}>
                    <Text style={piggy.metaAhorrado}>Ahorrado: {formatCOP(meta.ahorrado)}</Text>
                    <Text style={piggy.metaObjetivo}>Meta: {formatCOP(meta.meta)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Input de transferencia */}
            {metaSeleccionada && (
              <View style={piggy.transferContainer}>
                <Text style={modal.inputLabel}>
                  Transferir a "{metaSeleccionada.nombre}"
                </Text>
                <View style={modal.inputRow}>
                  <Text style={modal.currencyPrefix}>$</Text>
                  <TextInput
                    style={modal.input}
                    value={monto}
                    onChangeText={(t) => { setMonto(t); setResultado(null); }}
                    placeholder="Ej: 50000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                </View>

                {resultado?.error && (
                  <View style={[modal.resultCard, modal.resultErr, { marginTop: 10 }]}>
                    <Text style={[modal.resultTitle, { color: '#dc2626' }]}>✗ {resultado.error}</Text>
                  </View>
                )}

                {resultado?.ok && (
                  <View style={[modal.resultCard, modal.resultOk, { marginTop: 10 }]}>
                    <Text style={[modal.resultTitle, { color: '#16a34a' }]}>✓ Transferencia exitosa</Text>
                    <Text style={modal.resultDetail}>Nuevo saldo: {formatCOP(resultado.nuevoSaldo)}</Text>
                    <Text style={modal.resultDetail}>Meta ahorrada: {formatCOP(resultado.meta.ahorrado)}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[piggy.transferBtn, !monto && piggy.transferBtnDisabled]}
                  onPress={handleTransferir}
                  disabled={!monto}
                >
                  <Text style={piggy.transferBtnText}>Transferir ahora</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── MODAL DE COMPRA USDT ────────────────────────────────────────────
function USDTModal({ visible, saldoCOP, onClose, onSuccess }) {
  const [montoCOP, setMontoCOP] = useState('');
  const [resultado, setResultado] = useState(null);
  const [tasaVista, setTasaVista] = useState(() => generarTasaCambio());
  const [loading, setLoading] = useState(false);

  const refreshTasa = useCallback(() => {
    setTasaVista(generarTasaCambio());
    setResultado(null);
  }, []);

  const handleClose = useCallback(() => {
    setMontoCOP('');
    setResultado(null);
    onClose();
  }, [onClose]);

  const handleComprar = useCallback(() => {
    const monto = parseFloat(montoCOP.replace(/\./g, '').replace(',', '.'));
    if (isNaN(monto)) {
      setResultado({ estado: 'Rechazado', motivo: 'Ingresa un monto válido', usdt: 0, tasa: null });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const res = comprarUSDT(saldoCOP, monto);
      setResultado(res);
      setLoading(false);
      if (res.estado === 'Aprobado') {
        setTimeout(() => {
          onSuccess(res);
          handleClose();
        }, 1800);
      }
    }, 600);
  }, [montoCOP, saldoCOP, onSuccess, handleClose]);

  const usdtEstimado = useMemo(() => {
    const m = parseFloat(montoCOP.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(m) && m > 0 && tasaVista > 0) {
      return parseFloat((m / tasaVista).toFixed(6));
    }
    return null;
  }, [montoCOP, tasaVista]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <View style={modal.usdtBadge}>
              <Text style={modal.usdtBadgeText}>₮</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.title}>Comprar USDT</Text>
              <Text style={modal.subtitle}>Tether Digital — Anclado al dólar</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={modal.closeBtn}>
              <Text style={modal.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={modal.rateCard}>
            <View style={{ flex: 1 }}>
              <Text style={modal.rateLabel}>TASA ACTUAL SIMULADA</Text>
              <Text style={modal.rateValue}>1 USDT = {formatCOP(tasaVista)}</Text>
            </View>
            <TouchableOpacity onPress={refreshTasa} style={modal.refreshBtn}>
              <Text style={modal.refreshBtnText}>↻ Actualizar</Text>
            </TouchableOpacity>
          </View>
          <View style={modal.balanceRow}>
            <Text style={modal.balanceLabel}>Saldo COP disponible:</Text>
            <Text style={[modal.balanceValue, saldoCOP < 0 && modal.dangerText]}>
              {formatCOP(saldoCOP)}
            </Text>
          </View>
          <View style={modal.inputGroup}>
            <Text style={modal.inputLabel}>Monto en pesos (COP)</Text>
            <View style={modal.inputRow}>
              <Text style={modal.currencyPrefix}>$</Text>
              <TextInput
                style={modal.input}
                value={montoCOP}
                onChangeText={(t) => { setMontoCOP(t); setResultado(null); }}
                placeholder="Ej: 500000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
            </View>
          </View>
          {usdtEstimado !== null && (
            <View style={modal.previewRow}>
              <Text style={modal.previewLabel}>Recibirías aproximadamente:</Text>
              <Text style={modal.previewValue}>{formatUSDT(usdtEstimado)}</Text>
            </View>
          )}
          {resultado && (
            <View style={[modal.resultCard, resultado.estado === 'Aprobado' ? modal.resultOk : modal.resultErr]}>
              {resultado.estado === 'Aprobado' ? (
                <>
                  <Text style={modal.resultTitle}>✓ Compra aprobada</Text>
                  <Text style={modal.resultDetail}>Recibiste: <Text style={{ fontWeight: 'bold' }}>{formatUSDT(resultado.usdt)}</Text></Text>
                  <Text style={modal.resultDetail}>Tasa aplicada: {formatCOP(resultado.tasa)}</Text>
                  <Text style={modal.resultDetail}>Nuevo saldo: {formatCOP(resultado.nuevoSaldoCOP)}</Text>
                </>
              ) : (
                <>
                  <Text style={modal.resultTitle}>✗ Transacción rechazada</Text>
                  <Text style={modal.resultDetail}>{resultado.motivo}</Text>
                </>
              )}
            </View>
          )}
          <TouchableOpacity
            style={[modal.buyBtn, (loading || !montoCOP) && modal.buyBtnDisabled]}
            onPress={handleComprar}
            disabled={loading || !montoCOP}
          >
            <Text style={modal.buyBtnText}>
              {loading ? 'Procesando...' : 'Comprar USDT'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── MODAL DE RECARGA ────────────────────────────────────────────────
const MONTOS_RAPIDOS = [50000, 100000, 200000, 500000, 1000000];
function RecargarModal({ visible, onClose, onSuccess }) {
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const handleClose = useCallback(() => {
    setMonto('');
    setConfirmado(false);
    onClose();
  }, [onClose]);

  const handleRecargar = useCallback(() => {
    const valor = parseFloat(monto.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valor) || valor <= 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setConfirmado(true);
      onSuccess(valor);
      setTimeout(handleClose, 1600);
    }, 700);
  }, [monto, onSuccess, handleClose]);

  const valorNumerico = parseFloat(monto.replace(/\./g, '').replace(',', '.'));
  const montoValido = !isNaN(valorNumerico) && valorNumerico >= 10000;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <View style={[modal.usdtBadge, { backgroundColor: '#3b82f6' }]}>
              <Text style={modal.usdtBadgeText}>+</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.title}>Recargar saldo</Text>
              <Text style={modal.subtitle}>Agrega pesos colombianos a tu cuenta</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={modal.closeBtn}>
              <Text style={modal.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[modal.rateLabel, { marginBottom: 8 }]}>MONTOS RÁPIDOS</Text>
          <View style={recargar.quickRow}>
            {MONTOS_RAPIDOS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[recargar.quickBtn, monto === String(m) && recargar.quickBtnActive]}
                onPress={() => setMonto(String(m))}
              >
                <Text style={[recargar.quickBtnText, monto === String(m) && recargar.quickBtnTextActive]}>
                  {m >= 1000000 ? `$${m / 1000000}M` : `$${m / 1000}K`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={modal.inputGroup}>
            <Text style={modal.inputLabel}>O ingresa un monto personalizado</Text>
            <View style={modal.inputRow}>
              <Text style={modal.currencyPrefix}>$</Text>
              <TextInput
                style={modal.input}
                value={monto}
                onChangeText={setMonto}
                placeholder="Ej: 300000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
            </View>
            {monto !== '' && !montoValido && (
              <Text style={recargar.hint}>Mínimo $10.000 COP</Text>
            )}
          </View>
          {montoValido && !confirmado && (
            <View style={[modal.previewRow, { backgroundColor: '#eff6ff' }]}>
              <Text style={[modal.previewLabel, { color: '#1d4ed8' }]}>Se acreditará en tu saldo:</Text>
              <Text style={[modal.previewValue, { color: '#1e40af' }]}>{formatCOP(valorNumerico)}</Text>
            </View>
          )}
          {confirmado && (
            <View style={modal.resultCard}>
              <Text style={[modal.resultTitle, { color: '#1d4ed8' }]}>✓ Recarga exitosa</Text>
              <Text style={modal.resultDetail}>Se acreditó {formatCOP(valorNumerico)} a tu saldo</Text>
            </View>
          )}
          <TouchableOpacity
            style={[recargar.recargarBtn, (!montoValido || loading) && recargar.recargarBtnDisabled]}
            onPress={handleRecargar}
            disabled={!montoValido || loading}
            activeOpacity={0.85}
          >
            <Text style={recargar.recargarBtnText}>
              {loading ? 'Procesando...' : '+ Recargar ahora'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── PANTALLA PRINCIPAL ──────────────────────────────────────────────
export default function WalletScreen() {
  const [allTransactions, setAllTransactions] = useState(() => generateTransactionHistory(250));
  const [filter, setFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [showRecargar, setShowRecargar] = useState(false);
  const [showPiggy, setShowPiggy] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState(0);

  const totalBalance = useMemo(() => calculateNetBalance(allTransactions), [allTransactions]);
  const puntosADSO = useMemo(() => calcularPuntosADSO(allTransactions), [allTransactions]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'Todos') return allTransactions;
    return allTransactions.filter(tx => tx.type === filter);
  }, [filter, allTransactions]);

  const handleRecargarSuccess = useCallback((valor) => {
    const creditTx = {
      id: `recarga-${Date.now()}`,
      accountNumber: 'RECARGA-COP',
      type: 'Ingreso',
      amount: valor,
      date: new Date(),
      status: 'Completado',
      nota: 'Recarga manual de saldo',
      puntosADSO: valor > 50000 ? parseFloat((valor * 0.01).toFixed(2)) : 0,
    };
    setAllTransactions(prev => [creditTx, ...prev]);
  }, []);

  const handleUSDTSuccess = useCallback((resultado) => {
    const debitTx = {
      id: `usdt-${Date.now()}`,
      accountNumber: 'TETHER-USDT',
      type: 'Retiro',
      amount: resultado.montoCOPUsado,
      date: new Date(),
      status: 'Completado',
      nota: `Compra USDT @ ${resultado.tasa}`,
      puntosADSO: resultado.montoCOPUsado > 50000
        ? parseFloat((resultado.montoCOPUsado * 0.01).toFixed(2)) : 0,
    };
    setAllTransactions(prev => [debitTx, ...prev]);
    setUsdtBalance(prev => parseFloat((prev + resultado.usdt).toFixed(6)));
  }, []);

  const handlePiggyTransferir = useCallback((monto, nombreMeta) => {
    const debitTx = {
      id: `piggy-${Date.now()}`,
      accountNumber: 'PIGGY-BANK',
      type: 'Retiro',
      amount: monto,
      date: new Date(),
      status: 'Completado',
      nota: `Ahorro: ${nombreMeta}`,
      puntosADSO: 0,
    };
    setAllTransactions(prev => [debitTx, ...prev]);
  }, []);

  const renderItem = ({ item }) => {
    const isIngreso = item.type === 'Ingreso';
    const isUSDT = item.accountNumber === 'TETHER-USDT';
    const isPiggy = item.accountNumber === 'PIGGY-BANK';
    return (
      <View style={[styles.card, isUSDT && styles.usdtCard, isPiggy && styles.piggyCard]}>
        <View style={styles.cardRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isUSDT && <View style={styles.usdtDot} />}
            {isPiggy && <View style={styles.piggyDot} />}
            <Text style={styles.accountText}>
              {isUSDT ? '₮ USDT' : isPiggy ? '🐷 Ahorro' : `Ref: ${item.accountNumber}`}
            </Text>
          </View>
          <Text style={[styles.amountText, isIngreso ? styles.greenText : styles.redText]}>
            {isIngreso ? '+' : '−'} {formatCOP(item.amount)}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.statusText}>Estado: {item.status}</Text>
          <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('es-CO')}</Text>
        </View>
        {item.nota && <Text style={styles.notaText}>{item.nota}</Text>}
        {item.puntosADSO > 0 && (
          <Text style={styles.puntosText}>
            ★ +{item.puntosADSO.toLocaleString('es-CO')} pts ADSO
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Saldo Neto Total</Text>
        <Text style={styles.balanceValue}>{formatCOP(totalBalance)}</Text>
        {usdtBalance > 0 && (
          <View style={styles.usdtPill}>
            <Text style={styles.usdtPillText}>₮ {usdtBalance.toFixed(6)} USDT</Text>
          </View>
        )}
        {puntosADSO > 0 && (
          <View style={styles.adsoRow}>
            <View style={styles.adsoPill}>
              <Text style={styles.adsoPillText}>
                ★ {puntosADSO.toLocaleString('es-CO')} Puntos ADSO
              </Text>
            </View>
          </View>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.recargarBtn} onPress={() => setShowRecargar(true)} activeOpacity={0.85}>
            <Text style={styles.recargarBtnText}>+ Recargar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyUSDTBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <Text style={styles.buyUSDTBtnText}>💵 USDT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.piggyBtn} onPress={() => setShowPiggy(true)} activeOpacity={0.85}>
            <Text style={styles.piggyBtnText}>🐷 Ahorrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {['Todos', 'Ingreso', 'Retiro'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.activeButton,
              f === 'Ingreso' && styles.greenBtnBorder,
              f === 'Retiro' && styles.redBtnBorder,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={styles.filterButtonText}>{f === 'Todos' ? 'Todos' : f + 's'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContainer}
      />

      <USDTModal visible={showModal} saldoCOP={totalBalance} onClose={() => setShowModal(false)} onSuccess={handleUSDTSuccess} />
      <RecargarModal visible={showRecargar} onClose={() => setShowRecargar(false)} onSuccess={handleRecargarSuccess} />
      <PiggyBankModal visible={showPiggy} saldoCOP={totalBalance} onClose={() => setShowPiggy(false)} onTransferir={handlePiggyTransferir} />
    </SafeAreaView>
  );
}

// ── ESTILOS ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  balanceContainer: { backgroundColor: '#0f172a', padding: 24, margin: 16, borderRadius: 20, alignItems: 'center' },
  balanceLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  balanceValue: { color: '#ffffff', fontSize: 34, fontWeight: 'bold', marginTop: 6 },
  usdtPill: { marginTop: 12, backgroundColor: '#1c3a2a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#26d97f55' },
  usdtPillText: { color: '#26d97f', fontWeight: '700', fontSize: 13 },
  adsoRow: { marginTop: 8 },
  adsoPill: { backgroundColor: '#2d1a6e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#7c3aed55' },
  adsoPillText: { color: '#a78bfa', fontWeight: '700', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, width: '100%' },
  recargarBtn: { flex: 1, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  recargarBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  buyUSDTBtn: { flex: 1, backgroundColor: '#26d97f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buyUSDTBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  piggyBtn: { flex: 1, backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  piggyBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginBottom: 12 },
  filterButton: { flex: 1, paddingVertical: 10, marginHorizontal: 4, backgroundColor: '#e2e8f0', borderRadius: 8, alignItems: 'center' },
  activeButton: { backgroundColor: '#cbd5e1' },
  greenBtnBorder: { borderBottomWidth: 3, borderBottomColor: '#10b981' },
  redBtnBorder: { borderBottomWidth: 3, borderBottomColor: '#ef4444' },
  filterButtonText: { fontWeight: '600', color: '#334155' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 10 },
  usdtCard: { backgroundColor: '#f0fdf9', borderLeftWidth: 3, borderLeftColor: '#26d97f' },
  piggyCard: { backgroundColor: '#fffbeb', borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  usdtDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#26d97f' },
  piggyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  accountText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  greenText: { color: '#10b981' },
  redText: { color: '#ef4444' },
  statusText: { fontSize: 12, color: '#64748b' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  notaText: { fontSize: 11, color: '#059669', marginTop: 4, fontStyle: 'italic' },
  puntosText: { fontSize: 11, color: '#7c3aed', marginTop: 4, fontStyle: 'italic', fontWeight: '600' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  usdtBadge: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#26d97f', alignItems: 'center', justifyContent: 'center' },
  usdtBadgeText: { color: '#0f172a', fontWeight: '900', fontSize: 22 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 20, color: '#94a3b8' },
  rateCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  rateLabel: { fontSize: 10, color: '#94a3b8', letterSpacing: 0.8 },
  rateValue: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  refreshBtn: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  refreshBtnText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  balanceLabel: { fontSize: 14, color: '#64748b' },
  balanceValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  dangerText: { color: '#ef4444' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14 },
  currencyPrefix: { fontSize: 20, color: '#94a3b8', marginRight: 8 },
  input: { flex: 1, fontSize: 22, fontWeight: '700', color: '#0f172a', paddingVertical: 14 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12 },
  previewLabel: { fontSize: 13, color: '#16a34a' },
  previewValue: { fontSize: 15, fontWeight: '700', color: '#15803d' },
  resultCard: { borderRadius: 12, padding: 14, marginBottom: 16 },
  resultOk: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  resultErr: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  resultTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  resultDetail: { fontSize: 13, color: '#475569', marginTop: 2 },
  buyBtn: { backgroundColor: '#26d97f', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  buyBtnDisabled: { backgroundColor: '#a7f3d0' },
  buyBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 17 },
});

const recargar = StyleSheet.create({
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 20, borderWidth: 1.5, borderColor: '#bfdbfe' },
  quickBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  quickBtnText: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  quickBtnTextActive: { color: '#ffffff' },
  hint: { fontSize: 11, color: '#ef4444', marginTop: 4 },
  recargarBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  recargarBtnDisabled: { backgroundColor: '#93c5fd' },
  recargarBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 17 },
});

const piggy = StyleSheet.create({
  metaCard: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#fde68a' },
  metaCardSelected: { borderColor: '#f59e0b', backgroundColor: '#fef3c7' },
  metaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaNombre: { fontSize: 14, fontWeight: '700', color: '#92400e', flex: 1 },
  metaPorcentaje: { fontSize: 14, fontWeight: '800', color: '#d97706' },
  progressBar: { height: 8, backgroundColor: '#fde68a', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaAhorrado: { fontSize: 12, color: '#78350f' },
  metaObjetivo: { fontSize: 12, color: '#92400e' },
  transferContainer: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginTop: 4 },
  transferBtn: { backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  transferBtnDisabled: { backgroundColor: '#fde68a' },
  transferBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
});