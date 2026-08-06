import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { KEYUTIL, KJUR, X509 } from "npm:jsrsasign@11.1.3";
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
const escapeDn = (value: string) => value.replace(/[,+"\\<>;/]/g, " ").trim();
const escapeXmlText = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const fullAccessRoles = new Set(["مدير النظام", "مدير عام", "المدير العام"]);
const canManageSettings = (
  roleName: string,
  permissions: Record<string, unknown>,
) =>
  fullAccessRoles.has(roleName) ||
  permissions["module.settings"] === true ||
  permissions["module.settings"] === "manage";

const publicFields = `id, mode, company_name_ar, company_name_en, vat_number, commercial_registration,
  branch_name, branch_location, industry, device_manufacturer, device_model, device_serial,
  common_name, invoice_type, status, compliance_request_id, compliance_csid_masked,
  compliance_issued_at, compliance_results, last_error, created_at, updated_at`;

function generateCsr(input: Record<string, string>) {
  const keypair = KEYUTIL.generateKeypair("EC", "secp256k1");
  const privateKeyPem = KEYUTIL.getPEM(keypair.prvKeyObj, "PKCS8PRV");
  const publicKeyPem = KEYUTIL.getPEM(keypair.pubKeyObj);
  const subject = `/CN=${escapeDn(input.commonName)}/OU=${escapeDn(input.branchName)}/O=${escapeDn(input.companyNameAr)}/C=SA`;
  const serialNumber = `1-${input.deviceManufacturer}|2-${input.deviceModel}|3-${input.deviceSerial}`;
  const csrPem = KJUR.asn1.csr.CSRUtil.newCSRPEM({
    subject: { str: subject },
    sbjpubkey: keypair.pubKeyObj,
    sbjprvkey: keypair.prvKeyObj,
    sigalg: "SHA256withECDSA",
    extreq: [
      {
        extname: "1.3.6.1.4.1.311.20.2",
        extn: { prnstr: { str: "PREZATCA-Code-Signing" } },
      },
      {
        extname: "subjectAltName",
        array: [
          {
            dn: {
              array: [
                [{ type: "SN", value: serialNumber, ds: "prn" }],
                [{ type: "UID", value: input.vatNumber, ds: "prn" }],
                [{ type: "title", value: input.invoiceType, ds: "prn" }],
                [{ type: "2.5.4.26", value: input.branchLocation, ds: "prn" }],
                [{ type: "2.5.4.15", value: input.industry, ds: "prn" }],
              ],
            },
          },
        ],
      },
    ],
  } as any);
  return {
    privateKeyPem,
    publicKeyPem,
    csrPem,
    csrBase64: Buffer.from(csrPem, "utf8").toString("base64"),
  };
}

function validateIdentity(body: any) {
  const identity = {
    companyNameAr: clean(body.companyNameAr),
    companyNameEn: clean(body.companyNameEn),
    vatNumber: clean(body.vatNumber),
    commercialRegistration: clean(body.commercialRegistration),
    branchName: clean(body.branchName),
    branchLocation: clean(body.branchLocation),
    industry: clean(body.industry),
    deviceManufacturer: clean(body.deviceManufacturer),
    deviceModel: clean(body.deviceModel),
    deviceSerial: clean(body.deviceSerial),
    commonName: clean(body.commonName),
    invoiceType: clean(body.invoiceType || "1100"),
  };
  if (!/^\d{15}$/.test(identity.vatNumber))
    throw new Error("رقم ضريبة القيمة المضافة يجب أن يتكون من 15 رقماً");
  if (!/^\d{10,15}$/.test(identity.commercialRegistration))
    throw new Error("رقم السجل التجاري يجب أن يتكون من 10 إلى 15 رقماً");
  if (!["1000", "0100", "1100"].includes(identity.invoiceType))
    throw new Error("نوع الفواتير غير صالح");
  const required = [
    "companyNameAr",
    "branchName",
    "branchLocation",
    "industry",
    "deviceManufacturer",
    "deviceModel",
    "deviceSerial",
    "commonName",
  ] as const;
  const missing = required.filter((key) => identity[key].length < 2);
  if (missing.length)
    throw new Error("أكمل جميع بيانات المنشأة والجهاز المطلوبة");
  if (!/^[A-Za-z0-9._\-\/]+$/.test(identity.deviceSerial))
    throw new Error("الرقم التسلسلي للجهاز يحتوي على رموز غير صالحة");
  parseRegisteredAddress(identity.branchLocation);
  return identity;
}

type ComplianceCase = {
  key: string;
  label: string;
  scope: "standard" | "simplified";
  kind: "invoice" | "credit" | "debit";
};

const complianceCases: ComplianceCase[] = [
  {
    key: "standard-invoice",
    label: "فاتورة ضريبية معيارية B2B",
    scope: "standard",
    kind: "invoice",
  },
  {
    key: "standard-credit",
    label: "إشعار دائن معياري B2B",
    scope: "standard",
    kind: "credit",
  },
  {
    key: "standard-debit",
    label: "إشعار مدين معياري B2B",
    scope: "standard",
    kind: "debit",
  },
  {
    key: "simplified-invoice",
    label: "فاتورة ضريبية مبسطة B2C",
    scope: "simplified",
    kind: "invoice",
  },
  {
    key: "simplified-credit",
    label: "إشعار دائن مبسط B2C",
    scope: "simplified",
    kind: "credit",
  },
  {
    key: "simplified-debit",
    label: "إشعار مدين مبسط B2C",
    scope: "simplified",
    kind: "debit",
  },
];

function requiredCaseIndexes(invoiceType: string) {
  return complianceCases
    .map((testCase, index) => ({ testCase, index }))
    .filter(({ testCase }) => {
      if (invoiceType === "1000") return testCase.scope === "standard";
      if (invoiceType === "0100") return testCase.scope === "simplified";
      return true;
    })
    .map(({ index }) => index);
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

function parseRegisteredAddress(location: string) {
  const normalized = location.replace(/\s+/g, " ").trim();
  const buildingNumber = normalized.match(/\b\d{4}\b/)?.[0];
  const postalZone = normalized.match(/\b\d{5}\b/)?.[0];
  if (!buildingNumber || !postalZone) {
    throw new Error(
      "عنوان الفرع يجب أن يتضمن رقم المبنى من 4 أرقام والرمز البريدي من 5 أرقام",
    );
  }
  const parts = normalized
    .split(/[،,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const cityName = parts.find((part) =>
    /مكة|جدة|الرياض|المدينة|الدمام|الخبر|الطائف/.test(part),
  );
  if (!cityName) {
    throw new Error("عنوان الفرع يجب أن يتضمن اسم المدينة المسجلة");
  }
  const citySubdivisionName =
    parts.find((part) => /حي|الشوقية|العزيزية|الروضة|النسيم/.test(part)) ??
    parts[1] ??
    "الفرع الرئيسي";
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
      createHash("sha256")
        .update(Buffer.from(certificateBody, "base64"))
        .digest("base64"),
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
  const digest = createHash("sha256")
    .update(signedPropertiesXml, "utf8")
    .digest("base64");

  const correctedType = xml.replace(
    'Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties"',
    'Type="http://uri.etsi.org/01903#SignedProperties" URI="#xadesSignedProperties"',
  );
  return correctedType.replace(
    /(<ds:Reference Type="http:\/\/uri\.etsi\.org\/01903#SignedProperties" URI="#xadesSignedProperties">[\s\S]*?<ds:DigestValue>)[^<]*(<\/ds:DigestValue>)/,
    `$1${digest}$2`,
  );
}

function buildComplianceDocument(
  setup: any,
  testCase: ComplianceCase,
  caseIndex: number,
  previousHash: string,
) {
  const address = parseRegisteredAddress(String(setup.branch_location));
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const issueDate = now.slice(0, 10);
  const issueTime = now.slice(11, 19);
  const invoiceNumber = `SIM-${String(caseIndex + 1).padStart(2, "0")}-${Date.now()}`;
  const invoice = new InvoiceData()
    .setInvoiceNumber(invoiceNumber)
    .setIssueDate(issueDate)
    .setIssueTime(issueTime)
    .setDueDate(issueDate)
    .setCurrencyCode("SAR")
    .setDocumentCurrencyCode("SAR")
    .setTaxCurrencyCode("SAR")
    .setInvoiceCounter(String(caseIndex + 1))
    .setPreviousInvoiceHash(previousHash);

  if (testCase.scope === "standard") invoice.standard();
  else invoice.simplified();
  if (testCase.kind === "invoice") invoice.taxInvoice();
  else if (testCase.kind === "credit") invoice.creditNote();
  else invoice.debitNote();

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

  const buyer = new BuyerData()
    .setRegistrationName(
      testCase.scope === "standard" ? "شركة المشتري التجريبية" : "عميل تجريبي",
    )
    .setPartyIdentification(
      testCase.scope === "standard" ? "310000000000003" : "1234567890",
    )
    .setPartyIdentificationId(testCase.scope === "standard" ? "VAT" : "NAT")
    .setStreetName("شارع الملك فهد")
    .setBuildingNumber("1234")
    .setCitySubdivisionName("حي العليا")
    .setCityName("الرياض")
    .setPostalZone("12345")
    .setCountryCode("SA");
  if (testCase.scope === "standard") buyer.setVatNumber("310000000000003");

  const line = new InvoiceLineData()
    .setId(1)
    .setItemName(
      testCase.kind === "invoice"
        ? "خدمة اختبار التوافق"
        : testCase.kind === "credit"
          ? "تعديل دائن تجريبي"
          : "تعديل مدين تجريبي",
    )
    .setDescription("مستند محاكاة مخصص لفحص التوافق لدى ZATCA")
    .setQuantity(1)
    .setUnitPrice(100)
    .setTaxPercent(15)
    .setUnitCode("EA")
    .calculateTotals();

  invoice.setSeller(seller).setBuyer(buyer).addLine(line);
  if (testCase.kind !== "invoice") {
    invoice.addBillingReference({
      id: `SIM-ORIGINAL-${caseIndex + 1}`,
      uuid: crypto.randomUUID(),
    });
    invoice.addPaymentMeans({
      code: "10",
      instruction_note:
        testCase.kind === "credit"
          ? "إلغاء جزء من التوريد"
          : "زيادة قيمة التوريد",
    });
  }
  invoice.calculateTotals();

  const uuid = crypto.randomUUID();
  const unsignedXml = new ZatcaInvoice().generateXml(invoice, uuid);
  const certificate = createCompatibleCertificate(
    toCertificatePem(String(setup.compliance_csid)),
    String(setup.private_key_pem),
    String(setup.compliance_secret),
  );
  const signer = InvoiceSigner.signInvoice(unsignedXml, certificate);
  return {
    uuid,
    invoiceNumber,
    signedXml: correctXadesDigests(signer.getXML(), certificate),
    invoiceHash: signer.getHash(),
  };
}

function getValidationSummary(responseData: any) {
  const validation = responseData?.validationResults ?? {};
  const errors = Array.isArray(validation.errorMessages)
    ? validation.errorMessages
    : [];
  const warnings = Array.isArray(validation.warningMessages)
    ? validation.warningMessages
    : [];
  const status = clean(validation.status).toUpperCase();
  const passed = errors.length === 0 && ["PASS", "WARNING"].includes(status);
  return {
    passed,
    status: status || "ERROR",
    message:
      errors[0]?.message ??
      warnings[0]?.message ??
      (passed ? "اجتاز فحص ZATCA" : "لم يجتز فحص ZATCA"),
    validationResults: validation,
  };
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
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await caller.auth.getUser(token);
  if (authError || !user?.email) return respond({ error: "Unauthorized" }, 401);

  const { data: callerEmployee } = await admin
    .from("employees")
    .select("employee_role")
    .ilike("email", user.email)
    .maybeSingle();
  if (!callerEmployee?.employee_role)
    return respond({ error: "غير مصرح بإدارة إعدادات ZATCA" }, 403);
  const { data: callerRole } = await admin
    .from("user_roles")
    .select("permissions")
    .eq("name_ar", callerEmployee.employee_role)
    .eq("status", "فعال")
    .maybeSingle();
  const permissions =
    callerRole?.permissions && typeof callerRole.permissions === "object"
      ? (callerRole.permissions as Record<string, unknown>)
      : {};
  if (!canManageSettings(callerEmployee.employee_role, permissions))
    return respond({ error: "غير مصرح بإدارة إعدادات ZATCA" }, 403);

  const { data: existingSetup, error: ownerError } = await admin
    .from("zatca_onboarding_settings")
    .select("id, created_by, status, compliance_issued_at")
    .eq("mode", "simulation")
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (existingSetup && existingSetup.created_by !== user.id) {
    return respond({ error: "هذه التهيئة مرتبطة بحساب إداري آخر" }, 403);
  }

  let body: any = {};
  try {
    body = await req.json();
    const action = clean(body.action);

    if (action === "status") {
      const { data, error } = await admin
        .from("zatca_onboarding_settings")
        .select(publicFields)
        .eq("mode", "simulation")
        .maybeSingle();
      if (error) throw error;
      const { data: audit } = data
        ? await admin
            .from("zatca_onboarding_audit")
            .select("id, action, result, http_status, details, created_at")
            .eq("onboarding_id", data.id)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: [] };
      return respond({ setup: data, audit: audit ?? [] });
    }

    if (action === "prepare") {
      if (
        existingSetup &&
        (Boolean(existingSetup.compliance_issued_at) ||
          [
            "compliance_ready",
            "compliance_testing",
            "compliance_passed",
          ].includes(existingSetup.status))
      ) {
        return respond(
          {
            error:
              "لا يمكن إعادة توليد المفاتيح بعد إصدار شهادة التوافق لأنها ستفقد صلاحيتها",
          },
          409,
        );
      }
      const identity = validateIdentity(body);
      const csr = generateCsr(identity);
      const payload = {
        mode: "simulation",
        created_by: user.id,
        company_name_ar: identity.companyNameAr,
        company_name_en: identity.companyNameEn || null,
        vat_number: identity.vatNumber,
        commercial_registration: identity.commercialRegistration,
        branch_name: identity.branchName,
        branch_location: identity.branchLocation,
        industry: identity.industry,
        device_manufacturer: identity.deviceManufacturer,
        device_model: identity.deviceModel,
        device_serial: identity.deviceSerial,
        common_name: identity.commonName,
        invoice_type: identity.invoiceType,
        csr_pem: csr.csrPem,
        public_key_pem: csr.publicKeyPem,
        private_key_pem: csr.privateKeyPem,
        status: "csr_generated",
        compliance_request_id: null,
        compliance_csid: null,
        compliance_secret: null,
        compliance_csid_masked: null,
        compliance_issued_at: null,
        compliance_results: [],
        last_error: null,
        updated_at: new Date().toISOString(),
      };
      const saveQuery = existingSetup
        ? admin
            .from("zatca_onboarding_settings")
            .update(payload)
            .eq("id", existingSetup.id)
            .eq("created_by", user.id)
        : admin.from("zatca_onboarding_settings").insert(payload);
      const { data, error } = await saveQuery.select("id").single();
      if (error) throw error;
      await admin.from("zatca_onboarding_audit").insert({
        onboarding_id: data.id,
        actor_id: user.id,
        action: "csr_generated",
        result: "success",
        details: { mode: "simulation" },
      });
      return respond({
        setup: { id: data.id, status: "csr_generated" },
        message: "تم حفظ البيانات وتوليد CSR داخل الخادم",
      });
    }

    if (action === "update_branch_location") {
      if (!existingSetup?.compliance_issued_at) {
        return respond({ error: "يجب تجهيز الجهاز أولاً" }, 400);
      }
      const branchLocation = clean(body.branchLocation);
      parseRegisteredAddress(branchLocation);
      const { error } = await admin
        .from("zatca_onboarding_settings")
        .update({
          branch_location: branchLocation,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSetup.id)
        .eq("created_by", user.id);
      if (error) throw error;
      await admin.from("zatca_onboarding_audit").insert({
        onboarding_id: existingSetup.id,
        actor_id: user.id,
        action: "branch_location_updated",
        result: "success",
        details: { mode: "simulation" },
      });
      return respond({ message: "تم حفظ عنوان الفواتير المسجل" });
    }

    if (action === "onboard") {
      const otp = clean(body.otp);
      if (!/^\d{6}$/.test(otp))
        return respond({ error: "رمز OTP يجب أن يتكون من 6 أرقام" }, 400);
      const { data: setup, error: setupError } = await admin
        .from("zatca_onboarding_settings")
        .select("id, csr_pem, compliance_csid")
        .eq("mode", "simulation")
        .maybeSingle();
      if (setupError) throw setupError;
      if (!setup?.csr_pem)
        return respond(
          { error: "يجب تجهيز بيانات المنشأة وتوليد CSR أولاً" },
          400,
        );
      if (setup.compliance_csid) {
        return respond(
          { error: "تم إصدار شهادة التوافق لهذا الجهاز مسبقاً" },
          409,
        );
      }

      const csrBase64 = Buffer.from(setup.csr_pem, "utf8").toString("base64");
      const zatcaResponse = await fetch(`${SIMULATION_URL}/compliance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Version": "V2",
          OTP: otp,
        },
        body: JSON.stringify({ csr: csrBase64 }),
      });
      const responseData = await zatcaResponse.json().catch(() => ({}));
      const requestId = clean(responseData.requestID ?? responseData.requestId);
      const csid = clean(responseData.binarySecurityToken);
      const secret = clean(responseData.secret);
      const ok = zatcaResponse.ok && Boolean(requestId && csid && secret);
      const validationErrors =
        responseData?.validationResults?.errorMessages ?? responseData?.errors;
      const firstValidationError = Array.isArray(validationErrors)
        ? validationErrors[0]
        : validationErrors;
      const safeDetails = {
        requestId: requestId || null,
        dispositionMessage: responseData.dispositionMessage ?? null,
        errorCode: firstValidationError?.code ?? responseData?.code ?? null,
        errorMessage: firstValidationError?.message ?? null,
      };

      if (!ok) {
        const message = clean(
          firstValidationError?.message ||
            responseData.message ||
            responseData.error ||
            responseData.dispositionMessage ||
            `ZATCA HTTP ${zatcaResponse.status}`,
        );
        await admin
          .from("zatca_onboarding_settings")
          .update({
            status: "failed",
            last_error: message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", setup.id);
        await admin.from("zatca_onboarding_audit").insert({
          onboarding_id: setup.id,
          actor_id: user.id,
          action: "compliance_csid_requested",
          result: "failed",
          http_status: zatcaResponse.status,
          details: safeDetails,
        });
        return respond(
          { error: message, details: safeDetails },
          zatcaResponse.status >= 400 ? zatcaResponse.status : 502,
        );
      }

      const masked = `${csid.slice(0, 8)}••••${csid.slice(-6)}`;
      const issuedAt = new Date().toISOString();
      const { error: updateError } = await admin
        .from("zatca_onboarding_settings")
        .update({
          status: "compliance_ready",
          compliance_request_id: requestId,
          compliance_csid: csid,
          compliance_secret: secret,
          compliance_csid_masked: masked,
          compliance_issued_at: issuedAt,
          last_error: null,
          updated_at: issuedAt,
        })
        .eq("id", setup.id);
      if (updateError) throw updateError;
      await admin.from("zatca_onboarding_audit").insert({
        onboarding_id: setup.id,
        actor_id: user.id,
        action: "compliance_csid_requested",
        result: "success",
        http_status: zatcaResponse.status,
        details: safeDetails,
      });
      return respond({
        setup: {
          id: setup.id,
          status: "compliance_ready",
          complianceRequestId: requestId,
          complianceCsidMasked: masked,
        },
        message: "تم الحصول على Compliance CSID من منصة المحاكاة",
      });
    }

    if (action === "run_compliance_case") {
      const caseIndex = Number(body.caseIndex);
      if (
        !Number.isInteger(caseIndex) ||
        caseIndex < 0 ||
        caseIndex >= complianceCases.length
      ) {
        return respond({ error: "رقم اختبار التوافق غير صالح" }, 400);
      }
      const { data: setup, error: setupError } = await admin
        .from("zatca_onboarding_settings")
        .select("*")
        .eq("mode", "simulation")
        .maybeSingle();
      if (setupError) throw setupError;
      if (
        !setup?.compliance_csid ||
        !setup?.compliance_secret ||
        !setup?.private_key_pem
      ) {
        return respond({ error: "يجب الحصول على Compliance CSID أولاً" }, 400);
      }

      const existingResults: any[] = Array.isArray(setup.compliance_results)
        ? setup.compliance_results
        : [];
      const requiredIndexes = requiredCaseIndexes(String(setup.invoice_type));
      const sequenceIndex = requiredIndexes.indexOf(caseIndex);
      if (sequenceIndex === -1) {
        return respond(
          { error: "نوع هذا المستند غير مشمول في شهادة الجهاز" },
          400,
        );
      }
      const previousCaseIndex = requiredIndexes[sequenceIndex - 1];
      const scopedExistingResults =
        sequenceIndex === 0
          ? []
          : existingResults.filter((item) =>
              requiredIndexes.includes(Number(item.caseIndex)),
            );
      const previousHash =
        sequenceIndex === 0
          ? ZATCA_INITIAL_PIH
          : clean(
              scopedExistingResults.find(
                (item) => item.caseIndex === previousCaseIndex,
              )?.invoiceHash,
            );
      if (sequenceIndex > 0 && !previousHash) {
        return respond({ error: "يجب تنفيذ اختبارات التوافق بالترتيب" }, 409);
      }

      const testCase = complianceCases[caseIndex];
      await admin
        .from("zatca_onboarding_settings")
        .update({
          status: "compliance_testing",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", setup.id);

      let result: Record<string, unknown>;
      let httpStatus = 0;
      try {
        const document = buildComplianceDocument(
          setup,
          testCase,
          caseIndex,
          previousHash,
        );
        const zatcaResponse = await fetch(
          `${SIMULATION_URL}/compliance/invoices`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "Accept-Version": "V2",
              "Accept-Language": "ar",
              Authorization: `Basic ${Buffer.from(`${setup.compliance_csid}:${setup.compliance_secret}`).toString("base64")}`,
            },
            body: JSON.stringify({
              invoiceHash: document.invoiceHash,
              uuid: document.uuid,
              invoice: Buffer.from(document.signedXml, "utf8").toString(
                "base64",
              ),
            }),
            signal: AbortSignal.timeout(35_000),
          },
        );
        httpStatus = zatcaResponse.status;
        const responseData = await zatcaResponse.json().catch(() => ({}));
        const validation = getValidationSummary(responseData);
        result = {
          caseIndex,
          documentType: testCase.key,
          label: testCase.label,
          status: zatcaResponse.ok && validation.passed ? "passed" : "failed",
          message:
            validation.message ||
            responseData?.message ||
            `ZATCA HTTP ${httpStatus}`,
          httpStatus,
          uuid: document.uuid,
          invoiceNumber: document.invoiceNumber,
          invoiceHash: document.invoiceHash,
          validationResults: validation.validationResults,
          testedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        result = {
          caseIndex,
          documentType: testCase.key,
          label: testCase.label,
          status: "failed",
          message: error?.message ?? "فشل إنشاء أو توقيع مستند التوافق",
          httpStatus,
          testedAt: new Date().toISOString(),
        };
      }

      const nextResults = scopedExistingResults.filter(
        (item) => item.caseIndex !== caseIndex,
      );
      nextResults.push(result);
      nextResults.sort((a, b) => a.caseIndex - b.caseIndex);
      const completed = nextResults.length === requiredIndexes.length;
      const allPassed =
        completed && nextResults.every((item) => item.status === "passed");
      const firstFailure = nextResults.find((item) => item.status === "failed");
      const nextStatus = allPassed ? "compliance_passed" : "compliance_testing";
      const { error: updateError } = await admin
        .from("zatca_onboarding_settings")
        .update({
          status: nextStatus,
          compliance_results: nextResults,
          last_error: firstFailure ? firstFailure.message : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", setup.id);
      if (updateError) throw updateError;
      await admin.from("zatca_onboarding_audit").insert({
        onboarding_id: setup.id,
        actor_id: user.id,
        action: `compliance_test_${testCase.key}`,
        result: result.status === "passed" ? "success" : "failed",
        http_status: httpStatus || null,
        details: {
          documentType: testCase.key,
          uuid: result.uuid ?? null,
          invoiceHash: result.invoiceHash ?? null,
          message: result.message,
        },
      });
      return respond({ result, completed, allPassed, status: nextStatus });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (error: any) {
    console.error("zatca-onboarding", error);
    return respond({ error: error?.message ?? "Unexpected error" }, 500);
  }
});
