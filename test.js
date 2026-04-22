/**
 * Test file for calculator.js
 */

const calculator = require('./calculator');

console.log('=== Calculator Tests ===\n');

// Test addition
console.log('Addition:');
console.log('5 + 3 =', calculator.add(5, 3));
console.log('10 + (-5) =', calculator.add(10, -5));

// Test subtraction
console.log('\nSubtraction:');
console.log('10 - 4 =', calculator.subtract(10, 4));
console.log('5 - 8 =', calculator.subtract(5, 8));

// Test multiplication
console.log('\nMultiplication:');
console.log('6 * 7 =', calculator.multiply(6, 7));
console.log('9 * 0 =', calculator.multiply(9, 0));

// Test division
console.log('\nDivision:');
console.log('20 / 4 =', calculator.divide(20, 4));
console.log('15 / 3 =', calculator.divide(15, 3));

// Test division by zero
console.log('\nDivision by zero:');
try {
  console.log('10 / 0 =', calculator.divide(10, 0));
} catch (error) {
  console.log('Error:', error.message);
}

console.log('\n=== Tests Complete ===');
