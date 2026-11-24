-- ============================================================================
-- GENTLE READERS — SECURE ADMIN ORDERS ACCESS FIX
-- Allows /admin/orders dashboard to fetch orders securely via admin password
-- Keeps public.orders protected from anonymous SELECT scraping
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_orders(p_admin_password text DEFAULT NULL)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Authenticate caller: Must be authenticated store owner OR supply the valid admin password
  IF public.is_owner() OR (p_admin_password IS NOT NULL AND p_admin_password = 'gentleadmin') THEN
    RETURN QUERY
    SELECT *
    FROM public.orders
    ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED: Invalid admin password or insufficient permissions.';
  END IF;
END;
$$;

-- Grant execution to anon and authenticated callers so the dashboard prompt can query it
REVOKE ALL ON FUNCTION public.get_admin_orders(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_orders(text) TO anon, authenticated;
