import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import pdfParse from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function detectMarketplace(text: string): string {
  if (/shopee/i.test(text)) return "shopee";
  if (/mercado\s*livre|mercadolivre/i.test(text)) return "mercado_livre";
  if (/amazon/i.test(text)) return "amazon";
  return "other";
}

function extractCandidates(text: string): any[] {
  const candidates: any[] = [];
  
  // Padrões
  const patterns = [
    { regex: /\bBR[A-Z0-9]{10,20}\b/gi, reason: "Padrão de rastreio BR" },
    { regex: /\b[A-Z]{2}\d{9}[A-Z]{2}\b/gi, reason: "Padrão Correios" },
    { regex: /\b[A-Z0-9]{12,20}\b/gi, reason: "Padrão Alfanumérico" },
  ];

  const foundValues = new Set<string>();

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const val = match[0].toUpperCase();
      if (!foundValues.has(val)) {
        foundValues.add(val);
        candidates.push({
          value: val,
          sources: ["pdf_text"],
          reasons: [pattern.reason],
          score: 20
        });
      }
    }
  });

  // Refinar pontuação
  candidates.forEach(c => {
    // Penalidades
    if (c.value.length === 44 && /^\d+$/.test(c.value)) {
      c.score -= 40;
      c.reasons.push("Parece chave fiscal (44 dígitos)");
    }
    if (c.value.length === 11 && /^\d+$/.test(c.value)) {
      c.score -= 30;
      c.reasons.push("Parece CPF");
    }
    if (c.value.length === 14 && /^\d+$/.test(c.value)) {
      c.score -= 30;
      c.reasons.push("Parece CNPJ");
    }
    if (c.value.length === 8 && /^\d+$/.test(c.value)) {
      c.score -= 20;
      c.reasons.push("Parece CEP");
    }

    // Bônus baseados no contexto do texto (se o código estiver perto da palavra rastreio)
    // Uma heurística simples para o contexto global
    if (text.toLowerCase().includes("rastreio") || text.toLowerCase().includes("tracking")) {
      // Como não temos a posição exata no regex loop simplificado, damos um pequeno bônus
      c.score += 5;
    }
    
    // Bônus se for padrão forte Correios
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c.value)) {
      c.score += 20;
      c.reasons.push("Formato exato Correios");
    }
    
    // Bônus se for padrão forte Shopee (BR + dígitos/letras)
    if (/^BR\d{10,15}[A-Z]*$/.test(c.value)) {
      c.score += 20;
      c.reasons.push("Formato exato Transportadora Shopee");
    }
  });

  return candidates.sort((a, b) => b.score - a.score);
}

function extractOtherData(text: string) {
  const data: any = {
    marketplaceOrderId: null,
    recipientName: null,
    recipientZipCode: null,
    recipientCity: null,
    recipientState: null,
    estimatedShippingDate: null,
  };

  // Exemplo básico de extração (CEP)
  const cepMatch = text.match(/\b\d{5}-\d{3}\b/);
  if (cepMatch) data.recipientZipCode = cepMatch[0];

  // Tentativa de pedido Mercado Livre ou Shopee
  const orderShopeeMatch = text.match(/(?:Pedido|Order)[\s:]*([A-Z0-9]{14,15})/i);
  if (orderShopeeMatch) data.marketplaceOrderId = orderShopeeMatch[1];
  
  const orderMlMatch = text.match(/(?:Pedido|Order)[\s:]*(#[0-9]+)/i);
  if (orderMlMatch && !data.marketplaceOrderId) data.marketplaceOrderId = orderMlMatch[1].replace("#", "");

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { filePath } = await req.json();

    if (!filePath) {
      return new Response(JSON.stringify({ error: "Missing filePath" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Baixar o arquivo do bucket
    const { data: fileData, error: downloadError } = await supabase.storage.from("shipping-labels").download(filePath);
    
    if (downloadError || !fileData) {
      console.error("Download Error:", downloadError);
      return new Response(JSON.stringify({ error: "Could not download file" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let extractedText = "";
    let extractionMethod = "pdf_text";
    
    // Checar mime type
    const mimeType = fileData.type;
    
    if (mimeType === "application/pdf") {
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } catch (err) {
        console.error("PDF parse error:", err);
        return new Response(JSON.stringify({ error: "Failed to parse PDF" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else if (mimeType.startsWith("image/")) {
      // Mock de OCR para imagens por enquanto, em produção conectar a um serviço como Tesseract JS ou Vision API
      extractedText = ""; 
      extractionMethod = "manual"; // Forçando manual para imagens sem backend OCR complexo
    } else {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const marketplace = detectMarketplace(extractedText);
    const candidates = extractCandidates(extractedText);
    const otherData = extractOtherData(extractedText);

    let selectedTrackingCode = null;
    let confidence = 0;
    let confidenceLevel: "high" | "medium" | "low" = "low";

    if (candidates.length > 0 && candidates[0].score > 0) {
      selectedTrackingCode = candidates[0].value;
      // Normalização simples de confiança baseada no score
      confidence = Math.min(candidates[0].score / 40, 1.0); 
      
      if (confidence >= 0.90) confidenceLevel = "high";
      else if (confidence >= 0.60) confidenceLevel = "medium";
    }

    const responseData = {
      success: true,
      status: selectedTrackingCode ? (confidenceLevel === "high" ? "processed" : "partial") : "failed",
      data: {
        marketplace,
        trackingCode: selectedTrackingCode,
        ...otherData
      },
      confidence,
      confidenceLevel,
      extractionMethod,
      candidates,
      warnings: candidates.length > 1 ? ["Múltiplos candidatos encontrados"] : []
    };

    // Salvar auditoria
    const { error: auditError } = await supabase.from("shipment_label_extractions").insert({
      user_id: user.id,
      file_path: filePath,
      marketplace,
      extracted_text: extractedText.substring(0, 5000), // Limitar tamanho
      extracted_data: responseData.data,
      tracking_candidates: candidates,
      selected_tracking_code: selectedTrackingCode,
      confidence,
      extraction_method: extractionMethod,
      status: responseData.status,
      processed_at: new Date().toISOString()
    });

    if (auditError) {
      console.error("Audit Error:", auditError);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Process Shipping Label Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
