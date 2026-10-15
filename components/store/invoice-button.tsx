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
    const items = (order.order_items ?? []).map((item) => `
      <tr><td>${safe(item.product_name)}${item.variant && item.variant !== "Default" ? `<small>Variant: ${safe(item.variant)}</small>` : ""}</td>
      <td class="num">${item.quantity}</td><td class="num">${money(item.unit_price_paise)}</td><td class="num">${money(item.line_total_paise)}</td></tr>`).join("")
    const address = [order.address, order.landmark, order.city, order.state, order.pincode].filter(Boolean).map(safe).join(", ")
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Timora invoice ${safe(invoiceNumber)}</title>
      <style>
      *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#171717;margin:0;padding:36px}header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #c6a449;padding-bottom:20px}
      h1{margin:0;color:#9a762b;letter-spacing:3px;font-size:30px}h2{font-size:20px;margin:0 0 8px}.muted{color:#666;font-size:12px;line-height:1.6}.right{text-align:right}.blocks{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:26px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:12px 8px;border-bottom:1px solid #ddd;text-align:left}th{background:#f7f4ec;font-size:11px;text-transform:uppercase}small{display:block;color:#666;margin-top:4px}.num{text-align:right;white-space:nowrap}.totals{margin:20px 0 0 auto;width:min(100%,320px)}.line{display:flex;justify-content:space-between;gap:20px;padding:6px 0}.grand{border-top:2px solid #c6a449;margin-top:8px;padding-top:12px;font-size:18px;font-weight:bold}.note{margin-top:35px;padding-top:14px;border-top:1px solid #ddd;color:#666;font-size:11px;line-height:1.6}.pill{display:inline-block;background:#f7f4ec;padding:6px 9px;border-radius:4px;text-transform:capitalize}
      @media print{body{padding:0}@page{size:A4;margin:16mm}}
      </style></head><body>
      <header><div><h1>TIMORA</h1><p class="muted">Timeless Style. Modern Shopping.</p></div><div class="right"><h2>INVOICE</h2><div>Invoice reference: ${safe(invoiceNumber)}</div><div class="muted">Order date: ${safe(new Date(order.created_at).toLocaleDateString("en-IN"))}</div><div class="muted">Order ID: ${safe(order.id)}</div></div></header>
      <div class="blocks"><section><h2>Bill to</h2><strong>${safe(order.customer_name)}</strong><p class="muted">${safe(order.customer_email || "")}<br>${safe(order.customer_phone || "")}<br>${address}</p></section>
      <section><h2>Order & payment</h2><p>Order status: <span class="pill">${safe((order.order_status || "received").replace(/_/g, " "))}</span></p><p>Payment: ${safe((order.payment_provider || "Not provided").replace(/_/g, " "))} · ${safe(order.payment_status || "status unavailable")}</p></section></div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${items || '<tr><td colspan="4">No item details available</td></tr>'}</tbody></table>
      <div class="totals"><div class="line"><span>Subtotal</span><span>${money(order.subtotal_paise)}</span></div>
      ${Number(order.discount_paise || 0) > 0 ? `<div class="line"><span>Discount ${order.coupon_code ? `(${safe(order.coupon_code)})` : ""}</span><span>−${money(Number(order.discount_paise))}</span></div>` : ""}
      <div class="line"><span>Shipping</span><span>${money(order.shipping_paise)}</span></div><div class="line grand"><span>Total</span><span>${money(order.total_paise)}</span></div></div>
      <div class="note"><strong>Invoice information</strong><br>This document reflects the order details recorded by Timora. Tax/GST is not separately represented because seller GST registration and tax breakdown were not supplied to this invoice view. For a GST tax invoice, configure the seller's legal details and applicable tax data before issuing it.<br>Thank you for shopping with Timora.</div>
      <script>window.onload=()=>window.print()</script></body></html>`
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
