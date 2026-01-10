-- Replace large base64 blobs in styles.result->'image' with the stored Supabase URL (or drop if missing).
BEGIN;

UPDATE styles
SET result = CASE
    WHEN generated_image_url IS NOT NULL THEN jsonb_set(
        result - 'image',
        '{image}',
        to_jsonb(generated_image_url),
        true
    )
    ELSE result - 'image'
  END
WHERE result ? 'image'
  AND (result->>'image') LIKE 'data:image/%';

COMMIT;
