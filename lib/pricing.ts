import { fromGhs, round2 } from "./format";
import type { Quote, SnapshotLine } from "./types";

export function priceQuote(quote: Quote, travelers: number) {
  const lines = quote.items.map((item) => {
    const supplier = item.qty * item.unitPrice;
    const ghs = supplier * (quote.fx[item.currency] || 0);
    return { ...item, supplier, ghs };
  });
  const supplierGhs = lines.reduce((sum, line) => sum + line.ghs, 0);
  const sellGhs = supplierGhs * (1 + quote.marginPct / 100);
  const factor = supplierGhs === 0 ? 1 : sellGhs / supplierGhs;
  const sellInvoice = round2(fromGhs(sellGhs, quote.invoiceCurrency, quote.fx));
  const presented = lines.map((line) => ({
    ...line,
    client: round2(fromGhs(line.ghs * factor, quote.invoiceCurrency, quote.fx)),
  }));
  if (presented.length) {
    const drift = round2(sellInvoice - presented.reduce((sum, line) => sum + line.client, 0));
    presented[presented.length - 1].client = round2(presented[presented.length - 1].client + drift);
  }
  return {
    lines,
    presented,
    supplierGhs,
    sellGhs,
    sellInvoice,
    perPerson: travelers > 0 ? sellInvoice / travelers : sellInvoice,
  };
}

export function contractFromQuote(quote: Quote, travelers: number) {
  const priced = priceQuote(quote, travelers);
  const lines: SnapshotLine[] = priced.presented.map((line) => ({
    description: line.description,
    qty: line.qty,
    unit: line.unit,
    amount: line.client,
  }));
  return {
    total: priced.sellInvoice,
    currency: quote.invoiceCurrency,
    fx: quote.fx,
    fxLocked: quote.fxLocked,
    lines,
  };
}
