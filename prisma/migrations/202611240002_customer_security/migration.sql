-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerHistory" ADD CONSTRAINT "CustomerHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


DO $$
DECLARE role_name TEXT; table_name TEXT;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
   FOREACH table_name IN ARRAY ARRAY['Customer','CustomerContact','CustomerAddress','CustomerFinancial','CustomerProject','CustomerLocation','CustomerDocument','CustomerHistory','CustomerSequence'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, role_name);
   END LOOP;
  END IF;
 END LOOP;
END $$;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_type_check" CHECK ("type" IN ('Company','Individual'));
ALTER TABLE "CustomerFinancial" ADD CONSTRAINT "CustomerFinancial_positive_check" CHECK ("creditLimit" >= 0 AND "creditDays" >= 0 AND "openingBalance" >= 0);
