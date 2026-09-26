"use client";

import type { ShowcaseManifest, ShowcaseSelectionSnapshot } from "@showcase/core";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

export type CommerceTab = "reserve" | "test-drive" | "quote";

export interface CommerceModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: ShowcaseSelectionSnapshot;
  manifest: ShowcaseManifest;
  initialTab?: CommerceTab;
}

interface PriceItem {
  label: string;
  detail?: string;
  amount: number;
}

const pricingTable: Record<string, { label: string; amount: number }> = {
  // Trims
  "trim-touring": { label: "Astra One Touring Dual Motor", amount: 74500 },
  "trim-sport": { label: "Astra One Sport Aero Vectoring", amount: 89500 },
  // Finishes
  "finish-graphite": { label: "Graphite Solid Coat", amount: 0 },
  "finish-silver": { label: "Liquid Silver Metallic", amount: 1200 },
  "finish-blue": { label: "Ion Blue Tri-Coat Metallic", amount: 1500 },
  "finish-red": { label: "Signal Red Multi-Layer Tint", amount: 1800 },
  // Lighting & Motion
  "lighting-on": { label: "Signature Matrix LED Package", amount: 0 },
  "lighting-off": { label: "Signature Matrix LED (Dormant)", amount: 0 },
  "motion-pulse": { label: "Adaptive Signature Dynamics Package", amount: 850 },
  "motion-static": { label: "Standard Static Drive Profile", amount: 0 },
  // Furniture pricing fallbacks if furniture manifest
  "upholstery-obsidian": { label: "Obsidian Nappa Leather", amount: 2450 },
  "upholstery-cognac": { label: "Cognac Heritage Saddle Leather", amount: 2650 },
  "upholstery-forest": { label: "Nordic Forest Wool Textile", amount: 2150 },
  "upholstery-boucle": { label: "Oatmeal Textured Bouclé", amount: 2250 },
  "base-aluminum": { label: "Polished Die-Cast Aluminum Base", amount: 0 },
  "base-obsidian": { label: "Matte Obsidian Anodized Base", amount: 250 },
  "base-gold": { label: "Champagne Gold Architectural Base", amount: 450 },
  "ergo-focus": { label: "Precision Ergonomic Focus Mechanism", amount: 0 },
  "ergo-recline": { label: "Active Dynamic Recline with Cervical Lumbar", amount: 350 },
};

const showrooms = [
  { id: "sf", name: "San Francisco Flagship", city: "San Francisco, CA" },
  { id: "oslo", name: "Nordic Design Studio", city: "Oslo, Norway" },
  { id: "munich", name: "Bavaria Tech Experience", city: "Munich, Germany" },
  { id: "tokyo", name: "Shibuya Innovation Space", city: "Tokyo, Japan" },
  { id: "singapore", name: "Marina Bay Showroom", city: "Singapore" },
];

export function CommerceModal({
  isOpen,
  onClose,
  snapshot,
  manifest,
  initialTab = "reserve",
}: CommerceModalProps) {
  const [tab, setTab] = useState<CommerceTab>(initialTab);
  const [submittedTab, setSubmittedTab] = useState<CommerceTab | null>(null);
  const [referenceCode, setReferenceCode] = useState<string>("");

  // Reservation form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showroom, setShowroom] = useState(showrooms[0]?.id ?? "sf");
  const [paymentMethod, setPaymentMethod] = useState("card");

  // Test drive state
  const [driveDate, setDriveDate] = useState("2026-10-15");
  const [driveTime, setDriveTime] = useState("14:00");
  const [hasLicense, setHasLicense] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const modalTitleId = useId();

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setSubmittedTab(null);
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate pricing breakdown
  const { lineItems, subtotal, destinationFee, total, depositAmount } = useMemo(() => {
    const isFurniture = manifest.slug.includes("furniture") || manifest.slug.includes("chair");
    const items: PriceItem[] = [];

    // Base trim / product
    let baseFound = false;
    for (const optionId of snapshot.optionIds) {
      const match = pricingTable[optionId];
      if (match) {
        if (!baseFound && (optionId.startsWith("trim-") || optionId.startsWith("upholstery-"))) {
          items.unshift({
            label: match.label,
            detail: "Primary Specification",
            amount: match.amount,
          });
          baseFound = true;
        } else if (match.amount > 0) {
          items.push({
            label: match.label,
            detail: "Selected Enhancement",
            amount: match.amount,
          });
        }
      }
    }

    if (!baseFound) {
      const defaultBase = isFurniture ? 2450 : 74500;
      items.unshift({
        label: isFurniture ? "Kroma Lounge Chair Base" : "Astra One Touring Base",
        detail: "Standard Build",
        amount: defaultBase,
      });
    }

    const destFee = isFurniture ? 180 : 1250;
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const calculatedTotal = calculatedSubtotal + destFee;
    const deposit = isFurniture ? 300 : 1000;

    return {
      lineItems: items,
      subtotal: calculatedSubtotal,
      destinationFee: destFee,
      total: calculatedTotal,
      depositAmount: deposit,
    };
  }, [manifest.slug, snapshot.optionIds]);

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = manifest.slug.includes("furniture") ? "KROMA-RES" : "ASTRA-RES";
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    setReferenceCode(`${prefix}-2027-${randomSuffix}`);
    setSubmittedTab("reserve");
  };

  const handleTestDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = manifest.slug.includes("furniture") ? "CONSULT" : "DRIVE";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setReferenceCode(`${prefix}-ASTRA-${randomSuffix}`);
    setSubmittedTab("test-drive");
  };

  const handleCopyQuote = useCallback(async () => {
    const quotePayload = {
      product: manifest.title,
      snapshot,
      pricing: {
        lineItems,
        subtotal,
        destinationFee,
        total,
      },
      exportedAt: new Date().toISOString(),
    };

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(JSON.stringify(quotePayload, null, 2));
      setToastMessage("Itemized quotation JSON copied to clipboard");
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [lineItems, manifest.title, snapshot, subtotal, destinationFee, total]);

  if (!isOpen) return null;

  return (
    <div
      className="commerce-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="commerce-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <header className="commerce-modal-header">
          <div className="commerce-modal-title-group">
            <span className="commerce-kicker">COMMERCE ADAPTER / ZERO ENGINE COUPLING</span>
            <h2 id={modalTitleId}>{manifest.title} Commercial Gateway</h2>
            <div className="commerce-selection-pill">
              <span className="status-dot" aria-hidden="true" />
              <span>Snapshot: {snapshot.optionIds.join(" · ")}</span>
            </div>
          </div>
          <button
            type="button"
            className="commerce-close-btn"
            onClick={onClose}
            aria-label="Close commerce modal"
          >
            ✕
          </button>
        </header>

        <nav className="commerce-tabs" role="tablist" aria-label="Commerce workflows">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "reserve"}
            className="commerce-tab-btn"
            data-active={tab === "reserve"}
            onClick={() => {
              setTab("reserve");
              setSubmittedTab(null);
            }}
          >
            <span>1. Reserve Allocation</span>
            <span className="tab-badge">${depositAmount.toLocaleString()}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "test-drive"}
            className="commerce-tab-btn"
            data-active={tab === "test-drive"}
            onClick={() => {
              setTab("test-drive");
              setSubmittedTab(null);
            }}
          >
            <span>2. Schedule Experience</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "quote"}
            className="commerce-tab-btn"
            data-active={tab === "quote"}
            onClick={() => {
              setTab("quote");
              setSubmittedTab(null);
            }}
          >
            <span>3. Itemized Quote</span>
            <span className="tab-badge">${total.toLocaleString()}</span>
          </button>
        </nav>

        <div className="commerce-modal-body">
          {/* TAB 1: RESERVATION */}
          {tab === "reserve" && !submittedTab && (
            <div className="commerce-grid">
              <form className="commerce-form" onSubmit={handleReservationSubmit}>
                <div className="commerce-form-intro">
                  <h3>Production Allocation Reservation</h3>
                  <p>
                    Lock in your custom build based on the active 3D configuration snapshot.
                    Your deposit is fully refundable at any time prior to final build lock.
                  </p>
                </div>

                <div className="form-field-group">
                  <label htmlFor="res-name">Full Legal Name</label>
                  <input
                    id="res-name"
                    type="text"
                    required
                    placeholder="e.g. Jordan V. Mercer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-field-group">
                    <label htmlFor="res-email">Email Address</label>
                    <input
                      id="res-email"
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-field-group">
                    <label htmlFor="res-phone">Telephone / Mobile</label>
                    <input
                      id="res-phone"
                      type="tel"
                      required
                      placeholder="+1 (555) 019-2834"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label htmlFor="res-showroom">Preferred Delivery Experience Center</label>
                  <select
                    id="res-showroom"
                    value={showroom}
                    onChange={(e) => setShowroom(e.target.value)}
                  >
                    {showrooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Payment Method for Refundable Deposit</label>
                  <div className="payment-options">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                      />
                      <span>Credit Card / Apple Pay</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="payment"
                        value="wire"
                        checked={paymentMethod === "wire"}
                        onChange={() => setPaymentMethod("wire")}
                      />
                      <span>Direct Wire / Corporate ACH</span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="commerce-submit-btn">
                  Confirm ${depositAmount.toLocaleString()} Refundable Reservation
                </button>
                <span className="guarantee-note">
                  🔒 Encrypted 256-bit SSL handoff · Zero renderer state coupled to checkout
                </span>
              </form>

              <aside className="commerce-summary-card">
                <h4>Build Estimate Summary</h4>
                <div className="summary-lines">
                  {lineItems.map((item, idx) => (
                    <div className="summary-line" key={idx}>
                      <div>
                        <strong>{item.label}</strong>
                        {item.detail && <span>{item.detail}</span>}
                      </div>
                      <span>
                        {item.amount === 0 ? "Included" : `$${item.amount.toLocaleString()}`}
                      </span>
                    </div>
                  ))}
                  <div className="summary-line">
                    <div>
                      <strong>Destination & Handover Inspection</strong>
                      <span>Direct Factory Logistics</span>
                    </div>
                    <span>${destinationFee.toLocaleString()}</span>
                  </div>
                </div>

                <div className="summary-totals">
                  <div className="total-row">
                    <span>Estimated Total MSRP</span>
                    <strong>${total.toLocaleString()}</strong>
                  </div>
                  <div className="deposit-row">
                    <span>Due Today (Refundable)</span>
                    <span className="deposit-badge">${depositAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="snapshot-footnote">
                  <span>Generic Snapshot Contract:</span>
                  <code>{JSON.stringify(snapshot.selection)}</code>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: SCHEDULE TEST DRIVE / EXPERIENCE */}
          {tab === "test-drive" && !submittedTab && (
            <form className="commerce-form test-drive-form" onSubmit={handleTestDriveSubmit}>
              <div className="commerce-form-intro">
                <h3>Schedule Private Experience Session</h3>
                <p>
                  Experience the physical feel, materials, and dynamics with a dedicated product
                  specialist at our authorized experience centers.
                </p>
              </div>

              <div className="form-row">
                <div className="form-field-group">
                  <label htmlFor="drive-showroom">Location</label>
                  <select
                    id="drive-showroom"
                    value={showroom}
                    onChange={(e) => setShowroom(e.target.value)}
                  >
                    {showrooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field-group">
                  <label htmlFor="drive-date">Preferred Date</label>
                  <input
                    id="drive-date"
                    type="date"
                    required
                    value={driveDate}
                    onChange={(e) => setDriveDate(e.target.value)}
                  />
                </div>
                <div className="form-field-group">
                  <label htmlFor="drive-time">Time Slot</label>
                  <select
                    id="drive-time"
                    value={driveTime}
                    onChange={(e) => setDriveTime(e.target.value)}
                  >
                    <option value="10:00">10:00 AM – Morning Session</option>
                    <option value="14:00">02:00 PM – Afternoon Session</option>
                    <option value="16:30">04:30 PM – Sunset Session</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field-group">
                  <label htmlFor="drive-name">Driver Full Name</label>
                  <input
                    id="drive-name"
                    type="text"
                    required
                    placeholder="Jordan Mercer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-field-group">
                  <label htmlFor="drive-email">Confirmation Email</label>
                  <input
                    id="drive-email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  required
                  checked={hasLicense}
                  onChange={(e) => setHasLicense(e.target.checked)}
                />
                <span>
                  I confirm that I hold a valid, non-provisional driver's license / identity card and
                  am at least 21 years of age.
                </span>
              </label>

              <button type="submit" className="commerce-submit-btn">
                Confirm Private Experience Session
              </button>
            </form>
          )}

          {/* TAB 3: ITEMIZED QUOTE */}
          {tab === "quote" && (
            <div className="quote-breakdown-view">
              <div className="quote-header">
                <div>
                  <h3>Itemized Build Specification & Quotation</h3>
                  <p>
                    Verified against Snapshot ID <code>{snapshot.slug}</code>. Pricing includes
                    active paint, aero package, and standard regional homologation.
                  </p>
                </div>
                <div className="quote-actions">
                  <button type="button" onClick={handleCopyQuote} className="secondary-btn">
                    Copy JSON Quote Spec
                  </button>
                </div>
              </div>

              <div className="quote-table-container">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th scope="col">Component / Specification</th>
                      <th scope="col">Selection Code</th>
                      <th scope="col">Detail</th>
                      <th scope="col" className="text-right">
                        Price (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{item.label}</strong>
                        </td>
                        <td>
                          <code>{snapshot.optionIds[idx] ?? "STD"}</code>
                        </td>
                        <td>{item.detail ?? "Included Option"}</td>
                        <td className="text-right">
                          {item.amount === 0 ? "Included" : `$${item.amount.toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <strong>Logistics & Pre-Delivery Prep</strong>
                      </td>
                      <td>
                        <code>LOG-FACTORY</code>
                      </td>
                      <td>Factory Direct Transport & PDI</td>
                      <td className="text-right">${destinationFee.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={3}>
                        Total Estimated Vehicle Price
                      </th>
                      <td className="text-right total-cell">${total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="quote-footer-notice">
                <span>Architecture Guarantee:</span>
                <p>
                  This quotation was calculated exclusively from the decoupling boundary{" "}
                  <code>ShowcaseSelectionSnapshot</code>. The showcase canvas and rendering engine
                  remain completely isolated from financial and order lifecycle transactions.
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {submittedTab && (
            <div className="commerce-success-screen" role="status" aria-live="polite">
              <div className="success-icon" aria-hidden="true">
                ✓
              </div>
              <span className="success-kicker">
                {submittedTab === "reserve"
                  ? "ALLOCATION SECURED"
                  : "EXPERIENCE APPOINTMENT CONFIRMED"}
              </span>
              <h3>Transaction Reference: {referenceCode}</h3>
              <p className="success-desc">
                {submittedTab === "reserve"
                  ? `Thank you, ${name || "Client"}. Your allocation deposit of $${depositAmount.toLocaleString()} has been processed. A full build sheet has been dispatched to ${email || "your email"}.`
                  : `Your test drive session is confirmed for ${driveDate} at ${driveTime} at our ${showrooms.find((s) => s.id === showroom)?.name}. An advisor will prepare your vehicle.`}
              </p>

              <div className="success-digest">
                <span className="digest-label">Bound Selection Snapshot</span>
                <code>{JSON.stringify(snapshot, null, 2)}</code>
              </div>

              <div className="success-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={async () => {
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(
                        `Reference: ${referenceCode}\nSnapshot: ${JSON.stringify(snapshot)}`,
                      );
                      setToastMessage("Reference and snapshot copied to clipboard");
                      setTimeout(() => setToastMessage(null), 3000);
                    }
                  }}
                >
                  Copy Order Digest
                </button>
                <button type="button" className="commerce-submit-btn" onClick={onClose}>
                  Return to 3D Showcase
                </button>
              </div>
            </div>
          )}
        </div>

        {toastMessage && (
          <div className="commerce-toast" role="status" aria-live="polite">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
