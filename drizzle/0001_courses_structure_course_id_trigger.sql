CREATE OR REPLACE FUNCTION "public"."set_course_structure_course_id"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.id := COALESCE(NEW.id, gen_random_uuid());
	NEW.structure := jsonb_set(
		COALESCE(NEW.structure, '{}'::jsonb),
		'{courseId}',
		to_jsonb(NEW.id::text),
		true
	);
	RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "courses_set_structure_course_id_before_insert" ON "courses";
--> statement-breakpoint
CREATE TRIGGER "courses_set_structure_course_id_before_insert"
BEFORE INSERT ON "courses"
FOR EACH ROW
EXECUTE FUNCTION "public"."set_course_structure_course_id"();
