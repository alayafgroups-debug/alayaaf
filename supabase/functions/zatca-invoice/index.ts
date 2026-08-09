import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { KJUR, X509 } from "npm:jsrsasign@11.1.3";
import {
  BuyerData,
  Certificate,
  InvoiceData,
  InvoiceLineData,
  InvoiceSigner,
  SellerData,
  ZatcaInvoice,
} from "npm:@khaledhajsalem/zatca-node@1.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const SIMULATION_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation";
const ZATCA_INITIAL_PIH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const clean = (value: unknown) => String(value ?? "").trim();
const escapeXmlText = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function parseRegisteredAddress(location: string) {
  const normalized = location.replace(/\s+/g, " ").trim();
  const buildingNumber = normalized.match(/\b\d{4}\b/)?.[0] ?? "0000";
  const postalZone = normalized.match(/\b\d{5}\b/)?.[0] ?? "00000";
  const parts = normalized
    .split(/[،,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const cityName =
    parts.find((part) =>
      /مكة|جدة|الرياض|المدينة|الدمام|الخبر|الطائف/.test(part),
    ) ?? "الرياض";
  const citySubdivisionName = parts[1] ?? "الفرع الرئيسي";
  const streetName = (parts[0] ?? normalized)
    .replace(new RegExp(`^${buildingNumber}\\s*`), "")
    .trim();
  return {
    buildingNumber,
    postalZone,
    cityName,
    citySubdivisionName,
    streetName: streetName || "العنوان الوطني",
  };
}

function toCertificatePem(binarySecurityToken: string) {
  const compactToken = binarySecurityToken.replace(/\s+/g, "");
  const decoded = Buffer.from(compactToken, "base64").toString("utf8").trim();
  if (decoded.includes("-----BEGIN CERTIFICATE-----")) return decoded;
  const certificateBody =
    /^[A-Za-z0-9+/=\s]+$/.test(decoded) && decoded.length > 100
      ? decoded.replace(/\s+/g, "")
      : compactToken;
  return `-----BEGIN CERTIFICATE-----\n${certificateBody.match(/.{1,64}/g)?.join("\n") ?? certificateBody}\n-----END CERTIFICATE-----`;
}

function createCompatibleCertificate(
  certificatePem: string,
  privateKeyPem: string,
  secret: string,
) {
  const x509 = new X509();
  x509.readCertPEM(certificatePem);
  const certificateBody = certificatePem.replace(
    /-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g,
    "",
  );
  const issuer = x509
    .getIssuerString()
    .split("/")
    .filter(Boolean)
    .reverse()
    .join(", ");
  const serialNumber = BigInt(`0x${x509.getSerialNumberHex()}`).toString(10);

  return {
    getRawCertificate: () => certificatePem,
    getSecretKey: () => secret,
    getCertHash: () =>
      Buffer.from(
        createHash("sha256").update(certificateBody).digest("hex"),
        "utf8",
      ).toString("base64"),
    getFormattedIssuer: () => issuer,
    getSerialNumber: () => serialNumber,
    getRawPublicKey: () =>
      Buffer.from(x509.getPublicKeyHex(), "hex").toString("base64"),
    getCertSignature: () => Buffer.from(x509.getSignatureValueHex(), "hex"),
    sign: (data: Buffer) => {
      const signature = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
      signature.init(privateKeyPem);
      signature.updateHex(data.toString("hex"));
      return Buffer.from(signature.sign(), "hex");
    },
  } as unknown as Certificate;
}

function correctXadesDigests(xml: string, certificate: Certificate) {
  const signingTime = xml.match(
    /<xades:SigningTime>([^<]+)<\/xades:SigningTime>/,
  )?.[1];
  if (!signingTime) throw new Error("تعذر التحقق من وقت توقيع XAdES");

  const signedPropertiesXml =
    '<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="xadesSignedProperties">\n' +
    "                                <xades:SignedSignatureProperties>\n" +
    `                                    <xades:SigningTime>${signingTime}</xades:SigningTime>\n` +
    "                                    <xades:SigningCertificate>\n" +
    "                                        <xades:Cert>\n" +
    "                                            <xades:CertDigest>\n" +
    '                                                <ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>\n' +
    `                                                <ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certificate.getCertHash()}</ds:DigestValue>\n` +
    "                                            </xades:CertDigest>\n" +
    "                                            <xades:IssuerSerial>\n" +
    `                                                <ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certificate.getFormattedIssuer()}</ds:X509IssuerName>\n` +
    `                                                <ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certificate.getSerialNumber()}</ds:X509SerialNumber>\n` +
    "                                            </xades:IssuerSerial>\n" +
    "                                        </xades:Cert>\n" +
    "                                    </xades:SigningCertificate>\n" +
    "                                </xades:SignedSignatureProperties>\n" +
    "                            </xades:SignedProperties>";
  const digest = Buffer.from(
    createHash("sha256").update(signedPropertiesXml, "utf8").digest("hex"),
    "utf8",
  ).toString("base64");

  const correctedType = xml.replace(
    'Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties"',
    'Type="http://uri.etsi.org/01903#SignedProperties" URI="#xadesSignedProperties"',
  );
  return correctedType.replace(
    /(<ds:Reference Type="http:\/\/uri\.etsi\.org\/01903#SignedProperties" URI="#xadesSignedProperties">[\s\S]*?<ds:DigestValue>)[^<]*(<\/ds:DigestValue>)/,
    `$1${digest}$2`,
  );
}

function tlv(tag: number, value: Buffer) {
  return Buffer.concat([
    Buffer.from([tag, value.length]),
    value,
  ]);
}

function buildQrPayload(input: {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vatTotal: string;
  invoiceHash: string;
  signature: string;
  publicKey: Buffer;
  certificateSignature: Buffer;
  simplified: boolean;
}) {
  const chunks = [
    tlv(1, Buffer.from(input.sellerName, "utf8")),
    tlv(2, Buffer.from(input.vatNumber, "utf8")),
    tlv(3, Buffer.from(input.timestamp, "utf8")),
    tlv(4, Buffer.from(input.total, "utf8")),
    tlv(5, Buffer.from(input.vatTotal, "utf8")),
    tlv(6, Buffer.from(input.invoiceHash, "utf8")),
    tlv(7, Buffer.from(input.signature, "base64")),
    tlv(8, input.publicKey),
  ];
  if (input.simplified) chunks.push(tlv(9, input.certificateSignature));
  return Buffer.concat(chunks).toString("base64");
}

function buildSignedInvoice(input: {
  setup: any;
  invoice: any;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxPercent: number;
  }>;
  icv: number;
  previousHash: string;
  uuid: string;
  documentType: "invoice" | "creditNote" | "debitNote";
  originalInvoiceId?: string;
}) {
  const {
    setup,
    invoice,
    lines,
    icv,
    previousHash,
    uuid,
    documentType,
    originalInvoiceId,
  } = input;
  const address = parseRegisteredAddress(String(setup.branch_location));
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const simplified = invoice.invoice_type !== "standard";

  const document = new InvoiceData()
    .setInvoiceNumber(String(invoice.id))
    .setIssueDate(clean(invoice.date) || now.slice(0, 10))
    .setIssueTime(now.slice(11, 19))
    .setDueDate(clean(invoice.due_date) || clean(invoice.date) || now.slice(0, 10))
    .setCurrencyCode("SAR")
    .setDocumentCurrencyCode("SAR")
    .setTaxCurrencyCode("SAR")
    .setInvoiceCounter(String(icv))
    .setPreviousInvoiceHash(previousHash);

  if (simplified) document.simplified();
  else document.standard();
  if (documentType === "creditNote") document.creditNote();
  else if (documentType === "debitNote") document.debitNote();
  else document.taxInvoice();

  const seller = new SellerData()
    .setRegistrationName(escapeXmlText(setup.company_name_ar))
    .setVatNumber(String(setup.vat_number))
    .setPartyIdentification(String(setup.commercial_registration))
    .setPartyIdentificationId("CRN")
    .setStreetName(escapeXmlText(address.streetName))
    .setBuildingNumber(address.buildingNumber)
    .setCitySubdivisionName(escapeXmlText(address.citySubdivisionName))
    .setCityName(escapeXmlText(address.cityName))
    .setPostalZone(address.postalZone)
    .setCountryCode("SA");

  const buyerAddress = parseRegisteredAddress(
    clean(invoice.customer_address) || "1234 الرياض 12345",
  );
  const buyer = new BuyerData()
    .setRegistrationName(escapeXmlText(invoice.customer) || "عميل")
    .setPartyIdentification(simplified ? "1234567890" : "1010000000")
    .setPartyIdentificationId(simplified ? "NAT" : "CRN")
    .setStreetName(escapeXmlText(buyerAddress.streetName))
    .setBuildingNumber(buyerAddress.buildingNumber)
    .setCitySubdivisionName(escapeXmlText(buyerAddress.citySubdivisionName))
    .setCityName(escapeXmlText(buyerAddress.cityName))
    .setPostalZone(buyerAddress.postalZone)
    .setCountryCode("SA");
  if (!simplified) buyer.setVatNumber(String(invoice.buyer_vat));

  document.setSeller(seller).setBuyer(buyer);
  lines.forEach((line, index) => {
    document.addLine(
      new InvoiceLineData()
        .setId(index + 1)
        .setItemName(escapeXmlText(line.description) || "بند")
        .setDescription(escapeXmlText(line.description) || "بند")
        .setQuantity(line.quantity)
        .setUnitPrice(line.unitPrice)
        .setTaxPercent(line.taxPercent)
        .setUnitCode("EA")
        .calculateTotals(),
    );
  });
  if (documentType !== "invoice") {
    document.addBillingReference({
      id: String(originalInvoiceId ?? invoice.id),
      uuid: crypto.randomUUID(),
    });
    document.addPaymentMeans({
      code: "10",
      instruction_note:
        documentType === "creditNote"
          ? "تخفيض قيمة الفاتورة الأصلية"
          : "زيادة قيمة الفاتورة الأصلية",
    });
  }
  document.calculateTotals();

  const unsignedXml = new ZatcaInvoice().generateXml(document, uuid);
  const certificate = createCompatibleCertificate(
    toCertificatePem(String(setup.production_csid ?? setup.compliance_csid)),
    String(setup.private_key_pem),
    String(setup.production_secret ?? setup.compliance_secret),
  );
  const signer = InvoiceSigner.signInvoice(unsignedXml, certificate);
  const signedXml = correctXadesDigests(signer.getXML(), certificate);
  const invoiceHash = signer.getHash();
  const signatureValue =
    signedXml.match(/<ds:SignatureValue>([^<]+)<\/ds:SignatureValue>/)?.[1] ??
    "";

  const totals = lines.reduce(
    (acc, line) => {
      const net = line.quantity * line.unitPrice;
      const tax = (net * line.taxPercent) / 100;
      return { net: acc.net + net, tax: acc.tax + tax };
    },
    { net: 0, tax: 0 },
  );

  const qrCodeData = buildQrPayload({
    sellerName: String(setup.company_name_ar),
    vatNumber: String(setup.vat_number),
    timestamp: `${now.slice(0, 10)}T${now.slice(11, 19)}Z`,
    total: (totals.net + totals.tax).toFixed(2),
    vatTotal: totals.tax.toFixed(2),
    invoiceHash,
    signature: signatureValue,
    publicKey: Buffer.from(certificate.getRawPublicKey(), "base64"),
    certificateSignature: certificate.getCertSignature(),
    simplified,
  });

  return { signedXml, invoiceHash, qrCodeData, simplified, signatureValue };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer "))
    return respond({ error: "Unauthorized" }, 401);

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);
  const {
    data: { user },
    error: authError,
  } = await caller.auth.getUser(authHeader.slice(7));
  if (authError || !user) return respond({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const invoiceId = clean(body.invoiceId);
    const noteId = clean(body.noteId);
    if (!invoiceId && !noteId)
      return respond({ error: "رقم الفاتورة أو الإشعار مطلوب" }, 400);
    const table = noteId ? "invoice_adjustment_notes" : "sales_invoices";
    const recordId = noteId || invoiceId;

    const { data: setup, error: setupError } = await admin
      .from("zatca_onboarding_settings")
      .select("*")
      .eq("mode", "simulation")
      .maybeSingle();
    if (setupError) throw setupError;
    if (!setup?.private_key_pem || !setup?.compliance_csid) {
      return respond({ error: "أكمل تهيئة ZATCA قبل إرسال الفواتير" }, 409);
    }

    const { data: record, error: recordError } = await admin
      .from(table)
      .select("*")
      .eq("id", recordId)
      .maybeSingle();
    if (recordError) throw recordError;
    if (!record) return respond({ error: "المستند غير موجود" }, 404);
    if (record.zatca_status === "cleared" || record.zatca_status === "reported") {
      return respond({
        status: record.zatca_status,
        qrCodeData: record.qr_code_data,
        message: "تم إرسال هذا المستند إلى ZATCA مسبقاً",
      });
    }

    let originalInvoice: any = null;
    if (noteId) {
      const { data: linked } = await admin
        .from("sales_invoices")
        .select("*")
        .eq("id", clean(record.original_invoice_id))
        .maybeSingle();
      originalInvoice = linked;
    }

    const documentType: "invoice" | "creditNote" | "debitNote" = !noteId
      ? "invoice"
      : record.note_type === "sales_credit"
        ? "creditNote"
        : "debitNote";

    const invoice = noteId
      ? {
          id: clean(record.note_number) || recordId,
          date: clean(record.issue_date),
          due_date: clean(record.issue_date),
          customer: clean(record.counterparty),
          customer_address: clean(originalInvoice?.customer_address),
          invoice_type: clean(originalInvoice?.invoice_type) || "simplified",
          buyer_vat: clean(originalInvoice?.buyer_vat),
        }
      : record;

    const rawItems = Array.isArray(record.items) ? record.items : [];
    const lines = rawItems.map((item: any) => ({
      description: clean(item.description),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      taxPercent: Number(item.taxPercent ?? 15) || 15,
    }));
    if (!lines.length) {
      return respond({ error: "لا توجد بنود صالحة داخل المستند" }, 400);
    }

    const { data: lastLog } = await admin
      .from("zatca_invoice_submission_logs")
      .select("invoice_hash, created_at")
      .in("status", ["cleared", "reported"])
      .order("created_at", { ascending: false })
      .limit(1);
    const previousHash = clean(lastLog?.[0]?.invoice_hash) || ZATCA_INITIAL_PIH;

    const { count } = await admin
      .from("zatca_invoice_submission_logs")
      .select("id", { count: "exact", head: true })
      .in("status", ["cleared", "reported"]);
    const icv = (count ?? 0) + 1;
    const uuid = clean(record.uuid) || crypto.randomUUID();

    const signed = buildSignedInvoice({
      setup,
      invoice,
      lines,
      icv,
      previousHash,
      uuid,
      documentType,
      originalInvoiceId: clean(record.original_invoice_id),
    });

    const endpoint = signed.simplified
      ? `${SIMULATION_URL}/invoices/reporting/single`
      : `${SIMULATION_URL}/invoices/clearance/single`;
    const csid = clean(setup.production_csid ?? setup.compliance_csid);
    const secret = clean(setup.production_secret ?? setup.compliance_secret);

    const zatcaResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Version": "V2",
        "Accept-Language": "en",
        "Clearance-Status": signed.simplified ? "0" : "1",
        Authorization: `Basic ${Buffer.from(`${csid}:${secret}`, "utf8").toString("base64")}`,
      },
      body: JSON.stringify({
        invoiceHash: signed.invoiceHash,
        uuid,
        invoice: Buffer.from(signed.signedXml, "utf8").toString("base64"),
      }),
      signal: AbortSignal.timeout(35_000),
    });
    const responseText = await zatcaResponse.text();
    let responseData: any = {};
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = {};
    }

    const accepted = zatcaResponse.status === 200 || zatcaResponse.status === 202;
    const submittedAt = new Date().toISOString();
    const status = accepted
      ? signed.simplified
        ? "reported"
        : "cleared"
      : "rejected";

    await admin.from("zatca_invoice_submission_logs").insert({
      invoice_id: recordId,
      invoice_table: table,
      document_type: documentType,
      invoice_type: signed.simplified ? "simplified" : "standard",
      mode: "simulation",
      endpoint,
      http_status: zatcaResponse.status,
      request_uuid: uuid,
      invoice_hash: signed.invoiceHash,
      response: responseData,
      status,
      created_by: user.id,
    });

    if (!accepted) {
      const errorMessage = clean(
        responseData?.validationResults?.errorMessages?.[0]?.message ??
          responseData?.message ??
          responseText ??
          `ZATCA HTTP ${zatcaResponse.status}`,
      );
      await admin
        .from(table)
        .update({
          zatca_status: "rejected",
          zatca_response: responseData,
          zatca_submitted_at: submittedAt,
        })
        .eq("id", recordId);
      return respond({ error: errorMessage, details: responseData }, 422);
    }

    await admin
      .from(table)
      .update({
        uuid,
        icv: String(icv),
        pih: previousHash,
        qr_code_data: signed.qrCodeData,
        cryptographic_stamp: signed.signatureValue,
        invoice_xml: signed.signedXml,
        zatca_status: status,
        zatca_response: responseData,
        zatca_submitted_at: submittedAt,
        zatca_approved_at: signed.simplified ? null : submittedAt,
        zatca_reported_at: signed.simplified ? submittedAt : null,
      })
      .eq("id", recordId);

    return respond({
      status,
      uuid,
      icv,
      qrCodeData: signed.qrCodeData,
      message: signed.simplified
        ? "تم إبلاغ ZATCA بالمستند المبسط"
        : "تمت مصادقة ZATCA على المستند المعياري",
    });
  } catch (error: any) {
    console.error("zatca-invoice", error);
    return respond({ error: error?.message ?? "Unexpected error" }, 500);
  }
});
