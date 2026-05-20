import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { generateTransactionHistory, calculateNetBalance } from '../../walletEngine';

export default function WalletScreen() {
  const [allTransactions] = useState(() => generateTransactionHistory(250));
  const [filter, setFilter] = useState('Todos');
  const [selectedTx, setSelectedTx] = useState(null); // ← transacción seleccionada

  const totalBalance = useMemo(() => calculateNetBalance(allTransactions), [allTransactions]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'Todos') return allTransactions;
    return allTransactions.filter(tx => tx.type === filter);
  }, [filter, allTransactions]);

  const formatCOP = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const renderItem = ({ item }) => {
    const isIngreso = item.type === 'Ingreso';
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedTx(item)}>
        <View style={styles.cardRow}>
          <Text style={styles.accountText}>Ref: {item.accountNumber}</Text>
          <Text style={[styles.amountText, isIngreso ? styles.greenText : styles.redText]}>
            {isIngreso ? '+' : '-'} {formatCOP(item.amount)}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.statusText}>Estado: {item.status}</Text>
          <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('es-CO')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Saldo Neto Total</Text>
        <Text style={styles.balanceValue}>{formatCOP(totalBalance)}</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, filter === 'Todos' && styles.activeButton]} onPress={() => setFilter('Todos')}>
          <Text style={styles.filterButtonText}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, filter === 'Ingreso' && styles.activeButton, styles.greenBtnBorder]} onPress={() => setFilter('Ingreso')}>
          <Text style={styles.filterButtonText}>Ingresos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, filter === 'Retiro' && styles.activeButton, styles.redBtnBorder]} onPress={() => setFilter('Retiro')}>
          <Text style={styles.filterButtonText}>Retiros</Text>
        </TouchableOpacity>
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

      {/* Modal de detalle */}
      <Modal visible={!!selectedTx} transparent animationType="slide" onRequestClose={() => setSelectedTx(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedTx && (
              <>
                <Text style={styles.modalTitle}>Detalle de Transacción</Text>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Tipo</Text>
                  <Text style={[styles.modalValue, selectedTx.type === 'Ingreso' ? styles.greenText : styles.redText]}>
                    {selectedTx.type}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Monto</Text>
                  <Text style={[styles.modalValue, selectedTx.type === 'Ingreso' ? styles.greenText : styles.redText]}>
                    {selectedTx.type === 'Ingreso' ? '+' : '-'} {formatCOP(selectedTx.amount)}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Referencia</Text>
                  <Text style={styles.modalValue}>{selectedTx.accountNumber}</Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Estado</Text>
                  <Text style={styles.modalValue}>{selectedTx.status}</Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Fecha</Text>
                  <Text style={styles.modalValue}>
                    {new Date(selectedTx.date).toLocaleDateString('es-CO', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>ID</Text>
                  <Text style={[styles.modalValue, { fontSize: 11, color: '#94a3b8' }]}>{selectedTx.id}</Text>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedTx(null)}>
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  balanceContainer: { backgroundColor: '#0f172a', padding: 24, margin: 16, borderRadius: 16, alignItems: 'center' },
  balanceLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  balanceValue: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', marginTop: 8 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginBottom: 12 },
  filterButton: { flex: 1, paddingVertical: 10, marginHorizontal: 4, backgroundColor: '#e2e8f0', borderRadius: 8, alignItems: 'center' },
  activeButton: { backgroundColor: '#cbd5e1' },
  greenBtnBorder: { borderBottomWidth: 3, borderBottomColor: '#10b981' },
  redBtnBorder: { borderBottomWidth: 3, borderBottomColor: '#ef4444' },
  filterButtonText: { fontWeight: '600', color: '#334155' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  accountText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  greenText: { color: '#10b981' },
  redText: { color: '#ef4444' },
  statusText: { fontSize: 12, color: '#64748b' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  modalValue: { fontSize: 14, color: '#1e293b', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  closeButton: { marginTop: 20, backgroundColor: '#0f172a', padding: 16, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});