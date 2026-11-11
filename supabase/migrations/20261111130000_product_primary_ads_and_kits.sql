-- One physical catalog unit per product; one real primary offer per product.
ALTER TABLE public.ml_listing_variants
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_ad_id uuid REFERENCES public.ml_listing_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_gallery jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.ml_listing_variants SET bundle_quantity = 1
WHERE bundle_quantity IS NULL OR bundle_quantity < 1;
ALTER TABLE public.ml_listing_variants ALTER COLUMN bundle_quantity SET NOT NULL;
ALTER TABLE public.ml_listing_variants
  ADD CONSTRAINT ml_listing_bundle_positive CHECK (bundle_quantity >= 1);
ALTER TABLE public.ml_listing_variants
  ADD CONSTRAINT ml_listing_primary_unit CHECK (NOT is_primary OR bundle_quantity = 1);
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_ad_per_product
  ON public.ml_listing_variants(product_id) WHERE is_primary;

UPDATE public.ml_listing_variants SET image_gallery = to_jsonb(ARRAY[thumbnail])
WHERE thumbnail IS NOT NULL AND image_gallery = '[]'::jsonb;

-- Short sequential base-36 SKU for NEW products only; existing SKUs are untouched.
CREATE SEQUENCE IF NOT EXISTS public.short_product_sku_sequence;
CREATE OR REPLACE FUNCTION public.next_internal_sku(p_org_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint; code text; alphabet text := '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
BEGIN
  LOOP
    n := nextval('public.short_product_sku_sequence');
    IF n >= 34^4 THEN
      RAISE EXCEPTION 'Sequência de SKU curto esgotada';
    END IF;
    code := substr(alphabet, (n / (34^3))::int % 34 + 1, 1)
      || substr(alphabet, (n / (34^2))::int % 34 + 1, 1)
      || substr(alphabet, (n / 34)::int % 34 + 1, 1)
      || substr(alphabet, (n % 34)::int + 1, 1);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.products WHERE sku = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Keep legacy ad SKUs. Assign a predictable suffix to new offers.
CREATE OR REPLACE FUNCTION public.assign_ad_sku()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; next_number int;
BEGIN
  IF NEW.sku IS NOT NULL AND NEW.sku <> '' THEN RETURN NEW; END IF;
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.product_id::text));
  SELECT COALESCE(sku, upper(substr(replace(id::text, '-', ''), 1, 4)))
  INTO base FROM public.products WHERE id = NEW.product_id;
  IF NEW.is_primary THEN
    next_number := 1;
  ELSE
    SELECT COALESCE(MAX(substring(sku from '([0-9]{2})$')::int), 1) + 1
    INTO next_number FROM public.ml_listing_variants
    WHERE product_id = NEW.product_id AND sku LIKE base || '%';
  END IF;
  IF next_number > 99 THEN RAISE EXCEPTION 'Limite de 99 anúncios por produto'; END IF;
  WHILE EXISTS (SELECT 1 FROM public.ml_listing_variants a
    WHERE a.product_id = NEW.product_id AND a.id IS DISTINCT FROM NEW.id
      AND a.sku = base || lpad(next_number::text, 2, '0')) LOOP
    next_number := next_number + 1;
    IF next_number > 99 THEN RAISE EXCEPTION 'Limite de 99 anúncios por produto'; END IF;
  END LOOP;
  NEW.sku := base || lpad(next_number::text, 2, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER assign_ad_sku BEFORE INSERT OR UPDATE ON public.ml_listing_variants
FOR EACH ROW EXECUTE FUNCTION public.assign_ad_sku();

-- Explicit kit language in an ad title can be migrated without interpreting the
-- number of pieces that make up one catalog product.
UPDATE public.ml_listing_variants a SET bundle_quantity =
  (regexp_match(a.variant_title, '(?i)\mkit\M\s*(?:com|de)?\s*([2-9][0-9]?)\s*(?:unidades?|peças?|formas?)?'))[1]::int,
  is_primary = false
FROM public.products p
WHERE a.product_id = p.id
  AND a.variant_title ~* '\mkit\M\s*(?:com|de)?\s*[2-9][0-9]?'
  AND p.name !~* '\mkit\M\s*(?:com|de)?\s*[2-9][0-9]?';

-- Promote one existing unit offer. A kit is never promoted to primary.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY product_id
    ORDER BY COALESCE(is_official_model, false) DESC, created_at, id) AS position
  FROM public.ml_listing_variants
  WHERE bundle_quantity = 1 AND product_id IS NOT NULL
    AND (is_official_model = true OR origin_type IN ('supplier', 'super_admin', 'official'))
)
UPDATE public.ml_listing_variants a SET is_primary = true
FROM ranked r WHERE a.id = r.id AND r.position = 1;

-- If all existing offers are kits (or there is no offer yet), make a genuine
-- unit offer from the product's own unit title, description, price and photos.
INSERT INTO public.ml_listing_variants (
  user_id, product_id, variant_title, variant_description, internal_name,
  price, sku, bundle_quantity, is_primary, is_official_model, origin_type,
  status, image_gallery
)
SELECT COALESCE(p.supplier_id,
    (SELECT user_id FROM public.profiles WHERE role = 'super_admin' ORDER BY created_at LIMIT 1),
    (SELECT user_id FROM public.ml_listing_variants WHERE product_id = p.id ORDER BY created_at LIMIT 1)),
  p.id, left(p.name, 60),
  CASE WHEN p.description ~* '\mkit\M\s*(?:com|de)?\s*[2-9][0-9]?'
    AND p.name !~* '[0-9]+\s*(?:peças?|unidades?|formas?)'
    THEN p.name || '. Conteúdo: 1 unidade cadastrada deste produto.'
    ELSE p.description END,
  p.name || ' (Anúncio principal)',
  p.price, NULL, 1, true, true, 'official', 'draft',
  to_jsonb(COALESCE(p.images, ARRAY[]::text[]))
FROM public.products p
WHERE NOT EXISTS (SELECT 1 FROM public.ml_listing_variants a WHERE a.product_id = p.id AND a.is_primary)
  AND COALESCE(p.supplier_id,
    (SELECT user_id FROM public.profiles WHERE role = 'super_admin' ORDER BY created_at LIMIT 1),
    (SELECT user_id FROM public.ml_listing_variants WHERE product_id = p.id ORDER BY created_at LIMIT 1)) IS NOT NULL;

UPDATE public.ml_listing_variants a SET primary_ad_id = primary_ad.id
FROM public.ml_listing_variants primary_ad
WHERE a.product_id = primary_ad.product_id AND primary_ad.is_primary
  AND NOT a.is_primary;

UPDATE public.ml_listing_variants SET sku = NULL WHERE sku IS NULL;

-- A small audit queue for titles that may describe a kit as the product itself.
CREATE TABLE IF NOT EXISTS public.ad_restructure_review (
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, reason)
);
ALTER TABLE public.ad_restructure_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can review ambiguous ads" ON public.ad_restructure_review
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin'
));
INSERT INTO public.ad_restructure_review(product_id, reason)
SELECT id, 'Nome do produto contém kit e quantidade; confirmar unidade comercial antes de alterar títulos'
FROM public.products WHERE name ~* '\mkit\M\s*(?:com|de)?\s*[2-9][0-9]?'
ON CONFLICT (product_id, reason) DO NOTHING;

INSERT INTO public.ad_restructure_review(product_id, reason)
SELECT DISTINCT a.product_id, 'Descrição de anúncio unitário menciona kit; revisar texto'
FROM public.ml_listing_variants a
WHERE a.is_primary AND a.variant_description ~* '\mkit\M\s*(?:com|de)?\s*[2-9][0-9]?'
ON CONFLICT (product_id, reason) DO NOTHING;

INSERT INTO public.ad_restructure_review(product_id, reason)
SELECT DISTINCT a.product_id, 'Título de anúncio menciona kit sem quantidade inequívoca; revisar manualmente'
FROM public.ml_listing_variants a JOIN public.products p ON p.id = a.product_id
WHERE a.bundle_quantity = 1 AND a.variant_title ~* '\mkit\M'
  AND p.name !~* '\mkit\M'
ON CONFLICT (product_id, reason) DO NOTHING;

INSERT INTO public.ad_restructure_review(product_id, reason)
SELECT DISTINCT product_id, 'Kit já publicado no marketplace; sincronizar a disponibilidade em número de kits'
FROM public.ml_listing_variants WHERE bundle_quantity > 1 AND ml_item_id IS NOT NULL
  AND product_id IS NOT NULL
ON CONFLICT (product_id, reason) DO NOTHING;

INSERT INTO public.ad_restructure_review(product_id, reason)
SELECT p.id, 'Não foi possível criar anúncio primário: produto sem fornecedor e sem super admin cadastrado'
FROM public.products p WHERE NOT EXISTS (
  SELECT 1 FROM public.ml_listing_variants a WHERE a.product_id = p.id AND a.is_primary
) ON CONFLICT (product_id, reason) DO NOTHING;

-- Supplier/super admin own the offer structure. Resellers retain their legacy
-- published rows but may not create new variants or alter kit quantity.
CREATE OR REPLACE FUNCTION public.guard_ad_structure()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE role_name text; owner_id uuid; org_id uuid; structure_changed boolean;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' OR current_user = 'postgres' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_primary AND NOT NEW.is_primary THEN
      RAISE EXCEPTION 'O anúncio primário deve permanecer vinculado ao produto';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    structure_changed := true;
  ELSE
    structure_changed := NEW.bundle_quantity IS DISTINCT FROM OLD.bundle_quantity
      OR NEW.is_primary IS DISTINCT FROM OLD.is_primary
      OR NEW.sku IS DISTINCT FROM OLD.sku
      OR NEW.variant_title IS DISTINCT FROM OLD.variant_title
      OR NEW.variant_description IS DISTINCT FROM OLD.variant_description
      OR NEW.price IS DISTINCT FROM OLD.price
      OR NEW.image_gallery IS DISTINCT FROM OLD.image_gallery;
  END IF;
  IF structure_changed THEN
    SELECT role::text INTO role_name FROM public.profiles WHERE user_id = auth.uid();
    SELECT supplier_id, supplier_organization_id INTO owner_id, org_id
    FROM public.products WHERE id = NEW.product_id;
    IF role_name IS DISTINCT FROM 'super_admin' AND NOT COALESCE(
      role_name = 'supplier' AND (owner_id = auth.uid() OR public.is_supplier_org_member(org_id, auth.uid())), false) THEN
      RAISE EXCEPTION 'Somente fornecedor ou super admin pode criar anúncios e kits';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_ad_structure BEFORE INSERT OR UPDATE ON public.ml_listing_variants
FOR EACH ROW EXECUTE FUNCTION public.guard_ad_structure();

CREATE OR REPLACE FUNCTION public.protect_primary_ad()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_primary AND EXISTS (SELECT 1 FROM public.products WHERE id = OLD.product_id) THEN
    RAISE EXCEPTION 'O anúncio primário não pode ser removido';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER protect_primary_ad BEFORE DELETE ON public.ml_listing_variants
FOR EACH ROW EXECUTE FUNCTION public.protect_primary_ad();

CREATE OR REPLACE FUNCTION public.create_primary_ad_for_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ad_owner uuid;
BEGIN
  ad_owner := COALESCE(NEW.supplier_id,
    (SELECT user_id FROM public.profiles WHERE role = 'super_admin' ORDER BY created_at LIMIT 1));
  IF ad_owner IS NOT NULL THEN
    INSERT INTO public.ml_listing_variants (
      user_id, product_id, variant_title, variant_description, internal_name,
      price, bundle_quantity, is_primary, is_official_model, origin_type, status, image_gallery
    ) VALUES (
      ad_owner, NEW.id, left(NEW.name, 60), NEW.description,
      NEW.name || ' (Anúncio principal)', NEW.price, 1, true, true, 'official',
      'draft', to_jsonb(COALESCE(NEW.images, ARRAY[]::text[]))
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER create_primary_ad_for_product AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.create_primary_ad_for_product();

CREATE POLICY "Authenticated users can read official ads"
ON public.ml_listing_variants FOR SELECT TO authenticated
USING (is_official_model = true);

CREATE POLICY "Public can read published official ad galleries"
ON public.ml_listing_variants FOR SELECT TO anon
USING ((is_official_model = true OR origin_type IN ('supplier', 'super_admin'))
  AND status = 'published');

CREATE POLICY "Supplier members can manage their product ads"
ON public.ml_listing_variants FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = product_id
    AND public.is_supplier_org_member(p.supplier_organization_id, auth.uid())
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = product_id
    AND public.is_supplier_org_member(p.supplier_organization_id, auth.uid())
));

-- A kit sale can split a marketplace price into fractional cents per physical
-- unit. Financial splits must use the exact order line total.
CREATE OR REPLACE FUNCTION public.freeze_order_item_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cost numeric; v_supplier_id uuid; v_supplier_org_id uuid;
  v_split_fornecedor_pct numeric; v_split_revendedor_pct numeric; v_gross numeric;
BEGIN
  SELECT p.cost_price, p.supplier_id,
    COALESCE(p.supplier_organization_id, public.get_supplier_org_id(p.supplier_id))
  INTO v_cost, v_supplier_id, v_supplier_org_id
  FROM public.products p WHERE p.id = NEW.product_id;
  SELECT COALESCE(split_fornecedor_percentual, 0), COALESCE(split_revendedor_percentual, 0)
  INTO v_split_fornecedor_pct, v_split_revendedor_pct
  FROM public.platform_settings LIMIT 1;
  v_split_fornecedor_pct := COALESCE(v_split_fornecedor_pct, 0);
  v_split_revendedor_pct := COALESCE(v_split_revendedor_pct, 0);
  v_gross := NEW.total_price;
  NEW.supplier_id := v_supplier_id;
  NEW.supplier_organization_id := v_supplier_org_id;
  NEW.supplier_unit_cost := COALESCE(v_cost, 0);
  NEW.supplier_total_cost := COALESCE(v_cost, 0) * NEW.quantity;
  IF v_supplier_id IS NOT NULL THEN
    IF v_split_fornecedor_pct > 0 THEN
      NEW.supplier_net_amount := v_gross * (v_split_fornecedor_pct / 100.0);
    ELSE
      NEW.supplier_net_amount := COALESCE(v_cost, 0) * NEW.quantity;
    END IF;
  ELSE
    NEW.supplier_net_amount := 0;
  END IF;
  IF v_split_revendedor_pct > 0 THEN
    NEW.reseller_margin_amount := v_gross * (v_split_revendedor_pct / 100.0);
  ELSE
    NEW.reseller_margin_amount := v_gross - COALESCE(v_cost, 0) * NEW.quantity;
  END IF;
  NEW.platform_fee_amount := v_gross - COALESCE(NEW.supplier_net_amount, 0)
    - COALESCE(NEW.reseller_margin_amount, 0);
  NEW.financials_frozen_at := now();
  IF v_supplier_id IS NOT NULL AND v_cost IS NULL THEN
    PERFORM public.log_supplier_audit(
      v_supplier_org_id, 'order_item_frozen_without_cost', 'order_item', NEW.id,
      NULL, NULL, jsonb_build_object('order_id', NEW.order_id, 'product_id', NEW.product_id)
    );
  END IF;
  RETURN NEW;
END;
$$;
