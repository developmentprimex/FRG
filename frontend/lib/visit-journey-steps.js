// Shared by the browser, ingestion endpoint and admin report. Ranks are per flow.
export const JOURNEY_STEPS = {
  language: { flow: "FRG", rank: 10, en: "Language", de: "Sprache" },
  mode: { flow: "FRG", rank: 20, en: "Video / text selection", de: "Video- / Textauswahl" },
  text: { flow: "FRG", rank: 30, en: "Text introduction", de: "Text-Einführung" },
  video: { flow: "FRG", rank: 30, en: "Video introduction", de: "Video-Einführung" },
  contract: { flow: "FRG", rank: 40, en: "Contract form", de: "Vertragsformular" },
  contract_accepted: { flow: "FRG", rank: 45, server: true, en: "Contract verified", de: "Vertrag geprüft" },
  contract_rejected: { flow: "FRG", rank: 40, server: true, en: "Contract access failed", de: "Vertragszugriff fehlgeschlagen" },
  kitchen: { flow: "FRG", rank: 50, en: "Kitchen configurator", de: "Küchenkonfigurator" },
  products: { flow: "FRG", rank: 60, en: "Product selection interaction", de: "Produktauswahl bedient" },
  order_form: { flow: "FRG", rank: 70, en: "Order form", de: "Bestellformular" },
  order_created: { flow: "FRG", rank: 80, server: true, en: "Order saved", de: "Bestellung gespeichert" },
  checkout_created: { flow: "FRG", rank: 85, server: true, en: "Payment session created", de: "Zahlungssitzung erstellt" },
  checkout_return: { flow: "FRG", rank: 85, en: "Payment return page", de: "Rückkehr von der Zahlung" },
  payment_paid: { flow: "FRG", rank: 90, server: true, en: "Payment confirmed", de: "Zahlung bestätigt" },
  payment_failed: { flow: "FRG", rank: 85, server: true, en: "Payment attempt failed", de: "Zahlungsversuch fehlgeschlagen" },
  payment_requires_action: { flow: "FRG", rank: 85, server: true, en: "Additional payment verification required", de: "Zusätzliche Zahlungsprüfung erforderlich" },
  payment_canceled: { flow: "FRG", rank: 85, server: true, en: "Payment canceled", de: "Zahlung abgebrochen" },
  payment_pending: { flow: "FRG", rank: 85, server: true, en: "Payment pending", de: "Zahlung ausstehend" },
  checkout_expired: { flow: "FRG", rank: 85, server: true, en: "Payment session expired", de: "Zahlungssitzung abgelaufen" },
  service_start: { flow: "ASC", rank: 10, en: "Service start", de: "Service-Start" },
  service_complaint: { flow: "ASC", rank: 20, en: "Complaint form", de: "Reklamationsformular" },
  service_register: { flow: "ASC", rank: 20, en: "Registration form", de: "Registrierungsformular" },
  service_registered_next: { flow: "ASC", rank: 20, en: "Registered customer", de: "Registrierter Kunde" },
  service_contract_found: { flow: "ASC", rank: 30, server: true, en: "Service contract found", de: "Servicevertrag gefunden" },
  service_contract_not_found: { flow: "ASC", rank: 20, server: true, en: "Service contract not found", de: "Servicevertrag nicht gefunden" },
  service_submitted: { flow: "ASC", rank: 40, server: true, en: "Service claim submitted", de: "Reklamation eingereicht" },
  service_verification: { flow: "ASC", rank: 25, en: "Registration verification", de: "Registrierung bestätigen" },
  service_registered: { flow: "ASC", rank: 35, server: true, en: "Registration verified", de: "Registrierung bestätigt" },
};

export const JOURNEY_VISITOR_COOKIE = "fragmento_visit_id";
export const journeySessionCookie = (flow) => `fragmento_visit_${flow.toLowerCase()}`;
export const isJourneyId = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

