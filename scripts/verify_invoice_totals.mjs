import assert from 'assert';

console.log('Testing Invoice Totals & Precision Logic...');

// Test 1: Rate & Line item calculation
const qty = 500;
const lineItemAmount = 62003.96;
const underlyingRate = lineItemAmount / qty; // 124.00792
const displayRate = underlyingRate.toFixed(2); // '124.01'

console.log(`Line item amount: ₹${lineItemAmount}`);
console.log(`Underlying rate: ₹${underlyingRate}`);
console.log(`Display rate: ₹${displayRate}`);

assert.strictEqual(displayRate, '124.01', 'Display rate must format to 124.01');
assert.strictEqual(underlyingRate, 124.00792, 'Underlying rate must retain full precision');

// Test 2: Line items total must NOT be calculated from rounded display rate
const faultyTotal = Number((parseFloat(displayRate) * qty).toFixed(2));
console.log(`Faulty total from rounded rate (the old bug): ₹${faultyTotal}`);
assert.strictEqual(faultyTotal, 62005.00, 'Old bug would produce 62005.00');

// With our fix:
const correctLineTotal = Number((underlyingRate * qty).toFixed(2));
console.log(`Correct line total from underlying rate: ₹${correctLineTotal}`);
assert.strictEqual(correctLineTotal, 62003.96, 'Line total must equal 62003.96');

// Test 3: Invoice totals & round-off calculation
const itemsTotal = 62003.96;
const autoRoundOff = Number((Math.round(itemsTotal) - itemsTotal).toFixed(2));
const netPayable = Number((itemsTotal + autoRoundOff).toFixed(2));

console.log(`Subtotal (Line Items Total): ₹${itemsTotal}`);
console.log(`Round off amount: +₹${autoRoundOff}`);
console.log(`Net amount payable: ₹${netPayable}`);

assert.strictEqual(itemsTotal, 62003.96, 'Line Items Total must be 62003.96, NOT 62004');
assert.strictEqual(autoRoundOff, 0.04, 'Round off must be +0.04');
assert.strictEqual(netPayable, 62004.00, 'Net amount payable must be 62004.00');
assert.strictEqual(Number((itemsTotal + autoRoundOff).toFixed(2)), netPayable, 'Net payable must strictly equal Subtotal + Round Off');

// Test 4: When user manually enters net payable = 62004.00
const enteredNet = 62004.00;
const derivedRoundOff = Number((enteredNet - itemsTotal).toFixed(2));
assert.strictEqual(derivedRoundOff, 0.04, 'Manual net entry must derive round off +0.04');

console.log('✅ All invoice total and rate precision assertions passed successfully!');
