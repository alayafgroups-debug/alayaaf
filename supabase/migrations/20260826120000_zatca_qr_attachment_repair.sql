-- A cleared UBL document can contain more than one EmbeddedDocumentBinaryObject.
-- Repair locally displayed QR values by selecting the attachment identified as QR,
-- never the earlier PIH attachment. This does not resend or alter any legal XML.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['sales_invoices', 'invoice_adjustment_notes']
  loop
    if to_regclass('public.' || v_table) is null then
      continue;
    end if;

    execute format($sql$
      update public.%I
      set qr_code_data = substring(
        invoice_xml from '<cbc:ID>[[:space:]]*QR[[:space:]]*</cbc:ID>(?:.|\n)*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]+)</cbc:EmbeddedDocumentBinaryObject>'
      )
      where zatca_status = 'cleared'
        and invoice_xml is not null
        and substring(
          invoice_xml from '<cbc:ID>[[:space:]]*QR[[:space:]]*</cbc:ID>(?:.|\n)*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]+)</cbc:EmbeddedDocumentBinaryObject>'
        ) is not null
        and qr_code_data is distinct from substring(
          invoice_xml from '<cbc:ID>[[:space:]]*QR[[:space:]]*</cbc:ID>(?:.|\n)*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]+)</cbc:EmbeddedDocumentBinaryObject>'
        )
    $sql$, v_table);
  end loop;
end
$$;
