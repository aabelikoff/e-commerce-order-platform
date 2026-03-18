export function strOpToFloat(op: string): number {
  const numOp = parseFloat(op);
  if (!isFinite(numOp)) {
    throw new Error(`Invalid numeric value: ${op}`);
  }
  return numOp;
}

export function arrOpToFloat(...ops: string[]): number[] {
  return ops.map((op) => strOpToFloat(op));
}

export function safeSum(fixed: number, ...ops: string[]): string {
  if (ops.length === 0) {
    throw new Error('At least one operand required');
  }

  const n = Math.abs(Math.floor(fixed));
  const numOps = arrOpToFloat(...ops);
  const result = numOps.reduce((a, b) => a + b, 0);

  return result.toFixed(n);
}

export function safeSub(fixed: number, ...ops: string[]): string {
  if (ops.length === 0) {
    throw new Error('At least one operand required');
  }

  const n = Math.abs(Math.floor(fixed));
  const numOps = arrOpToFloat(...ops);
  const result = numOps.reduce((a, b) => a - b);

  return result.toFixed(n);
}

export function safeMul(fixed: number, ...ops: string[]): string {
  if (ops.length === 0) {
    throw new Error('At least one operand required');
  }

  const n = Math.abs(Math.floor(fixed));
  const numOps = arrOpToFloat(...ops);
  const result = numOps.reduce((a, b) => a * b, 1);

  return result.toFixed(n);
}

export function safeDiv(fixed: number, ...ops: string[]): string {
  if (ops.length === 0) {
    throw new Error('At least one operand required');
  }

  const n = Math.abs(Math.floor(fixed));
  const numOps = arrOpToFloat(...ops);
  const result = numOps.reduce((a, b) => {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  });

  if (!isFinite(result)) {
    throw new Error('Result is not finite');
  }

  return result.toFixed(n);
}
