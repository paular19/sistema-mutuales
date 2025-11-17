-- ============================================================
-- FIX USERS POLICY (NEON COMPATIBLE)
-- ============================================================

-- Aseguramos que la policy select_usuarios tenga la condición correcta

ALTER POLICY select_usuarios
  ON usuarios
  USING (
    "clerkId" = current_setting('app.clerk_id', true)
  );

-- ============================================================
-- 2) NORMALIZE ALL OTHER POLICIES
-- ============================================================

-- Asociados
ALTER POLICY select_asociados ON asociados
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY update_asociados ON asociados
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY delete_asociados ON asociados
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY insert_asociados ON asociados
  WITH CHECK (id_mutual = current_setting('app.mutual_id')::integer);

-- Tipos de Asociado
ALTER POLICY select_tipos_asociados ON tipos_asociados
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY update_tipos_asociados ON tipos_asociados
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY delete_tipos_asociados ON tipos_asociados
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY insert_tipos_asociados ON tipos_asociados
  WITH CHECK (id_mutual = current_setting('app.mutual_id')::integer);

-- Productos
ALTER POLICY select_productos ON productos
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY update_productos ON productos
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY delete_productos ON productos
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY insert_productos ON productos
  WITH CHECK (id_mutual = current_setting('app.mutual_id')::integer);

-- Créditos
ALTER POLICY select_creditos ON creditos
  USING (
    EXISTS (
      SELECT 1 FROM asociados a
      WHERE a.id_asociado = creditos.id_asociado
        AND a.id_mutual = current_setting('app.mutual_id')::integer
    )
  );

ALTER POLICY update_creditos ON creditos
  USING (
    EXISTS (
      SELECT 1 FROM asociados a
      WHERE a.id_asociado = creditos.id_asociado
        AND a.id_mutual = current_setting('app.mutual_id')::integer
    )
  );

ALTER POLICY delete_creditos ON creditos
  USING (
    EXISTS (
      SELECT 1 FROM asociados a
      WHERE a.id_asociado = creditos.id_asociado
        AND a.id_mutual = current_setting('app.mutual_id')::integer
    )
  );

ALTER POLICY insert_creditos ON creditos
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM asociados a
      WHERE a.id_asociado = creditos.id_asociado
        AND a.id_mutual = current_setting('app.mutual_id')::integer
    )
  );

-- Cuotas
ALTER POLICY select_cuotas ON cuotas
  USING (
    EXISTS (
      SELECT 1 
      FROM creditos c 
      JOIN asociados a ON a.id_asociado = c.id_asociado
      WHERE c.id_credito = cuotas.id_credito
        AND a.id_mutual = current_setting('app.mutual_id')::integer
    )
  );

-- Pagos
ALTER POLICY select_pagos ON pagos
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY update_pagos ON pagos
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY delete_pagos ON pagos
  USING (id_mutual = current_setting('app.mutual_id')::integer);

ALTER POLICY insert_pagos ON pagos
  WITH CHECK (id_mutual = current_setting('app.mutual_id')::integer);

-- Pago Cuotas
ALTER POLICY select_pago_cuotas ON pago_cuotas
  USING (
    EXISTS (
      SELECT 1 FROM pagos p
      WHERE p.id_pago = pago_cuotas.id_pago
        AND p.id_mutual = current_setting('app.mutual_id')::integer
    )
  );

-- Configuración Cierre
ALTER POLICY select_configuraciones_cierre ON configuraciones_cierre
  USING (id_mutual = current_setting('app.mutual_id')::integer);

-- Liquidaciones
ALTER POLICY select_liquidaciones ON liquidaciones
  USING (id_mutual = current_setting('app.mutual_id')::integer);

-- Liquidaciones Detalle
ALTER POLICY select_liquidaciones_detalle ON liquidaciones_detalle
  USING (
    EXISTS (
      SELECT 1 FROM liquidaciones l
      WHERE l.id_liquidacion = liquidaciones_detalle.id_liquidacion
        AND l.id_mutual = current_setting('app.mutual_id')::integer
    )
  );

-- Cancelaciones
ALTER POLICY select_cancelacion ON "Cancelacion"
  USING (id_mutual = current_setting('app.mutual_id')::integer);

-- Informe 3688
ALTER POLICY select_informe3688 ON "Informe3688"
  USING (id_mutual = current_setting('app.mutual_id')::integer);

-- ============================================================
-- DONE
-- ============================================================
