"use client"

import { FileText } from "lucide-react"

type InvoiceItem = {
  product_name: string
  quantity: number
  unit_price_paise: number
  line_total_paise: number
  variant?: string | null
}
type InvoiceOrder = {
  id: string
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  address: string
  landmark?: string | null
  city: string
  state: string
  pincode: string
  subtotal_paise: number
  shipping_paise: number
  discount_paise?: number
  coupon_code?: string | null
  total_paise: number
  payment_provider?: string | null
  payment_status?: string | null
  order_status?: string | null
  created_at: string
  order_items?: InvoiceItem[]
}

const money = (paise: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(paise || 0) / 100)

const safe = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
}[char] || char))

export function InvoiceButton({ order, admin = false }: { order: InvoiceOrder; admin?: boolean }) {
  function printInvoice() {
    if (order.order_status === "pending_payment" || order.order_status === "cancelled") {
      window.alert("An invoice is available after the order is confirmed. Pending or cancelled orders cannot be invoiced.")
      return
    }
    const invoiceNumber = `TM-${new Date(order.created_at).getFullYear()}-${order.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`
    const items = (order.order_items ?? []).map((item, index) => `
      <tr><td><span class="item-index">${String(index + 1).padStart(2, "0")}</span><span class="item-name">${safe(item.product_name)}</span>${item.variant && item.variant !== "Default" ? `<small>Variant: ${safe(item.variant)}</small>` : ""}</td>
      <td class="num">${item.quantity}</td><td class="num">${money(item.unit_price_paise)}</td><td class="num amount">${money(item.line_total_paise)}</td></tr>`).join("")
    const address = [order.address, order.landmark, order.city, order.state, order.pincode].filter(Boolean).map(safe).join(", ")
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Timora invoice ${safe(invoiceNumber)}</title>
      <style>
      :root{--gold:#b08b35;--ink:#191914;--muted:#77766f;--line:#e8e4d9;--paper:#fff;--soft:#f8f6f0}
      *{box-sizing:border-box}body{font:14px/1.55 Arial,Helvetica,sans-serif;color:var(--ink);margin:0;background:#f0eee8;padding:28px}
      .sheet{max-width:850px;margin:0 auto;background:var(--paper);padding:44px 48px;box-shadow:0 12px 45px #00000012}
      header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:28px;border-bottom:1px solid var(--line)}
      .brand-mark{font-size:30px;font-weight:800;letter-spacing:5px;color:var(--gold);margin:0}.tagline{margin:4px 0;color:var(--muted);font-size:11px;letter-spacing:1.5px;text-transform:uppercase}
      .eyebrow{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:bold}.doc-title{font-size:26px;letter-spacing:1px;margin:3px 0 8px}.meta{font-size:11px;color:var(--muted);line-height:1.9}.right{text-align:right}
      .status{display:inline-block;background:var(--soft);border:1px solid var(--line);padding:4px 9px;border-radius:20px;font-size:10px;text-transform:capitalize}
      .blocks{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:26px 0}.panel{border:1px solid var(--line);padding:17px 18px;border-radius:8px;min-width:0}.panel h2{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin:0 0 10px}.customer{font-size:16px;font-weight:bold}.muted{color:var(--muted);font-size:12px;line-height:1.7;overflow-wrap:anywhere}
      table{width:100%;border-collapse:collapse;margin-top:12px}th{background:var(--soft);color:#68665d;font-size:9px;text-transform:uppercase;letter-spacing:1px;padding:12px 10px;text-align:left}td{padding:14px 10px;border-bottom:1px solid var(--line);font-size:12px}th:first-child,td:first-child{width:52%}.num{text-align:right;white-space:nowrap}.item-index{display:inline-block;color:var(--gold);font-size:10px;margin-right:10px}.item-name{font-weight:600}small{display:block;color:var(--muted);margin:4px 0 0 28px;font-size:10px}.amount{font-weight:600}
      .bottom{display:flex;justify-content:flex-end;margin-top:24px}.totals{border:1px solid var(--line);border-radius:8px;padding:16px 18px}.line{display:flex;justify-content:space-between;gap:16px;padding:7px 0;font-size:12px}.line span:first-child{color:var(--muted)}.grand{border-top:1px solid var(--line);margin-top:8px;padding-top:14px;font-size:17px;font-weight:bold}.grand span:first-child{color:var(--ink)}.grand span:last-child{color:var(--gold)}
      footer{margin-top:32px;padding-top:18px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:16px;color:var(--muted);font-size:10px}.thanks{font-size:13px;color:var(--ink);font-weight:bold}
      @media(max-width:620px){body{padding:0;background:#fff}.sheet{padding:24px 18px;box-shadow:none}header{gap:12px}.brand-mark{font-size:23px;letter-spacing:3px}.doc-title{font-size:20px}.blocks,.bottom{display:flex;justify-content:flex-end}.right{max-width:52%;overflow-wrap:anywhere}.bottom{gap:14px}td,th{padding:10px 5px;font-size:10px}th:first-child,td:first-child{width:auto}.item-index{margin-right:4px}}
      @media print{body{padding:0;background:#fff}.sheet{max-width:none;padding:0;box-shadow:none}@page{size:A4;margin:15mm}}
      </style></head><body><main class="sheet">
      <header><div><p class="brand-mark">TIMORA</p><p class="tagline">Timeless style. Modern shopping.</p></div><div class="right"><div class="eyebrow">Order document</div><h1 class="doc-title">INVOICE</h1><div class="meta">Reference: ${safe(invoiceNumber)}<br>Order date: ${safe(new Date(order.created_at).toLocaleDateString("en-IN"))}<br>Order ID: ${safe(order.id)}</div></div></header>
      <div class="blocks"><section class="panel"><h2>Customer / bill to</h2><div class="customer">${safe(order.customer_name)}</div><p class="muted">${safe(order.customer_email || "")}<br>${safe(order.customer_phone || "")}<br>${address}</p></section>
      <section class="panel"><h2>Order details</h2><p>Order status: <span class="status">${safe((order.order_status || "received").replace(/_/g, " "))}</span></p><p class="muted">Payment method: ${safe((order.payment_provider || "Not provided").replace(/_/g, " "))}<br>Payment status: ${safe(order.payment_status || "Not available")}</p></section></div>
      <div class="eyebrow">Purchased items</div><table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${items || '<tr><td colspan="4">No item details available</td></tr>'}</tbody></table>
      <div class="bottom"><section class="totals"><div class="eyebrow">Payment summary</div><div class="line"><span>Subtotal</span><span>${money(order.subtotal_paise)}</span></div>
      ${Number(order.discount_paise || 0) > 0 ? `<div class="line"><span>Discount ${order.coupon_code ? `(${safe(order.coupon_code)})` : ""}</span><span>−${money(Number(order.discount_paise))}</span></div>` : ""}
      <div class="line"><span>Shipping</span><span>${money(order.shipping_paise)}</span></div><div class="line grand"><span>Order total</span><span>${money(order.total_paise)}</span></div></section></div>
      <footer><span>Thank you for choosing Timora.</span><span>Generated from Timora order records</span></footer></main><script>window.onload=()=>window.print()</script></body></html>`
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
      window.alert("Please allow pop-ups for Timora to open your printable invoice.")
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  return <button type="button" onClick={printInvoice} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#d4af37]/35 px-4 text-sm text-[#e4c878] transition hover:bg-[#d4af37]/10">
    <FileText className="size-4" /> {admin ? "View / print invoice" : "Download invoice"}
  </button>
}
