import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  SafeAreaView, TextInput, Modal, Animated, ScrollView
} from 'react-native';
import { generateTransactionHistory, calculateNetBalance, comprarUSDT, generarTasaCambio } from './walletEngine';

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const formatUSDT = (value) =>
  `${parseFloat(value).toFixed(6)} USDT`;

// ─── USDT PURCHASE MODAL ─────────────────────────────────────────────────────

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

          {/* Tasa de cambio */}
          <View style={modal.rateCard}>
            <View style={{ flex: 1 }}>
              <Text style={modal.rateLabel}>Tasa actual simulada</Text>
              <Text style={modal.rateValue}>
                1 USDT = {formatCOP(tasaVista)}
              </Text>
            </View>
            <TouchableOpacity onPress={refreshTasa} style={modal.refreshBtn}>
              <Text style={modal.refreshBtnText}>↻ Actualizar</Text>
            </TouchableOpacity>
          </View>

          {/* Saldo disponible */}
          <View style={modal.balanceRow}>
            <Text style={modal.balanceLabel}>Saldo COP disponible:</Text>
            <Text style={[modal.balanceValue, saldoCOP < 0 && modal.dangerText]}>
              {formatCOP(saldoCOP)}
            </Text>
          </View>

          {/* Input monto */}
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

          {/* Preview USDT */}
          {usdtEstimado !== null && (
            <View style={modal.previewRow}>
              <Text style={modal.previewLabel}>Recibirías aproximadamente:</Text>
              <Text style={modal.previewValue}>{formatUSDT(usdtEstimado)}</Text>
            </View>
          )}

          {/* Resultado */}
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
            style={[modal.buyBtn, loading && modal.buyBtnLoading]}
            onPress={handleComprar}
            disabled={loading || !montoCOP}
          >
            <Text style={modal.buyBtnText}>
              {loading ? 'Procesando...' : `Comprar USDT`}
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN WALLET SCREEN ───────────────────────────────────────────────────────

export default function WalletScreen() {
  const [allTransactions, setAllTransactions] = useState(() => generateTransactionHistory(250));
  const [filter, setFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState(0);

  const totalBalance = useMemo(() => calculateNetBalance(allTransactions), [allTransactions]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'Todos') return allTransactions;
    return allTransactions.filter(tx => tx.type === filter);
  }, [filter, allTransactions]);

  const handleUSDTSuccess = useCallback((resultado) => {
    const debitTx = {
      id: `usdt-${Date.now()}`,
      accountNumber: 'TETHER-USDT',
      type: 'Retiro',
      amount: resultado.montoCOPUsado,
      date: new Date(),
      status: 'Completado',
      nota: `Compra USDT @ ${resultado.tasa}`,
    };
    setAllTransactions(prev => [debitTx, ...prev]);
    setUsdtBalance(prev => parseFloat((prev + resultado.usdt).toFixed(6)));
  }, []);

  const renderItem = ({ item }) => {
    const isIngreso = item.type === 'Ingreso';
    const isUSDT = item.accountNumber === 'TETHER-USDT';
    return (
      <View style={[styles.card, isUSDT && styles.usdtCard]}>
        <View style={styles.cardRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isUSDT && <View style={styles.usdtDot} />}
            <Text style={styles.accountText}>
              {isUSDT ? '₮ USDT' : `Ref: ${item.accountNumber}`}
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
        {item.nota && (
          <Text style={styles.notaText}>{item.nota}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Balance principal ── */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Saldo Neto Total</Text>
        <Text style={styles.balanceValue}>{formatCOP(totalBalance)}</Text>

        {usdtBalance > 0 && (
          <View style={styles.usdtBalanceRow}>
            <View style={styles.usdtPill}>
              <Text style={styles.usdtPillText}>₮ {usdtBalance.toFixed(6)} USDT</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.buyUSDTBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.buyUSDTBtnText}>Comprar Dólares Digitales (USDT)</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filtros ── */}
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

      <USDTModal
        visible={showModal}
        saldoCOP={totalBalance}
        onClose={() => setShowModal(false)}
        onSuccess={handleUSDTSuccess}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },

  balanceContainer: {
    backgroundColor: '#0f172a', padding: 24, margin: 16,
    borderRadius: 20, alignItems: 'center',
  },
  balanceLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  balanceValue: { color: '#ffffff', fontSize: 34, fontWeight: 'bold', marginTop: 6 },

  usdtBalanceRow: { marginTop: 12 },
  usdtPill: {
    backgroundColor: '#1c3a2a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#26d97f33',
  },
  usdtPillText: { color: '#26d97f', fontWeight: '700', fontSize: 13 },

  buyUSDTBtn: {
    marginTop: 16, backgroundColor: '#26d97f', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24, width: '100%', alignItems: 'center',
  },
  buyUSDTBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },

  filterContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginBottom: 12 },
  filterButton: {
    flex: 1, paddingVertical: 10, marginHorizontal: 4,
    backgroundColor: '#e2e8f0', borderRadius: 8, alignItems: 'center',
  },
  activeButton: { backgroundColor: '#cbd5e1' },
  greenBtnBorder: { borderBottomWidth: 3, borderBottomColor: '#10b981' },
  redBtnBorder: { borderBottomWidth: 3, borderBottomColor: '#ef4444' },
  filterButtonText: { fontWeight: '600', color: '#334155' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 10 },
  usdtCard: { backgroundColor: '#f0fdf9', borderLeftWidth: 3, borderLeftColor: '#26d97f' },
  usdtDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#26d97f' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  accountText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  greenText: { color: '#10b981' },
  redText: { color: '#ef4444' },
  statusText: { fontSize: 12, color: '#64748b' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  notaText: { fontSize: 11, color: '#059669', marginTop: 4, fontStyle: 'italic' },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  usdtBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#26d97f',
    alignItems: 'center', justifyContent: 'center',
  },
  usdtBadgeText: { color: '#0f172a', fontWeight: '900', fontSize: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },

  rateCard: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    marginBottom: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  rateLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  rateValue: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  refreshBtn: {
    backgroundColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  refreshBtnText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  balanceLabel: { fontSize: 14, color: '#64748b' },
  balanceValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  dangerText: { color: '#ef4444' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    backgroundColor: '#f8fafc', paddingHorizontal: 14,
  },
  currencyPrefix: { fontSize: 18, color: '#94a3b8', marginRight: 8 },
  input: { flex: 1, fontSize: 20, fontWeight: '700', color: '#0f172a', paddingVertical: 14 },

  previewRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12,
  },
  previewLabel: { fontSize: 13, color: '#16a34a' },
  previewValue: { fontSize: 15, fontWeight: '700', color: '#15803d' },

  resultCard: { borderRadius: 12, padding: 14, marginBottom: 16 },
  resultOk: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  resultErr: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  resultTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  resultDetail: { fontSize: 13, color: '#475569', marginTop: 2 },

  buyBtn: {
    backgroundColor: '#26d97f', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  buyBtnLoading: { backgroundColor: '#86efac' },
  buyBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 17 },
});