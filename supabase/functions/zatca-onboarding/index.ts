import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { KEYUTIL, KJUR } from "npm:jsrsasign@11.1.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const SIMULATION_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation";

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const clean = (value: unknown) => String(value ?? "").trim();
const escapeDn = (value: string) => value.replace(/[,+"\\<>;/]/g, " ").trim();

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
  return identity;
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

  const { data: employee } = await admin
    .from("employees")
    .select("employee_role, role, account_title")
    .ilike("email", user.email)
    .maybeSingle();
  const roleName = clean(
    employee?.employee_role || employee?.role || employee?.account_title,
  );
  const { data: role } = roleName
    ? await admin
        .from("user_roles")
        .select("permissions")
        .eq("name_ar", roleName)
        .eq("status", "فعال")
        .maybeSingle()
    : ({ data: null } as any);
  const permissions =
    role?.permissions && typeof role.permissions === "object"
      ? (role.permissions as Record<string, unknown>)
      : {};
  const permissionKeys = [
    "zatca.settings",
    "module.zatca",
    "module.settings",
    "module.sales",
    "module.accounting",
  ];
  const followsUnrestrictedAppRole =
    Boolean(employee && roleName) && Object.keys(permissions).length === 0;
  const canManage =
    permissionKeys.some(
      (key) => permissions[key] === true || permissions[key] === "manage",
    ) ||
    followsUnrestrictedAppRole ||
    /admin|مدير|مسؤول النظام/i.test(roleName);
  if (!canManage) return respond({ error: "Forbidden" }, 403);

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
      const { data, error } = await admin
        .from("zatca_onboarding_settings")
        .upsert(payload, { onConflict: "mode" })
        .select("id")
        .single();
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

    if (action === "onboard") {
      const otp = clean(body.otp);
      if (!/^\d{6}$/.test(otp))
        return respond({ error: "رمز OTP يجب أن يتكون من 6 أرقام" }, 400);
      const { data: setup, error: setupError } = await admin
        .from("zatca_onboarding_settings")
        .select("id, csr_pem")
        .eq("mode", "simulation")
        .maybeSingle();
      if (setupError) throw setupError;
      if (!setup?.csr_pem)
        return respond(
          { error: "يجب تجهيز بيانات المنشأة وتوليد CSR أولاً" },
          400,
        );

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
      const safeDetails = {
        requestId: requestId || null,
        dispositionMessage: responseData.dispositionMessage ?? null,
      };

      if (!ok) {
        const message = clean(
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

    return respond({ error: "Unknown action" }, 400);
  } catch (error: any) {
    console.error("zatca-onboarding", error);
    return respond({ error: error?.message ?? "Unexpected error" }, 500);
  }
});
