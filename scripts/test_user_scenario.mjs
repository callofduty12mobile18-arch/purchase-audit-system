// Test script for the exact user scenario specified in Step 7
// Invoice: ₹1,00,000
// Cash: ₹20,000
// Cheque: ₹80,000

function calculateBreakdown(invoiceAmount, payments) {
  let totalCash = 0;
  let totalClearedCheques = 0;
  let totalPendingCheques = 0;

  for (const p of payments) {
    if (p.payment_status === 'CLEARED') {
      if (p.payment_method === 'CASH') {
        totalCash += p.amount;
      } else if (p.payment_method === 'CHEQUE') {
        totalClearedCheques += p.amount;
      }
    } else if (p.payment_method === 'CHEQUE' && p.payment_status === 'PENDING') {
      totalPendingCheques += p.amount;
    }
  }

  const clearedAmount = Number((totalCash + totalClearedCheques).toFixed(2));
  const outstandingAmount = Number(Math.max(0, invoiceAmount - clearedAmount).toFixed(2));
  const pendingChequeAmount = Number(totalPendingCheques.toFixed(2));

  let payment_status = 'UNPAID';
  if (clearedAmount >= (invoiceAmount - 0.01)) {
    payment_status = 'PAID';
  } else if (clearedAmount > 0) {
    payment_status = 'PARTIALLY_PAID';
  } else if (pendingChequeAmount > 0) {
    payment_status = 'CHEQUE_PENDING';
  } else {
    payment_status = 'UNPAID';
  }

  return {
    invoiceAmount,
    totalCash,
    totalClearedCheques,
    clearedAmount,
    outstandingAmount,
    pendingChequeAmount,
    status: payment_status
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('=====================================================');
console.log('Testing User Required Scenario (Step 7)');
console.log('Invoice Amount: ₹1,00,000');
console.log('=====================================================\n');

const INVOICE_AMOUNT = 100000;

// Step 1: After cash payment of ₹20,000
console.log('1. After cash payment of ₹20,000:');
const step1Payments = [
  { id: '1', payment_method: 'CASH', amount: 20000, payment_status: 'CLEARED' }
];
const res1 = calculateBreakdown(INVOICE_AMOUNT, step1Payments);
assert(res1.clearedAmount === 20000, 'Cleared Amount = ₹20,000');
assert(res1.outstandingAmount === 80000, 'Outstanding Amount = ₹80,000');
assert(res1.status === 'PARTIALLY_PAID', 'Status = PARTIALLY_PAID');
console.log(`   -> Cleared: ₹${res1.clearedAmount}, Outstanding: ₹${res1.outstandingAmount}, Status: ${res1.status}\n`);

// Step 2: After cheque issuance of ₹80,000 (status = PENDING)
console.log('2. After cheque issuance of ₹80,000 (PENDING):');
const step2Payments = [
  { id: '1', payment_method: 'CASH', amount: 20000, payment_status: 'CLEARED' },
  { id: '2', payment_method: 'CHEQUE', amount: 80000, payment_status: 'PENDING' }
];
const res2 = calculateBreakdown(INVOICE_AMOUNT, step2Payments);
assert(res2.outstandingAmount === 80000, 'Outstanding Amount = ₹80,000 (issuing cheque must NOT reduce outstanding balance)');
assert(res2.pendingChequeAmount === 80000, 'Pending Cheque Amount = ₹80,000');
assert(res2.clearedAmount === 20000, 'Cleared Amount remains ₹20,000');
console.log(`   -> Outstanding: ₹${res2.outstandingAmount}, Pending Cheque: ₹${res2.pendingChequeAmount}\n`);

// Step 3: After cheque clearance (status = CLEARED)
console.log('3. After cheque clearance:');
const step3Payments = [
  { id: '1', payment_method: 'CASH', amount: 20000, payment_status: 'CLEARED' },
  { id: '2', payment_method: 'CHEQUE', amount: 80000, payment_status: 'CLEARED' }
];
const res3 = calculateBreakdown(INVOICE_AMOUNT, step3Payments);
assert(res3.outstandingAmount === 0, 'Outstanding Amount = ₹0');
assert(res3.pendingChequeAmount === 0, 'Pending Cheque Amount = ₹0');
assert(res3.clearedAmount === 100000, 'Cleared Amount = ₹1,00,000');
assert(res3.status === 'PAID', 'Status = PAID');
console.log(`   -> Outstanding: ₹${res3.outstandingAmount}, Status: ${res3.status}\n`);

// Step 4: After cheque bounce (status = BOUNCED)
console.log('4. After cheque bounce:');
const step4Payments = [
  { id: '1', payment_method: 'CASH', amount: 20000, payment_status: 'CLEARED' },
  { id: '2', payment_method: 'CHEQUE', amount: 80000, payment_status: 'BOUNCED' }
];
const res4 = calculateBreakdown(INVOICE_AMOUNT, step4Payments);
assert(res4.outstandingAmount === 80000, 'Outstanding Amount = ₹80,000 (bounced cheque does not count as payment)');
assert(res4.pendingChequeAmount === 0, 'Pending Cheque Amount = ₹0');
assert(res4.clearedAmount === 20000, 'Cleared Amount = ₹20,000');
assert(res4.status === 'PARTIALLY_PAID', 'Status = PARTIALLY_PAID');
console.log(`   -> Outstanding: ₹${res4.outstandingAmount}, Status: ${res4.status}\n`);

console.log('=====================================================');
console.log(`Scenario Validation Result: ${passed} passed, ${failed} failed`);
console.log('=====================================================');

if (failed > 0) process.exit(1);

