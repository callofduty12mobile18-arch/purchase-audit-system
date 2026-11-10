// Test script for Cash + Cheque Partial Payment calculations and status logic
// Run with: node scripts/test_partial_payments_logic.mjs

function calculatePaymentSummary(invoiceAmount, payments) {
  let totalCash = 0;
  let totalClearedCheques = 0;
  let totalPendingCheques = 0;
  let totalBouncedCheques = 0;
  let totalCancelledCheques = 0;

  for (const p of payments) {
    if (p.payment_method === 'CASH') {
      if (p.payment_status === 'CLEARED') {
        totalCash += p.amount;
      }
    } else if (p.payment_method === 'CHEQUE') {
      if (p.payment_status === 'CLEARED') {
        totalClearedCheques += p.amount;
      } else if (p.payment_status === 'PENDING') {
        totalPendingCheques += p.amount;
      } else if (p.payment_status === 'BOUNCED') {
        totalBouncedCheques += p.amount;
      } else if (p.payment_status === 'CANCELLED') {
        totalCancelledCheques += p.amount;
      }
    }
  }

  const clearedAmount = Number((totalCash + totalClearedCheques).toFixed(2));
  const outstandingAmount = Number(Math.max(0, invoiceAmount - clearedAmount).toFixed(2));
  const pendingChequeAmount = Number(totalPendingCheques.toFixed(2));

  // Validation: Total committed payments (cleared + pending) cannot exceed invoice amount
  const committedTotal = Number((clearedAmount + pendingChequeAmount).toFixed(2));
  const exceedsInvoice = committedTotal > (invoiceAmount + 0.01);

  // Status calculation
  let status = 'UNPAID';
  if (clearedAmount >= (invoiceAmount - 0.01)) {
    status = 'PAID';
  } else if (clearedAmount > 0) {
    status = 'PARTIALLY_PAID';
  } else if (pendingChequeAmount > 0) {
    status = 'CHEQUE_PENDING';
  } else {
    status = 'UNPAID';
  }

  return {
    invoiceAmount,
    clearedAmount,
    outstandingAmount,
    pendingChequeAmount,
    totalBouncedCheques,
    committedTotal,
    exceedsInvoice,
    status
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

console.log('--- Testing Partial Payment Business Logic ---');

// Test 1: Brand new invoice with no payments
{
  const res = calculatePaymentSummary(10000, []);
  assert(res.clearedAmount === 0, 'Cleared amount is 0');
  assert(res.outstandingAmount === 10000, 'Outstanding amount is full invoice amount');
  assert(res.pendingChequeAmount === 0, 'Pending cheque amount is 0');
  assert(res.status === 'UNPAID', 'Status is UNPAID');
}

// Test 2: Issuing a cheque must NOT reduce outstanding balance
{
  const res = calculatePaymentSummary(10000, [
    { payment_method: 'CHEQUE', amount: 10000, payment_status: 'PENDING' }
  ]);
  assert(res.clearedAmount === 0, 'Pending cheque does not increase cleared amount');
  assert(res.outstandingAmount === 10000, 'Outstanding amount remains 10000');
  assert(res.pendingChequeAmount === 10000, 'Pending cheque amount is 10000');
  assert(res.status === 'CHEQUE_PENDING', 'Status is CHEQUE_PENDING');
}

// Test 3: Partial cash payment
{
  const res = calculatePaymentSummary(10000, [
    { payment_method: 'CASH', amount: 4000, payment_status: 'CLEARED' }
  ]);
  assert(res.clearedAmount === 4000, 'Cleared amount is 4000');
  assert(res.outstandingAmount === 6000, 'Outstanding amount is reduced to 6000');
  assert(res.status === 'PARTIALLY_PAID', 'Status is PARTIALLY_PAID');
}

// Test 4: Partial cash + Partial pending cheque
{
  const res = calculatePaymentSummary(10000, [
    { payment_method: 'CASH', amount: 4000, payment_status: 'CLEARED' },
    { payment_method: 'CHEQUE', amount: 6000, payment_status: 'PENDING' }
  ]);
  assert(res.clearedAmount === 4000, 'Cleared amount reflects only cash (4000)');
  assert(res.outstandingAmount === 6000, 'Outstanding remains 6000 until cheque clears');
  assert(res.pendingChequeAmount === 6000, 'Pending cheque is 6000');
  assert(res.status === 'PARTIALLY_PAID', 'Status is PARTIALLY_PAID (cash was received)');
}

// Test 5: Cheque clears -> Invoice becomes fully PAID
{
  const res = calculatePaymentSummary(10000, [
    { payment_method: 'CASH', amount: 4000, payment_status: 'CLEARED' },
    { payment_method: 'CHEQUE', amount: 6000, payment_status: 'CLEARED' }
  ]);
  assert(res.clearedAmount === 10000, 'Cleared amount is 10000');
  assert(res.outstandingAmount === 0, 'Outstanding is 0');
  assert(res.pendingChequeAmount === 0, 'Pending is 0');
  assert(res.status === 'PAID', 'Status becomes PAID');
}

// Test 6: Bounced cheque does not count as payment
{
  const res = calculatePaymentSummary(10000, [
    { payment_method: 'CASH', amount: 4000, payment_status: 'CLEARED' },
    { payment_method: 'CHEQUE', amount: 6000, payment_status: 'BOUNCED' }
  ]);
  assert(res.clearedAmount === 4000, 'Cleared amount is still only 4000');
  assert(res.outstandingAmount === 6000, 'Outstanding remains 6000');
  assert(res.pendingChequeAmount === 0, 'Bounced cheque is not pending');
  assert(res.status === 'PARTIALLY_PAID', 'Status remains PARTIALLY_PAID');
}

// Test 7: Prevent payments exceeding invoice amount (considering both cleared & pending)
{
  const res = calculatePaymentSummary(10000, [
    { payment_method: 'CASH', amount: 4000, payment_status: 'CLEARED' },
    { payment_method: 'CHEQUE', amount: 7000, payment_status: 'PENDING' }
  ]);
  assert(res.exceedsInvoice === true, 'Correctly flags that 4000 + 7000 = 11000 exceeds 10000');
}

// Test 8: Multiple partial cheques and cash payments
{
  const res = calculatePaymentSummary(20000, [
    { payment_method: 'CASH', amount: 5000, payment_status: 'CLEARED' },
    { payment_method: 'CHEQUE', amount: 5000, payment_status: 'CLEARED' },
    { payment_method: 'CHEQUE', amount: 5000, payment_status: 'PENDING' }
  ]);
  assert(res.clearedAmount === 10000, 'Cleared is 5000 cash + 5000 cleared cheque = 10000');
  assert(res.outstandingAmount === 10000, 'Outstanding is 20000 - 10000 = 10000');
  assert(res.pendingChequeAmount === 5000, 'Pending cheque is 5000');
  assert(res.status === 'PARTIALLY_PAID', 'Status is PARTIALLY_PAID');
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

